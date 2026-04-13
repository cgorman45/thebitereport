/**
 * Satellite orbit computation using satellite.js and real TLE data.
 *
 * Computes real-time positions, ground tracks, and imagery footprints
 * for Earth observation satellites relevant to kelp detection.
 *
 * Satellites tracked:
 *   - Sentinel-2A (ESA, 10m, free)
 *   - Sentinel-2B (ESA, 10m, free)
 *   - Pléiades-1A (Airbus, 50cm)
 *   - Pléiades-1B (Airbus, 50cm)
 *   - Pléiades Neo 3 (Airbus, 30cm)
 *   - Pléiades Neo 4 (Airbus, 30cm)
 *   - WorldView-3 (Maxar, 31cm)
 *   - SPOT 6 (Airbus, 1.5m)
 *   - SPOT 7 (Airbus, 1.5m)
 *   - Landsat 8 (USGS, 30m, free)
 *   - Landsat 9 (USGS, 30m, free)
 *   - Terra (NASA MODIS)
 *   - Aqua (NASA MODIS)
 */

import * as satelliteJs from 'satellite.js';

// TLE data from Space-Track.org (USSPACECOM) — fetched 2026-04-13
// Real operational TLEs for all tracked Earth observation satellites
const SATELLITE_TLES: Record<string, { name: string; tle1: string; tle2: string; provider: string; resolution: string; swathKm: number; color: string; type: 'optical' | 'sar' | 'multispectral' }> = {
  'SENTINEL-2A': {
    name: 'Sentinel-2A',
    tle1: '1 40697U 15028A   26103.31962760  .00000149  00000-0  73621-4 0  9995',
    tle2: '2 40697  98.5635 179.1037 0001334  90.3570 269.7766 14.30820435564454',
    provider: 'ESA',
    resolution: '10m',
    swathKm: 290,
    color: '#0ea5e9',
    type: 'multispectral',
  },
  'SENTINEL-2B': {
    name: 'Sentinel-2B',
    tle1: '1 42063U 17013A   26103.31238177  .00000097  00000-0  53636-4 0  9994',
    tle2: '2 42063  98.5661 179.0095 0001242  94.0245 266.1080 14.30820791475369',
    provider: 'ESA',
    resolution: '10m',
    swathKm: 290,
    color: '#38bdf8',
    type: 'multispectral',
  },
  'PLEIADES-1A': {
    name: 'Pléiades-1A',
    tle1: '1 38012U 11076F   26103.30212009  .00000098  00000-0  30959-4 0  9995',
    tle2: '2 38012  98.1995 179.2692 0001232  74.7360  14.4539 14.58569605762536',
    provider: 'Airbus',
    resolution: '50cm',
    swathKm: 20,
    color: '#a855f7',
    type: 'optical',
  },
  'PLEIADES-1B': {
    name: 'Pléiades-1B',
    tle1: '1 39019U 12068A   26103.31968126  .00000047  00000-0  19969-4 0  9996',
    tle2: '2 39019  98.1965 179.2573 0001145  78.7513 281.3815 14.58556660711393',
    provider: 'Airbus',
    resolution: '50cm',
    swathKm: 20,
    color: '#c084fc',
    type: 'optical',
  },
  'PLEIADES-NEO-3': {
    name: 'Pléiades Neo 3',
    tle1: '1 48268U 21034A   26103.28691712 -.00000513  00000-0 -58555-4 0  9999',
    tle2: '2 48268  97.8930 178.9850 0001214  93.4173 266.7179 14.81670491268048',
    provider: 'Airbus',
    resolution: '30cm',
    swathKm: 14,
    color: '#d946ef',
    type: 'optical',
  },
  'PLEIADES-NEO-4': {
    name: 'Pléiades Neo 4',
    tle1: '1 49070U 21073E   26103.45575234 -.00000177  00000-0 -15901-4 0  9997',
    tle2: '2 49070  97.8941 179.1478 0001146 101.1056 259.0286 14.81672939251788',
    provider: 'Airbus',
    resolution: '30cm',
    swathKm: 14,
    color: '#e879f9',
    type: 'optical',
  },
  'WORLDVIEW-3': {
    name: 'WorldView-3',
    tle1: '1 40115U 14048A   26103.27765272  .00000548  00000-0  70680-4 0  9990',
    tle2: '2 40115  97.8587 179.0048 0002350 129.9372 230.2049 14.84915076632274',
    provider: 'Maxar',
    resolution: '31cm',
    swathKm: 13,
    color: '#ef4444',
    type: 'optical',
  },
  'SPOT-6': {
    name: 'SPOT 6',
    tle1: '1 38755U 12047A   26103.30009036  .00000033  00000-0  17026-4 0  9991',
    tle2: '2 38755  98.2160 171.3556 0001307  84.6756 275.4592 14.58587829723598',
    provider: 'Airbus',
    resolution: '1.5m',
    swathKm: 60,
    color: '#f97316',
    type: 'optical',
  },
  'SPOT-7': {
    name: 'SPOT 7',
    tle1: '1 40053U 14034A   26103.32115929  .00000080  00000-0  25685-4 0  9996',
    tle2: '2 40053  98.0681 167.4707 0001611  86.4686 273.6700 14.60901601627665',
    provider: 'Airbus',
    resolution: '1.5m',
    swathKm: 60,
    color: '#fb923c',
    type: 'optical',
  },
  'LANDSAT-8': {
    name: 'Landsat 8',
    tle1: '1 39084U 13008A   26103.26963233  .00000218  00000-0  58296-4 0  9997',
    tle2: '2 39084  98.1864 174.4169 0001173  93.4590 266.6743 14.57116978688449',
    provider: 'USGS',
    resolution: '30m',
    swathKm: 185,
    color: '#22c55e',
    type: 'multispectral',
  },
  'LANDSAT-9': {
    name: 'Landsat 9',
    tle1: '1 49260U 21088A   26103.23544126  .00000210  00000-0  56599-4 0  9990',
    tle2: '2 49260  98.1886 174.4532 0001117  99.5555 260.5770 14.57112635241545',
    provider: 'USGS',
    resolution: '30m',
    swathKm: 185,
    color: '#4ade80',
    type: 'multispectral',
  },
  'TERRA': {
    name: 'Terra (MODIS)',
    tle1: '1 25994U 99068A   26103.22802308  .00000263  00000-0  62512-4 0  9999',
    tle2: '2 25994  97.9523 155.3307 0003615  81.7033 318.5443 14.61051928400129',
    provider: 'NASA',
    resolution: '250m',
    swathKm: 2330,
    color: '#eab308',
    type: 'multispectral',
  },
  'AQUA': {
    name: 'Aqua (MODIS)',
    tle1: '1 27424U 02022A   26103.25582291  .00000589  00000-0  12725-3 0  9993',
    tle2: '2 27424  98.4228  71.2660 0001730 108.9713   2.3826 14.62056821273789',
    provider: 'NASA',
    resolution: '250m',
    swathKm: 2330,
    color: '#facc15',
    type: 'multispectral',
  },
};

