import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/demo/kelp-paddies
 *
 * Returns all active confirmed kelp paddies with their drift paths
 * as GeoJSON for map rendering.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('kelp_paddies')
    .select('*')
    .in('status', ['active', 'drifting'])
    .order('confirmed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const features: object[] = [];

  for (const paddy of data || []) {
    // Kelp paddy icon (current position)
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [paddy.lng, paddy.lat] },
      properties: {
        id: paddy.id,
        type: 'kelp-paddy',
        status: paddy.status,
        confirmed_at: paddy.confirmed_at,
        notes: paddy.notes,
      },
    });

    // Predicted drift path as a line
    let predictedPath: { lat: number; lng: number }[] = [];
    try {
      predictedPath = typeof paddy.predicted_path === 'string'
        ? JSON.parse(paddy.predicted_path)
        : paddy.predicted_path || [];
    } catch { /* ignore */ }

    if (predictedPath.length > 0) {
      const lineCoords = [
        [paddy.lng, paddy.lat], // start at current position
        ...predictedPath.map((p: { lat: number; lng: number }) => [p.lng, p.lat]),
      ];

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: lineCoords },
        properties: {
          id: paddy.id,
          type: 'drift-path',
          hours: predictedPath.length > 0 ? (predictedPath as any[]).slice(-1)[0]?.hours_ahead || 48 : 48,
        },
      });

      // Time marker points along drift path (24h, 48h)
      for (const pt of predictedPath as any[]) {
        if (pt.hours_ahead === 24 || pt.hours_ahead === 48) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
            properties: {
              id: paddy.id,
              type: 'drift-time-marker',
              hours_ahead: pt.hours_ahead,
              label: `${pt.hours_ahead}h`,
            },
          });
        }
      }
    }

    // Historical drift path (confirmed positions)
    let driftHistory: { lat: number; lng: number }[] = [];
    try {
      driftHistory = typeof paddy.drift_path === 'string'
        ? JSON.parse(paddy.drift_path)
        : paddy.drift_path || [];
    } catch { /* ignore */ }

    if (driftHistory.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: driftHistory.map((p: { lat: number; lng: number }) => [p.lng, p.lat]),
        },
        properties: {
          id: paddy.id,
          type: 'drift-history',
        },
      });
    }
  }

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
    meta: {
      active_paddies: (data || []).length,
    },
  });
}
