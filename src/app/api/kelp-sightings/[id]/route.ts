import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/kelp-sightings/[id] — public
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('kelp_sightings')
    .select(`
      id, user_id, lat, lng, description, status, verification_count, created_at, expires_at,
      profiles!user_id ( display_name, avatar_key ),
      sighting_photos ( id, storage_path, media_type, created_at ),
      sighting_verifications ( id )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Sighting not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verifications = data.sighting_verifications as Array<unknown> | null;

  return NextResponse.json({
    ...data,
    sighting_verifications: undefined,
    verification_count: verifications?.length ?? data.verification_count ?? 0,
  });
}
