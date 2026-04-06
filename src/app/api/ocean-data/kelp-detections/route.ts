import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:kelp-detections';
const CACHE_TTL = 15 * 60_000; // 15 minutes

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minConfidence = parseFloat(searchParams.get('min_confidence') ?? '0');
    const cacheKey = `${CACHE_KEY}:${minConfidence}`;

    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let query = supabase
      .from('kelp_detections')
      .select('lat, lng, confidence, area_m2, method, detected_at, indices');

    if (!isNaN(minConfidence) && minConfidence > 0) {
      query = query.gte('confidence', minConfidence);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ocean-data/kelp-detections] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(EMPTY_FC);
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features: data.map((row) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lng, row.lat],
        },
        properties: {
          confidence: row.confidence,
          area_m2: row.area_m2,
          method: row.method,
          detected_at: row.detected_at,
          indices: row.indices,
        },
      })),
    };

    cache.set(cacheKey, featureCollection, CACHE_TTL);

    return NextResponse.json(featureCollection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/kelp-detections]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
