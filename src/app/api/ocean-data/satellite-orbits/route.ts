import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentPositions,
  computeAllOrbits,
  findNextPasses,
  getImageryFootprint,
  coversArea,
  getSatelliteCatalog,
} from '@/lib/ocean-data/satellite-orbits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds — satellites move fast

/**
 * GET /api/ocean-data/satellite-orbits
 *
 * Returns real-time satellite positions, orbit paths, and imagery footprints
 * for all tracked Earth observation satellites.
 *
 * Query params:
 *   orbit_minutes — how many minutes of orbit path to compute (default: 90)
 *   passes_hours  — how far ahead to search for passes (default: 24)
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const orbitMinutes = Math.min(parseInt(params.get('orbit_minutes') || '90'), 180);
    const passesHours = Math.min(parseInt(params.get('passes_hours') || '24'), 72);

    // Check cache
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const now = new Date();

    // Current satellite positions
    const positions = getCurrentPositions(now);

    // Orbit paths (past + future)
    const orbits = computeAllOrbits(orbitMinutes);

    // Imagery footprints for satellites currently in view area
    const footprints = positions
      .filter(p => coversArea(p))
      .map(p => getImageryFootprint(p));

    // Next passes over our area
    const nextPasses = findNextPasses(passesHours);

    // Satellite catalog
    const catalog = getSatelliteCatalog();

    const result = {
      timestamp: now.toISOString(),
      positions,
      orbits,
      footprints,
      nextPasses,
      catalog,
      coverage: {
        south: 28.7,
        north: 34.3,
        west: -120.5,
        east: -115.0,
        label: 'Channel Islands to Isla Guadalupe',
      },
      meta: {
        total_satellites: positions.length,
        in_view: footprints.length,
        next_pass: nextPasses[0] || null,
      },
    };

    cache = { data: result, ts: Date.now() };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=30' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
