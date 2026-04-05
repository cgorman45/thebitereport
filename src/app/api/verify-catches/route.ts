import { NextResponse } from 'next/server';
import { scrape976Tuna, type LiveCatchReport } from '@/lib/scraper/parsers/tuna976';
import {
  scrapeLandingSites,
  type LandingCatchEntry,
} from '@/lib/scraper/parsers/landing-sites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoatMatch {
  boat: string;
  landing: string;
  date: string;
  tuna976: { tripType: string; anglers: number; species: { name: string; count: number }[] } | null;
  landingSite: { tripType: string; anglers: number; species: { name: string; count: number }[] } | null;
  discrepancies: string[];
}

interface VerificationResult {
  verifiedAt: string;
  landings: string[];
  totalTuna976: number;
  totalLandingSites: number;
  matches: BoatMatch[];
  summary: {
    matched: number;
    missingFromTuna976: number;
    missingFromLandingSites: number;
    speciesMismatches: number;
    anglerMismatches: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize boat names for comparison */
function normalizeBoat(name: string): string {
  return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Species aliases for cross-source comparison */
const SPECIES_NORMALIZE: Record<string, string> = {
  'red snapper': 'reds',
  'red rockfish': 'reds',
  'vermilion': 'reds',
  'vermilion rockfish': 'reds',
  'ling cod': 'lingcod',
  'sand bass': 'sandbass',
  'calico': 'calico bass',
  'white sea bass': 'white seabass',
  'mahi mahi': 'dorado',
  'mahi': 'dorado',
  'assorted rockfish': 'rockfish',
};

/** Normalize species names for comparison */
function normalizeSpecies(name: string): string {
  const clean = (name ?? '').trim().toLowerCase()
    .replace(/[!?.]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\bup\s+to\s+\d+\s*(?:lbs?|pounds?)?\b/gi, '')
    .replace(/\bfrom\s+\d+[-–]\d+\s*(?:lbs?|pounds?)?\b/gi, '')
    .replace(/\b(?:released|short|limits?\s+of)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return SPECIES_NORMALIZE[clean] ?? clean;
}

/** Convert 976-tuna report to a flat species list */
function tuna976ToSpecies(report: LiveCatchReport): { name: string; count: number }[] {
  const list: { name: string; count: number }[] = [{ name: report.species, count: report.count }];
  if (report.also) {
    for (const a of report.also) {
      list.push({ name: a.species, count: a.count });
    }
  }
  return list;
}

/** Normalize trip type for key matching */
function normalizeTripType(t: string): string {
  const s = (t ?? '').trim().toLowerCase();
  if (/\bam\b/.test(s) || /\bmorning\b/.test(s)) return 'am';
  if (/\bpm\b/.test(s) || /\bafternoon\b/.test(s)) return 'pm';
  if (/\bfull\b/.test(s)) return 'full';
  if (/\b3\/4\b/.test(s)) return '3/4';
  if (/\bovernight\b/.test(s)) return 'overnight';
  return s.slice(0, 10);
}

/** Build a lookup key for matching boats */
function boatKey(boat: string, landing: string, date: string, tripType?: string): string {
  const trip = tripType ? normalizeTripType(tripType) : '';
  return `${normalizeBoat(boat)}|${landing}|${date}|${trip}`;
}

/** Compare two species lists and return discrepancy descriptions */
function compareSpecies(
  source: string,
  a: { name: string; count: number }[],
  b: { name: string; count: number }[],
): string[] {
  const discrepancies: string[] = [];

  const mapA = new Map<string, number>();
  for (const s of a) mapA.set(normalizeSpecies(s.name), s.count);

  const mapB = new Map<string, number>();
  for (const s of b) mapB.set(normalizeSpecies(s.name), s.count);

  // Species in A but not B
  for (const [species, count] of mapA) {
    if (!mapB.has(species)) {
      discrepancies.push(`${species} (${count}) in 976-tuna but not ${source}`);
    } else if (mapB.get(species) !== count) {
      discrepancies.push(
        `${species} count differs: 976-tuna=${count}, ${source}=${mapB.get(species)}`,
      );
    }
  }

  // Species in B but not A
  for (const [species, count] of mapB) {
    if (!mapA.has(species)) {
      discrepancies.push(`${species} (${count}) in ${source} but not 976-tuna`);
    }
  }

  return discrepancies;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Scrape both sources in parallel
    const [tuna976Reports, landingEntries] = await Promise.all([
      scrape976Tuna(),
      scrapeLandingSites(),
    ]);

    // Only compare landings we have data from both sources
    const landingsWithDirectData = new Set(landingEntries.map((e) => e.landing));

    // Filter 976-tuna to only landings we can verify
    const comparableTuna = tuna976Reports.filter((r) =>
      landingsWithDirectData.has(r.landing),
    );

    // Build maps keyed by boat+landing+date+tripType (precise match)
    // and also boat+landing+date (fuzzy match for when trip types differ)
    const tunaByKey = new Map<string, LiveCatchReport[]>();
    const tunaByBoatDate = new Map<string, LiveCatchReport[]>();
    for (const r of comparableTuna) {
      const key = boatKey(r.boat, r.landing, r.date, r.tripType);
      (tunaByKey.get(key) ?? (tunaByKey.set(key, []), tunaByKey.get(key)!)).push(r);
      const fuzzy = `${normalizeBoat(r.boat)}|${r.landing}|${r.date}`;
      (tunaByBoatDate.get(fuzzy) ?? (tunaByBoatDate.set(fuzzy, []), tunaByBoatDate.get(fuzzy)!)).push(r);
    }

    const landingByKey = new Map<string, LandingCatchEntry[]>();
    const landingByBoatDate = new Map<string, LandingCatchEntry[]>();
    for (const e of landingEntries) {
      const key = boatKey(e.boat, e.landing, e.date, e.tripType);
      (landingByKey.get(key) ?? (landingByKey.set(key, []), landingByKey.get(key)!)).push(e);
      const fuzzy = `${normalizeBoat(e.boat)}|${e.landing}|${e.date}`;
      (landingByBoatDate.get(fuzzy) ?? (landingByBoatDate.set(fuzzy, []), landingByBoatDate.get(fuzzy)!)).push(e);
    }

    // Match strategy: try exact key first, then fuzzy (boat+landing+date only)
    const processedTuna = new Set<string>();
    const processedLanding = new Set<string>();
    const matches: BoatMatch[] = [];
    let matched = 0;
    let missingFromTuna976 = 0;
    let missingFromLandingSites = 0;
    let speciesMismatches = 0;
    let anglerMismatches = 0;

    // Helper to build a match entry
    function addMatch(
      tuna: LiveCatchReport | null,
      landing: LandingCatchEntry | null,
    ) {
      const boatName = tuna?.boat ?? landing?.boat ?? '';
      const landName = tuna?.landing ?? landing?.landing ?? '';
      const date = tuna?.date ?? landing?.date ?? '';
      const discrepancies: string[] = [];

      if (!tuna) {
        missingFromTuna976++;
        discrepancies.push('Boat missing from 976-tuna.com');
      } else if (!landing) {
        missingFromLandingSites++;
        discrepancies.push('Boat missing from landing website');
      } else {
        matched++;
        if (landing.anglers > 0 && tuna.anglers > 0 && tuna.anglers !== landing.anglers) {
          anglerMismatches++;
          discrepancies.push(
            `Angler count differs: 976-tuna=${tuna.anglers}, landing=${landing.anglers}`,
          );
        }
        const tunaSpecies = tuna976ToSpecies(tuna);
        const speciesDisc = compareSpecies(landName, tunaSpecies, landing.species);
        if (speciesDisc.length > 0) {
          speciesMismatches++;
          discrepancies.push(...speciesDisc);
        }
      }

      matches.push({
        boat: boatName,
        landing: landName,
        date,
        tuna976: tuna
          ? { tripType: tuna.tripType, anglers: tuna.anglers, species: tuna976ToSpecies(tuna) }
          : null,
        landingSite: landing
          ? { tripType: landing.tripType, anglers: landing.anglers, species: landing.species }
          : null,
        discrepancies,
      });
    }

    // Pass 1: exact key matches (boat+landing+date+tripType)
    for (const key of tunaByKey.keys()) {
      if (!landingByKey.has(key)) continue;
      processedTuna.add(key);
      processedLanding.add(key);
      addMatch(tunaByKey.get(key)![0], landingByKey.get(key)![0]);
    }

    // Pass 2: fuzzy matches for unmatched entries (boat+landing+date, ignore trip type)
    // This handles cases where trip type naming differs between sources
    for (const [fuzzyKey, tunaList] of tunaByBoatDate) {
      for (const tuna of tunaList) {
        const exactKey = boatKey(tuna.boat, tuna.landing, tuna.date, tuna.tripType);
        if (processedTuna.has(exactKey)) continue;

        // Find unmatched landing entry for same boat+landing+date
        const landingList = landingByBoatDate.get(fuzzyKey);
        if (!landingList) continue;

        const unmatchedLanding = landingList.find((e) => {
          const lKey = boatKey(e.boat, e.landing, e.date, e.tripType);
          return !processedLanding.has(lKey);
        });
        if (!unmatchedLanding) continue;

        processedTuna.add(exactKey);
        processedLanding.add(boatKey(unmatchedLanding.boat, unmatchedLanding.landing, unmatchedLanding.date, unmatchedLanding.tripType));
        addMatch(tuna, unmatchedLanding);
      }
    }

    // Pass 3: remaining unmatched entries from each source
    for (const [key, list] of tunaByKey) {
      if (processedTuna.has(key)) continue;
      // Only report today's data as missing (older data may have fallen off landing sites)
      const today = new Date().toISOString().split('T')[0];
      if (list[0].date === today) {
        addMatch(list[0], null);
      }
    }
    for (const [key, list] of landingByKey) {
      if (processedLanding.has(key)) continue;
      const today = new Date().toISOString().split('T')[0];
      if (list[0].date === today) {
        addMatch(null, list[0]);
      }
    }

    // Sort: discrepancies first, then by landing+boat
    matches.sort((a, b) => {
      if (a.discrepancies.length > 0 && b.discrepancies.length === 0) return -1;
      if (a.discrepancies.length === 0 && b.discrepancies.length > 0) return 1;
      return `${a.landing}${a.boat}`.localeCompare(`${b.landing}${b.boat}`);
    });

    const result: VerificationResult = {
      verifiedAt: new Date().toISOString(),
      landings: [...landingsWithDirectData],
      totalTuna976: comparableTuna.length,
      totalLandingSites: landingEntries.length,
      matches,
      summary: {
        matched,
        missingFromTuna976,
        missingFromLandingSites,
        speciesMismatches,
        anglerMismatches,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/verify-catches] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
