import { createClient } from '@supabase/supabase-js';
import { FLEET_ROSTER, PORTS } from '@/lib/fleet/boats';

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

    // Fetch ALL known positions (no time cutoff — show last known position)
    const { data, error } = await supabase
      .from('fleet_positions')
      .select('mmsi, name, landing, lat, lng, speed, heading, course, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return Response.json({
        connected: false,
        count: 0,
        positions: [],
        error: error.message,
      });
    }

    // Build a set of MMSIs that have AIS positions
    const aisPositions = new Map(
      (data || []).map(row => [row.mmsi, row])
    );

    const now = Date.now();
    const positions = [];

    // Include every fleet roster boat (AIS data or home port fallback)
    for (const boat of FLEET_ROSTER) {
      if (boat.mmsi === 0) continue; // Skip boats without MMSI (no AIS)

      const ais = aisPositions.get(boat.mmsi);

      if (ais) {
        // Has AIS data — use it
        positions.push({
          mmsi: ais.mmsi,
          name: boat.name, // Use roster name (cleaner than AIS uppercase)
          landing: ais.landing,
          lat: ais.lat,
          lng: ais.lng,
          sog: ais.speed,
          cog: ais.course,
          heading: ais.heading,
          timestamp: new Date(ais.updated_at).getTime(),
        });
      } else {
        // No AIS data — place at home port
        const port = PORTS[boat.landing];
        if (!port) continue;

        positions.push({
          mmsi: boat.mmsi,
          name: boat.name,
          landing: boat.landing,
          lat: port.lat,
          lng: port.lng,
          sog: 0,
          cog: 0,
          heading: 0,
          timestamp: now, // Mark as current so it doesn't get pruned
        });
      }
    }

    return Response.json({
      connected: true,
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
