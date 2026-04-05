import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// DELETE /api/trip-watches/[tripId] — stop watching a trip
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { tripId } = await params;
  const decodedId = decodeURIComponent(tripId);

  const { error: dbError } = await supabase!
    .from('trip_watches')
    .delete()
    .eq('user_id', user!.id)
    .eq('trip_id', decodedId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
