import { NextResponse } from 'next/server';
import { predictPasses, getNextPassSummary } from '@/lib/ocean-data/satellite-passes';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL = 300_000; // 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') ?? '32.7');
    const lng = parseFloat(searchParams.get('lng') ?? '-117.5');
    const hours = parseInt(searchParams.get('hours') ?? '72', 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(hours)) {
      return NextResponse.json(
        { error: 'Invalid query parameters: lat, lng, and hours must be numbers' },
        { status: 400 },
      );
    }

    const cacheKey = `satellite-passes:${lat}:${lng}:${hours}`;
    const cached = cache.get<{
      passes: ReturnType<typeof predictPasses>;
      next: ReturnType<typeof getNextPassSummary>;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    const passes = predictPasses(lat, lng, hours);
    const next = getNextPassSummary(lat, lng);

    const result = { passes, next };
    cache.set(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ocean-data/satellite-passes]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
