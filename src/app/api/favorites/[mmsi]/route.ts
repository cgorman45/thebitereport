import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// DELETE /api/favorites/[mmsi] — remove a boat from favorites
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mmsi: string }> }
) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { mmsi } = await params;
  const mmsiNum = parseInt(mmsi, 10);
  if (isNaN(mmsiNum)) {
    return NextResponse.json({ error: 'Invalid MMSI' }, { status: 400 });
  }

  const { error: dbError } = await supabase!
    .from('boat_favorites')
    .delete()
    .eq('user_id', user!.id)
    .eq('boat_mmsi', mmsiNum);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
