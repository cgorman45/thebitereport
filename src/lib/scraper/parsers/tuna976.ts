import * as cheerio from 'cheerio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveCatchReport {
  id: string;
  date: string;        // ISO date YYYY-MM-DD
  boat: string;
  landing: string;
  tripType: string;
  species: string;     // primary (highest priority)
  count: number;       // count of primary species
  anglers: number;
  area: string;        // empty for now
  also: { species: string; count: number }[];
  scrapedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Species priority list — index 0 is highest priority.
 * Normalised to lowercase for comparison.
 */
const SPECIES_PRIORITY: string[] = [
  'bluefin tuna',
  'yellowfin tuna',
  'yellowtail',
  'white seabass',
  'dorado',
  'calico bass',
  'barracuda',
  'lingcod',
  'rockfish',
];

const LANDING_URLS: { url: string; landing: string }[] = [
  { url: 'https://www.976-tuna.com/landing/4/seaforth/counts',                landing: 'seaforth'    },
  { url: 'https://www.976-tuna.com/landing/3/fishermans-landing/counts',      landing: 'fishermans'  },
  { url: 'https://www.976-tuna.com/landing/17/h-m-landing/counts',            landing: 'hm_landing'  },
  { url: 'https://www.976-tuna.com/landing/32/point-loma-sportfishing/counts',landing: 'point_loma'  },
  { url: 'https://www.976-tuna.com/landing/16/helgrens-sportfishing/counts',  landing: 'helgrens'    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the priority index for a species name (lower = higher priority).
 * Returns Infinity for unrecognised species.
 */
function speciesPriority(name: string): number {
  const normalised = name.trim().toLowerCase();
  const idx = SPECIES_PRIORITY.indexOf(normalised);
  return idx === -1 ? Infinity : idx;
}

/**
 * Parse a date string like "Thursday April 2nd 2026" into an ISO date.
 * Falls back to today's date if parsing fails.
 */
function parseDateHeader(raw: string): string {
  // Strip ordinal suffixes: 1st, 2nd, 3rd, 4th…
  const cleaned = raw.replace(/(\d+)(?:st|nd|rd|th)/gi, '$1').trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    // Use UTC to avoid timezone shifts
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Fallback: today
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a species+count string like:
 *   "28 rockfish, 6 whitefish, 5 sculpin, and 3 sheephead"
 * Returns an array of { species, count } objects.
 */
function parseSpeciesCounts(caughtText: string): { species: string; count: number }[] {
  const results: { species: string; count: number }[] = [];

  // Split on commas or " and "
  const parts = caughtText
    .split(/,|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    // Each part should be "[count] [species name]"
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const count = parseInt(match[1], 10);
      const species = match[2].trim().toLowerCase();
      if (species && count > 0) {
        results.push({ species, count });
      }
    }
  }

  return results;
}

/**
 * Fetch a single landing page and extract catch reports from it.
 */
async function scrapeLandingPage(
  url: string,
  landing: string,
  scrapedAt: string,
): Promise<LiveCatchReport[]> {
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
  const reports: LiveCatchReport[] = [];

  // Find the date header — typically an <h2> or <h3> containing day/month text
  let pageDate = new Date().toISOString().split('T')[0];
  $('h1, h2, h3, h4, .date, .report-date').each((_i, el) => {
    const text = $(el).text().trim();
    // Look for something that contains a month name and a year
    if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text) && /\b20\d{2}\b/.test(text)) {
      pageDate = parseDateHeader(text);
      return false; // stop iterating
    }
  });

  // Each boat entry lives inside a div.row.card
  $('div.row.card').each((_i, card) => {
    const cardText = $(card).text();

    // Must contain "with X anglers on a"
    if (!/with\s+\d+\s+anglers\s+on\s+a/i.test(cardText)) return;

    // Boat name: text of the first <a> tag in the card
    const boatAnchor = $(card).find('a').first();
    const boat = boatAnchor.text().trim();
    if (!boat) return;

    // Angler count
    const anglerMatch = cardText.match(/with\s+(\d+)\s+anglers/i);
    const anglers = anglerMatch ? parseInt(anglerMatch[1], 10) : 0;

    // Trip type: text between "on a" and "caught"
    const tripMatch = cardText.match(/on\s+a\s+(.+?)\s+caught/i);
    const tripType = tripMatch ? tripMatch[1].trim() : '';

    // Species counts: text after "caught"
    const caughtMatch = cardText.match(/caught\s+([\s\S]+?)\.?\s*$/);
    if (!caughtMatch) return;

    const speciesCounts = parseSpeciesCounts(caughtMatch[1]);
    if (speciesCounts.length === 0) return;

    // Sort by priority; ties broken by count descending
    const sorted = [...speciesCounts].sort((a, b) => {
      const pa = speciesPriority(a.species);
      const pb = speciesPriority(b.species);
      if (pa !== pb) return pa - pb;
      return b.count - a.count;
    });

    const primary = sorted[0];
    const also = sorted.slice(1);

    reports.push({
      id: crypto.randomUUID(),
      date: pageDate,
      boat,
      landing,
      tripType,
      species: primary.species,
      count: primary.count,
      anglers,
      area: '',
      also,
      scrapedAt,
    });
  });

  return reports;
}

// ---------------------------------------------------------------------------
// Exported scraper
// ---------------------------------------------------------------------------

/**
 * Scrape fish counts from all configured 976-tuna.com landing pages.
 * Failures on individual pages are logged but do not stop the others.
 */
export async function scrape976Tuna(): Promise<LiveCatchReport[]> {
  const scrapedAt = new Date().toISOString();
  const allReports: LiveCatchReport[] = [];

  for (const { url, landing } of LANDING_URLS) {
    try {
      const reports = await scrapeLandingPage(url, landing, scrapedAt);
      console.log(`[976-tuna] ${landing}: ${reports.length} report(s)`);
      allReports.push(...reports);
    } catch (err) {
      console.error(
        `[976-tuna] Failed to scrape "${landing}" (${url}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return allReports;
}
