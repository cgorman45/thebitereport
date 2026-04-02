import type { BuoyData } from '@/types';

const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

/**
 * Sentinel value NDBC uses throughout the data file to indicate that a
 * measurement was not available for that observation period.
 */
const MISSING = 'MM';

/** Convert metres-per-second to statute miles-per-hour. */
function mpsToMph(mps: number): number {
  return Math.round(mps * 2.23694 * 10) / 10;
}

/** Convert Celsius to Fahrenheit, rounded to one decimal place. */
function celsiusToFahrenheit(c: number): number {
  return Math.round(((c * 9) / 5 + 32) * 10) / 10;
}

/**
 * Parses a single numeric field from the NDBC text file.
 *
 * @param value  The raw string token from the data row
 * @returns      The parsed number, or null when the value is "MM" (missing)
 */
function parseField(value: string | undefined): number | null {
  if (!value || value.trim() === MISSING) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

/**
 * NDBC realtime2 files use a two-line header:
 *
 *   Line 1 (column names):  #YY  MM DD hh mm WDIR WSPD GST  WVHT  DPD  APD MWD  PRES  ATMP  WTMP ...
 *   Line 2 (units):         #yr  mo dy hr mn  deg m/s m/s     m    sec   sec deg  hPa  degC  degC ...
 *   Line 3+: data rows, oldest first, newest last
 *
 * We read the FIRST data row (index 2) which is the most recent observation.
 */
function parseNdbcText(
  text: string,
  buoyId: string
): BuoyData | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 3) {
    console.warn(`[noaa-buoy] Insufficient data rows for buoy ${buoyId}`);
    return null;
  }

  // Strip the leading '#' from the header row and split on whitespace
  const headers = lines[0].replace(/^#/, '').trim().split(/\s+/);

  // The most-recent observation is the FIRST data line (line index 2,
  // immediately after the two header rows).
  const dataLine = lines[2];
  const values = dataLine.split(/\s+/);

  if (values.length < headers.length) {
    console.warn(
      `[noaa-buoy] Data row column count mismatch for buoy ${buoyId}`
    );
    return null;
  }

  // Build a lookup map: column-name → raw string value
  const row: Record<string, string> = {};
  headers.forEach((col, i) => {
    row[col] = values[i] ?? MISSING;
  });

  // ── Date / time ──────────────────────────────────────────────────────────
  // NDBC uses UTC.  Column names: #YY / YY, MM, DD, hh, mm
  const year = row['YY'] ?? row['#YY'] ?? '00';
  const month = row['MM'];
  const day = row['DD'];
  const hour = row['hh'];
  const minute = row['mm'];

  // Guard against completely unparseable timestamps
  const timestampStr =
    year && month && day && hour && minute
      ? `20${year.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00Z`
      : new Date().toISOString();

  // ── Measurements ─────────────────────────────────────────────────────────
  const rawWspd = parseField(row['WSPD']); // m/s → mph
  const rawWdir = parseField(row['WDIR']); // degrees, no conversion needed
  const rawAtmp = parseField(row['ATMP']); // °C → °F
  const rawWtmp = parseField(row['WTMP']); // °C → °F

  // If every core measurement is missing, treat the row as unusable
  if (
    rawWspd === null &&
    rawWdir === null &&
    rawAtmp === null &&
    rawWtmp === null
  ) {
    console.warn(
      `[noaa-buoy] All core fields missing for buoy ${buoyId} — skipping row`
    );
    return null;
  }

  return {
    waterTemp: rawWtmp !== null ? celsiusToFahrenheit(rawWtmp) : 0,
    airTemp: rawAtmp !== null ? celsiusToFahrenheit(rawAtmp) : 0,
    windSpeed: rawWspd !== null ? mpsToMph(rawWspd) : 0,
    windDirection: rawWdir ?? 0,
    timestamp: timestampStr,
  };
}

/**
 * Fetches the latest observation from an NDBC buoy.
 * No API key is required.
 *
 * @param buoyId - NDBC buoy identifier (e.g. "46025" for Santa Monica Basin)
 * @returns Typed BuoyData or null on failure / missing data
 */
export async function getBuoyData(buoyId: string): Promise<BuoyData | null> {
  const url = `${NDBC_BASE}/${buoyId}.txt`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (!res.ok) {
      console.error(
        `[noaa-buoy] Fetch failed for buoy ${buoyId}: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const text = await res.text();
    return parseNdbcText(text, buoyId);
  } catch (err) {
    console.error(`[noaa-buoy] getBuoyData error (${buoyId}):`, err);
    return null;
  }
}
