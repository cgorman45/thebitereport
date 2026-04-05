import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: 'Supabase not configured',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only return positions updated within the last 10 minutes
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('fleet_positions')
      .select('mmsi, name, landing, lat, lng, speed, heading, course, updated_at')
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false });

    if (error) {
      return Response.json({
        connected: false,
        count: 0,
        positions: [],
        error: error.message,
      });
    }

    const positions = (data || []).map(row => ({
      mmsi: row.mmsi,
      name: row.name,
      landing: row.landing,
      lat: row.lat,
      lng: row.lng,
      sog: row.speed,
      cog: row.course,
      heading: row.heading,
      timestamp: new Date(row.updated_at).getTime(),
    }));

    return Response.json({
      connected: positions.length > 0,
      count: positions.length,
      positions,
    });
  } catch (err) {
    return Response.json({
      connected: false,
      count: 0,
      positions: [],
      error: String(err),
    });
  }
}
