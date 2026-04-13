import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Tier = 'sentinel' | 'planetscope' | 'up42';

/**
 * POST /api/demo/order-satellite
 *
 * Searches for and orders satellite imagery at a kelp signal location.
 * Body: { lat, lng, boat_stop_id, score, tier? }
 *
 * Tiers:
 *   - "sentinel": 10m Sentinel-2 via Sentinel Hub (free)
 *   - "planetscope" (default): 3m PlanetScope via Planet Labs
 *   - "up42": 50cm Pléiades via UP42
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, boat_stop_id, score, tier = 'planetscope' } = body as {
      lat: number;
      lng: number;
      boat_stop_id?: string;
      score?: number;
      tier?: Tier;
    };

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    let result;

    switch (tier) {
      case 'sentinel':
        result = await handleSentinel(lat, lng, score);
        break;
      case 'up42':
        result = await handleUP42(lat, lng, score);
        break;
      case 'planetscope':
      default:
        result = await handlePlanetScope(lat, lng, score);
        break;
    }

    // Persist order to satellite_orders table
    let satelliteOrderId: string | null = null;
    if (result.success) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: orderRow } = await supabase
          .from('satellite_orders')
          .insert({
            zone_id: boat_stop_id || null,
            lat,
            lng,
            tier: result.tier,
            provider: result.tier_label,
            scene_id: result.scene?.id,
            order_id: result.order?.id,
            status: result.order?.status?.includes('Scene') ? 'placed' : 'processing',
            resolution: result.scene?.resolution,
            cloud_cover: result.scene?.cloud_cover,
            acquired_at: result.scene?.acquired,
          })
          .select('id')
          .single();

        satelliteOrderId = orderRow?.id || null;

        // Also update boat_stops
        if (boat_stop_id) {
          await supabase
            .from('boat_stops')
            .update({
              satellite_requested: true,
              satellite_scene_id: result.scene?.id || tier,
            })
            .eq('id', boat_stop_id);
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ ...result, satellite_order_id: satelliteOrderId, location: { lat, lng } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[order-satellite]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// — Sentinel-2 (10m, free) —
// Uses Copernicus STAC catalog (no auth needed for search) with Sentinel Hub fallback
async function handleSentinel(lat: number, lng: number, score?: number) {
  try {
    // Try Sentinel Hub first if credentials are available
    if (process.env.SENTINEL_HUB_CLIENT_ID) {
      const { searchSentinelScenes } = await import('@/lib/ocean-data/sentinel-hub');
      const scenes = await searchSentinelScenes(lat, lng, 14, 30, 5);
      if (scenes.length > 0) {
        const best = scenes[0];
        return {
          success: true,
          tier: 'sentinel',
          tier_label: 'Sentinel-2 10m (free)',
          scene: {
            id: best.id,
            acquired: best.acquired,
            cloud_cover: best.cloud_cover,
            resolution: 10,
            satellite: 'Sentinel-2',
          },
          order: {
            id: 'sentinel-free',
            status: 'Scene available — free tier, no order needed',
          },
          total_scenes_available: scenes.length,
        };
      }
    }

    // Fallback: Copernicus OData catalog (free, no auth required for search)
    const now = new Date();
    const daysBack = 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const odataUrl = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=` +
      `Collection/Name eq 'SENTINEL-2'` +
      ` and OData.CSC.Intersects(area=geography'SRID=4326;POINT(${lng} ${lat})')` +
      ` and ContentDate/Start gt ${startDate.toISOString()}` +
      ` and ContentDate/Start lt ${now.toISOString()}` +
      ` and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/Value lt 50.00)` +
      `&$orderby=ContentDate/Start desc&$top=10`;

    const odataRes = await fetch(odataUrl);

    if (!odataRes.ok) {
      const text = await odataRes.text();
      throw new Error(`Copernicus catalog search failed ${odataRes.status}: ${text.substring(0, 200)}`);
    }

    const odataData = await odataRes.json();
    // Prefer L2A scenes (atmospherically corrected) over L1C
    const allProducts = odataData.value || [];
    const l2aProducts = allProducts.filter((p: any) => p.Name?.includes('MSIL2A'));
    const features = l2aProducts.length > 0 ? l2aProducts : allProducts;

    if (features.length === 0) {
      return {
        success: false,
        tier: 'sentinel',
        tier_label: 'Sentinel-2 10m',
        message: `No clear Sentinel-2 scenes found in the last ${daysBack} days (cloud cover < 50%)`,
        scenes_found: 0,
      };
    }

    const best = features[0];
    const sceneId = best.Name || best.Id;
    const acquired = best.ContentDate?.Start;
    // Extract cloud cover from attributes
    const ccAttr = (best.Attributes || []).find((a: any) => a.Name === 'cloudCover');
    const cloudCover = ccAttr?.Value ?? 0;

    // Build Copernicus Browser link for direct viewing
    const browserLink = `https://browser.dataspace.copernicus.eu/?zoom=12&lat=${lat}&lng=${lng}&themeId=DEFAULT-THEME&visualizationUrl=https://sh.dataspace.copernicus.eu/ogc/wms/a91f72b0-7c1d-4a19-8bd4-3f4bfb04f01a&datasetId=S2_L2A_CDAS&fromTime=${startDate.toISOString()}&toTime=${now.toISOString()}`;

    return {
      success: true,
      tier: 'sentinel',
      tier_label: 'Sentinel-2 10m (free)',
      scene: {
        id: sceneId,
        acquired,
        cloud_cover: cloudCover,
        resolution: 10,
        satellite: best.properties?.platform || 'Sentinel-2',
      },
      order: {
        id: 'copernicus-free',
        status: 'Scene available — view free on Copernicus Browser',
        browser_link: browserLink,
      },
      total_scenes_available: features.length,
    };
  } catch (err) {
    return {
      success: false,
      tier: 'sentinel',
      tier_label: 'Sentinel-2 10m',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// — PlanetScope (3m) —
async function handlePlanetScope(lat: number, lng: number, score?: number) {
  if (!process.env.PLANET_API_KEY) {
    return {
      success: false,
      tier: 'planetscope',
      tier_label: 'PlanetScope 3m',
      message: 'PLANET_API_KEY not configured',
    };
  }

  const { searchScenes, orderScene } = await import('@/lib/ocean-data/planet');
  const scenes = await searchScenes(lat, lng, 30, 0.3, 5, 'PSScene');

  if (scenes.length === 0) {
    return {
      success: false,
      tier: 'planetscope',
      tier_label: 'PlanetScope 3m',
      message: 'No clear PlanetScope scenes found in the last 30 days',
      scenes_found: 0,
    };
  }

  const best = scenes[0];
  let order = null;
  try {
    const orderName = `kelp-ps-${score || 0}-${lat.toFixed(3)}-${Math.abs(lng).toFixed(3)}`;
    order = await orderScene(best.id, lat, lng, orderName, 'PSScene');
  } catch (orderErr) {
    console.log('[order-satellite] Planet order failed:', orderErr instanceof Error ? orderErr.message : String(orderErr));
  }

  return {
    success: true,
    tier: 'planetscope',
    tier_label: 'PlanetScope 3m',
    scene: {
      id: best.id,
      acquired: best.acquired,
      cloud_cover: best.cloud_cover,
      resolution: best.pixel_resolution || 3,
      satellite: best.satellite_id,
    },
    order: order
      ? { id: order.orderId, status: order.status }
      : { id: 'trial-limited', status: 'Scene identified — upgrade Planet account to download' },
    total_scenes_available: scenes.length,
  };
}

// — UP42 Pléiades (50cm) —
async function handleUP42(lat: number, lng: number, score?: number) {
  if (!process.env.UP42_EMAIL) {
    return {
      success: false,
      tier: 'up42',
      tier_label: 'Pléiades 50cm (UP42)',
      message: 'UP42_EMAIL not configured. Sign up at https://console.up42.com',
    };
  }

  try {
    const { searchUP42Scenes, orderUP42Scene } = await import('@/lib/ocean-data/up42');
    const scenes = await searchUP42Scenes(lat, lng, 90, 30, 5);

    if (scenes.length === 0) {
      return {
        success: false,
        tier: 'up42',
        tier_label: 'Pléiades 50cm (UP42)',
        message: 'No Pléiades scenes found in the last 90 days for this location',
        scenes_found: 0,
      };
    }

    const best = scenes[0];
    let order = null;
    try {
      const orderName = `kelp-up42-${score || 0}-${lat.toFixed(3)}-${Math.abs(lng).toFixed(3)}`;
      order = await orderUP42Scene(best.id, lat, lng, orderName);
    } catch (orderErr) {
      console.log('[order-satellite] UP42 order failed:', orderErr instanceof Error ? orderErr.message : String(orderErr));
    }

    return {
      success: true,
      tier: 'up42',
      tier_label: 'Pléiades 50cm (UP42)',
      scene: {
        id: best.id,
        acquired: best.acquired,
        cloud_cover: best.cloud_cover,
        resolution: 0.5,
        satellite: best.constellation,
      },
      order: order
        ? { id: order.orderId, status: order.status, credits: order.credits }
        : { id: 'search-only', status: 'Scene found — add UP42 credits to order' },
      total_scenes_available: scenes.length,
    };
  } catch (err) {
    return {
      success: false,
      tier: 'up42',
      tier_label: 'Pléiades 50cm (UP42)',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * GET /api/demo/order-satellite?order_id=xxx
 * Check status of an existing Planet order.
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
