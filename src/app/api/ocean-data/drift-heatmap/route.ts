import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { driftColormap } from '@/lib/ocean-data/colormap';
import { renderGridToPng } from '@/lib/ocean-data/tile-renderer';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:drift-heatmap';
const CACHE_TTL = 30 * 60_000; // 30 minutes

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=1800',
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
      .from('drift_predictions')
      .select('grid_data')
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return new Response(null, { status: 204 });
      }
      console.error('[ocean-data/drift-heatmap] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!data) {
      return new Response(null, { status: 204 });
    }

    const gridData = data.grid_data as { lat: number[]; lng: number[]; values: number[][] };
    const { values } = gridData;

    if (!values || values.length === 0) {
      return new Response(null, { status: 204 });
    }

    const maxValue = Math.max(1, ...values.flatMap((row) => row));

    const buf = await renderGridToPng(values, (v) => driftColormap(v / maxValue));
    const png: ArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    cache.set(CACHE_KEY, png, CACHE_TTL);

    return new Response(png, { headers: PNG_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/drift-heatmap]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
