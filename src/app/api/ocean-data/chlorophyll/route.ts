import { NextResponse } from 'next/server';
import { fetchGrid } from '@/lib/ocean-data/erddap';
import { chlorophyllColormap } from '@/lib/ocean-data/colormap';
import { renderGridToPng } from '@/lib/ocean-data/tile-renderer';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:chlorophyll';
const CACHE_TTL = 3600_000; // 1 hour

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600',
} as const;

export async function GET() {
  try {
    const cached = cache.get<{ png: ArrayBuffer; timestamp: string }>(CACHE_KEY);
    if (cached) {
      return new Response(cached.png, {
        headers: { ...PNG_HEADERS, 'X-Data-Timestamp': cached.timestamp },
      });
    }

    const grid = await fetchGrid('nesdisVHNSQchlaDaily', 'chlor_a');
    const buf = await renderGridToPng(grid.values, chlorophyllColormap);
    const png: ArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    cache.set(CACHE_KEY, { png, timestamp: grid.timestamp }, CACHE_TTL);

    return new Response(png, {
      headers: { ...PNG_HEADERS, 'X-Data-Timestamp': grid.timestamp },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/chlorophyll]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