export interface SatellitePosition {
  id: string;
  name: string;
  provider: string;
  resolution: string;
  swathKm: number;
  color: string;
  type: string;
  lat: number;
  lng: number;
  altitude: number; // km
  velocity: number; // km/s
  timestamp: string;
}

export interface OrbitPath {
  id: string;
  name: string;
  color: string;
  positions: { lat: number; lng: number; alt: number; time: string }[];
}

export interface ImageryFootprint {
  id: string;
  name: string;
  color: string;
  swathKm: number;
  polygon: [number, number][]; // [lng, lat][]
}

/**
 * Get current positions of all tracked satellites.
 */
export function getCurrentPositions(date?: Date): SatellitePosition[] {
  const satellite = satelliteJs;
  if (!satellite?.twoline2satrec) {
    return getFallbackPositions(date || new Date());
  }

  const now = date || new Date();
  const positions: SatellitePosition[] = [];

  for (const [id, sat] of Object.entries(SATELLITE_TLES)) {
    try {
      const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
      const positionAndVelocity = satellite.propagate(satrec, now);

      if (!positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') continue;

      const gmst = satellite.gstime(now);
      const geo = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

      const lng = satellite.degreesLong(geo.longitude);
      const lat = satellite.degreesLat(geo.latitude);
      const alt = geo.height; // km

      const vel = positionAndVelocity.velocity;
      const speed = typeof vel === 'object' ? Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) : 7.5;

      positions.push({
        id,
        name: sat.name,
        provider: sat.provider,
        resolution: sat.resolution,
        swathKm: sat.swathKm,
        color: sat.color,
        type: sat.type,
        lat,
        lng,
        altitude: alt,
        velocity: speed,
        timestamp: now.toISOString(),
      });
    } catch {
      // Skip satellites with propagation errors
    }
  }

  return positions;
}

