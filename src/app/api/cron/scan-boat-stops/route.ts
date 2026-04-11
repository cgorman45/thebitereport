import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PORTS } from '@/lib/fleet/boats';
import { isNearIsland } from '@/lib/ocean-data/proximity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stop detection thresholds
const STOP_SPEED_MAX = 1.5; // knots — below this = stopped
const MIN_STOP_DURATION_MIN = 5; // minimum stop to record
const HIGH_CONFIDENCE_MIN = 20; // 20+ min stop = high confidence
const MIN_PORT_DISTANCE_M = 5000; // 5km from port (> 1 mile offshore)
const CONFIRM_RADIUS_M = 1000; // 1km circle for multi-boat confirmation
const CONFIRM_WINDOW_HOURS = 24;
const LOOKBACK_HOURS = 24; // scan last 24 hours of positions

// Coverage area
const COVERAGE = { latMin: 28.7, latMax: 34.3, lngMin: -120.5, lngMax: -115.0 };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isNearPort(lat: number, lng: number): boolean {
  for (const port of Object.values(PORTS)) {
    if (haversine(lat, lng, port.lat, port.lng) < MIN_PORT_DISTANCE_M) return true;
  }
  return false;
}

function inCoverage(lat: number, lng: number): boolean {
  return lat >= COVERAGE.latMin && lat <= COVERAGE.latMax &&
    lng >= COVERAGE.lngMin && lng <= COVERAGE.lngMax;
}

interface PositionRecord {
  mmsi: number;
  lat: number;
  lng: number;
  speed: number;
  recorded_at: string;
}

