/**
 * UP42 API client for high-resolution satellite imagery ordering.
 *
 * Searches the Pléiades catalog (50cm) and creates archive orders.
 * Auth: OAuth2 password grant via UP42_EMAIL + UP42_PASSWORD
 * Docs: https://docs.up42.com/developers/api-catalog
 */

const AUTH_URL = 'https://auth.up42.com/realms/public/protocol/openid-connect/token';
const API_BASE = 'https://api.up42.com';

let cachedToken: { token: string; expiresAt: number } | null = null;

let cachedWorkspaceId: string | null = null;

function getCredentials() {
  const email = process.env.UP42_EMAIL;
  const password = process.env.UP42_PASSWORD;
  if (!email || !password) {
    throw new Error('UP42_EMAIL and UP42_PASSWORD required. Sign up at https://console.up42.com');
  }
  return { email, password };
}

/**
 * Auto-discover workspace ID from the access token JWT payload.
 */
async function getWorkspaceId(): Promise<string | null> {
  if (cachedWorkspaceId) return cachedWorkspaceId;
  if (process.env.UP42_WORKSPACE_ID) {
    cachedWorkspaceId = process.env.UP42_WORKSPACE_ID;
    return cachedWorkspaceId;
  }

  // Decode workspace from the JWT token
  const token = await getToken();
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      cachedWorkspaceId = payload.workspace_id || payload.workspaceId || payload.account_id || null;
    }
  } catch { /* ignore decode errors */ }

  return cachedWorkspaceId;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const { email, password } = getCredentials();

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: email,
      password: password,
      client_id: 'up42-api',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UP42 auth failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 300) * 1000,
  };
  return cachedToken.token;
}

// Pléiades catalog data product IDs
const PLEIADES_PRODUCTS = {
  display: {
    id: '647780db-5a06-4b61-b525-577a8b68bb54',
    name: 'phr-display',
    label: 'Pléiades Display (50cm)',
  },
  analytic: {
    id: '4f1b2f62-98df-4c74-81f4-5dce45deee99',
    name: 'phr-analytic',
    label: 'Pléiades Analytic (50cm, 4-band)',
  },
  pansharpened: {
    id: 'df4ca029-2f6f-432b-98d5-ef2f5d70baee',
    name: 'phr-pansharpened-reflectance',
    label: 'Pléiades Pansharpened (50cm)',
  },
};

export interface UP42Scene {
  id: string;
  acquired: string;
  cloud_cover: number;
  resolution: number;
  constellation: string;
  geometry: object;
}

/**
 * Search the UP42 Pléiades catalog for available archive scenes.
 */
export async function searchUP42Scenes(
  lat: number,
  lng: number,
  daysBack: number = 90,
  maxCloudCover: number = 30,
  limit: number = 5,
): Promise<UP42Scene[]> {
  const token = await getToken();
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const delta = 0.02; // ~2km search area
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  const searchBody = {
    collections: ['PHR'],
    bbox,
    datetime: `${startDate.toISOString()}/${now.toISOString()}`,
    limit,
  };

  // UP42 catalog search endpoint
  const res = await fetch(`${API_BASE}/catalog/hosts/oneatlas/stac/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UP42 catalog search failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const features = data.features || [];

  return features.slice(0, limit).map((f: any) => ({
    id: f.properties?.id || f.id,
    acquired: f.properties?.acquisitionDate || f.properties?.datetime || '',
    cloud_cover: f.properties?.cloudCoverage ?? f.properties?.['eo:cloud_cover'] ?? 0,
    resolution: 0.5, // Pléiades is always 50cm
    constellation: f.properties?.constellation || 'PHR',
    geometry: f.geometry,
  }));
}

/**
 * Estimate the cost of ordering a scene from UP42.
 */
export async function estimateUP42Order(
  sceneId: string,
  lat: number,
  lng: number,
): Promise<{ credits: number; sqKm: number }> {
  const token = await getToken();
  const workspaceId = await getWorkspaceId();

  const delta = 0.005; // ~1km x 1km clip to minimize cost (~€10)
  const aoi = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - delta, lat - delta],
          [lng + delta, lat - delta],
          [lng + delta, lat + delta],
          [lng - delta, lat + delta],
          [lng - delta, lat - delta],
        ]],
      },
      properties: {},
    }],
  };

  const body = {
    dataProduct: PLEIADES_PRODUCTS.display.id,
    params: { id: sceneId },
    featureCollection: aoi,
  };

  const url = workspaceId
    ? `${API_BASE}/v2/orders/estimate?workspaceId=${workspaceId}`
    : `${API_BASE}/v2/orders/estimate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UP42 estimate failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  return {
    credits: data.credits || data.summary?.totalCredits || 0,
    sqKm: data.summary?.totalSize || 16, // ~4km x 4km default
  };
}

/**
 * Order a Pléiades scene from the UP42 catalog.
 */
export async function orderUP42Scene(
  sceneId: string,
  lat: number,
  lng: number,
  name: string = 'kelp-paddy-verification',
): Promise<{ orderId: string; status: string; credits?: number }> {
  const token = await getToken();
  const workspaceId = await getWorkspaceId();

  const delta = 0.02;
  const aoi = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - delta, lat - delta],
          [lng + delta, lat - delta],
          [lng + delta, lat + delta],
          [lng - delta, lat + delta],
          [lng - delta, lat - delta],
        ]],
      },
      properties: {},
    }],
  };

  const body = {
    dataProduct: PLEIADES_PRODUCTS.display.id,
    displayName: name,
    params: { id: sceneId },
    featureCollection: aoi,
  };

  const url = workspaceId
    ? `${API_BASE}/v2/orders?workspaceId=${workspaceId}`
    : `${API_BASE}/v2/orders`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UP42 order failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  return {
    orderId: data.id || data.orderId,
    status: data.status || 'PLACED',
    credits: data.credits,
  };
}
