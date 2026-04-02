import * as cheerio from 'cheerio';
import type { CatchReport } from '@/types';
import { scrapeSources, type ScrapeSource } from './sources';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Common SoCal sportfish species used to identify relevant lines of text.
 * Ordered longest-first so partial matches don't shadow longer ones.
 */
const KNOWN_SPECIES: string[] = [
  'yellowfin tuna',
  'bluefin tuna',
  'bigeye tuna',
  'albacore tuna',
  'yellowtail',
  'white seabass',
  'calico bass',
  'sand bass',
  'striped bass',
  'sheephead',
  'rockfish',
  'lingcod',
  'halibut',
  'barracuda',
  'bonito',
  'dorado',
  'mahi',
  'marlin',
  'swordfish',
  'wahoo',
  'tuna',
  'bass',
  'salmon',
  'opah',
  'triggerfish',
  'sculpin',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a species string: trim, lowercase, collapse whitespace.
 */
function normaliseSpecies(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extract today's ISO date string in YYYY-MM-DD format.
 */
function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a date string from scraped text. Returns ISO YYYY-MM-DD if
 * recognisable, otherwise falls back to today.
 */
function parseDate(raw: string): string {
  const cleaned = raw.trim();

  // MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = cleaned.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return todayIso();
}

/**
 * Given a block of plain text, attempt to extract CatchReport entries.
 *
 * Strategy:
 *  1. Walk every line of text from the page.
 *  2. If a line contains a known species name, look for an integer count
 *     in the same line or the immediately adjacent lines.
 *  3. Look for a date anywhere in the surrounding ±3 lines.
 */
function extractCatchesFromText(
  lines: string[],
  source: ScrapeSource,
  scrapedAt: string,
): CatchReport[] {
  const reports: CatchReport[] = [];
  const primarySlug = source.locationSlugs[0] ?? 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    for (const species of KNOWN_SPECIES) {
      if (!line.includes(species)) continue;

      // Look for a count: a bare integer near the species mention.
      // Check current line and ±1 lines.
      const window = [
        lines[i - 1] ?? '',
        lines[i],
        lines[i + 1] ?? '',
      ].join(' ');

      const countMatch = window.match(/\b(\d{1,5})\b/);
      const count = countMatch ? parseInt(countMatch[1], 10) : 0;

      // Look for a date in a ±3 line window.
      let reportDate = todayIso();
      for (let offset = -3; offset <= 3; offset++) {
        const nearby = lines[i + offset] ?? '';
        const dateMatch = nearby.match(
          /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b|(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
        );
        if (dateMatch) {
          reportDate = parseDate(dateMatch[0]);
          break;
        }
      }

      reports.push({
        id: crypto.randomUUID(),
        date: reportDate,
        locationSlug: primarySlug,
        species: normaliseSpecies(species),
        count,
        source: source.name,
        sourceUrl: source.url,
        scrapedAt,
      });

      // Avoid adding the same species twice from overlapping windows.
      break;
    }
  }

  return reports;
}

// ---------------------------------------------------------------------------
// Generic parser
// ---------------------------------------------------------------------------

/**
 * Fetch a URL and use cheerio to pull visible text, then run the
 * species-extraction heuristic over it.
 */
async function parseGenericFishCounts(
  source: ScrapeSource,
  scrapedAt: string,
): Promise<CatchReport[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; TheBiteReport/1.0; +https://thebitereport.com)',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${source.url}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  // Remove script/style noise before extracting text.
  $('script, style, noscript, nav, footer, header').remove();

  // Extract visible text line-by-line from the body.
  const rawText = $('body').text();
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return extractCatchesFromText(lines, source, scrapedAt);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Scrape all configured sources and return a flat array of CatchReport
 * objects. Sources that fail are skipped so one bad endpoint never blocks
 * the rest.
 */
export async function scrapeAllSources(): Promise<CatchReport[]> {
  const scrapedAt = new Date().toISOString();
  const allReports: CatchReport[] = [];

  for (const source of scrapeSources) {
    try {
      let reports: CatchReport[];

      switch (source.parser) {
        case 'generic-fish-counts':
        default:
          reports = await parseGenericFishCounts(source, scrapedAt);
          break;
      }

      console.log(
        `[scraper] ${source.name}: ${reports.length} catch report(s) extracted`,
      );
      allReports.push(...reports);
    } catch (err) {
      console.error(
        `[scraper] Failed to scrape "${source.name}" (${source.url}):`,
        err instanceof Error ? err.message : err,
      );
      // Continue with remaining sources.
    }
  }

  console.log(
    `[scraper] Total: ${allReports.length} reports from ${scrapeSources.length} sources`,
  );

  return allReports;
}
