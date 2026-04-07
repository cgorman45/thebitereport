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
