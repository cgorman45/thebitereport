import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchScenes, orderScene } from '@/lib/ocean-data/planet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/demo/order-satellite
 *
 * Searches for and orders PlanetScope 3m imagery at a kelp signal location.
 * Body: { lat, lng, boat_stop_id, score }
 *
 * Flow:
 * 1. Search Planet for available PlanetScope scenes at the location
 * 2. Pick the most recent clear scene
 * 3. Order a clipped download (~4km x 4km around the point)
 * 4. Update boat_stops table with satellite_requested=true and scene_id
 * 5. Return order status
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, boat_stop_id, score } = body as {
      lat: number;
      lng: number;
      boat_stop_id?: string;
      score?: number;
    };

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    if (!process.env.PLANET_API_KEY) {
      return NextResponse.json({ error: 'PLANET_API_KEY not configured' }, { status: 500 });
    }

    // 1. Search for available scenes
    const scenes = await searchScenes(lat, lng, 14, 0.2, 5);

    if (scenes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No clear PlanetScope scenes found in the last 14 days for this location',
        lat,
        lng,
        scenes_found: 0,
      });
    }

    // 2. Pick the best scene (most recent, least cloud)
    const bestScene = scenes[0]; // Already sorted by date, filtered by cloud

    // 3. Order the scene
    const orderName = `kelp-signal-${score || 0}-${lat.toFixed(3)}-${Math.abs(lng).toFixed(3)}`;
    const order = await orderScene(bestScene.id, lat, lng, orderName);

    // 4. Update boat_stops if ID provided
    if (boat_stop_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      await supabase
        .from('boat_stops')
        .update({
          satellite_requested: true,
          satellite_scene_id: bestScene.id,
        })
        .eq('id', boat_stop_id);
    }

    return NextResponse.json({
      success: true,
      scene: {
        id: bestScene.id,
        acquired: bestScene.acquired,
        cloud_cover: bestScene.cloud_cover,
        resolution: bestScene.pixel_resolution,
        satellite: bestScene.satellite_id,
      },
      order: {
        id: order.orderId,
        status: order.status,
      },
      location: { lat, lng },
      total_scenes_available: scenes.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[order-satellite]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/demo/order-satellite?order_id=xxx
 *
 * Check status of an existing order.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  try {
    const { checkOrderStatus } = await import('@/lib/ocean-data/planet');
    const status = await checkOrderStatus(orderId);
    return NextResponse.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
