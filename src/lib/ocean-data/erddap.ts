// src/lib/ocean-data/erddap.ts

export interface GridBounds {
  latMin: number;
  latMax: number;
  lngMin: number; // negative for west
  lngMax: number;
}

export interface GridData {
  lat: number[];
  lng: number[];
  values: number[][]; // [latIdx][lngIdx]
  timestamp: string;
}

const ERDDAP_BASE = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap';

const DEFAULT_BOUNDS: GridBounds = {
  latMin: 32.0,
  latMax: 35.0,
  lngMin: -121.0,
  lngMax: -117.0,
};

async function fetchWithRetry(url: string): Promise<Response> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (res.ok) return res;
  await new Promise((r) => setTimeout(r, 5000));
  const retry = await fetch(url, { next: { revalidate: 0 } });
  if (!retry.ok) throw new Error(`ERDDAP fetch failed: ${retry.status} ${retry.statusText}`);
  return retry;
}

export async function fetchGrid(
  dataset: string,
  variable: string,
  bounds: GridBounds = DEFAULT_BOUNDS,
): Promise<GridData> {
  const url =
    `${ERDDAP_BASE}/${dataset}.csv` +
    `?${variable}[(last)]` +
    `[(${bounds.latMin}):(${bounds.latMax})]` +
    `[(${bounds.lngMin}):(${bounds.lngMax})]`;

  const res = await fetchWithRetry(url);
  const text = await res.text();

  // ERDDAP CSV has two header rows: column names + units
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 3) throw new Error(`ERDDAP ${dataset}: empty response`);

  const dataLines = lines.slice(2); // skip headers + units row

  const latSet = new Set<number>();
  const lngSet = new Set<number>();
  const entries: { lat: number; lng: number; value: number }[] = [];
  let timestamp = '';

  for (const line of dataLines) {
    const cols = line.split(',');
    if (cols.length < 4) continue;
    if (!timestamp) timestamp = cols[0];
    const lat = parseFloat(cols[1]);
    const lng = parseFloat(cols[2]);
    const value = parseFloat(cols[3]);
    latSet.add(lat);
    lngSet.add(lng);
    entries.push({ lat, lng, value });
  }

  const latArr = Array.from(latSet).sort((a, b) => a - b);
  const lngArr = Array.from(lngSet).sort((a, b) => a - b);

  const latIdx = new Map(latArr.map((v, i) => [v, i]));
  const lngIdx = new Map(lngArr.map((v, i) => [v, i]));

  const values: number[][] = Array.from({ length: latArr.length }, () =>
    new Array(lngArr.length).fill(NaN),
  );

  for (const e of entries) {
    const li = latIdx.get(e.lat);
    const gi = lngIdx.get(e.lng);
    if (li !== undefined && gi !== undefined) {
      values[li][gi] = e.value;
    }
  }

  return { lat: latArr, lng: lngArr, values, timestamp };
}
