import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ocean-data/boat-stops
 *
 * Returns confirmed boat stops (kelp paddy ground truth signals).
 * Query params:
 *   confirmed=true — only confirmed stops (default)
 *   days=7 — lookback period
 *   limit=50 — max results
 */
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const confirmedOnly = searchParams.get('confirmed') !== 'false';
  const days = parseInt(searchParams.get('days') || '7');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('boat_stops')
    .select('id, mmsi, boat_name, lat, lng, stopped_at, duration_minutes, confirmed, confirmed_at, confirming_boat, satellite_requested, satellite_scene_id')
    .gte('stopped_at', since)
    .order('stopped_at', { ascending: false })
    .limit(limit);

  if (confirmedOnly) {
    query = query.eq('confirmed', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  // Convert to GeoJSON for map display
  const features = (data || []).map((stop) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
    properties: {
      boat_name: stop.boat_name,
      stopped_at: stop.stopped_at,
      confirmed: stop.confirmed,
      confirming_boat: stop.confirming_boat,
      satellite_requested: stop.satellite_requested,
    },
  }));

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
    meta: {
      total: data?.length || 0,
      confirmed: data?.filter((s) => s.confirmed).length || 0,
      since,
    },
  });
}
