import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveTrip {
  id: string;
  boatName: string;
  landing: string;
  departureDate: string;    // ISO date YYYY-MM-DD
  departureTime: string;    // "12:30 PM"
  duration: string;         // "PM Half Day", "Full Day", etc.
  durationHours: number;    // estimated from trip type
  pricePerPerson: number;
  maxAnglers: number;
  spotsLeft: number;        // 0 if "Full", 999 if "OPEN"
  description: string;
  targetSpecies: string[];  // inferred from trip type
  status: string;           // 'open' | 'full' | 'definite'
  bookingUrl: string;       // direct trip booking link, e.g. .../user.php?trip_id=XXXXX
  scrapedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;

const RESERVATION_URLS: { url: string; landing: string }[] = [
  { url: 'https://seaforth.fishingreservations.net/sales/',              landing: 'seaforth'   },
  // Point Loma's fishingreservations.net uses a non-standard layout (Spry panels),
  // so we scrape their own schedules page which uses the standard trip-cell format.
  { url: 'https://www.pointlomasportfishing.com/schedules.php',          landing: 'point_loma' },
  { url: 'https://fishermanslanding.fishingreservations.net/resos/',     landing: 'fishermans' },
];

/** Trip types to skip — non-fishing trips */
const NON_FISHING_KEYWORDS = [
  'whale watch',
  'whale-watch',
  'sunset cruise',
  'harbor cruise',
  'sightseeing',
  'dolphin',
  'eco tour',
  'nature cruise',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Estimate the duration in hours from a trip type string.
 */
function estimateDurationHours(duration: string): number {
  const lower = duration.toLowerCase();
  if (/overnight/.test(lower)) return 18;
  if (/1\.5\s*day|1-5\s*day/.test(lower)) return 14;
  if (/full\s*day|full-day/.test(lower)) return 10;
  if (/3\s*[/\\]?\s*4\s*day|three.quarter/.test(lower)) return 8;
  if (/half\s*day|half-day/.test(lower)) return 5;
  return 5; // default
}

/**
 * Infer likely target species from trip type / duration.
 * Returns a broad list — the scraper doesn't have species-specific info.
 */
function inferTargetSpecies(duration: string): string[] {
  const lower = duration.toLowerCase();
  if (/overnight|1\.5\s*day|full\s*day/.test(lower)) {
    return ['yellowtail', 'yellowfin tuna', 'bluefin tuna', 'dorado'];
  }
  if (/3\s*[/\\]?\s*4/.test(lower)) {
    return ['yellowtail', 'calico bass', 'white seabass', 'rockfish'];
  }
  // Half day
  return ['rockfish', 'calico bass', 'barracuda', 'bonito'];
}

/**
 * Return true if the trip type string represents a non-fishing trip.
 */
function isNonFishing(tripType: string): boolean {
  const lower = tripType.toLowerCase();
  return NON_FISHING_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Parse a departure date string like "Fri. 4-3-2026" into ISO YYYY-MM-DD.
 * Falls back to today on failure.
 */
function parseDepartureDate(raw: string): string {
  // Strip day-of-week prefix like "Fri. " or "Friday "
  const stripped = raw.replace(/^[A-Za-z]+\.?\s+/, '').trim();

  // Expect M-D-YYYY or M/D/YYYY
  const match = stripped.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(stripped);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parse the spot availability value from .trip-spots text.
 * "Full" → 0, "OPEN" → 999, otherwise parse as integer.
 */
function parseSpotsLeft(raw: string): number {
  const trimmed = raw.trim();
  if (/full/i.test(trimmed)) return 0;
  if (/open/i.test(trimmed)) return 999;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? 999 : n;
}

/**
 * Parse a price string like "$75" into a number.
 * Returns -1 if no valid price can be extracted (e.g. "Call for pricing", empty).
 */
function parsePrice(raw: string): number {
  const match = raw.replace(/,/g, '').match(/[\d.]+/);
  if (!match) return -1;
  const price = parseFloat(match[0]);
  return price > 0 ? price : -1;
}

/**
 * Derive a status string from spots and description.
 */
function deriveStatus(spotsLeft: number, description: string): string {
  if (spotsLeft === 0) return 'full';
  if (/definite/i.test(description)) return 'definite';
  return 'open';
}

/**
 * Extract the trip type text from a .trip-info element.
 * The element looks like: <div class="trip-info"><strong>Boat Name</strong><br>PM Half Day</div>
 * We want the text that comes after the <br>.
 */
function extractTripType($tripInfo: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string {
  // The trip-info div has: <strong>Boat</strong><br>Trip Type<hr>...
  // We want just the trip type text between <br> and <hr>
  const html = $tripInfo.html() || '';
  // Remove everything before and including the first <br>
  const afterBr = html.split(/<br\s*\/?>/i)[1] || '';
  // Remove everything from <hr> onward
  const beforeHr = afterBr.split(/<hr/i)[0] || afterBr;
  // Strip remaining tags and trim
  return $('<div>').html(beforeHr).text().trim();
}

// ---------------------------------------------------------------------------
// Page scraper
// ---------------------------------------------------------------------------

async function scrapeReservationPage(
  url: string,
  landing: string,
  scrapedAt: string,
): Promise<LiveTrip[]> {
  const baseUrl = url.replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; TheBiteReport/1.0; +https://thebitereport.com)',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const trips: LiveTrip[] = [];

  // Collect all unique trip IDs.
  // Some pages (fishingreservations.net) put all data in one td.trip-cell,
  // while others (pointlomasportfishing.com) spread data across multiple td
  // elements sharing the same data-trip-id. We handle both by grouping.
  const tripIds = new Set<string>();
  $('[data-trip-id]').each((_i, el) => {
    const id = $(el).attr('data-trip-id');
    if (id) tripIds.add(id);
  });

  for (const tripId of tripIds) {
    const els = $(`[data-trip-id="${tripId}"]`);

    // Boat name: try .trip-info strong (fishingreservations.net),
    // then td.trip-name strong (landing site format)
    let boatName = els.find('.trip-info strong').first().text().trim();
    if (!boatName) {
      boatName = els.filter('.trip-name').find('strong').first().text().trim();
    }
    if (!boatName) {
      boatName = els.find('strong').first().text().trim();
    }
    if (!boatName) continue;

    // Trip type / duration
    let duration = '';
    const tripInfoEl = els.find('.trip-info').first();
    if (tripInfoEl.length) {
      duration = extractTripType(tripInfoEl, $);
    } else {
      const tripNameEl = els.filter('.trip-name').first();
      if (tripNameEl.length) {
        const nameHtml = tripNameEl.html() || '';
        const afterBr = nameHtml.split(/<br\s*\/?>/i)[1] || '';
        duration = $('<div>').html(afterBr).text().trim();
      }
    }

    // Skip non-fishing trips
    if (isNonFishing(duration)) continue;

    // Find data fields across all elements with this trip ID
    const departText = els.find('.trip-depart').text().trim();
    const departLines = departText.split(/\s*\n\s*|\s*<br\s*\/?>\s*/i).map((s) => s.trim()).filter(Boolean);
    const departureDateRaw = departLines[0] ?? '';
    const departureTimeRaw = departLines[1] ?? '';
    const departureDate = parseDepartureDate(departureDateRaw);
    const departureTime = departureTimeRaw || departText.replace(departureDateRaw, '').trim();

    // Max anglers
    const maxAnglersText = els.find('.trip-load').text().trim();
    const maxAnglers = parseInt(maxAnglersText, 10) || 0;

    // Price
    const priceText = els.find('.trip-price').text().trim();
    const pricePerPerson = parsePrice(priceText);

    // Spots left
    const spotsText = els.find('.trip-spots').text().trim();
    const spotsLeft = parseSpotsLeft(spotsText);

    // Description
    const commentCell = $(`td.trip-cell:not(.scale-data)[data-trip-id="${tripId}"]`);
    const description = commentCell.find('.trip-comments').text().trim();

    const status = deriveStatus(spotsLeft, description);

    // Skip trips with no valid price
    if (pricePerPerson <= 0) continue;

    // Build booking URL — use the original booking link if available
    let bookingUrl = tripId ? `${baseUrl}/user.php?trip_id=${tripId}` : url;
    const bookingLink = els.find('a[href*="trip_id"]').first().attr('href');
    if (bookingLink) bookingUrl = bookingLink;

    trips.push({
      id: crypto.randomUUID(),
      boatName,
      landing,
      departureDate,
      departureTime,
      duration,
      durationHours: estimateDurationHours(duration),
      pricePerPerson,
      maxAnglers,
      spotsLeft,
      description,
      targetSpecies: inferTargetSpecies(duration),
      status,
      bookingUrl,
      scrapedAt,
    });
  }

  return trips;
}

// ---------------------------------------------------------------------------
// Exported scraper
// ---------------------------------------------------------------------------

/**
 * Scrape trip schedules from all configured fishingreservations.net pages.
 * Failures on individual pages are logged but do not stop the others.
 */
export async function scrapeFishingReservations(): Promise<LiveTrip[]> {
  const scrapedAt = new Date().toISOString();
  const allTrips: LiveTrip[] = [];

  for (const { url, landing } of RESERVATION_URLS) {
    try {
      const trips = await scrapeReservationPage(url, landing, scrapedAt);
      console.log(`[fishing-reservations] ${landing}: ${trips.length} trip(s)`);
      allTrips.push(...trips);
    } catch (err) {
      console.error(
        `[fishing-reservations] Failed to scrape "${landing}" (${url}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return allTrips;
}
