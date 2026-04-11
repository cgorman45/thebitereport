export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Detection extends GeoPoint {
  id: string;
  type: 'kelp-satellite' | 'kelp-sighting' | 'current-break' | 'drift-zone' | 'fish-report';
  label: string;
  confidence?: number;
}

export interface ProximityAlert {
  detection: Detection;
  distanceNM: number;
  bearing: number; // degrees from north
}

/** Haversine distance in nautical miles */
export function haversineNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from point 1 to point 2 in degrees (0-360) */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x =
    Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/** Convert bearing to compass direction */
export function bearingToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Check proximity of user position against all detections.
 * Returns alerts for detections within the radius, sorted by distance.
 */
export function checkProximity(
  userLat: number,
  userLng: number,
  detections: Detection[],
  radiusNM: number,
  alreadyAlerted: Set<string>,
): ProximityAlert[] {
  const alerts: ProximityAlert[] = [];

  for (const det of detections) {
    if (alreadyAlerted.has(det.id)) continue;

    const dist = haversineNM(userLat, userLng, det.lat, det.lng);
    if (dist <= radiusNM) {
      const bear = bearing(userLat, userLng, det.lat, det.lng);
      alerts.push({ detection: det, distanceNM: dist, bearing: bear });
    }
  }

  return alerts.sort((a, b) => a.distanceNM - b.distanceNM);
}

/** Default alert radii options in nautical miles */
export const ALERT_RADII = [1, 3, 5, 10] as const;
export type AlertRadius = typeof ALERT_RADII[number];

/**
 * Island exclusion zones for satellite hotspot tracking.
 *
 * Each entry is a waypoint on or near an island. `radiusNM` covers the
 * island's extent from that waypoint plus a 1-statute-mile (~0.87 NM) buffer.
 * Large islands use multiple waypoints so the union of circles approximates
 * the coastline without over-excluding open ocean.
 */
export const ISLAND_ZONES = [
  // Catalina Island — 22 mi long, 8 mi max width
  { name: 'Catalina Island (NW)', lat: 33.4700, lng: -118.6000, radiusNM: 5 },
  { name: 'Catalina Island (Center)', lat: 33.3894, lng: -118.4162, radiusNM: 5 },
  { name: 'Catalina Island (SE)', lat: 33.3200, lng: -118.3000, radiusNM: 5 },

  // San Clemente Island — 21 mi long, 4 mi max width
  { name: 'San Clemente Island (N)', lat: 33.0200, lng: -118.5700, radiusNM: 3.5 },
  { name: 'San Clemente Island (C)', lat: 32.9200, lng: -118.5000, radiusNM: 3.5 },
  { name: 'San Clemente Island (S)', lat: 32.8200, lng: -118.3500, radiusNM: 3.5 },

  // Santa Cruz Island — 24 mi long, 6 mi wide
  { name: 'Santa Cruz Island (E)', lat: 34.0200, lng: -119.5500, radiusNM: 5 },
  { name: 'Santa Cruz Island (W)', lat: 33.9700, lng: -119.8500, radiusNM: 5 },

  // Santa Rosa Island — 15 mi long, 10 mi wide
  { name: 'Santa Rosa Island', lat: 33.9600, lng: -120.1000, radiusNM: 6 },

  // San Miguel Island — 8 mi long, 4 mi wide
  { name: 'San Miguel Island', lat: 34.0400, lng: -120.3600, radiusNM: 4 },

  // Anacapa Island — 5 mi long, narrow
  { name: 'Anacapa Island', lat: 34.0100, lng: -119.3600, radiusNM: 3 },

  // San Nicolas Island — 9 mi long, 3 mi wide
  { name: 'San Nicolas Island', lat: 33.2500, lng: -119.5000, radiusNM: 4 },

  // Santa Barbara Island — small (~1 mi)
  { name: 'Santa Barbara Island', lat: 33.4800, lng: -119.0300, radiusNM: 2 },

  // Coronado Islands — small chain south of the border
  { name: 'Coronado Islands', lat: 32.4200, lng: -117.2500, radiusNM: 3 },
] as const;

/** Check if a position falls within any island exclusion zone (island extent + 1 mi buffer) */
export function isNearIsland(lat: number, lng: number): boolean {
  for (const zone of ISLAND_ZONES) {
    if (haversineNM(lat, lng, zone.lat, zone.lng) <= zone.radiusNM) {
      return true;
    }
  }
  return false;
}
