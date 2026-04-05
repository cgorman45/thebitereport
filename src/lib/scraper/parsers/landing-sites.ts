import * as cheerio from 'cheerio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingCatchEntry {
  boat: string;
  landing: string;
  tripType: string;
  anglers: number;
  species: { name: string; count: number }[];
  date: string; // ISO YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TheBiteReport/1.0; +https://thebitereport.com)';

const LANDING_SOURCES: {
  landing: string;
  url: string;
  parser: 'fishermans' | 'pointloma' | 'hmlanding';
}[] = [
  {
    landing: 'fishermans',
    url: 'https://www.fishermanslanding.com/fishcounts.php',
    parser: 'fishermans',
  },
  {
    landing: 'point_loma',
    url: 'https://www.pointlomasportfishing.com/fishcounts.php',
    parser: 'pointloma',
  },
  {
    landing: 'hm_landing',
    url: 'https://www.hmlanding.com/breaking-news',
    parser: 'hmlanding',
  },
];

// Known H&M Landing boat names for validation
const HM_BOATS = new Set([
  'grande', 'premier', 'malihini', 'horizon', 'fury',
  'patriot', 'old glory', 'chief', 'apollo',
]);

// Words that are never boat names
const NOT_BOATS = new Set([
  'they', 'he', 'she', 'we', 'it', 'who', 'that', 'which', 'also',
  'the', 'our', 'their', 'his', 'her', 'its', 'this', 'these',
  'both', 'all', 'some', 'each', 'every', 'today', 'yesterday',
]);

// Species name aliases — normalize to canonical names matching 976-tuna
const SPECIES_ALIASES: Record<string, string> = {
  'ling cod': 'lingcod',
  'red snapper': 'reds',
  'red rockfish': 'reds',
  'vermilion': 'reds',
  'vermilion rockfish': 'reds',
  'sand bass': 'sand bass',
  'sandbass': 'sand bass',
  'calico': 'calico bass',
  'white sea bass': 'white seabass',
  'mahi mahi': 'dorado',
  'mahi': 'dorado',
  'assorted rockfish': 'rockfish',
};

// Trip type patterns for extraction
const TRIP_TYPE_RE =
  /\b(Full[- ]?Day|1\/2\s*Day\s*(?:AM|PM)?|Half[- ]?Day\s*(?:AM|PM)?|3\/4[- ]?Day|AM\s*(?:trip)?|PM\s*(?:trip)?|Overnight|Twilight)\b/i;

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

/** Normalize a species name to match 976-tuna conventions */
function normalizeSpeciesName(raw: string): string {
  // Strip punctuation, parenthetical notes like "(released)", weight info
  let name = raw
    .replace(/[!?.]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\bup\s+to\s+\d+\s*(?:lbs?|pounds?)?\b/gi, '')
    .replace(/\bfrom\s+\d+[-–]\d+\s*(?:lbs?|pounds?)?\b/gi, '')
    .replace(/\b(?:released|short|limits?\s+of)\b/gi, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return SPECIES_ALIASES[name] ?? name;
}

/**
 * Parse species counts from text like "24 Yellowtail, 2 Bonito and 5 Ling cod!"
 */
function parseSpeciesList(text: string): { name: string; count: number }[] {
  const results: { name: string; count: number }[] = [];
  const parts = text
    .split(/,|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const count = parseInt(match[1], 10);
      const name = normalizeSpeciesName(match[2]);
      if (name && name.length > 1 && count > 0) {
        results.push({ name, count });
      }
    }
  }
  return results;
}

/**
 * Parse a date like "04/04/2026" or "April 4th, 2026" into ISO format.
 */
function parseDate(raw: string): string | null {
  // MM/DD/YYYY
  const slashMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0');
    const d = slashMatch[2].padStart(2, '0');
    return `${slashMatch[3]}-${m}-${d}`;
  }

  // "April 4th, 2026" or "Apr. 4, 2026"
  const cleaned = raw
    .replace(/(\d+)(?:st|nd|rd|th)/gi, '$1')
    .replace(/\./g, '')
    .trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** Extract trip type from a text string and return [tripType, remaining text] */
