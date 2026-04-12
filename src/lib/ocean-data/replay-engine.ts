/**
 * 4D Replay Engine
 *
 * Handles smooth vessel animation, AI pattern detection,
 * and event narration for the Fishing Intelligence 4D globe.
 *
 * Core capabilities:
 * - Smooth 60fps vessel interpolation between AIS snapshots
 * - Auto-detect convergence hotspots (3+ boats within 1km)
 * - Generate event narratives for hotspots
 * - Camera auto-tracking to follow action
 */

export interface VesselState {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}

export interface Snapshot {
  timestamp: string;
  vessels: VesselState[];
}

export interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  firstSeen: string;
  lastSeen: string;
  durationMinutes: number;
  vessels: { mmsi: number; name: string; maxDuration: number }[];
  boatCount: number;
  score: number; // 0-10 confidence
  narrative: string;
  type: 'convergence' | 'stop' | 'circling';
}

export interface InterpolatedFrame {
  timestamp: string;
  progress: number; // 0-1 between snapshots
  vessels: (VesselState & { interpolated: boolean })[];
  hotspots: Hotspot[];
}

// Haversine distance in km
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Interpolate vessel positions between two snapshots.
 */
export function interpolateFrame(
  snapA: Snapshot,
  snapB: Snapshot,
  progress: number, // 0-1
): VesselState[] {
  const result: (VesselState & { interpolated: boolean })[] = [];

  for (const vA of snapA.vessels) {
    const vB = snapB.vessels.find(v => v.mmsi === vA.mmsi);

    if (vB) {
      // Smooth interpolation
      result.push({
        mmsi: vA.mmsi,
        name: vA.name,
        lat: vA.lat + (vB.lat - vA.lat) * progress,
        lng: vA.lng + (vB.lng - vA.lng) * progress,
        speed: vA.speed + (vB.speed - vA.speed) * progress,
        heading: interpolateAngle(vA.heading, vB.heading, progress),
        interpolated: true,
      });
    } else {
      // Vessel only in first snapshot — fade out
      result.push({ ...vA, interpolated: false });
    }
  }

  // Vessels only in second snapshot — fade in
  for (const vB of snapB.vessels) {
    if (!snapA.vessels.find(v => v.mmsi === vB.mmsi)) {
      result.push({ ...vB, interpolated: false });
    }
  }

  return result;
}

