import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// POST /api/kelp-sightings/[id]/verify — auth required, toggles verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sightingId } = await params;
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  // Check if user already verified this sighting
  const { data: existing, error: checkError } = await supabase!
    .from('sighting_verifications')
    .select('id')
    .eq('sighting_id', sightingId)
    .eq('user_id', user!.id)
    .maybeSingle();

  if (checkError) return NextResponse.json({ error: checkError.message }, { status: 500 });

  let verified: boolean;

  if (existing) {
    // Toggle off — remove verification
    const { error: deleteError } = await supabase!
      .from('sighting_verifications')
      .delete()
      .eq('id', existing.id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    verified = false;

    // Decrement user contributions
    await supabase!
      .from('user_contributions')
      .upsert(
        {
          user_id: user!.id,
          sightings_count: 0,
          verifications_count: -1,
          photos_count: 0,
          contribution_score: -1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );
  } else {
    // Toggle on — insert verification
    const { error: insertError } = await supabase!
      .from('sighting_verifications')
      .insert({ sighting_id: sightingId, user_id: user!.id });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    verified = true;

    // Increment user contributions
    await supabase!
      .from('user_contributions')
      .upsert(
        {
          user_id: user!.id,
          sightings_count: 0,
          verifications_count: 1,
          photos_count: 0,
          contribution_score: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );
  }

  // Fetch current verification count from the sighting (trigger may have updated it)
  const { data: sighting, error: fetchError } = await supabase!
    .from('kelp_sightings')
    .select('verification_count')
    .eq('id', sightingId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json({
    verified,
    verification_count: sighting.verification_count,
  });
}
