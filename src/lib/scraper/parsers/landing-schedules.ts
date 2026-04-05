import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingTrip {
  tripId: string;
  boatName: string;
  landing: string;
  departureDate: string;   // ISO YYYY-MM-DD
  departureTime: string;   // "5:30 AM"
  returnTime: string;
  duration: string;        // "Full Day", "PM Half Day", etc.
  pricePerPerson: number;
  maxAnglers: number;
  spotsLeft: number;       // 0=Full, 999=OPEN
  status: string;          // 'open' | 'full' | 'definite'
  source: string;          // URL scraped from
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TheBiteReport/1.0; +https://thebitereport.com)';

/** Trip types to skip — non-fishing trips */
const NON_FISHING_KEYWORDS = [
  'whale watch', 'whale-watch', 'sunset cruise', 'harbor cruise',
  'sightseeing', 'dolphin', 'eco tour', 'nature cruise',
];

/**
 * Landing schedule sources.
 *
 * These are the landing websites' OWN schedule pages (not fishingreservations.net).
 * Point Loma's schedules.php embeds trip data in the same HTML format as
 * fishingreservations.net, so we can reuse the same parsing logic.
 */
const LANDING_SCHEDULE_SOURCES: { url: string; landing: string }[] = [
  { url: 'https://www.pointlomasportfishing.com/schedules.php', landing: 'point_loma' },
];

/**
 * Additional fishingreservations.net subdomains for boats that have
 * their own booking pages separate from the main landing page.
 */
const EXTRA_RESERVATION_SOURCES: { url: string; landing: string; boatFilter?: string }[] = [
  { url: 'https://americanangler.fishingreservations.net/sales/', landing: 'point_loma', boatFilter: 'American Angler' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': USER_AGENT },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      return res.text();
    })
    .finally(() => clearTimeout(timer));
}

