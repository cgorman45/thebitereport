import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FLEET_ROSTER, PORTS } from '@/lib/fleet/boats';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:boat-kelp-signals';
const CACHE_TTL = 5 * 60_000; // 5 minutes

// Boats moving slower than this are potentially fishing (knots)
const FISHING_SPEED_MAX = 3.0;
// Minimum boats in a cluster to flag as probable kelp
const MIN_CLUSTER_BOATS = 2;
// Maximum distance between boats to be considered a cluster (meters)
// Also used as the circle radius for boat stop ground truth collection
const CLUSTER_RADIUS_M = 1000; // 1km
// Minimum distance from port to exclude docked boats (meters)
const MIN_PORT_DISTANCE_M = 3000; // 3km from any port

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isNearPort(lat: number, lng: number): boolean {
  for (const port of Object.values(PORTS)) {
    if (haversineDistance(lat, lng, port.lat, port.lng) < MIN_PORT_DISTANCE_M) {
      return true;
    }
  }
  return false;
}

interface FishingBoat {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  updated_at: string;
}

export async function GET() {
  try {
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all fleet positions
    const { data, error } = await supabase
      .from('fleet_positions')
      .select('mmsi, name, lat, lng, speed, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ type: 'FeatureCollection', features: [], signals: [] });
    }

    // Filter to boats that appear to be fishing in open water
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour

    const fishingBoats: FishingBoat[] = data.filter((pos) => {
      // Must have recent position
      const age = now - new Date(pos.updated_at).getTime();
      if (age > staleThreshold) return false;

      // Must be slow (fishing speed)
      if (pos.speed > FISHING_SPEED_MAX) return false;

      // Must NOT be near a port
      if (isNearPort(pos.lat, pos.lng)) return false;

      return true;
    });

    // Cluster fishing boats by proximity
    const assigned = new Set<number>();
    const clusters: FishingBoat[][] = [];

    for (let i = 0; i < fishingBoats.length; i++) {
      if (assigned.has(i)) continue;

      const cluster: FishingBoat[] = [fishingBoats[i]];
      assigned.add(i);

      for (let j = i + 1; j < fishingBoats.length; j++) {
        if (assigned.has(j)) continue;

        const dist = haversineDistance(
          fishingBoats[i].lat,
          fishingBoats[i].lng,
          fishingBoats[j].lat,
          fishingBoats[j].lng,
        );

        if (dist <= CLUSTER_RADIUS_M) {
          cluster.push(fishingBoats[j]);
          assigned.add(j);
        }
      }

      if (cluster.length >= MIN_CLUSTER_BOATS) {
        clusters.push(cluster);
      }
    }

    // Convert clusters to GeoJSON + signal objects
    const features: object[] = [];
    const signals: object[] = [];

    for (const cluster of clusters) {
      // Cluster centroid
      const avgLat = cluster.reduce((s, b) => s + b.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((s, b) => s + b.lng, 0) / cluster.length;

      // Confidence based on boat count
      const confidence = Math.min(0.95, 0.5 + cluster.length * 0.15);

      const boatNames = cluster.map((b) => b.name);

      const signal = {
        lat: avgLat,
        lng: avgLng,
        boat_count: cluster.length,
        boats: boatNames,
        confidence,
        detected_at: new Date().toISOString(),
        method: 'fleet_cluster',
      };

      signals.push(signal);

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [avgLng, avgLat] },
        properties: {
          boat_count: cluster.length,
          boats: boatNames.join(', '),
          confidence,
          method: 'fleet_cluster',
        },
      });
    }

    const result = {
      type: 'FeatureCollection',
      features,
      signals,
      meta: {
        fishing_boats: fishingBoats.length,
        clusters: clusters.length,
        timestamp: new Date().toISOString(),
      },
    };

    cache.set(CACHE_KEY, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