function interpolateAngle(a: number, b: number, t: number): number {
  // Handle 360° wrapping
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

// Known port/harbor locations — vessels near these are parked, not fishing
const HARBORS = [
  { lat: 32.715, lng: -117.175, radiusKm: 3, name: 'San Diego Harbor' },
  { lat: 32.755, lng: -117.235, name: 'Mission Bay', radiusKm: 2 },
  { lat: 32.850, lng: -117.255, name: 'La Jolla Shore', radiusKm: 1 },
  { lat: 33.460, lng: -117.620, name: 'Dana Point', radiusKm: 1.5 },
  { lat: 33.750, lng: -118.280, name: 'Long Beach/LA Harbor', radiusKm: 5 },
  { lat: 33.600, lng: -117.900, name: 'Newport/Huntington', radiusKm: 2 },
  { lat: 33.725, lng: -118.270, name: 'San Pedro', radiusKm: 3 },
  { lat: 33.210, lng: -117.395, name: 'Oceanside Harbor', radiusKm: 1.5 },
  { lat: 34.410, lng: -119.690, name: 'Santa Barbara', radiusKm: 2 },
  { lat: 34.170, lng: -119.225, name: 'Ventura Harbor', radiusKm: 1.5 },
  { lat: 33.340, lng: -118.330, name: 'Avalon/Catalina', radiusKm: 1 },
  { lat: 31.870, lng: -116.625, name: 'Ensenada Harbor', radiusKm: 2 },
  { lat: 32.430, lng: -117.245, name: 'Coronado Cays', radiusKm: 1 },
];

function isInHarbor(lat: number, lng: number): boolean {
  for (const h of HARBORS) {
    if (distKm(lat, lng, h.lat, h.lng) < h.radiusKm) return true;
  }
  return false;
}

/**
 * Detect convergence hotspots in a sequence of snapshots.
 * Finds locations where 3+ vessels stop/slow within 1km of each other.
 * Excludes harbor/port areas — only detects open ocean convergence.
 */
export function detectHotspots(
  snapshots: Snapshot[],
  radiusKm: number = 1.5,
  minBoats: number = 3,
  minSpeedKts: number = 3,
): Hotspot[] {
  const hotspotMap = new Map<string, {
    lat: number; lng: number;
    firstIdx: number; lastIdx: number;
    vessels: Map<number, { name: string; count: number }>;
  }>();

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    // Find slow/stopped vessels that are NOT in a harbor
    const slowVessels = snap.vessels.filter(v => v.speed < minSpeedKts && !isInHarbor(v.lat, v.lng));

    // Cluster slow vessels within radius
    const assigned = new Set<number>();

    for (const v of slowVessels) {
      if (assigned.has(v.mmsi)) continue;

      const cluster = [v];
      assigned.add(v.mmsi);

      for (const other of slowVessels) {
        if (assigned.has(other.mmsi)) continue;
        if (distKm(v.lat, v.lng, other.lat, other.lng) <= radiusKm) {
          cluster.push(other);
          assigned.add(other.mmsi);
        }
      }

      if (cluster.length >= minBoats) {
        // Calculate centroid
        const cLat = cluster.reduce((s, c) => s + c.lat, 0) / cluster.length;
        const cLng = cluster.reduce((s, c) => s + c.lng, 0) / cluster.length;

        // Find or create hotspot at this location
        const key = `${Math.round(cLat * 100)}_${Math.round(cLng * 100)}`;
        const existing = hotspotMap.get(key);

        if (existing) {
          existing.lastIdx = i;
          for (const c of cluster) {
            const e = existing.vessels.get(c.mmsi);
            if (e) e.count++;
            else existing.vessels.set(c.mmsi, { name: c.name, count: 1 });
          }
        } else {
          const vessels = new Map<number, { name: string; count: number }>();
          for (const c of cluster) vessels.set(c.mmsi, { name: c.name, count: 1 });
          hotspotMap.set(key, { lat: cLat, lng: cLng, firstIdx: i, lastIdx: i, vessels });
        }
      }
    }
  }

  // Convert to Hotspot objects
  const hotspots: Hotspot[] = [];

  for (const [key, hs] of hotspotMap) {
    const firstTime = new Date(snapshots[hs.firstIdx].timestamp);
    const lastTime = new Date(snapshots[hs.lastIdx].timestamp);
    const durationMin = (lastTime.getTime() - firstTime.getTime()) / 60000;
    const vessels = Array.from(hs.vessels.entries()).map(([mmsi, v]) => ({
      mmsi, name: v.name, maxDuration: v.count * 5, // ~5min per snapshot
    }));

    const boatCount = vessels.length;
    const score = Math.min(10, Math.round(boatCount * 2 + durationMin / 15));

    // Generate narrative
    const boatNames = vessels.slice(0, 3).map(v => v.name).join(', ');
    const moreBoats = vessels.length > 3 ? ` and ${vessels.length - 3} more` : '';
    const narrative = `${boatCount} vessels converged at ${hs.lat.toFixed(3)}°N, ${Math.abs(hs.lng).toFixed(3)}°W. ` +
      `${boatNames}${moreBoats} stopped/slowed for ~${Math.round(durationMin)} minutes. ` +
      `Confidence: ${score}/10. ${score >= 7 ? 'HIGH — likely kelp paddy or bait school.' : score >= 4 ? 'MEDIUM — possible fishing activity.' : 'LOW — brief convergence.'}`;

    hotspots.push({
      id: key,
      lat: hs.lat,
      lng: hs.lng,
      firstSeen: firstTime.toISOString(),
      lastSeen: lastTime.toISOString(),
      durationMinutes: durationMin,
      vessels,
      boatCount,
      score,
      narrative,
      type: 'convergence',
    });
  }

  // Final filter: remove any hotspot centroid that's still in a harbor
  return hotspots
    .filter(hs => !isInHarbor(hs.lat, hs.lng))
    .sort((a, b) => b.score - a.score);
}

/**
 * Generate a timeline narration for a replay session.
 */
export function generateReplayNarration(
  snapshots: Snapshot[],
  hotspots: Hotspot[],
): string[] {
  const events: string[] = [];

  if (snapshots.length > 0) {
    const start = new Date(snapshots[0].timestamp);
    const end = new Date(snapshots[snapshots.length - 1].timestamp);
    const hours = Math.round((end.getTime() - start.getTime()) / 3600000);
    const totalVessels = new Set(snapshots.flatMap(s => s.vessels.map(v => v.mmsi))).size;

    events.push(`REPLAY: ${hours}h of vessel activity. ${totalVessels} unique vessels tracked.`);
  }

  for (const hs of hotspots.slice(0, 5)) {
    events.push(`HOTSPOT DETECTED: ${hs.narrative}`);
  }

  return events;
}
