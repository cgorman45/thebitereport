import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLUSTER_RADIUS_M = 1000; // 1km circle
const LOOKBACK_HOURS = 48;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Generate a GeoJSON circle polygon (approximation with 36 points).
 */
function createCircle(lat: number, lng: number, radiusM: number): number[][] {
  const points: number[][] = [];
  const R = 6371000;
  for (let i = 0; i <= 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const dLat = (radiusM * Math.cos(angle)) / R * (180 / Math.PI);
    const dLng = (radiusM * Math.sin(angle)) / (R * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
    points.push([lng + dLng, lat + dLat]);
  }
  return points;
}

interface StopRecord {
  id: string;
  mmsi: number;
  boat_name: string;
  lat: number;
  lng: number;
  stopped_at: string;
  duration_minutes: number | null;
  confirmed: boolean;
  confirming_boat: string | null;
  satellite_requested: boolean;
}

interface ScoredZone {
  id: string;
  lat: number;
  lng: number;
  score: number;
  boat_count: number;
  boats: { name: string; mmsi: number; duration: number; stopped_at: string }[];
  max_duration: number;
  confirmed: boolean;
  satellite_requested: boolean;
  satellite_action: 'none' | 'medium-res' | 'high-res';
}

/**
 * Score a stop based on duration.
 */
function durationScore(minutes: number): number {
  if (minutes >= 20) return 3;
  if (minutes >= 10) return 2;
  if (minutes >= 5) return 1;
  return 0;
}

/**
 * GET /api/demo/kelp-scores
 *
 * Computes kelp paddy probability scores from boat_stops data.
 * Groups overlapping stops into scored zones with 1km circle geometry.
 *
 * Scoring:
 *   Base: duration score per boat (5-10min=1, 10-20min=2, 20+min=3)
 *   Multi-boat bonus: +3 per additional boat within 1km
 *   Score ≥5: medium confidence (request medium-res satellite)
 *   Score ≥7: high confidence (request high-res satellite)
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    const { data: stops, error } = await supabase
      .from('boat_stops')
      .select('id, mmsi, boat_name, lat, lng, stopped_at, duration_minutes, confirmed, confirming_boat, satellite_requested')
      .gte('stopped_at', since)
      .order('stopped_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!stops || stops.length === 0) {
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        zones: [],
        meta: { total_stops: 0, scored_zones: 0, high_confidence: 0 },
      });
    }

    // Cluster stops within 1km of each other into zones
    const assigned = new Set<number>();
    const zones: ScoredZone[] = [];

    for (let i = 0; i < stops.length; i++) {
      if (assigned.has(i)) continue;

      const cluster: StopRecord[] = [stops[i]];
      assigned.add(i);

      // Check ALL stops against ANY member of the cluster (not just the first)
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < stops.length; j++) {
          if (assigned.has(j)) continue;
          // Check distance to every boat already in the cluster
          const nearCluster = cluster.some(c =>
            haversine(c.lat, c.lng, stops[j].lat, stops[j].lng) <= CLUSTER_RADIUS_M
          );
          if (nearCluster) {
            cluster.push(stops[j]);
            assigned.add(j);
            changed = true;
          }
        }
      }

      // Calculate zone centroid
      const avgLat = cluster.reduce((s, c) => s + c.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((s, c) => s + c.lng, 0) / cluster.length;

      // Unique boats in this zone
      const uniqueBoats = new Map<number, { name: string; mmsi: number; duration: number; stopped_at: string }>();
      for (const stop of cluster) {
        const existing = uniqueBoats.get(stop.mmsi);
        const dur = stop.duration_minutes || 0;
        if (!existing || dur > existing.duration) {
          uniqueBoats.set(stop.mmsi, {
            name: stop.boat_name,
            mmsi: stop.mmsi,
            duration: dur,
            stopped_at: stop.stopped_at,
          });
        }
      }

      const boats = Array.from(uniqueBoats.values());
      const boatCount = boats.length;

      // Score calculation
      const maxDuration = Math.max(...boats.map(b => b.duration));
      const baseDurScore = durationScore(maxDuration);
      const multiBoatBonus = Math.max(0, boatCount - 1) * 3;
      const totalScore = baseDurScore + multiBoatBonus;

      // Satellite action
      let satelliteAction: 'none' | 'medium-res' | 'high-res' = 'none';
      if (totalScore >= 7) satelliteAction = 'high-res';
      else if (totalScore >= 5) satelliteAction = 'medium-res';

      const isConfirmed = cluster.some(s => s.confirmed);
      const satRequested = cluster.some(s => s.satellite_requested);

      zones.push({
        id: cluster[0].id,
        lat: avgLat,
        lng: avgLng,
        score: totalScore,
        boat_count: boatCount,
        boats,
        max_duration: maxDuration,
        confirmed: isConfirmed,
        satellite_requested: satRequested,
        satellite_action: satelliteAction,
      });
    }

    // Sort by score descending
    zones.sort((a, b) => b.score - a.score);

    // Build GeoJSON features with 1km circle polygons
    const features = zones.map(zone => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [createCircle(zone.lat, zone.lng, CLUSTER_RADIUS_M)],
      },
      properties: {
        id: zone.id,
        score: zone.score,
        boat_count: zone.boat_count,
        boats: zone.boats.map(b => b.name).join(', '),
        max_duration: zone.max_duration,
        confirmed: zone.confirmed,
        satellite_requested: zone.satellite_requested,
        satellite_action: zone.satellite_action,
        // Color based on score
        fill_color: zone.score >= 7 ? '#ef4444' : zone.score >= 5 ? '#eab308' : zone.score >= 3 ? '#f97316' : '#8899aa',
        fill_opacity: Math.min(0.6, 0.15 + zone.score * 0.06),
      },
    }));

    // Also add center points for labels
    const centerPoints = zones.map(zone => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [zone.lng, zone.lat],
      },
      properties: {
        score: zone.score,
        boat_count: zone.boat_count,
        label: `${zone.score}`,
      },
    }));

    return NextResponse.json({
      type: 'FeatureCollection',
      features: [...features, ...centerPoints],
      zones,
      meta: {
        total_stops: stops.length,
        scored_zones: zones.length,
        high_confidence: zones.filter(z => z.score >= 7).length,
        medium_confidence: zones.filter(z => z.score >= 5 && z.score < 7).length,
        satellite_queued: zones.filter(z => z.satellite_action !== 'none').length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
