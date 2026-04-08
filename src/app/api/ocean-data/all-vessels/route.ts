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

    // Known cargo/tanker/cruise ship name patterns to exclude
    const CARGO_PATTERNS = [
      /^MSC\s/i, /^CMA\s*CGM/i, /^COSCO/i, /^OOCL/i, /^CSCL/i, /^ONE\s/i,
      /^HMM\s/i, /^EVERGREEN/i, /^MAERSK/i, /^HAPAG/i, /^ZIM\s/i, /^PIL\s/i,
      /^MATSON/i, /^APL\s/i, /^YANG\s*MING/i, /^MOL\s/i, /^NYK\s/i,
      /^HYUNDAI/i, /^HANJIN/i, /^KMTC/i, /^WAN\s*HAI/i, /^SITC/i,
      /TANKER/i, /CRUDE/i, /CHEMICAL/i, /LNG\s/i, /LPG\s/i,
      /LEADER$/i, /^ZAANDAM/i, /^CARNIVAL/i, /^PRINCESS/i, /^CELEBRITY/i,
      /^ROYAL\s*CARIBBEAN/i, /^NAVIGATOR/i, /^EXPLORER\s*OF/i,
      /^PILOT\s/i, /^TUG\s/i, /^DREDG/i, /^BARGE\s/i,
    ];

    // MMSI ranges that indicate non-fishing vessels
    // 2xxxxxxxx = coast stations, 97xxxxxxx = SAR aircraft
    // Fishing boats: typically 3xxxxxxxx (USA) or 345xxxxxx
    const isLikelyCargo = (name: string, mmsi: number): boolean => {
      // Check name patterns
      if (CARGO_PATTERNS.some(p => p.test(name))) return true;
      // Very large vessels (MMSI starting with certain country codes + large)
      // Skip for now — name-based filtering is more reliable
      return false;
    };

    // Convert to GeoJSON, filtering out cargo/tankers/cruise ships
    const features = positions
      .filter((p: { mmsi: number; name: string }) => !isLikelyCargo(p.name, p.mmsi))
      .map((p: {
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