function isNonFishing(tripType: string): boolean {
  const lower = tripType.toLowerCase();
  return NON_FISHING_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseDepartureDate(raw: string): string {
  const stripped = raw.replace(/^[A-Za-z]+\.?\s+/, '').trim();
  const match = stripped.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(stripped);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

function parseSpotsLeft(raw: string): number {
  const trimmed = raw.trim();
  if (/full/i.test(trimmed)) return 0;
  if (/open/i.test(trimmed)) return 999;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? 999 : n;
}

function parsePrice(raw: string): number {
  const match = raw.replace(/,/g, '').match(/[\d.]+/);
  if (!match) return -1;
  const price = parseFloat(match[0]);
  return price > 0 ? price : -1;
}

function deriveStatus(spotsLeft: number, description: string): string {
  if (spotsLeft === 0) return 'full';
  if (/definite/i.test(description)) return 'definite';
  return 'open';
}

/**
 * Extract trip type text from a .trip-info element.
 * Format: <strong>Boat</strong><br>Trip Type<hr>...
 */
function extractTripType($tripInfo: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string {
  const html = $tripInfo.html() || '';
  const afterBr = html.split(/<br\s*\/?>/i)[1] || '';
  const beforeHr = afterBr.split(/<hr/i)[0] || afterBr;
  return $('<div>').html(beforeHr).text().trim();
}

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

/**
 * Parse trip data from HTML that uses a fishingreservations.net–style format.
 *
 * There are two layout variants:
 *   1. fishingreservations.net subdomains — all data in ONE td.trip-cell with
 *      sub-elements .trip-info, .trip-depart, .trip-price, etc.
 *   2. Landing sites (e.g. pointlomasportfishing.com/schedules.php) — data
 *      spread across MULTIPLE td elements sharing the same data-trip-id.
 *      Boat name is in td.trip-name, data fields are in div.trip-depart, etc.
 *
 * This parser handles both by grouping all elements by data-trip-id.
 */
function parseFishingReservationsFormat(
  html: string,
  landing: string,
  sourceUrl: string,
): LandingTrip[] {
  const $ = cheerio.load(html);
  const trips: LandingTrip[] = [];

  // Collect all unique trip IDs
  const tripIds = new Set<string>();
  $('[data-trip-id]').each((_i, el) => {
    const id = $(el).attr('data-trip-id');
    if (id) tripIds.add(id);
  });

  for (const tripId of tripIds) {
    // Select ALL elements with this trip ID
    const els = $(`[data-trip-id="${tripId}"]`);

    // Boat name: try .trip-info strong (fishingreservations.net format),
    // then td.trip-name strong (landing site format)
    let boatName = els.find('.trip-info strong').first().text().trim();
    if (!boatName) {
      boatName = els.filter('.trip-name').find('strong').first().text().trim();
    }
    if (!boatName) {
      boatName = els.find('strong').first().text().trim();
    }
    if (!boatName) continue;

    // Trip type: try .trip-info layout, then td.trip-name layout
    let duration = '';
    const tripInfoEl = els.find('.trip-info').first();
    if (tripInfoEl.length) {
      duration = extractTripType(tripInfoEl, $);
    } else {
      // Point Loma format: <strong>Boat</strong><br>Trip Type in td.trip-name
      const tripNameEl = els.filter('.trip-name').first();
      if (tripNameEl.length) {
        const nameHtml = tripNameEl.html() || '';
        const afterBr = nameHtml.split(/<br\s*\/?>/i)[1] || '';
        duration = $('<div>').html(afterBr).text().trim();
      }
    }
    if (isNonFishing(duration)) continue;

    // Find data fields — could be in same element or sibling elements
    // Search across all elements with this trip ID
    const departText = els.find('.trip-depart').text().trim();
    const returnText = els.find('.trip-return').text().trim();
    const loadText = els.find('.trip-load').text().trim();
    const priceText = els.find('.trip-price').text().trim();
    const spotsText = els.find('.trip-spots').text().trim();

    // Departure
    const departLines = departText.split(/\s*\n\s*|\s*<br\s*\/?>\s*/i)
      .map((s) => s.trim()).filter(Boolean);
    const departureDateRaw = departLines[0] ?? '';
    const departureTimeRaw = departLines[1] ?? '';
    const departureDate = parseDepartureDate(departureDateRaw);
    const departureTime = departureTimeRaw || departText.replace(departureDateRaw, '').trim();

    // Return time
    const returnLines = returnText.split(/\s*\n\s*/)
      .map((s) => s.trim()).filter(Boolean);
    const returnTime = returnLines[returnLines.length - 1] ?? '';

    // Capacity, price, spots
    const maxAnglers = parseInt(loadText, 10) || 0;
    const pricePerPerson = parsePrice(priceText);
    const spotsLeft = parseSpotsLeft(spotsText);

    // Description
    const commentCell = $(`td.trip-cell:not(.scale-data)[data-trip-id="${tripId}"]`);
    const description = commentCell.find('.trip-comments').text().trim();

    const status = deriveStatus(spotsLeft, description);

    if (pricePerPerson <= 0) continue;

    trips.push({
      tripId,
      boatName,
      landing,
      departureDate,
      departureTime,
      returnTime,
      duration,
      pricePerPerson,
      maxAnglers,
      spotsLeft,
      status,
      source: sourceUrl,
    });
  }

  return trips;
}

// ---------------------------------------------------------------------------
// Exported scrapers
// ---------------------------------------------------------------------------

/**
 * Scrape trip schedules from individual landing websites.
 * Currently only Point Loma has a parseable schedule page.
 */
export async function scrapeLandingSchedules(): Promise<LandingTrip[]> {
  const allTrips: LandingTrip[] = [];

  for (const { url, landing } of LANDING_SCHEDULE_SOURCES) {
    try {
      const html = await fetchWithTimeout(url);
      const trips = parseFishingReservationsFormat(html, landing, url);
      console.log(`[landing-schedules] ${landing}: ${trips.length} trips`);
      allTrips.push(...trips);
    } catch (err) {
      console.error(
        `[landing-schedules] Failed to scrape "${landing}" (${url}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Also scrape boat-specific fishingreservations.net subdomains
  for (const { url, landing } of EXTRA_RESERVATION_SOURCES) {
    try {
      const html = await fetchWithTimeout(url);
      const trips = parseFishingReservationsFormat(html, landing, url);
      console.log(`[landing-schedules] ${landing} (extra): ${trips.length} trips`);
      allTrips.push(...trips);
    } catch (err) {
      console.error(
        `[landing-schedules] Failed to scrape extra source (${url}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return allTrips;
}
