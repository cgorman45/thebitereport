import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PORTS } from '@/lib/fleet/boats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Boat is "stopped" if speed < this (knots)
const STOP_SPEED_MAX = 1.5;
// Must be this far from any port (meters)
const MIN_PORT_DISTANCE_M = 3000;
// Radius for matching a second boat to confirm kelp (meters)
const CONFIRM_RADIUS_M = 1000;
// Time window for confirmation (hours)
const CONFIRM_WINDOW_HOURS = 24;
// Coverage area: Channel Islands to Guadalupe
const COVERAGE = { latMin: 28.7, latMax: 34.3, lngMin: -120.5, lngMax: -115.0 };

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isNearPort(lat: number, lng: number): boolean {
  for (const port of Object.values(PORTS)) {
    if (haversineDistance(lat, lng, port.lat, port.lng) < MIN_PORT_DISTANCE_M) return true;
  }
  return false;
}

function inCoverage(lat: number, lng: number): boolean {
  return lat >= COVERAGE.latMin && lat <= COVERAGE.latMax &&
         lng >= COVERAGE.lngMin && lng <= COVERAGE.lngMax;
}

/**
 * Cron endpoint: scans fleet positions for stopped boats in open ocean.
 *
 * 1. Find boats going < 1.5 knots, > 3km from port, in coverage area
 * 2. Record as a boat_stop if not already recorded recently
 * 3. Check if any existing unconfirmed stops are within 1km — if so, confirm both
 * 4. For confirmed stops, queue satellite image request
 *
 * Run every 5-10 minutes via Vercel cron or external scheduler.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 1. Get current fleet positions
    const { data: positions, error: posError } = await supabase
      .from('fleet_positions')
      .select('mmsi, name, lat, lng, speed, updated_at');

    if (posError) {
      return NextResponse.json({ error: posError.message }, { status: 502 });
    }

    const now = new Date();
    const staleMs = 30 * 60 * 1000; // 30 min — position must be recent
    const newStops: Array<{ mmsi: number; name: string; lat: number; lng: number; speed: number }> = [];

    for (const pos of positions || []) {
      const age = now.getTime() - new Date(pos.updated_at).getTime();
      if (age > staleMs) continue;
      if (pos.speed > STOP_SPEED_MAX) continue;
      if (!inCoverage(pos.lat, pos.lng)) continue;
      if (isNearPort(pos.lat, pos.lng)) continue;

      newStops.push({
        mmsi: pos.mmsi,
        name: pos.name,
        lat: pos.lat,
        lng: pos.lng,
        speed: pos.speed,
      });
    }

    // 2. Check each stopped boat against recent stops to avoid duplicates
    let recorded = 0;
    let confirmed = 0;

    for (const stop of newStops) {
      // Check if this boat already has a recent stop at this location
      const { data: existing } = await supabase
        .from('boat_stops')
        .select('id')
        .eq('mmsi', stop.mmsi)
        .gte('stopped_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString()) // last hour
        .limit(1);

      if (existing && existing.length > 0) continue; // Already recorded recently

      // Record the stop
      const { data: inserted, error: insertErr } = await supabase
        .from('boat_stops')
        .insert({
          mmsi: stop.mmsi,
          boat_name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          speed: stop.speed,
          stopped_at: now.toISOString(),
        })
        .select('id')
        .single();

      if (insertErr) continue;
      recorded++;

      // 3. Check for nearby unconfirmed stops from DIFFERENT boats in last 24h
      const windowStart = new Date(now.getTime() - CONFIRM_WINDOW_HOURS * 60 * 60 * 1000);
      const { data: nearbyStops } = await supabase
        .from('boat_stops')
        .select('id, mmsi, boat_name, lat, lng')
        .neq('mmsi', stop.mmsi) // different boat
        .eq('confirmed', false)
        .gte('stopped_at', windowStart.toISOString());

      if (!nearbyStops) continue;

      for (const nearby of nearbyStops) {
        const dist = haversineDistance(stop.lat, stop.lng, nearby.lat, nearby.lng);

        if (dist <= CONFIRM_RADIUS_M) {
          // Confirm BOTH stops — two independent boats stopped at same location
          await supabase
            .from('boat_stops')
            .update({
              confirmed: true,
              confirmed_at: now.toISOString(),
              confirming_mmsi: stop.mmsi,
              confirming_boat: stop.name,
            })
            .eq('id', nearby.id);

          await supabase
            .from('boat_stops')
            .update({
              confirmed: true,
              confirmed_at: now.toISOString(),
              confirming_mmsi: nearby.mmsi,
              confirming_boat: nearby.boat_name,
            })
            .eq('id', inserted.id);

          confirmed++;
          break; // One confirmation is enough
        }
      }
    }

    return NextResponse.json({
      scanned: positions?.length || 0,
      stopped_in_ocean: newStops.length,
      new_stops_recorded: recorded,
      confirmed_kelp_signals: confirmed,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
