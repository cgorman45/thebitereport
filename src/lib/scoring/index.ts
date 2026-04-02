import SunCalc from 'suncalc';
import { getWeatherData } from '@/lib/api/open-meteo';
import { getTidePredictions } from '@/lib/api/noaa-tides';
import { getBuoyData } from '@/lib/api/noaa-buoy';
import { withCache } from '@/lib/cache';
import { scoreWeather } from './weather';
import { scoreTides } from './tides';
import { scorePressure } from './pressure';
import { scorePressureDelta } from './pressure-delta';
import { scoreWaterTemp } from './water-temp';
import { scoreMoon } from './moon';
import { scoreTimeOfDay } from './time-of-day';
import { scoreWind } from './wind';
import { scoreCatchReports } from './catch-reports';
import type {
  Location,
  DailyScore,
  HourlyScore,
  FactorScore,
  FishingEvent,
  CatchReport,
} from '@/types';

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5) return 'Moderate';
  if (score >= 3) return 'Fair';
  return 'Poor';
}

function parseHour(isoString: string): number {
  return new Date(isoString).getHours();
}

function buildEvents(
  weather: Awaited<ReturnType<typeof getWeatherData>>,
  tides: Awaited<ReturnType<typeof getTidePredictions>>,
  lat: number,
  lng: number,
  date: string,
  pressures: number[]
): FishingEvent[] {
  const events: FishingEvent[] = [];

  // Tide events
  if (tides?.predictions) {
    for (const pred of tides.predictions) {
      const predDate = pred.t.split(' ')[0];
      if (predDate === date || pred.t.startsWith(date)) {
        const hour = new Date(pred.t.replace(' ', 'T')).getHours();
        events.push({
          hour,
          type: pred.type === 'H' ? 'tide_high' : 'tide_low',
          label: `${pred.type === 'H' ? 'High' : 'Low'} tide ${parseFloat(pred.v).toFixed(1)}ft`,
        });
      }
    }
  }

  // Sunrise/sunset
  if (weather?.daily?.sunrise?.[0]) {
    const sunriseHour = parseHour(weather.daily.sunrise[0]);
    events.push({ hour: sunriseHour, type: 'sunrise', label: 'Sunrise' });
  }
  if (weather?.daily?.sunset?.[0]) {
    const sunsetHour = parseHour(weather.daily.sunset[0]);
    events.push({ hour: sunsetHour, type: 'sunset', label: 'Sunset' });
  }

  // Moon rise/set
  const dateObj = new Date(date + 'T12:00:00');
  const moonTimes = SunCalc.getMoonTimes(dateObj, lat, lng);
  if (moonTimes.rise) {
    events.push({
      hour: moonTimes.rise.getHours(),
      type: 'moonrise',
      label: 'Moonrise',
    });
  }
  if (moonTimes.set) {
    events.push({
      hour: moonTimes.set.getHours(),
      type: 'moonset',
      label: 'Moonset',
    });
  }

  // Significant pressure drops
  for (let i = 3; i < pressures.length; i++) {
    const delta = (pressures[i] - pressures[i - 3]) / 33.8639;
    if (delta < -0.06) {
      events.push({
        hour: i,
        type: 'pressure_drop',
        label: 'Rapid pressure drop',
      });
    }
  }

  return events;
}

