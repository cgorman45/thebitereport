import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// GET /api/favorites — list user's boat favorites
export async function GET(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('boat_favorites')
    .select('id, boat_mmsi, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/favorites — add a boat to favorites
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { mmsi } = await req.json();
  if (typeof mmsi !== 'number') {
    return NextResponse.json({ error: 'mmsi must be a number' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('boat_favorites')
    .insert({ user_id: user!.id, boat_mmsi: mmsi })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Already favorited' }, { status: 409 });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
