import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// California Current: general southward flow at ~0.1-0.3 knots
// Simplified drift prediction — in production this would use HYCOM data
const DRIFT_SPEED_KM_H = 0.5; // ~0.27 knots average
const DRIFT_DIRECTION_DEG = 200; // SSW (California Current)

function predictDriftPath(
  lat: number,
  lng: number,
  hoursAhead: number = 48,
  stepHours: number = 6,
): { lat: number; lng: number; timestamp: string; hours_ahead: number }[] {
  const path = [];
  const now = Date.now();
  const dirRad = (DRIFT_DIRECTION_DEG * Math.PI) / 180;

  for (let h = stepHours; h <= hoursAhead; h += stepHours) {
    const distKm = DRIFT_SPEED_KM_H * h;
    const dLat = (distKm * Math.cos(dirRad)) / 111.32;
    const dLng = (distKm * Math.sin(dirRad)) / (111.32 * Math.cos((lat * Math.PI) / 180));

    path.push({
      lat: lat + dLat,
      lng: lng + dLng,
      timestamp: new Date(now + h * 60 * 60 * 1000).toISOString(),
      hours_ahead: h,
    });
  }
  return path;
}

/**
 * POST /api/demo/confirm-kelp
 *
 * Admin confirms a scored zone as a real kelp paddy.
 * Creates a kelp_paddies record with predicted drift path.
 * Body: { lat, lng, boat_stop_id, notes? }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const body = await req.json();
    const { lat, lng, boat_stop_id, notes } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    // Generate 48-hour drift prediction
    const predictedPath = predictDriftPath(lat, lng, 48, 6);

    // Create the confirmed kelp paddy
    const { data, error } = await supabase
      .from('kelp_paddies')
      .insert({
        source_boat_stop_id: boat_stop_id || null,
        lat,
        lng,
        first_detected_at: new Date().toISOString(),
        confirmed_by: 'admin',
        status: 'active',
        drift_path: JSON.stringify([{ lat, lng, timestamp: new Date().toISOString(), source: 'initial' }]),
        predicted_path: JSON.stringify(predictedPath),
        next_satellite_request_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      paddy: data,
      predicted_path: predictedPath,
      next_satellite_request: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
