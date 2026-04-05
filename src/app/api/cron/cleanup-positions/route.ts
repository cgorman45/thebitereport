export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/cron/cleanup-positions
 *
 * Nightly cron job that deletes positions and trips older than 7 days.
 * Calls the Postgres function created in migration 003_trip_history.sql.
 *
 * Vercel cron schedule: "0 7 * * *" (7 AM UTC daily)
 * Protected by CRON_SECRET header check.
 */
export async function GET(request: Request) {
  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc('cleanup_old_positions');

    if (error) {
      console.error('[Cleanup] Failed:', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[Cleanup] Complete:', data);
    return Response.json({ ok: true, result: data });
  } catch (err) {
    console.error('[Cleanup] Error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
