import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

const SOCAL_LAT_MIN = 32;
const SOCAL_LAT_MAX = 35;
const SOCAL_LNG_MIN = -121;
const SOCAL_LNG_MAX = -117;

// GET /api/kelp-sightings — public, returns non-expired sightings from last 48h
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('kelp_sightings')
    .select(`
      id, user_id, lat, lng, description, status, verification_count, created_at, expires_at,
      profiles!user_id ( display_name, avatar_key ),
      sighting_photos ( storage_path )
    `)
    .neq('status', 'expired')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sightings = (data ?? []).map((s: Record<string, unknown>) => {
    const photos = s.sighting_photos as Array<{ storage_path: string }> | null;
    return {
      ...s,
      sighting_photos: undefined,
      first_photo: photos?.[0]?.storage_path ?? null,
    };
  });

  return NextResponse.json(sightings);
}

// POST /api/kelp-sightings — auth required
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const { lat, lng, description } = body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 });
  }

  if (lat < SOCAL_LAT_MIN || lat > SOCAL_LAT_MAX || lng < SOCAL_LNG_MIN || lng > SOCAL_LNG_MAX) {
    return NextResponse.json(
      { error: 'Location must be within Southern California (lat 32–35, lng -121 to -117)' },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: sighting, error: insertError } = await supabase!
    .from('kelp_sightings')
    .insert({
      user_id: user!.id,
      lat,
      lng,
      description: description ?? null,
      status: 'pending',
      verification_count: 0,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Upsert user_contributions: +1 sightings_count, +5 contribution_score
  const { error: contribError } = await supabase!.rpc('upsert_user_contribution', {
    p_user_id: user!.id,
    p_sightings_delta: 1,
    p_verifications_delta: 0,
    p_photos_delta: 0,
    p_score_delta: 5,
  });

  // Fall back to manual upsert if RPC doesn't exist
  if (contribError) {
    await supabase!
      .from('user_contributions')
      .upsert(
        {
          user_id: user!.id,
          sightings_count: 1,
          verifications_count: 0,
          photos_count: 0,
          contribution_score: 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );
  }

  return NextResponse.json(sighting, { status: 201 });
}
