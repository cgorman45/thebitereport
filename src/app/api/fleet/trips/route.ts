export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getFleetBoat } from '@/lib/fleet/boats';
import { withCache } from '@/lib/cache';

/**
 * GET /api/fleet/trips?mmsi=367703230&limit=1
 *
 * Returns the last N trips for a boat, including the route positions
 * and current real-time position (from the AIS collector).
 *
 * Response:
 * {
 *   boat: { name, mmsi, landing, vesselType, photo },
 *   currentPosition: { lat, lng, speed, heading, timestamp } | null,
 *   trips: [
 *     {
 *       id, startedAt, endedAt, duration, pointCount,
 *       positions: [{ lat, lng, speed, heading, recordedAt }]
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mmsiStr = searchParams.get('mmsi');
  const limitStr = searchParams.get('limit');

  if (!mmsiStr) {
    return Response.json({ error: 'mmsi parameter required' }, { status: 400 });
  }

  const mmsi = parseInt(mmsiStr, 10);
  if (isNaN(mmsi)) {
    return Response.json({ error: 'Invalid mmsi' }, { status: 400 });
  }

  const limit = Math.min(parseInt(limitStr || '1', 10) || 1, 10);

  // Look up boat metadata from fleet roster
  const fleetBoat = getFleetBoat(mmsi);
  const boat = fleetBoat
    ? {
        name: fleetBoat.name,
        mmsi: fleetBoat.mmsi,
        landing: fleetBoat.landing,
        vesselType: fleetBoat.vesselType || null,
        photo: fleetBoat.photo ? `/boats/${fleetBoat.photo}.jpg` : null,
      }
    : { name: `Vessel ${mmsi}`, mmsi, landing: 'unknown', vesselType: null, photo: null };

  // Fetch current position from AIS collector
  const currentPosition = await getCurrentPosition(mmsi);

  // Fetch trips from Supabase (cached 60s)
  const trips = await withCache(
    `fleet-trips:${mmsi}:${limit}`,
    60,
    () => fetchTrips(mmsi, limit),
  );

  return Response.json({ boat, currentPosition, trips });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentPosition(mmsi: number) {
  try {
    const collectorUrl = process.env.AIS_COLLECTOR_URL;
    if (!collectorUrl) return null;

    const res = await fetch(`${collectorUrl}/positions`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pos = data.positions?.find(
      (p: { mmsi: number }) => p.mmsi === mmsi,
    );
    if (!pos) return null;

    return {
      lat: pos.lat,
      lng: pos.lng,
      speed: pos.sog ?? pos.speed ?? 0,
      heading: pos.heading ?? pos.cog ?? 0,
      timestamp: pos.timestamp,
    };
  } catch {
    return null;
  }
}

interface TripRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  point_count: number;
}

interface PositionRow {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  recorded_at: string;
}

function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

async function fetchTrips(mmsi: number, limit: number) {
  const supabase = getSupabaseAdmin();

  // Get the last N trips (completed or active)
  const { data: tripRows, error: tripError } = await supabase
    .from('trips')
    .select('id, started_at, ended_at, point_count')
    .eq('mmsi', mmsi)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (tripError || !tripRows || tripRows.length === 0) {
    return [];
  }

  // Fetch positions for each trip
  const trips = await Promise.all(
    (tripRows as TripRow[]).map(async (trip) => {
      const { data: posRows } = await supabase
        .from('positions')
        .select('lat, lng, speed, heading, recorded_at')
        .eq('trip_id', trip.id)
        .order('recorded_at', { ascending: true });

      return {
        id: trip.id,
        startedAt: trip.started_at,
        endedAt: trip.ended_at,
        duration: formatDuration(trip.started_at, trip.ended_at),
        pointCount: trip.point_count,
        positions: ((posRows || []) as PositionRow[]).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          speed: p.speed,
          heading: p.heading,
          recordedAt: p.recorded_at,
        })),
      };
    }),
  );

  return trips;
}