function extractTripType(text: string): [string, string] {
  const match = text.match(TRIP_TYPE_RE);
  if (!match) return ['', text];
  const tripType = match[1].trim();
  const remaining = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
  return [tripType, remaining];
}

// ---------------------------------------------------------------------------
// Per-landing parsers
// ---------------------------------------------------------------------------

/**
 * Fisherman's Landing (fishermanslanding.com/fishcounts.php)
 *
 * Lines look like:
 *   "04/04/2026"                                        ← date header
 *   "The Freeman 34 Full Day caught 10 Bonito, and 2 Yellowtail for 4 anglers."
 *   "The Dolphin AM trip caught 334 Rockfish for 61 anglers."
 */
function parseFishermans(html: string): LandingCatchEntry[] {
  const $ = cheerio.load(html);
  const entries: LandingCatchEntry[] = [];
  const text = $('body').text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentDate = new Date().toISOString().split('T')[0];

  for (const line of lines) {
    // Check for standalone date header (e.g. "04/04/2026")
    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s*$/.test(line)) {
      const d = parseDate(line);
      if (d) currentDate = d;
      continue;
    }

    // Also check for inline date at start of line
    const inlineDateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+/);
    if (inlineDateMatch) {
      const d = parseDate(inlineDateMatch[1]);
      if (d) currentDate = d;
    }

    // Must contain "caught ... for N anglers"
    const catchMatch = line.match(
      /(?:The\s+)?(.+?)\s+caught\s+([\s\S]+?)\s+for\s+(?:their\s+)?(\d+)\s+anglers/i,
    );
    if (!catchMatch) continue;

    const boatRaw = catchMatch[1].replace(/^The\s+/i, '').trim();
    const speciesText = catchMatch[2];
    const anglers = parseInt(catchMatch[3], 10);

    // Separate boat name from trip type
    const [tripType, boatClean] = extractTripType(boatRaw);
    // Remove trailing "trip" if still present
    const boat = boatClean.replace(/\s+trip$/i, '').trim();

    if (!boat || boat.length > 30) continue;

    const species = parseSpeciesList(speciesText);
    if (species.length === 0) continue;

    entries.push({
      boat,
      landing: 'fishermans',
      tripType,
      anglers,
      species,
      date: currentDate,
    });
  }

  return entries;
}

/**
 * Point Loma Sportfishing (pointlomasportfishing.com/fishcounts.php)
 *
 * HTML table: Boat | Trip Type | Anglers | Fish Count
 * Date in heading: "Point Loma Sportfishing Fish Counts for April 4th, 2026"
 */
function parsePointLoma(html: string): LandingCatchEntry[] {
  const $ = cheerio.load(html);
  const entries: LandingCatchEntry[] = [];

  // Find date from page heading or body text
  let pageDate = new Date().toISOString().split('T')[0];
  const bodyText = $('body').text();
  const dateMatch = bodyText.match(
    /(?:for|as\s+of)[^\n]*?((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d+\w*,?\s+\d{4})/i,
  );
  if (dateMatch) {
    const parsed = parseDate(dateMatch[1]);
    if (parsed) pageDate = parsed;
  }

  // Parse table rows
  $('table tr').each((_i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const boat = $(cells[0]).text().trim();
    const tripType = $(cells[1]).text().trim();
    const anglersText = $(cells[2]).text().trim();
    const anglers = parseInt(anglersText, 10);
    const speciesText = $(cells[3]).text().trim();

    // Skip header rows or empty rows
    if (!boat || isNaN(anglers) || !speciesText) return;
    if (/^boat$/i.test(boat)) return;

    const species = parseSpeciesList(speciesText);
    if (species.length === 0) return;

    entries.push({
      boat,
      landing: 'point_loma',
      tripType,
      anglers,
      species,
      date: pageDate,
    });
  });

  // Fallback: parse pipe-separated text (some pages use this format)
  if (entries.length === 0) {
    const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(.+)/);
      if (!m) continue;
      const species = parseSpeciesList(m[4]);
      if (species.length === 0) continue;
      entries.push({
        boat: m[1].trim(),
        landing: 'point_loma',
        tripType: m[2].trim(),
        anglers: parseInt(m[3], 10),
        species,
        date: pageDate,
      });
    }
  }

  return entries;
}

