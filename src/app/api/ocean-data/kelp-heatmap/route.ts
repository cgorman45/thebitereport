import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { kelpHeatmapColormap } from '@/lib/ocean-data/colormap';
import { renderGridToPng } from '@/lib/ocean-data/tile-renderer';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:kelp-heatmap';
const CACHE_TTL = 3600_000; // 1 hour

// Full SoCal + Baja California coverage (down to Cabo San Lucas)
const LAT_MIN = 22;
const LAT_MAX = 35;
const LNG_MIN = -121;
const LNG_MAX = -109;
const CELL_SIZE = 0.05; // degrees

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600',
} as const;

export async function GET() {
  try {
    const cached = cache.get<ArrayBuffer>(CACHE_KEY);
    if (cached) {
      return new Response(cached, { headers: PNG_HEADERS });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('kelp_detections')
      .select('lat, lng');

    if (error) {
      console.error('[ocean-data/kelp-heatmap] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const latCells = Math.ceil((LAT_MAX - LAT_MIN) / CELL_SIZE); // 60
    const lngCells = Math.ceil((LNG_MAX - LNG_MIN) / CELL_SIZE); // 80

    // Build 2D density grid [latIdx][lngIdx]
    const grid: number[][] = Array.from({ length: latCells }, () =>
      new Array(lngCells).fill(0),
    );

    if (data && data.length > 0) {
      for (const row of data) {
        const latIdx = Math.floor((row.lat - LAT_MIN) / CELL_SIZE);
        const lngIdx = Math.floor((row.lng - LNG_MIN) / CELL_SIZE);
        if (latIdx >= 0 && latIdx < latCells && lngIdx >= 0 && lngIdx < lngCells) {
          grid[latIdx][lngIdx] += 1;
        }
      }
    }

    const maxDensity = Math.max(1, ...grid.flatMap((row) => row));

    const buf = await renderGridToPng(grid, (v) => kelpHeatmapColormap(v, maxDensity));
    const png: ArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    cache.set(CACHE_KEY, png, CACHE_TTL);

    return new Response(png, { headers: PNG_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/kelp-heatmap]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
