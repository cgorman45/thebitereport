import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cache from '@/lib/ocean-data/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CACHE_TTL = 60_000; // 60 seconds

interface TrajectoryRow {
  mmsi: number;
  boat_name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface VesselSnapshot {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}

interface Snapshot {
  timestamp: string;
  vessels: VesselSnapshot[];
}

/**
 * Round an ISO timestamp down to the nearest interval boundary.
 */
function roundToInterval(ts: string, intervalMinutes: number): string {
  const d = new Date(ts);
  const mins = d.getUTCMinutes();
  d.setUTCMinutes(mins - (mins % intervalMinutes), 0, 0);
  return d.toISOString();
}

/**
 * GET /api/ocean-data/vessel-trajectories
 *
 * Returns historical vessel positions grouped into time snapshots
 * for a 4D replay / time-slider feature.
 *
 * Query params:
 *   hours_back       (default: 48)  — lookback window
 *   interval_minutes (default: 5)   — snapshot time resolution
 *   mmsi             (optional)     — filter to a single vessel
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const hoursBack = Math.min(Number(params.get('hours_back') || 48), 168); // cap at 7 days
    const intervalMinutes = Math.max(Number(params.get('interval_minutes') || 5), 1);
    const mmsiFilter = params.get('mmsi');

    // Build a cache key that varies by the query parameters
    const cacheKey = `ocean:vessel-trajectories:${hoursBack}:${intervalMinutes}:${mmsiFilter || 'all'}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Time window
    const end = new Date();
    const start = new Date(end.getTime() - hoursBack * 60 * 60 * 1000);

    // Paginate through all trajectory data (Supabase caps at 1000 rows per query)
    let allRows: TrajectoryRow[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    const MAX_ROWS = 50000; // Safety cap

    while (allRows.length < MAX_ROWS) {
      let query = supabase
        .from('vessel_trajectories')
        .select('mmsi, boat_name, lat, lng, speed, heading, timestamp')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (mmsiFilter) {
        query = query.eq('mmsi', Number(mmsiFilter));
      }

      const { data: pageData, error: pageError } = await query;
      if (pageError || !pageData || pageData.length === 0) break;

      allRows = allRows.concat(pageData as TrajectoryRow[]);
      if (pageData.length < PAGE_SIZE) break; // Last page
      page++;
    }

    const data = allRows;

    const rows = data;

    // Group rows into snapshots by rounding timestamps to the nearest interval
    const snapshotMap = new Map<string, VesselSnapshot[]>();

    for (const row of rows) {
      const bucket = roundToInterval(row.timestamp, intervalMinutes);
      let vessels = snapshotMap.get(bucket);
      if (!vessels) {
        vessels = [];
        snapshotMap.set(bucket, vessels);
      }
      vessels.push({
        mmsi: row.mmsi,
        name: row.boat_name || `Vessel ${row.mmsi}`,
        lat: row.lat,
        lng: row.lng,
        speed: row.speed,
        heading: row.heading,
      });
    }

    // Build ordered snapshots array
    const snapshots: Snapshot[] = Array.from(snapshotMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, vessels]) => ({ timestamp, vessels }));

    // Count unique vessels across all snapshots
    const uniqueVessels = new Set<number>();
    for (const row of rows) {
      uniqueVessels.add(row.mmsi);
    }

    const result = {
      snapshots,
      meta: {
        total_snapshots: snapshots.length,
        total_vessels: uniqueVessels.size,
        time_range: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        interval_minutes: intervalMinutes,
      },
    };

    cache.set(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
