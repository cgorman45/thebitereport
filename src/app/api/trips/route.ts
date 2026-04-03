import { NextResponse } from 'next/server';
import { scrapeFishingReservations } from '@/lib/scraper/parsers/fishing-reservations';
import { withCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trips = await withCache(
      'trips:fishing-reservations',
      3600,
      () => scrapeFishingReservations(),
    );
    return NextResponse.json(trips);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/trips] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
