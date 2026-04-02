import type { WeatherData } from '@/types';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const WEATHER_HOURLY =
  'hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,weather_code';

const SHARED_PARAMS =
  'temperature_unit=fahrenheit' +
  '&wind_speed_unit=mph' +
  '&precipitation_unit=inch' +
  '&timezone=America%2FLos_Angeles' +
  '&forecast_days=3';

function buildWeatherUrl(lat: number, lng: number): string {
  return (
    `${BASE_URL}?latitude=${lat}&longitude=${lng}` +
    `&${WEATHER_HOURLY}` +
    `&daily=sunrise,sunset` +
    `&${SHARED_PARAMS}`
  );
}

function buildMarineUrl(lat: number, lng: number): string {
  // Open-Meteo Marine API for wave data
  return (
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height` +
    `&timezone=America%2FLos_Angeles` +
    `&forecast_days=3`
  );
}

/**
 * Maps the raw Open-Meteo JSON response to our typed WeatherData shape.
 * The API uses verbose snake_case keys — we normalize them here so the
 * rest of the app never has to know about the upstream naming.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWeatherResponse(json: any): WeatherData {
  const h = json.hourly ?? {};
  const d = json.daily ?? {};

  return {
    hourly: {
      time: h.time ?? [],
      temperature: h.temperature_2m ?? [],
      windSpeed: h.wind_speed_10m ?? [],
      windDirection: h.wind_direction_10m ?? [],
      windGusts: h.wind_gusts_10m ?? [],
      pressure: h.pressure_msl ?? [],
      precipitation: h.precipitation ?? [],
      cloudCover: h.cloud_cover ?? [],
      weatherCode: h.weather_code ?? [],
    },
    daily: {
      sunrise: d.sunrise ?? [],
      sunset: d.sunset ?? [],
    },
  };
}

/**
 * Fetches a 3-day hourly weather forecast from Open-Meteo (no API key required).
 *
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @returns Typed WeatherData or null on failure
 */
export async function getWeatherData(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  const url = buildWeatherUrl(lat, lng);

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error(
        `[open-meteo] Weather fetch failed: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const json = await res.json();
    return mapWeatherResponse(json);
  } catch (err) {
    console.error('[open-meteo] getWeatherData error:', err);
    return null;
  }
}

/**
 * Fetches marine (wave) data from the Open-Meteo Marine API and merges it
 * with a standard weather forecast so callers get a single unified object.
 *
 * Wave fields are appended where available; missing columns are left as
 * empty arrays so downstream consumers can safely check `.length`.
 *
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @returns Typed WeatherData (with wave sub-keys) or null on failure
 */
export async function getMarineData(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  const [weatherUrl, marineUrl] = [
    buildWeatherUrl(lat, lng),
    buildMarineUrl(lat, lng),
  ];

  try {
    // Fire both requests in parallel — marine API may not cover inland coords
    const [weatherRes, marineRes] = await Promise.all([
      fetch(weatherUrl, { next: { revalidate: 3600 } }),
      fetch(marineUrl, { next: { revalidate: 3600 } }).catch(() => null),
    ]);

    if (!weatherRes.ok) {
      console.error(
        `[open-meteo] Marine/weather fetch failed: ${weatherRes.status}`
      );
      return null;
    }

    const weatherJson = await weatherRes.json();
    const base = mapWeatherResponse(weatherJson);

    // Merge wave data when the marine endpoint returned a valid response
    if (marineRes && marineRes.ok) {
      const marineJson = await marineRes.json();
      const mh = marineJson.hourly ?? {};

      // Attach wave fields directly onto hourly so scoring functions can read
      // them via (base.hourly as any).waveHeight etc. without breaking the
      // WeatherData interface for locations that have no marine data.
      Object.assign(base.hourly, {
        waveHeight: mh.wave_height ?? [],
        waveDirection: mh.wave_direction ?? [],
        wavePeriod: mh.wave_period ?? [],
        windWaveHeight: mh.wind_wave_height ?? [],
        swellWaveHeight: mh.swell_wave_height ?? [],
      });
    }

    return base;
  } catch (err) {
    console.error('[open-meteo] getMarineData error:', err);
    return null;
  }
}