/**
 * Compute orbit path for a satellite over the next N minutes.
 */
export function computeOrbitPath(
  satId: string,
  minutesAhead: number = 90,
  stepMinutes: number = 1,
  startDate?: Date,
): OrbitPath | null {
  const satellite = satelliteJs;
  if (!satellite?.twoline2satrec) return null;

  const sat = SATELLITE_TLES[satId];
  if (!sat) return null;

  const start = startDate || new Date();
  const positions: { lat: number; lng: number; alt: number; time: string }[] = [];

  try {
    const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);

    for (let m = -minutesAhead; m <= minutesAhead; m += stepMinutes) {
      const t = new Date(start.getTime() + m * 60 * 1000);
      const posVel = satellite.propagate(satrec, t);
      if (!posVel.position || typeof posVel.position === 'boolean') continue;

      const gmst = satellite.gstime(t);
      const geo = satellite.eciToGeodetic(posVel.position, gmst);

      positions.push({
        lat: satellite.degreesLat(geo.latitude),
        lng: satellite.degreesLong(geo.longitude),
        alt: geo.height,
        time: t.toISOString(),
      });
    }
  } catch {
    return null;
  }

  return { id: satId, name: sat.name, color: sat.color, positions };
}

/**
 * Compute all orbit paths for display.
 */
export function computeAllOrbits(minutesAhead: number = 90): OrbitPath[] {
  const paths: OrbitPath[] = [];
  for (const id of Object.keys(SATELLITE_TLES)) {
    try {
      const path = computeOrbitPath(id, minutesAhead);
      if (path && path.positions.length > 0) paths.push(path);
    } catch {
      // Skip individual satellite failures
    }
  }

  // Fallback: if satellite.js failed for all, generate simplified orbits
  if (paths.length === 0) {
    const now = new Date();
    for (const [id, sat] of Object.entries(SATELLITE_TLES)) {
      const positions: { lat: number; lng: number; alt: number; time: string }[] = [];
      const t0 = now.getTime() / 1000;
      const period = 100.6 * 60; // ~100 min orbital period
      const offset = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 0.1;

      for (let m = -minutesAhead; m <= minutesAhead; m += 1) {
        const ts = t0 + m * 60;
        const phase = (ts / period) * 2 * Math.PI + offset;
        const lat = 80 * Math.sin(phase);
        // Ground track shifts ~25° per orbit due to Earth rotation
        const lng = ((((ts / 240) + offset * 50) % 360) + 360) % 360 - 180;
        const alt = id.includes('SPOT') || id.includes('PLEIADES') ? 694 : 786;

        positions.push({
          lat: Math.max(-85, Math.min(85, lat)),
          lng,
          alt,
          time: new Date(now.getTime() + m * 60000).toISOString(),
        });
      }

      paths.push({ id, name: sat.name, color: sat.color, positions });
    }
  }

  return paths;
}

/**
 * Get the current imagery footprint (swath) for a satellite.
 */
export function getImageryFootprint(pos: SatellitePosition): ImageryFootprint {
  const halfSwath = pos.swathKm / 2;
  const R = 6371; // Earth radius km
  const dLat = (halfSwath / R) * (180 / Math.PI);
  const dLng = (halfSwath / (R * Math.cos(pos.lat * Math.PI / 180))) * (180 / Math.PI);

  // Simple rectangular footprint
  const polygon: [number, number][] = [
    [pos.lng - dLng, pos.lat - dLat],
    [pos.lng + dLng, pos.lat - dLat],
    [pos.lng + dLng, pos.lat + dLat],
    [pos.lng - dLng, pos.lat + dLat],
    [pos.lng - dLng, pos.lat - dLat],
  ];

  return {
    id: pos.id,
    name: pos.name,
    color: pos.color,
    swathKm: pos.swathKm,
    polygon,
  };
}

