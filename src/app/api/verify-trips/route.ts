import { NextResponse } from 'next/server';
import { scrapeFishingReservations, type LiveTrip } from '@/lib/scraper/parsers/fishing-reservations';
import {
  scrapeLandingSchedules,
  type LandingTrip,
} from '@/lib/scraper/parsers/landing-schedules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TripMatch {
  tripId: string;
  boatName: string;
  landing: string;
  departureDate: string;
  duration: string;
  fishingreservations: {
    price: number;
    spotsLeft: number;
    maxAnglers: number;
    departureTime: string;
    status: string;
  } | null;
  landingSite: {
    price: number;
    spotsLeft: number;
    maxAnglers: number;
    departureTime: string;
    status: string;
    source: string;
  } | null;
  discrepancies: string[];
}

interface VerificationResult {
  verifiedAt: string;
  landings: string[];
  totalFishingReservations: number;
  totalLandingSites: number;
  matches: TripMatch[];
  summary: {
    matched: number;
    matchedClean: number;
    missingFromFishingReservations: number;
    missingFromLandingSites: number;
    priceMismatches: number;
    spotsMismatches: number;
    capacityMismatches: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeBoat(name: string): string {
  return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDuration(d: string): string {
  return (d ?? '').trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/half-day/g, 'half day')
    .replace(/full-day/g, 'full day');
}

/**
 * Build a matching key from trip data.
 * tripId is the best match — if both sources have it, that's definitive.
 * Fallback to boat+date+duration for cross-source matching.
 */
function tripKey(boatName: string, date: string, duration: string): string {
  return `${normalizeBoat(boatName)}|${date}|${normalizeDuration(duration)}`;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Scrape both sources in parallel
    const [frTrips, landingTrips] = await Promise.all([
      scrapeFishingReservations(),
      scrapeLandingSchedules(),
    ]);

    // Only compare landings we have data from both sources
    const landingsWithDirectData = new Set(landingTrips.map((t) => t.landing));

    // Filter fishingreservations.net to only verifiable landings
    const comparableFR = frTrips.filter((t) => landingsWithDirectData.has(t.landing));

    // Build maps — try tripId first, fall back to boat+date+duration
    const frByTripId = new Map<string, LiveTrip>();
    const frByKey = new Map<string, LiveTrip[]>();
    for (const t of comparableFR) {
      if (t.bookingUrl) {
        const idMatch = t.bookingUrl.match(/trip_id=(\d+)/);
        if (idMatch) frByTripId.set(idMatch[1], t);
      }
      const key = tripKey(t.boatName, t.departureDate, t.duration);
      (frByKey.get(key) ?? (frByKey.set(key, []), frByKey.get(key)!)).push(t);
    }

    const landingByTripId = new Map<string, LandingTrip>();
    const landingByKey = new Map<string, LandingTrip[]>();
    for (const t of landingTrips) {
      if (t.tripId) landingByTripId.set(t.tripId, t);
      const key = tripKey(t.boatName, t.departureDate, t.duration);
      (landingByKey.get(key) ?? (landingByKey.set(key, []), landingByKey.get(key)!)).push(t);
    }

    const processedFR = new Set<string>();
    const processedLanding = new Set<string>();
    const matches: TripMatch[] = [];
    let matched = 0;
    let matchedClean = 0;
    let missingFromFishingReservations = 0;
    let missingFromLandingSites = 0;
    let priceMismatches = 0;
    let spotsMismatches = 0;
    let capacityMismatches = 0;

    function addMatch(fr: LiveTrip | null, landing: LandingTrip | null) {
      const discrepancies: string[] = [];
      const boatName = fr?.boatName ?? landing?.boatName ?? '';
      const landingName = fr?.landing ?? landing?.landing ?? '';
      const date = fr?.departureDate ?? landing?.departureDate ?? '';
      const duration = fr?.duration ?? landing?.duration ?? '';
      const tripId = landing?.tripId ?? '';

      if (!fr) {
        missingFromFishingReservations++;
        discrepancies.push('Trip missing from fishingreservations.net');
      } else if (!landing) {
        missingFromLandingSites++;
        discrepancies.push('Trip missing from landing website');
      } else {
        matched++;

        // Compare prices
        if (fr.pricePerPerson > 0 && landing.pricePerPerson > 0 &&
            Math.abs(fr.pricePerPerson - landing.pricePerPerson) > 0.01) {
          priceMismatches++;
          discrepancies.push(
            `Price differs: fishingreservations=$${fr.pricePerPerson.toFixed(2)}, landing=$${landing.pricePerPerson.toFixed(2)}`,
          );
        }

        // Compare spots
        if (fr.spotsLeft !== landing.spotsLeft) {
          // Only flag if meaningfully different (not just OPEN vs OPEN)
          const frDisplay = fr.spotsLeft === 999 ? 'OPEN' : fr.spotsLeft === 0 ? 'Full' : String(fr.spotsLeft);
          const landDisplay = landing.spotsLeft === 999 ? 'OPEN' : landing.spotsLeft === 0 ? 'Full' : String(landing.spotsLeft);
          if (frDisplay !== landDisplay) {
            spotsMismatches++;
            discrepancies.push(`Spots differ: fishingreservations=${frDisplay}, landing=${landDisplay}`);
          }
        }

        // Compare capacity
        if (fr.maxAnglers > 0 && landing.maxAnglers > 0 && fr.maxAnglers !== landing.maxAnglers) {
          capacityMismatches++;
          discrepancies.push(
            `Max anglers differs: fishingreservations=${fr.maxAnglers}, landing=${landing.maxAnglers}`,
          );
        }

        if (discrepancies.length === 0) matchedClean++;
      }

      matches.push({
        tripId,
        boatName,
        landing: landingName,
        departureDate: date,
        duration,
        fishingreservations: fr
          ? {
              price: fr.pricePerPerson,
              spotsLeft: fr.spotsLeft,
              maxAnglers: fr.maxAnglers,
              departureTime: fr.departureTime,
              status: fr.status,
            }
          : null,
        landingSite: landing
          ? {
              price: landing.pricePerPerson,
              spotsLeft: landing.spotsLeft,
              maxAnglers: landing.maxAnglers,
              departureTime: landing.departureTime,
              status: landing.status,
              source: landing.source,
            }
          : null,
        discrepancies,
      });
    }

    // Pass 1: match by tripId (most reliable)
    for (const [tripId, landing] of landingByTripId) {
      const fr = frByTripId.get(tripId);
      if (!fr) continue;
      processedFR.add(tripKey(fr.boatName, fr.departureDate, fr.duration));
      processedLanding.add(tripId);
      addMatch(fr, landing);
    }

    // Pass 2: match by boat+date+duration for unmatched entries
    for (const [key, frList] of frByKey) {
      if (processedFR.has(key)) continue;
      const landingList = landingByKey.get(key);
      if (!landingList) continue;

      const unmatchedLanding = landingList.find((t) => !processedLanding.has(t.tripId));
      if (!unmatchedLanding) continue;

      processedFR.add(key);
      processedLanding.add(unmatchedLanding.tripId);
      addMatch(frList[0], unmatchedLanding);
    }

    // Pass 3: unmatched from fishingreservations.net (only today+future)
    const today = new Date().toISOString().split('T')[0];
    for (const [key, frList] of frByKey) {
      if (processedFR.has(key)) continue;
      if (frList[0].departureDate >= today) {
        addMatch(frList[0], null);
      }
    }

    // Pass 4: unmatched from landing sites (only today+future)
    for (const [tripId, landing] of landingByTripId) {
      if (processedLanding.has(tripId)) continue;
      if (landing.departureDate >= today) {
        addMatch(null, landing);
      }
    }

    // Sort: discrepancies first, then by date+boat
    matches.sort((a, b) => {
      if (a.discrepancies.length > 0 && b.discrepancies.length === 0) return -1;
      if (a.discrepancies.length === 0 && b.discrepancies.length > 0) return 1;
      const dateComp = a.departureDate.localeCompare(b.departureDate);
      if (dateComp !== 0) return dateComp;
      return a.boatName.localeCompare(b.boatName);
    });

    const result: VerificationResult = {
      verifiedAt: new Date().toISOString(),
      landings: [...landingsWithDirectData],
      totalFishingReservations: comparableFR.length,
      totalLandingSites: landingTrips.length,
      matches,
      summary: {
        matched,
        matchedClean,
        missingFromFishingReservations,
        missingFromLandingSites,
        priceMismatches,
        spotsMismatches,
        capacityMismatches,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/verify-trips] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
