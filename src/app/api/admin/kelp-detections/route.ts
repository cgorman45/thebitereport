import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/supabase/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const { user, error } = await getAuthUser(req);
  if (error) return { error };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user!.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: user!, supabase };
}

export async function GET(req: NextRequest) {
  // TODO: restore admin check after testing
  // const auth = await requireAdmin(req);
  // if (auth.error) return auth.error;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const auth = { supabase };

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // pending | approved | rejected
  const sort = searchParams.get('sort') || 'date'; // date | confidence
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  let query = auth.supabase!
    .from('kelp_detections')
    .select('id, scene_id, detected_at, lat, lng, area_m2, confidence, method, indices, thumbnail_b64, status, reviewed_at, review_notes', { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (sort === 'confidence') {
    query = query.order('confidence', { ascending: false });
  } else {
    query = query.order('detected_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    detections: data || [],
    total: count || 0,
    page,
    limit,
  });
}
