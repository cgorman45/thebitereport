import { NextResponse } from 'next/server';
import { scrape976Tuna } from '@/lib/scraper/parsers/tuna976';
import { withCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await withCache(
      'catch-reports:976tuna',
      3600,
      () => scrape976Tuna(),
    );
    return NextResponse.json(reports);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/catch-reports] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
