import { NextResponse } from 'next/server';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:all-vessels';
const CACHE_TTL = 30_000; // 30 seconds — near real-time

/**
 * GET /api/ocean-data/all-vessels
 *
 * Returns ALL vessels from the AIS collector, not just the fleet roster.
 * This captures private sportfishers, pleasure boats, and other vessels
 * that might indicate kelp paddy activity.
 *
 * Fetches directly from the AIS collector server (ais-server).
 */
export async function GET() {
  try {
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    const collectorUrl = process.env.AIS_COLLECTOR_URL || 'http://localhost:3001';

    const res = await fetch(`${collectorUrl}/positions`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        meta: { error: `AIS collector ${res.status}`, connected: false },
      });
    }

    const data = await res.json();
    const positions = data.positions || [];

    // Convert to GeoJSON
    const features = positions.map((p: {
      mmsi: number;
      name: string;
      lat: number;
      lng: number;
      sog: number;
      cog: number;
      heading: number;
      timestamp: number;
    }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        mmsi: p.mmsi,
        name: p.name,
        speed: p.sog,
        heading: p.heading,
        course: p.cog,
        age_sec: Math.round((Date.now() - p.timestamp) / 1000),
        // Classify vessel activity
        status: p.sog < 1.5 ? 'stopped' : p.sog < 5 ? 'slow' : 'transit',
      },
    }));

    const stopped = features.filter((f: { properties: { status: string } }) => f.properties.status === 'stopped');
    const slow = features.filter((f: { properties: { status: string } }) => f.properties.status === 'slow');

    const result = {
      type: 'FeatureCollection',
      features,
      meta: {
        connected: data.connected,
        total_vessels: features.length,
        stopped: stopped.length,
        slow_fishing: slow.length,
        transit: features.length - stopped.length - slow.length,
        source: 'aisstream.io (live)',
      },
    };

    cache.set(CACHE_KEY, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      meta: { error: msg, connected: false },
    });
  }
}