/**
 * Check if a satellite pass covers our area of interest.
 */
export function coversArea(
  pos: SatellitePosition,
  bounds = { south: 28.7, north: 34.3, west: -120.5, east: -115.0 },
): boolean {
  const halfSwath = pos.swathKm / 2;
  const R = 6371;
  const dLat = (halfSwath / R) * (180 / Math.PI);
  const dLng = (halfSwath / (R * Math.cos(pos.lat * Math.PI / 180))) * (180 / Math.PI);

  return (
    pos.lat + dLat >= bounds.south &&
    pos.lat - dLat <= bounds.north &&
    pos.lng + dLng >= bounds.west &&
    pos.lng - dLng <= bounds.east
  );
}

/**
 * Find next pass over our area for each satellite.
 */
export function findNextPasses(hoursAhead: number = 24): {
  satellite: string;
  name: string;
  provider: string;
  resolution: string;
  color: string;
  passTime: string;
  timeUntil: string;
  lat: number;
  lng: number;
  altitude: number;
}[] {
  const passes: any[] = [];
  const now = new Date();

  for (const [id, sat] of Object.entries(SATELLITE_TLES)) {
    // Check every 2 minutes for next hoursAhead hours
    for (let m = 0; m < hoursAhead * 60; m += 2) {
      const t = new Date(now.getTime() + m * 60 * 1000);
      const positions = getCurrentPositions(t);
      const pos = positions.find(p => p.id === id);
      if (pos && coversArea(pos)) {
        const diffMs = t.getTime() - now.getTime();
        const h = Math.floor(diffMs / 3600000);
        const min = Math.floor((diffMs % 3600000) / 60000);
        passes.push({
          satellite: id,
          name: sat.name,
          provider: sat.provider,
          resolution: sat.resolution,
          color: sat.color,
          passTime: t.toISOString(),
          timeUntil: h > 0 ? `${h}h ${min}m` : `${min}m`,
          lat: pos.lat,
          lng: pos.lng,
          altitude: pos.altitude,
        });
        break; // Only need the next pass per satellite
      }
    }
  }

  return passes.sort((a, b) => new Date(a.passTime).getTime() - new Date(b.passTime).getTime());
}

/**
 * Fallback positions when satellite.js isn't available (client-side).
 * Uses simplified orbital model.
 */
function getFallbackPositions(now: Date): SatellitePosition[] {
  const positions: SatellitePosition[] = [];
  const t = now.getTime() / 1000; // seconds since epoch

  for (const [id, sat] of Object.entries(SATELLITE_TLES)) {
    // Simplified orbit: period ~100 min, sun-sync at ~98.5° inclination
    const period = id.includes('TERRA') || id.includes('LANDSAT') ? 98.8 * 60 : 100.6 * 60;
    const phase = (t / period) * 2 * Math.PI;
    // Each satellite gets a different phase offset based on its name hash
    const offset = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 0.1;

    const lat = 80 * Math.sin(phase + offset); // ±80° latitude range
    const lng = ((((t / 240) + offset * 50) % 360) + 360) % 360 - 180; // ground track shifts
    const alt = id.includes('SPOT') || id.includes('PLEIADES') ? 694 : 786;

    positions.push({
      id,
      name: sat.name,
      provider: sat.provider,
      resolution: sat.resolution,
      swathKm: sat.swathKm,
      color: sat.color,
      type: sat.type,
      lat: Math.max(-80, Math.min(80, lat)),
      lng,
      altitude: alt,
      velocity: 7.5,
      timestamp: now.toISOString(),
    });
  }

  return positions;
}

export function getSatelliteCatalog() {
  return Object.entries(SATELLITE_TLES).map(([id, sat]) => ({
    id,
    ...sat,
  }));
}
