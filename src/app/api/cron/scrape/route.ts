import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllSources } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

// Vercel cron jobs use GET requests.
export async function GET(request: NextRequest) {
  // ---------------------------------------------------------------------------
  // Auth check via CRON_SECRET env var.
  // Vercel passes the secret as a Bearer token when the cron is configured
  // with the CRON_SECRET environment variable.
  // ---------------------------------------------------------------------------
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/scrape] CRON_SECRET is not configured — rejecting request');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (token !== cronSecret) {
    console.warn('[cron/scrape] Unauthorized request — invalid or missing CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---------------------------------------------------------------------------
  // Run scraper
  // ---------------------------------------------------------------------------
  console.log('[cron/scrape] Starting scrape run…');
  const startedAt = Date.now();

  try {
    const reports = await scrapeAllSources();

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[cron/scrape] Scrape complete: ${reports.length} reports in ${elapsedMs}ms`,
    );

    // TODO: persist `reports` to Supabase once the integration is wired up.
    // Example:
    //   const { error } = await supabase.from('catch_reports').upsert(reports);

    // Process trip watch notifications (dynamic import to avoid build-time Supabase init)
    let alertResult = { processed: 0, alerts: 0 };
    try {
      const { scrapeFishingReservations } = await import('@/lib/scraper/parsers/fishing-reservations');
      const { processTripWatchAlerts } = await import('@/lib/notifications/trip-alerts');
      const liveTrips = await scrapeFishingReservations();
      alertResult = await processTripWatchAlerts(liveTrips);
    } catch (e) {
      console.error('[cron/scrape] Trip alert processing failed:', e);
    }

    return NextResponse.json({
      ok: true,
      count: reports.length,
      alerts: alertResult.alerts,
      watchesProcessed: alertResult.processed,
      elapsedMs,
      reports,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/scrape] Unhandled error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
