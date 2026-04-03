import type { TideData } from '@/types';

const BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * Formats a Date object as YYYYMMDD — the format NOAA's API expects for
 * begin_date / end_date parameters.
 */
function _formatNoaaDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Builds the query URL for NOAA's Tides & Currents predictions endpoint.
 *
 * Parameters:
 *  - begin_date  Start of the prediction window (YYYYMMDD)
 *  - range       Hours of data to return (72 = 3 days)
 *  - station     7-character NOAA station ID
 *  - product     "predictions" — the standard hi/lo tide product
 *  - datum       MLLW (Mean Lower Low Water) — standard reference plane
 *  - time_zone   lst_ldt — local standard / daylight time
 *  - interval    hilo — only return hi/lo events, not 6-min intervals
 *  - units       english — feet
 *  - format      json
 */
function buildTideUrl(stationId: string, beginDate: string): string {
  const params = new URLSearchParams({
    begin_date: beginDate,
    range: '72',
    station: stationId,
    product: 'predictions',
    datum: 'MLLW',
    time_zone: 'lst_ldt',
    interval: 'hilo',
    units: 'english',
    format: 'json',
    application: 'thebitereport',
  });

  return `${BASE_URL}?${params.toString()}`;
}

/**
 * Fetches 72-hour hi/lo tide predictions from NOAA's CO-OPS API.
 * No API key is required.
 *
 * @param stationId - 7-digit NOAA station ID (e.g. "9410660" for Los Angeles)
 * @param date      - Start date as "YYYYMMDD"; defaults to today (Pacific time)
 * @returns Typed TideData or null on failure
 */
export async function getTidePredictions(
  stationId: string,
  date?: string
): Promise<TideData | null> {
  // Default to today in Pacific time.  Using toLocaleDateString with the
  // en-CA locale gives us YYYY-MM-DD, which is easy to strip of dashes.
  const beginDate =
    date ??
    new Date()
      .toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
      .replace(/-/g, '');

  const url = buildTideUrl(stationId, beginDate);

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error(
        `[noaa-tides] Fetch failed for station ${stationId}: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const json = await res.json();

    // NOAA returns an "error" key (not an HTTP error code) when the station
    // is invalid or the product is unavailable.
    if (json.error) {
      console.error(
        `[noaa-tides] API error for station ${stationId}:`,
        json.error.message ?? json.error
      );
      return null;
    }

    if (!Array.isArray(json.predictions) || json.predictions.length === 0) {
      console.warn(
        `[noaa-tides] No predictions returned for station ${stationId}`
      );
      return null;
    }

    // The raw prediction objects already match our TideData.predictions shape:
    //   { t: "2026-04-02 06:14", v: "4.345", type: "H" }
    // Validate and narrow the type field to 'H' | 'L' defensively.
    const predictions = (
      json.predictions as Array<{ t: string; v: string; type: string }>
    )
      .filter((p) => p.type === 'H' || p.type === 'L')
      .map((p) => ({
        t: p.t,
        v: p.v,
        type: p.type as 'H' | 'L',
      }));

    return { predictions };
  } catch (err) {
    console.error(`[noaa-tides] getTidePredictions error (${stationId}):`, err);
    return null;
  }
}
