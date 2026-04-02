import type { PositionEntry, BoatStatus } from './types';
import { PORTS } from './boats';

const HISTORY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CATCHING_FISH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CIRCLING_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const PORT_RADIUS_M = 1852; // 1 nautical mile

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if position is within port radius
function isInPort(lat: number, lng: number): boolean {
  for (const port of Object.values(PORTS)) {
    if (haversineDistance(lat, lng, port.lat, port.lng) < PORT_RADIUS_M) {
      return true;
    }
  }
  return false;
}

// Prune history to 15-minute window
export function pruneHistory(history: PositionEntry[], now: number): PositionEntry[] {
  const cutoff = now - HISTORY_WINDOW_MS;
  return history.filter(p => p.timestamp >= cutoff);
}

// Smallest angle between two headings (0-180)
function headingDelta(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Main classification function
export function classifyBoatStatus(
  lat: number,
  lng: number,
  speed: number,
  history: PositionEntry[],
  now: number
): { status: BoatStatus; label: string; detail: string } {
  // 1. In Port
  if (isInPort(lat, lng)) {
    return { status: 'in_port', label: 'In Port', detail: 'Docked at landing' };
  }

  // Prerequisites: 3+ entries, most recent within 5 minutes
  if (history.length < 3) {
    return { status: 'unknown', label: 'Unknown', detail: 'Insufficient position data' };
  }
  const mostRecent = Math.max(...history.map(p => p.timestamp));
  if (now - mostRecent > STALE_THRESHOLD_MS) {
    return { status: 'unknown', label: 'Unknown', detail: 'No recent data' };
  }

  // 2. Catching Fish — stationary < 1 knot for 10+ minutes
  const tenMinAgo = now - CATCHING_FISH_WINDOW_MS;
  const tenMinWindow = history.filter(p => p.timestamp >= tenMinAgo);
  const oldestInBuffer = Math.min(...history.map(p => p.timestamp));
  const bufferSpanMs = now - oldestInBuffer;

  if (
    bufferSpanMs >= CATCHING_FISH_WINDOW_MS &&
    tenMinWindow.length >= 3 &&
    tenMinWindow.every(p => p.speed < 1.0)
  ) {
    const minutes = Math.round(bufferSpanMs / 60000);
    return {
      status: 'catching_fish',
      label: 'ON THE BITE',
      detail: `Stationary for ${minutes}+ min — likely catching fish`,
    };
  }

  // 3. Circling / Chumming
  const threeMinAgo = now - CIRCLING_WINDOW_MS;
  const threeMinWindow = history.filter(p => p.timestamp >= threeMinAgo);

  if (threeMinWindow.length >= 3) {
    const allInSpeedRange = threeMinWindow.every(p => p.speed >= 0.5 && p.speed <= 3.0);

    if (allInSpeedRange) {
      // Bounding radius check
      const centLat = threeMinWindow.reduce((s, p) => s + p.lat, 0) / threeMinWindow.length;
      const centLng = threeMinWindow.reduce((s, p) => s + p.lng, 0) / threeMinWindow.length;
      const maxDist = Math.max(...threeMinWindow.map(p => haversineDistance(p.lat, p.lng, centLat, centLng)));

      if (maxDist < 500) {
        // Cumulative heading change
        let cumulativeDelta = 0;
        for (let i = 1; i < threeMinWindow.length; i++) {
          cumulativeDelta += headingDelta(threeMinWindow[i - 1].heading, threeMinWindow[i].heading);
        }

        if (cumulativeDelta >= 180) {
          return {
            status: 'circling',
            label: 'THROWING BAIT',
            detail: `Circling in ${Math.round(maxDist)}m radius — chumming the water`,
          };
        }
      }
    }
  }

  // 4. Transit
  if (speed > 3.0) {
    return {
      status: 'transit',
      label: 'Transit',
      detail: `Moving at ${speed.toFixed(1)} knots`,
    };
  }

  // 5. Drifting / Slow (fallback)
  return {
    status: 'drifting',
    label: 'Drifting',
    detail: `Slow movement at ${speed.toFixed(1)} knots — repositioning or trolling`,
  };
}