/**
 * H&M Landing (hmlanding.com/breaking-news)
 *
 * Entries are in <strong> or <h4> tags:
 *   "Grande caught 24 Yellowtail, 2 Bonito, 2 Cabezon, 2 Reds, 1 Sheephead and 5 Ling cod!"
 *   "Premier AM trip caught 112 Red Rockfish, 83 Rockfish and 1 Sheephead!"
 * Date headers are <h3>:
 *   "April 4th, 2026"
 */
function parseHMLanding(html: string): LandingCatchEntry[] {
  const $ = cheerio.load(html);
  const entries: LandingCatchEntry[] = [];

  // Collect all text blocks that might contain catch data
  // H&M uses <strong> and heading tags for entries
  const blocks: string[] = [];
  $('strong, b, h3, h4').each((_i, el) => {
    const text = $(el).text().trim();
    if (text) blocks.push(text);
  });

  // Also add plain paragraph text for entries not in bold
  $('p').each((_i, el) => {
    const text = $(el).text().trim();
    if (text && /caught\s+\d+/i.test(text)) {
      blocks.push(text);
    }
  });

  let currentDate = new Date().toISOString().split('T')[0];

  for (const block of blocks) {
    // Check for date headers (e.g., "April 4th, 2026")
    if (
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(block) &&
      /\b20\d{2}\b/.test(block) &&
      block.length < 50 &&
      !/caught/i.test(block)
    ) {
      const parsed = parseDate(block);
      if (parsed) {
        currentDate = parsed;
        continue;
      }
    }

    // Pattern: "[Boat] caught [species list]"
    // May or may not end with "for X anglers"
    const catchMatch = block.match(
      /^(.+?)\s+caught\s+([\d][\s\S]+?)(?:\s+for\s+(?:their\s+)?(\d+)\s+anglers)?[.!]?\s*$/i,
    );
    if (!catchMatch) continue;

    let boatRaw = catchMatch[1].replace(/^The\s+/i, '').trim();
    const speciesText = catchMatch[2];
    const anglers = catchMatch[3] ? parseInt(catchMatch[3], 10) : 0;

    // Extract trip type from boat name string
    const [tripType, boatClean] = extractTripType(boatRaw);
    let boat = boatClean.replace(/\s+trip$/i, '').trim();

    // Validate: skip if boat name looks like a pronoun/article or is too long
    if (boat.length > 25) continue;
    if (NOT_BOATS.has(boat.toLowerCase())) continue;

    // Additional validation: if we know H&M boats, prefer known names
    // but don't reject unknowns (new boats get added)
    const species = parseSpeciesList(speciesText);
    if (species.length === 0) continue;

    entries.push({
      boat,
      landing: 'hm_landing',
      tripType,
      anglers,
      species,
      date: currentDate,
    });
  }

  // Deduplicate — same boat+date+tripType appearing in both <strong> and <p>
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.boat.toLowerCase()}|${e.date}|${e.tripType.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Exported scraper
// ---------------------------------------------------------------------------

/**
 * Scrape fish counts directly from individual landing websites.
 * Used for cross-verification against 976-tuna.com data.
 */
export async function scrapeLandingSites(): Promise<LandingCatchEntry[]> {
  const allEntries: LandingCatchEntry[] = [];

  for (const { landing, url, parser } of LANDING_SOURCES) {
    try {
      const html = await fetchWithTimeout(url);
      let entries: LandingCatchEntry[];

      switch (parser) {
        case 'fishermans':
          entries = parseFishermans(html);
          break;
        case 'pointloma':
          entries = parsePointLoma(html);
          break;
        case 'hmlanding':
          entries = parseHMLanding(html);
          break;
      }

      console.log(`[landing-sites] ${landing}: ${entries.length} entries`);
      allEntries.push(...entries);
    } catch (err) {
      console.error(
        `[landing-sites] Failed to scrape "${landing}" (${url}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return allEntries;
}
