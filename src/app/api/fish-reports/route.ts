import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

const SOCAL_LAT_MIN = 32;
const SOCAL_LAT_MAX = 35;
const SOCAL_LNG_MIN = -121;
const SOCAL_LNG_MAX = -117;

const VALID_QUANTITIES = ['few', 'some', 'lots', 'wide-open'] as const;

// GET /api/fish-reports — public, returns active fish reports from last 6 hours
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('fish_reports')
    .select(`
      id, user_id, lat, lng, species, quantity, bait, technique, description, photo_url,
      verification_count, status, created_at, expires_at,
      profiles!user_id ( display_name, avatar_key )
    `)
    .neq('status', 'expired')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/fish-reports — auth required
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const { lat, lng, species, quantity, bait, technique, description, photo_url } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 });
  }

  if (lat < SOCAL_LAT_MIN || lat > SOCAL_LAT_MAX || lng < SOCAL_LNG_MIN || lng > SOCAL_LNG_MAX) {
    return NextResponse.json(
      { error: 'Location must be within Southern California (lat 32–35, lng -121 to -117)' },
      { status: 400 },
    );
  }

  if (!species || typeof species !== 'string' || species.trim() === '') {
    return NextResponse.json({ error: 'species is required' }, { status: 400 });
  }

  if (!VALID_QUANTITIES.includes(quantity)) {
    return NextResponse.json(
      { error: 'quantity must be one of: few, some, lots, wide-open' },
      { status: 400 },
    );
  }

  const { data: report, error: insertError } = await supabase!
    .from('fish_reports')
    .insert({
      user_id: user!.id,
      lat,
      lng,
      species: species.trim(),
      quantity,
      bait: bait ?? null,
      technique: technique ?? null,
      description: description ?? null,
      photo_url: photo_url ?? null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(report, { status: 201 });
}
