import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// GET /api/trip-watches — list user's watched trips
export async function GET(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('trip_watches')
    .select('id, trip_id, boat_name, trip_date, created_at')
    .eq('user_id', user!.id)
    .order('trip_date', { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/trip-watches — watch a trip
export async function POST(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { tripId, boatName, tripDate } = await req.json();
  if (!tripId || !boatName || !tripDate) {
    return NextResponse.json({ error: 'tripId, boatName, and tripDate are required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase!
    .from('trip_watches')
    .insert({ user_id: user!.id, trip_id: tripId, boat_name: boatName, trip_date: tripDate })
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json({ error: 'Already watching this trip' }, { status: 409 });
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