interface DetectedStop {
  mmsi: number;
  lat: number;
  lng: number;
  started_at: string;
  ended_at: string;
  duration_min: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Analyze position history to find stops.
 * A stop = consecutive positions below STOP_SPEED_MAX for 5+ minutes.
 */
function detectStops(positions: PositionRecord[]): DetectedStop[] {
  // Group by MMSI
  const byBoat = new Map<number, PositionRecord[]>();
  for (const p of positions) {
    const arr = byBoat.get(p.mmsi) || [];
    arr.push(p);
    byBoat.set(p.mmsi, arr);
  }

  const stops: DetectedStop[] = [];

  for (const [mmsi, boatPositions] of byBoat) {
    // Sort by time
    boatPositions.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    let stopStart: PositionRecord | null = null;
    let stopPositions: PositionRecord[] = [];

    for (const pos of boatPositions) {
      if (pos.speed <= STOP_SPEED_MAX && inCoverage(pos.lat, pos.lng) && !isNearPort(pos.lat, pos.lng) && !isNearIsland(pos.lat, pos.lng)) {
        if (!stopStart) {
          stopStart = pos;
          stopPositions = [pos];
        } else {
          stopPositions.push(pos);
        }
      } else {
        // Boat moved — close any active stop
        if (stopStart && stopPositions.length >= 2) {
          const last = stopPositions[stopPositions.length - 1];
          const durationMs = new Date(last.recorded_at).getTime() - new Date(stopStart.recorded_at).getTime();
          const durationMin = Math.round(durationMs / 60000);

          if (durationMin >= MIN_STOP_DURATION_MIN) {
            // Average position during stop
            const avgLat = stopPositions.reduce((s, p) => s + p.lat, 0) / stopPositions.length;
            const avgLng = stopPositions.reduce((s, p) => s + p.lng, 0) / stopPositions.length;

            let confidence: 'low' | 'medium' | 'high' = 'low';
            if (durationMin >= HIGH_CONFIDENCE_MIN) confidence = 'high';
            else if (durationMin >= 10) confidence = 'medium';

            stops.push({
              mmsi,
              lat: avgLat,
              lng: avgLng,
              started_at: stopStart.recorded_at,
              ended_at: last.recorded_at,
              duration_min: durationMin,
              confidence,
            });
          }
        }
        stopStart = null;
        stopPositions = [];
      }
    }

    // Handle stop still in progress at end of data
    if (stopStart && stopPositions.length >= 2) {
      const last = stopPositions[stopPositions.length - 1];
      const durationMs = new Date(last.recorded_at).getTime() - new Date(stopStart.recorded_at).getTime();
      const durationMin = Math.round(durationMs / 60000);

      if (durationMin >= MIN_STOP_DURATION_MIN) {
        const avgLat = stopPositions.reduce((s, p) => s + p.lat, 0) / stopPositions.length;
        const avgLng = stopPositions.reduce((s, p) => s + p.lng, 0) / stopPositions.length;

        let confidence: 'low' | 'medium' | 'high' = 'low';
        if (durationMin >= HIGH_CONFIDENCE_MIN) confidence = 'high';
        else if (durationMin >= 10) confidence = 'medium';

        stops.push({
          mmsi, lat: avgLat, lng: avgLng,
          started_at: stopStart.recorded_at,
          ended_at: last.recorded_at,
          duration_min: durationMin,
          confidence,
        });
      }
    }
  }

  return stops;
}

/**
 * Cron endpoint: analyzes last 24h of AIS position history for boat stops.
 *
 * 1. Query positions table for all positions in last 24h
 * 2. Detect stops (5+ min below 1.5 knots, >5km from port)
 * 3. Score confidence (5-10 min = low, 10-20 min = medium, 20+ min = high)
 * 4. Check for multi-boat confirmation (2+ boats within 1km = confirmed kelp signal)
 * 5. Write new stops to boat_stops table
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const now = new Date();
    const lookbackStart = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

    // 1. Get positions from two sources:
    //    a) Supabase positions table (historical, roster boats)
    //    b) AIS collector live snapshot (ALL vessels including non-roster)

    // Source A: Supabase historical positions
    const { data: dbPositions } = await supabase
      .from('positions')
      .select('mmsi, lat, lng, speed, recorded_at')
      .gte('recorded_at', lookbackStart.toISOString())
      .order('recorded_at', { ascending: true });

    // Source B: Live AIS collector (ALL vessels, not just roster)
    let livePositions: PositionRecord[] = [];
    try {
      const collectorUrl = process.env.AIS_COLLECTOR_URL || 'http://localhost:3001';
      const liveRes = await fetch(`${collectorUrl}/positions`, { next: { revalidate: 0 } });
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        livePositions = (liveData.positions || []).map((p: { mmsi: number; lat: number; lng: number; sog: number; timestamp: number }) => ({
          mmsi: p.mmsi,
          lat: p.lat,
          lng: p.lng,
          speed: p.sog,
          recorded_at: new Date(p.timestamp).toISOString(),
        }));
      }
    } catch {
      // AIS collector not available — continue with DB data only
    }

    // Merge both sources
    const positions = [...(dbPositions || []), ...livePositions];

    if (positions.length === 0) {
      return NextResponse.json({
        positions_analyzed: 0,
        stops_detected: 0,
        confirmed_kelp_signals: 0,
        message: 'No position data available',
        sources: { db: dbPositions?.length || 0, live: livePositions.length },
      });
    }

    // 2. Detect stops from position history
    const stops = detectStops(positions);

    // 3. Write new stops and check for multi-boat confirmation
    let newStopsWritten = 0;
    let confirmed = 0;

    // Get boat names from fleet positions
    const { data: fleetData } = await supabase
      .from('fleet_positions')
      .select('mmsi, name');
    const boatNames = new Map((fleetData || []).map(b => [b.mmsi, b.name]));

    for (const stop of stops) {
      const boatName = boatNames.get(stop.mmsi) || `MMSI:${stop.mmsi}`;

      // Check if already recorded
      const { data: existing } = await supabase
        .from('boat_stops')
        .select('id')
        .eq('mmsi', stop.mmsi)
        .gte('stopped_at', new Date(new Date(stop.started_at).getTime() - 30 * 60000).toISOString())
        .lte('stopped_at', new Date(new Date(stop.started_at).getTime() + 30 * 60000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Write the stop
      const { data: inserted } = await supabase
        .from('boat_stops')
        .insert({
          mmsi: stop.mmsi,
          boat_name: boatName,
          lat: stop.lat,
          lng: stop.lng,
          speed: 0,
          stopped_at: stop.started_at,
          duration_minutes: stop.duration_min,
        })
        .select('id')
        .single();

      if (!inserted) continue;
      newStopsWritten++;

      // 4. Check for multi-boat confirmation
      const windowStart = new Date(new Date(stop.started_at).getTime() - CONFIRM_WINDOW_HOURS * 60 * 60 * 1000);
      const { data: nearbyStops } = await supabase
        .from('boat_stops')
        .select('id, mmsi, boat_name, lat, lng')
        .neq('mmsi', stop.mmsi)
        .eq('confirmed', false)
        .gte('stopped_at', windowStart.toISOString());

      if (!nearbyStops) continue;

      for (const nearby of nearbyStops) {
        const dist = haversine(stop.lat, stop.lng, nearby.lat, nearby.lng);

        if (dist <= CONFIRM_RADIUS_M) {
          // Two boats stopped at same spot — confirmed kelp paddy!
          await supabase
            .from('boat_stops')
            .update({
              confirmed: true,
              confirmed_at: now.toISOString(),
              confirming_mmsi: stop.mmsi,
              confirming_boat: boatName,
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
          break;
        }
      }
    }

    return NextResponse.json({
      positions_analyzed: positions.length,
      unique_boats: new Set(positions.map(p => p.mmsi)).size,
      stops_detected: stops.length,
      stops_by_confidence: {
        high: stops.filter(s => s.confidence === 'high').length,
        medium: stops.filter(s => s.confidence === 'medium').length,
        low: stops.filter(s => s.confidence === 'low').length,
      },
      new_stops_written: newStopsWritten,
      confirmed_kelp_signals: confirmed,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
