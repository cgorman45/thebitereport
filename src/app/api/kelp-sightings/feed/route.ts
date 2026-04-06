import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/kelp-sightings/feed — public, paginated feed with optional status filter
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
  const statusFilter = searchParams.get('status');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const offset = (page - 1) * limit;

  let query = supabase
    .from('kelp_sightings')
    .select(
      `
      id, user_id, lat, lng, description, status, verification_count, created_at, expires_at,
      profiles!user_id ( display_name, avatar_key ),
      sighting_photos ( id, storage_path, media_type, created_at )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sightings: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
