/**
 * Global Fishing Watch API client.
 *
 * Provides SAR vessel detections (Sentinel-1 radar) including non-AIS "dark" vessels.
 * Free API — requires token from https://globalfishingwatch.org/our-apis/tokens/signup
 *
 * Key capabilities:
 * - Detect ALL vessels on water (metal, fiberglass, even small boats 10-20m)
 * - Match detected vessels with AIS where possible
 * - Identify "dark" vessels (no AIS transponder) — critical for private fishing boats
 * - Historical data from 2017 to ~5 days ago
 */

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org/v3';

// Coverage area: Channel Islands to Guadalupe
const COVERAGE = {
  latMin: 28.7,
  latMax: 34.3,
  lngMin: -120.5,
  lngMax: -115.0,
};

function getToken(): string {
  const token = process.env.GFW_API_TOKEN;
  if (!token) throw new Error('GFW_API_TOKEN not set. Get one at https://globalfishingwatch.org/our-apis/tokens/signup');
  return token;
}

interface SARDetection {
  lat: number;
  lng: number;
  timestamp: string;
  matched: boolean; // true = matched to AIS vessel
  vessel_id?: string;
  vessel_name?: string;
  flag?: string;
  vessel_type?: string;
  speed?: number;
}

/**
 * Fetch SAR vessel detections for our coverage area.
 * Returns both AIS-matched and "dark" vessel positions.
 */
export async function fetchSARDetections(
  daysBack: number = 7,
): Promise<SARDetection[]> {
  const token = getToken();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Use the 4wings report API to get SAR detections in our area
  const body = {
    datasets: ['public-global-sar-presence:latest'],
    'date-range': `${startDate},${endDate}`,
    'spatial-resolution': 'low', // ~0.1 degree cells
    'temporal-resolution': 'daily',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [COVERAGE.lngMin, COVERAGE.latMin],
        [COVERAGE.lngMax, COVERAGE.latMin],
        [COVERAGE.lngMax, COVERAGE.latMax],
        [COVERAGE.lngMin, COVERAGE.latMax],
        [COVERAGE.lngMin, COVERAGE.latMin],
      ]],
    },
    'group-by': ['matched'],
    format: 'JSON',
  };

  const res = await fetch(`${GFW_BASE}/4wings/report`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GFW API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Search for vessels by name, MMSI, or other identifier.
 */
export async function searchVessel(query: string): Promise<object[]> {
  const token = getToken();

  const res = await fetch(
    `${GFW_BASE}/vessels/search?query=${encodeURIComponent(query)}&datasets[0]=public-global-vessel-identity:latest&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.entries || [];
}

/**
 * Get fishing events for a specific vessel.
 */
export async function getVesselEvents(vesselId: string, daysBack: number = 30): Promise<object[]> {
  const token = getToken();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const res = await fetch(
    `${GFW_BASE}/events?vessels[0]=${vesselId}&datasets[0]=public-global-fishing-events:latest&start-date=${startDate}&end-date=${endDate}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.entries || [];
}
