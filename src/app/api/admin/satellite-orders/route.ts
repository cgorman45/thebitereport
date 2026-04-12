import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/admin/satellite-orders
 * List all satellite orders with optional filtering.
 * Query params: status, tier, limit, offset
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const sb = getSupabase();
  let query = sb.from('satellite_orders').select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (tier) query = query.eq('tier', tier);

  const { data, error, count } = await query
    .order('ordered_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ orders: data || [], total: count || 0 });
}
