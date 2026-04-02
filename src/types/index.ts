export type LocationType = 'port' | 'pier' | 'shore' | 'offshore';

export type Region =
  | 'San Diego'
  | 'Orange County'
  | 'LA County'
  | 'Ventura County';

export interface Location {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  type: LocationType;
  region: Region;
  noaaTideStation: string;
  ndbcBuoyId: string;
  description: string;
}

export type FactorName =
  | 'weather'
  | 'tides'
  | 'barometricPressure'
  | 'pressureDelta'
  | 'waterTemp'
  | 'moonPhase'
  | 'timeOfDay'
  | 'wind'
  | 'catchReports';

export interface FactorScore {
  name: FactorName;
  /** 0–10 */
  score: number;
  label: string;
  details: string;
}

export interface FishingEvent {
  /** 0–23 */
  hour: number;
  /** e.g. 'tide_high', 'sunrise', 'moonrise', 'pressure_drop' */
  type: string;
  label: string;
}

export interface HourlyScore {
  /** 0–23 */
  hour: number;
  overall: number;
  factors: FactorScore[];
  events: FishingEvent[];
}

export interface DailyScore {
  /** ISO date string, e.g. '2026-04-02' */
  date: string;
  location: Location;
  overall: number;
  label: string;
  hourlyScores: HourlyScore[];
  /** Hour of day (0–23) with the highest overall score */
  bestHour: number;
  factors: FactorScore[];
}

export interface ForecastDay {
  /** ISO date string */
  date: string;
  overall: number;
  label: string;
  /** Hour of day (0–23) */
  bestHour: number;
  highTemp: number;
  lowTemp: number;
  windSpeed: number;
  tideEvents: string[];
}

export interface CatchReport {
  id: string;
  /** ISO date string */
  date: string;
  locationSlug: string;
  species: string;
  count: number;
  source: string;
  sourceUrl: string;
  /** ISO datetime string */
  scrapedAt: string;
}

export interface TripWindow {
  /** Hour of day (0–23) */
  startHour: number;
  /** Hour of day (0–23) */
  endHour: number;
  averageScore: number;
  /** Hour of day (0–23) */
  bestHour: number;
  events: FishingEvent[];
  suggestedSpecies: string[];
}

export interface WeatherData {
  hourly: {
    time: string[];
    temperature: number[];
    windSpeed: number[];
    windDirection: number[];
    windGusts: number[];
    pressure: number[];
    precipitation: number[];
    cloudCover: number[];
    weatherCode: number[];
  };
  daily: {
    sunrise: string[];
    sunset: string[];
  };
}

export interface TideData {
  predictions: {
    /** ISO datetime string */
    t: string;
    /** Water level in feet */
    v: string;
    type: 'H' | 'L';
  }[];
}

export interface BuoyData {
  waterTemp: number;
  airTemp: number;
  windSpeed: number;
  windDirection: number;
  /** ISO datetime string */
  timestamp: string;
}