export async function computeDailyScore(
  location: Location,
  date?: string,
  catchReports?: CatchReport[]
): Promise<DailyScore> {
  const targetDate =
    date ||
    new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Los_Angeles',
    });

  // Fetch all data in parallel with caching
  const [weather, tides, buoy] = await Promise.all([
    withCache(`weather-${location.slug}`, 3600, () =>
      getWeatherData(location.lat, location.lng)
    ),
    withCache(`tides-${location.noaaTideStation}-${targetDate}`, 86400, () =>
      getTidePredictions(location.noaaTideStation, targetDate)
    ),
    withCache(`buoy-${location.ndbcBuoyId}`, 3600, () =>
      getBuoyData(location.ndbcBuoyId)
    ),
  ]);

  // Moon data (pure computation, no API)
  const dateObj = new Date(targetDate + 'T12:00:00');
  const moonIllum = SunCalc.getMoonIllumination(dateObj);
  const moonTimes = SunCalc.getMoonTimes(dateObj, location.lat, location.lng);

  // Parse sunrise/sunset as decimal hours
  const sunriseDecimal = weather?.daily?.sunrise?.[0]
    ? (() => {
        const d = new Date(weather.daily.sunrise[0]);
        return d.getHours() + d.getMinutes() / 60;
      })()
    : 6;
  const sunsetDecimal = weather?.daily?.sunset?.[0]
    ? (() => {
        const d = new Date(weather.daily.sunset[0]);
        return d.getHours() + d.getMinutes() / 60;
      })()
    : 18.5;

  const moonriseHour = moonTimes.rise
    ? moonTimes.rise.getHours() + moonTimes.rise.getMinutes() / 60
    : null;
  const moonsetHour = moonTimes.set
    ? moonTimes.set.getHours() + moonTimes.set.getMinutes() / 60
    : null;

  // Pressure array for delta calculations
  const pressures = weather?.hourly?.pressure || [];

  // Build events
  const events = buildEvents(
    weather,
    tides,
    location.lat,
    location.lng,
    targetDate,
    pressures
  );

  // Compute hourly scores
  const hourlyScores: HourlyScore[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const factors: FactorScore[] = [
      scoreWeather(
        weather?.hourly?.weatherCode?.[hour] ?? 0,
        weather?.hourly?.cloudCover?.[hour] ?? 0,
        weather?.hourly?.precipitation?.[hour] ?? 0
      ),
      scoreTides(hour, tides?.predictions || []),
      scorePressure(weather?.hourly?.pressure?.[hour] ?? 1013),
      scorePressureDelta(pressures, hour),
      scoreWaterTemp(buoy?.waterTemp ?? null),
      scoreMoon(
        moonIllum.phase,
        moonIllum.fraction,
        hour,
        moonriseHour,
        moonsetHour
      ),
      scoreTimeOfDay(hour, sunriseDecimal, sunsetDecimal),
      scoreWind(
        weather?.hourly?.windSpeed?.[hour] ?? 0,
        weather?.hourly?.windGusts?.[hour] ?? 0,
        weather?.hourly?.windDirection?.[hour] ?? 0
      ),
      scoreCatchReports(catchReports || [], location.slug, targetDate),
    ];

    const overall =
      factors.reduce((sum, f) => sum + f.score, 0) / factors.length;

    const hourEvents = events.filter((e) => e.hour === hour);

    hourlyScores.push({
      hour,
      overall: Math.round(overall * 10) / 10,
      factors,
      events: hourEvents,
    });
  }

  // Overall daily score = average of all hours (weighted toward prime hours)
  const primeHours = hourlyScores.filter((h) => {
    const hr = h.hour;
    return (
      (hr >= Math.floor(sunriseDecimal) - 1 &&
        hr <= Math.floor(sunriseDecimal) + 3) ||
      (hr >= Math.floor(sunsetDecimal) - 3 &&
        hr <= Math.floor(sunsetDecimal) + 1)
    );
  });

  const overallScore =
    primeHours.length > 0
      ? primeHours.reduce((sum, h) => sum + h.overall, 0) / primeHours.length
      : hourlyScores.reduce((sum, h) => sum + h.overall, 0) /
        hourlyScores.length;

  const roundedOverall = Math.round(overallScore * 10) / 10;

  const bestHour = hourlyScores.reduce(
    (best, h) => (h.overall > best.overall ? h : best),
    hourlyScores[0]
  );

  // Aggregate factor scores (average across prime hours)
  const sourceHours = primeHours.length > 0 ? primeHours : hourlyScores;
  const aggregateFactors: FactorScore[] = sourceHours[0].factors.map(
    (_, idx) => {
      const avgScore =
        sourceHours.reduce((sum, h) => sum + h.factors[idx].score, 0) /
        sourceHours.length;
      const rounded = Math.round(avgScore * 10) / 10;
      return {
        name: sourceHours[0].factors[idx].name,
        score: rounded,
        label: getScoreLabel(rounded),
        details: sourceHours[0].factors[idx].details,
      };
    }
  );

  return {
    date: targetDate,
    location,
    overall: roundedOverall,
    label: getScoreLabel(roundedOverall),
    hourlyScores,
    bestHour: bestHour.hour,
    factors: aggregateFactors,
  };
}

export function computeTripWindow(
  hourlyScores: HourlyScore[],
  startHour: number,
  endHour: number,
  waterTemp: number | null
): {
  averageScore: number;
  bestHour: number;
  events: FishingEvent[];
  suggestedSpecies: string[];
} {
  const windowScores = hourlyScores.filter(
    (h) => h.hour >= startHour && h.hour <= endHour
  );

  const averageScore =
    windowScores.length > 0
      ? Math.round(
          (windowScores.reduce((sum, h) => sum + h.overall, 0) /
            windowScores.length) *
            10
        ) / 10
      : 0;

  const bestHourScore = windowScores.reduce(
    (best, h) => (h.overall > best.overall ? h : best),
    windowScores[0]
  );

  const events = windowScores.flatMap((h) => h.events);

  // Suggest species based on water temp and conditions
  const species: string[] = [];
  const temp = waterTemp ?? 65;

  if (temp >= 64 && temp <= 72) {
    species.push('Yellowtail', 'Calico Bass', 'White Seabass');
  }
  if (temp >= 68 && temp <= 78) {
    species.push('Yellowfin Tuna', 'Dorado');
  }
  if (temp >= 62 && temp <= 70) {
    species.push('Bluefin Tuna');
  }
  if (temp >= 55 && temp <= 65) {
    species.push('Halibut', 'Lingcod', 'Rockfish');
  }
  if (temp >= 58 && temp <= 68) {
    species.push('Barracuda', 'Bonito');
  }
  if (species.length === 0) {
    species.push('Rockfish', 'Sculpin', 'Sand Bass');
  }

  return {
    averageScore,
    bestHour: bestHourScore?.hour ?? startHour,
    events,
    suggestedSpecies: [...new Set(species)],
  };
}
