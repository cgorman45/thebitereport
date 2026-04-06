import { NextResponse } from 'next/server';
import { fetchGrid } from '@/lib/ocean-data/erddap';
import { extractBreaks } from '@/lib/ocean-data/gradient';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:breaks';
const CACHE_TTL = 3600_000;

export async function GET() {
  try {
    const cached = cache.get<{ geojson: GeoJSON.FeatureCollection; timestamp: string }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached.geojson, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'X-Data-Timestamp': cached.timestamp,
        },
      });
    }

    const grid = await fetchGrid('jplMURSST41', 'analysed_sst');
    const geojson = extractBreaks(grid, 0.5);

    cache.set(CACHE_KEY, { geojson, timestamp: grid.timestamp }, CACHE_TTL);

    return NextResponse.json(geojson, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Data-Timestamp': grid.timestamp,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/breaks]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
