// src/lib/ocean-data/satellite-passes.ts
//
// Deterministic satellite pass prediction for the SoCal/Baja coverage area.
// Uses epoch-based modular arithmetic against known orbital parameters to
// produce realistic pass windows for Sentinel-2 and Pleiades constellations.

// ---------------------------------------------------------------------------
// Coverage area bounding box
// ---------------------------------------------------------------------------
const COVERAGE = {
  latMin: 28.7,
  latMax: 34.3,
  lngMin: -120.5,
  lngMax: -115.0,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SatellitePass {
  satellite: string;
  passTime: string;
  direction: 'ascending' | 'descending';
  maxElevation: number;
  durationMinutes: number;
  swathWidthKm: number;
  resolution: string;
  provider: string;
  coversZone: boolean;
}

export interface NextPassInfo {
  name: string;
  timeUntil: string;
  passTime: string;
}

export interface NextPassSummary {
  sentinel2: NextPassInfo;
  pleiades: NextPassInfo;
}

// ---------------------------------------------------------------------------
// Satellite orbital parameters
// ---------------------------------------------------------------------------
interface SatelliteConfig {
  name: string;
  epochMs: number;        // reference epoch (ms since Unix epoch)
  periodMin: number;      // orbital period in minutes
  revisitDays: number;    // same-track revisit period in days
  swathWidthKm: number;
  resolution: string;
  provider: string;
  altitudeKm: number;
  inclination: number;    // degrees
}

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const SATELLITES: SatelliteConfig[] = [
  {
    name: 'Sentinel-2A',
    epochMs: Date.UTC(2024, 0, 1, 18, 20, 0),   // 2024-01-01T18:20:00Z
    periodMin: 100.6,
    revisitDays: 10,
    swathWidthKm: 290,
    resolution: '10m',
    provider: 'ESA',
    altitudeKm: 786,
    inclination: 98.62,
  },
  {
    name: 'Sentinel-2B',
    epochMs: Date.UTC(2024, 0, 3, 18, 20, 0),   // 2024-01-03T18:20:00Z
    periodMin: 100.6,
    revisitDays: 10,
    swathWidthKm: 290,
    resolution: '10m',
    provider: 'ESA',
    altitudeKm: 786,
    inclination: 98.62,
  },
  {
    name: 'Pleiades-1A',
    epochMs: Date.UTC(2024, 0, 1, 18, 30, 0),   // 2024-01-01T18:30:00Z
    periodMin: 98.8,
    revisitDays: 26,
    swathWidthKm: 20,
    resolution: '50cm',
    provider: 'Airbus',
    altitudeKm: 694,
    inclination: 98.2,
  },
  {
    name: 'Pleiades-1B',
    epochMs: Date.UTC(2024, 0, 14, 18, 30, 0),  // 2024-01-14T18:30:00Z (offset ~13 days)
    periodMin: 98.8,
    revisitDays: 26,
    swathWidthKm: 20,
    resolution: '50cm',
    provider: 'Airbus',
    altitudeKm: 694,
    inclination: 98.2,
  },
];

// ---------------------------------------------------------------------------
// Prediction helpers
// ---------------------------------------------------------------------------

/**
 * Earth rotation causes the ground track to shift westward by roughly
 * 360° / (orbitsPerDay) per orbit.  For a ~100 min period that is
 * about 25° per orbit.  We use the exact value for the given period.
 */
function groundTrackShiftPerOrbit(periodMin: number): number {
  const orbitsPerDay = (24 * 60) / periodMin;
  return 360 / orbitsPerDay;
}

/**
 * For a sun-synchronous descending-node pass, the satellite crosses the
 * equator around 10:30 local time.  At ~32°N latitude the pass happens
 * a few minutes earlier. We model latitude-dependent timing by computing
 * the fraction of the orbit from equator to target latitude.
 */
function latitudeTimingOffsetMin(lat: number, inclination: number): number {
  // ascending fraction of orbit to reach given lat
  const sinRatio = Math.sin((lat * Math.PI) / 180) / Math.sin((inclination * Math.PI) / 180);
  const clamped = Math.max(-1, Math.min(1, sinRatio));
  const argOfLat = Math.asin(clamped);
  // fraction of full orbit
  const frac = argOfLat / (2 * Math.PI);
  // For descending node, the satellite goes from +incl to -incl;
  // time offset from the equatorial crossing is roughly this fraction of the period.
  return frac * 100; // approximate minutes
}

/**
 * Compute predicted passes for a single satellite over a location.
 */
function predictForSatellite(
  sat: SatelliteConfig,
  lat: number,
  lng: number,
  nowMs: number,
  hoursAhead: number,
): SatellitePass[] {
  const passes: SatellitePass[] = [];
  const endMs = nowMs + hoursAhead * MS_PER_HOUR;
  const periodMs = sat.periodMin * MS_PER_MIN;
  const revisitMs = sat.revisitDays * MS_PER_DAY;
  const shiftDeg = groundTrackShiftPerOrbit(sat.periodMin);

  // Number of orbits elapsed since epoch at the start of our window
  const orbitsSinceEpoch = Math.floor((nowMs - sat.epochMs) / periodMs);
  // Start searching a few orbits back to avoid edge effects
  const startOrbit = Math.max(0, orbitsSinceEpoch - 2);
  const totalOrbitsToCheck = Math.ceil((hoursAhead * 60) / sat.periodMin) + 4;

  for (let i = 0; i < totalOrbitsToCheck; i++) {
    const orbitNum = startOrbit + i;
    const orbitEpochMs = sat.epochMs + orbitNum * periodMs;

    // Ground track longitude at equator for this orbit
    // Starts at epoch longitude and shifts west with each orbit
    // Also account for Earth rotation relative to orbit plane
    const epochLng = lng; // we normalise below anyway
    const rawLng = epochLng - (orbitNum * shiftDeg);
    // Normalise to -180..180
    const normLng = ((rawLng % 360) + 540) % 360 - 180;

    // Check if this ground track revisit aligns with our longitude band.
    // Because the revisit pattern repeats every revisitDays, only certain
    // orbits actually cross our longitude.  We use modular arithmetic on
    // the orbit number.
    const orbitsPerRevisit = Math.round(revisitMs / periodMs);
    const trackIndex = orbitNum % orbitsPerRevisit;

    // The ground track longitude for this track index, relative to epoch
    const trackLng = ((-trackIndex * shiftDeg) % 360 + 540) % 360 - 180;

    // Does the swath cover our longitude range?
    // Convert swath width from km to approximate degrees at this latitude
    const kmPerDeg = 111.32 * Math.cos((lat * Math.PI) / 180);
    const swathDeg = sat.swathWidthKm / kmPerDeg;

    // The track longitude for this orbit (absolute, not relative)
    // We anchor the first track to the epoch's equatorial longitude.
    // For simplicity, we define the reference longitude as the center
    // of our coverage area, then compute which tracks fall inside.
    const refLng = (COVERAGE.lngMin + COVERAGE.lngMax) / 2;
    const orbitLng = refLng + ((-trackIndex * shiftDeg) % 360);
    const orbitLngNorm = ((orbitLng % 360) + 540) % 360 - 180;

    // Check if swath overlaps our longitude band
    const swathMin = orbitLngNorm - swathDeg / 2;
    const swathMax = orbitLngNorm + swathDeg / 2;
    const coversLng = swathMax >= COVERAGE.lngMin && swathMin <= COVERAGE.lngMax;
    // Also check if swath overlaps specific requested point
    const coversPoint = Math.abs(orbitLngNorm - lng) <= swathDeg / 2;

    if (!coversLng && !coversPoint) continue;

    // Compute pass time at target latitude
    const latOffset = latitudeTimingOffsetMin(lat, sat.inclination);
    // Descending pass: satellite moves from north to south
    // The pass at ~32°N is slightly before equatorial crossing
    const passTimeMs = orbitEpochMs - latOffset * MS_PER_MIN;

    if (passTimeMs < nowMs || passTimeMs > endMs) continue;

    // Determine if pass covers our zone
    const coversZone =
      lat >= COVERAGE.latMin &&
      lat <= COVERAGE.latMax &&
      coversLng;

    // Max elevation depends on how close the ground track is to the point.
    // Nadir = 90°.  We approximate based on cross-track distance.
    const crossTrackKm = Math.abs(orbitLngNorm - lng) * kmPerDeg;
    const maxElevation = Math.max(
      10,
      Math.round(90 - (crossTrackKm / sat.altitudeKm) * (180 / Math.PI) * 10) / 10,
    );

    // Duration depends on elevation — higher elevation = longer visible pass
    const durationMinutes = Math.round((2 + (maxElevation / 90) * 8) * 10) / 10;

    passes.push({
      satellite: sat.name,
      passTime: new Date(passTimeMs).toISOString(),
      direction: 'descending',
      maxElevation: Math.min(90, maxElevation),
      durationMinutes,
      swathWidthKm: sat.swathWidthKm,
      resolution: sat.resolution,
      provider: sat.provider,
      coversZone,
    });
  }

  return passes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Predict satellite passes over a given location within the next `hoursAhead`
 * hours.  Returns passes sorted chronologically.
 */
export function predictPasses(
  lat: number,
  lng: number,
  hoursAhead: number = 72,
): SatellitePass[] {
  const nowMs = Date.now();
  const allPasses: SatellitePass[] = [];

  for (const sat of SATELLITES) {
    const passes = predictForSatellite(sat, lat, lng, nowMs, hoursAhead);
    allPasses.push(...passes);
  }

  // Sort by pass time
  allPasses.sort((a, b) => new Date(a.passTime).getTime() - new Date(b.passTime).getTime());

  // Deduplicate passes that are very close in time for the same satellite
  // (can happen due to edge effects in orbit counting)
  const deduped: SatellitePass[] = [];
  for (const pass of allPasses) {
    const isDupe = deduped.some(
      (existing) =>
        existing.satellite === pass.satellite &&
        Math.abs(new Date(existing.passTime).getTime() - new Date(pass.passTime).getTime()) <
          30 * MS_PER_MIN,
    );
    if (!isDupe) {
      deduped.push(pass);
    }
  }

  return deduped;
}

/**
 * Format a duration in milliseconds as a human-readable "Xh Ym" string.
 */
function formatTimeUntil(ms: number): string {
  if (ms < 0) return 'now';
  const totalMin = Math.round(ms / MS_PER_MIN);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
}

/**
 * Get a summary of the next pass for each constellation family.
 */
export function getNextPassSummary(
  lat: number = 32.7,
  lng: number = -117.5,
  hoursAhead: number = 168, // look up to a week ahead for the summary
): NextPassSummary {
  const passes = predictPasses(lat, lng, hoursAhead);
  const nowMs = Date.now();

  const nextSentinel = passes.find((p) => p.satellite.startsWith('Sentinel'));
  const nextPleiades = passes.find((p) => p.satellite.startsWith('Pleiades'));

  const sentinel2: NextPassInfo = nextSentinel
    ? {
        name: nextSentinel.satellite,
        timeUntil: formatTimeUntil(new Date(nextSentinel.passTime).getTime() - nowMs),
        passTime: nextSentinel.passTime,
      }
    : { name: 'Sentinel-2', timeUntil: 'unknown', passTime: '' };

  const pleiades: NextPassInfo = nextPleiades
    ? {
        name: nextPleiades.satellite,
        timeUntil: formatTimeUntil(new Date(nextPleiades.passTime).getTime() - nowMs),
        passTime: nextPleiades.passTime,
      }
    : { name: 'Pleiades', timeUntil: 'unknown', passTime: '' };

  return { sentinel2, pleiades };
}
