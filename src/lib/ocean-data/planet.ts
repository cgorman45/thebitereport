/**
 * Planet Labs API client for searching and ordering PlanetScope imagery.
 *
 * Uses the Planet Data API (search) and Orders API (download) to:
 * 1. Search for available PlanetScope scenes at a given lat/lng
 * 2. Order 3m resolution imagery for kelp paddy verification
 * 3. Download and store results for ML training
 *
 * Docs: https://developers.planet.com/quickstart/apis/
 * Auth: API key via PLANET_API_KEY env var
 */

const DATA_API = 'https://api.planet.com/data/v1';
const ORDERS_API = 'https://api.planet.com/compute/ops/orders/v2';

function getApiKey(): string {
  const key = process.env.PLANET_API_KEY;
  if (!key) throw new Error('PLANET_API_KEY not set. Get one at https://www.planet.com/');
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `api-key ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

export interface SceneResult {
  id: string;
  acquired: string;
  cloud_cover: number;
  pixel_resolution: number;
  satellite_id: string;
  geometry: object;
}

/**
 * Search for available PlanetScope scenes at a given location.
 * Returns scenes sorted by date (newest first), filtered by cloud cover.
 */
export async function searchScenes(
  lat: number,
  lng: number,
  daysBack: number = 14,
  maxCloudCover: number = 0.5,
  limit: number = 10,
): Promise<SceneResult[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Create a small bounding box (~2km) around the point
  const delta = 0.01; // ~1km at this latitude
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  const searchBody = {
    item_types: ['PSScene'],
    filter: {
      type: 'AndFilter',
      config: [
        {
          type: 'GeometryFilter',
          field_name: 'geometry',
          config: {
            type: 'Polygon',
            coordinates: [[
              [bbox[0], bbox[1]],
              [bbox[2], bbox[1]],
              [bbox[2], bbox[3]],
              [bbox[0], bbox[3]],
              [bbox[0], bbox[1]],
            ]],
          },
        },
        {
          type: 'DateRangeFilter',
          field_name: 'acquired',
          config: {
            gte: startDate.toISOString(),
            lte: now.toISOString(),
          },
        },
        {
          type: 'RangeFilter',
          field_name: 'cloud_cover',
          config: { lte: maxCloudCover },
        },
        // Note: removed PermissionFilter — trial accounts may not have
        // ortho_analytic_4b download permissions. Search all available scenes.
      ],
    },
  };

  const res = await fetch(`${DATA_API}/quick-search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planet search failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const features = data.features || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return features.slice(0, limit).map((f: any) => ({
    id: f.id,
    acquired: f.properties.acquired,
    cloud_cover: f.properties.cloud_cover,
    pixel_resolution: f.properties.pixel_resolution,
    satellite_id: f.properties.satellite_id,
    geometry: f.geometry,
  }));
}

/**
 * Order a PlanetScope scene for download.
 * Clips to a small area around the GPS coordinate to minimize cost.
 */
export async function orderScene(
  sceneId: string,
  lat: number,
  lng: number,
  name: string = 'kelp-paddy-verification',
): Promise<{ orderId: string; status: string }> {
  // Clip to ~4km x 4km area around the detection point
  const delta = 0.02;
  const clipGeometry = {
    type: 'Polygon',
    coordinates: [[
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ]],
  };

  const orderBody = {
    name,
    products: [
      {
        item_ids: [sceneId],
        item_type: 'PSScene',
        product_bundle: 'visual',
      },
    ],
    // Note: clip tool removed — trial accounts don't have permission.
    // Full scene will be downloaded instead.
  };

  const res = await fetch(ORDERS_API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(orderBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planet order failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  return {
    orderId: data.id,
    status: data.state,
  };
}

/**
 * Check the status of an existing order.
 */
export async function checkOrderStatus(orderId: string): Promise<{
  status: string;
  results?: { location: string; name: string }[];
}> {
  const res = await fetch(`${ORDERS_API}/${orderId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Planet order status check failed: ${res.status}`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = data._links?.results?.map((r: any) => ({
    location: r.location,
    name: r.name,
  }));

  return {
    status: data.state,
    results,
  };
}
