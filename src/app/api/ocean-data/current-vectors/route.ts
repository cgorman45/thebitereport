import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'ocean:current-vectors';
const CACHE_TTL = 30 * 60_000; // 30 minutes

const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] };

export async function GET() {
  try {
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('current_vectors')
      .select('vectors')
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json(EMPTY_FEATURE_COLLECTION);
      }
      console.error('[ocean-data/current-vectors] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    if (!data) {
      return NextResponse.json(EMPTY_FEATURE_COLLECTION);
    }

    const vectors = data.vectors as object;
    cache.set(CACHE_KEY, vectors, CACHE_TTL);

    return NextResponse.json(vectors);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/current-vectors]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
