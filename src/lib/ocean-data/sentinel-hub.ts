/**
 * Sentinel Hub API client for Sentinel-2 imagery (10m resolution, free tier).
 *
 * Uses the Copernicus Data Space Ecosystem (CDSE) Sentinel Hub services.
 * Auth: OAuth2 client credentials via SENTINEL_HUB_CLIENT_ID + SENTINEL_HUB_CLIENT_SECRET
 * Docs: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/
 */

const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const CATALOG_URL = 'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET required');
  }
  return { clientId, clientSecret };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentinel Hub auth failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 300) * 1000,
  };
  return cachedToken.token;
}

export interface SentinelScene {
  id: string;
  acquired: string;
  cloud_cover: number;
  geometry: object;
}

/**
 * Search for available Sentinel-2 L2A scenes at a given location.
 */
export async function searchSentinelScenes(
  lat: number,
  lng: number,
  daysBack: number = 14,
  maxCloudCover: number = 30,
  limit: number = 5,
): Promise<SentinelScene[]> {
  const token = await getToken();
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  const body = {
    bbox,
    datetime: `${startDate.toISOString()}/${now.toISOString()}`,
    collections: ['sentinel-2-l2a'],
    limit,
    filter: `eo:cloud_cover < ${maxCloudCover}`,
    'filter-lang': 'cql2-text',
  };

  const res = await fetch(CATALOG_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentinel Hub catalog search failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const features = data.features || [];

  return features.slice(0, limit).map((f: any) => ({
    id: f.id,
    acquired: f.properties.datetime,
    cloud_cover: f.properties['eo:cloud_cover'] ?? 0,
    geometry: f.geometry,
  }));
}

/**
 * Request a Sentinel-2 true-color image via the Process API.
 * Returns a PNG/JPEG image URL or base64 data.
 */
export async function requestSentinelImage(
  lat: number,
  lng: number,
  width: number = 512,
  height: number = 512,
  daysBack: number = 14,
): Promise<{ imageBase64: string; contentType: string; sceneDate: string }> {
  const token = await getToken();
  const now = new Date();
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // ~2km x 2km area around the point
  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02", "SCL"], units: "DN" }],
    output: { bands: 3, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  // Skip clouds (SCL 8,9,10) — make transparent
  if ([8, 9, 10].includes(sample.SCL)) {
    return [0, 0, 0];
  }
  // True color with brightness boost
  let gain = 3.5 / 10000;
  return [sample.B04 * gain, sample.B03 * gain, sample.B02 * gain];
}`;

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: {
            from: startDate.toISOString(),
            to: now.toISOString(),
          },
          maxCloudCoverage: 30,
          mosaickingOrder: 'leastCC',
        },
      }],
    },
    output: {
      width,
      height,
      responses: [{ identifier: 'default', format: { type: 'image/png' } }],
    },
    evalscript,
  };

  const res = await fetch(PROCESS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'image/png',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentinel Hub process failed ${res.status}: ${text.substring(0, 200)}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return {
    imageBase64: base64,
    contentType: 'image/png',
    sceneDate: now.toISOString(),
  };
}
