import { NextResponse } from 'next/server';
import { scrape976Tuna } from '@/lib/scraper/parsers/tuna976';
import { FLEET_ROSTER } from '@/lib/fleet/boats';
import { withCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/fleet/active-boats
 *
 * Returns the set of boats that have submitted catch reports recently.
 * Used by the AIS collector to dynamically track only active fleet boats.
 *
 * Response: {
 *   boats: [{ name, mmsi, landing }],
 *   unmatchedBoats: string[],    // boats in catch reports but not in roster
 *   scrapedAt: string,
 * }
 */
export async function GET() {
  try {
    const result = await withCache('active-boats', 3600, async () => {
      const reports = await scrape976Tuna();

      // Extract unique boat names from catch reports
      const reportedBoats = new Set(reports.map((r) => r.boat));

      // Match to fleet roster (case-insensitive)
      const matched: { name: string; mmsi: number; landing: string }[] = [];
      const unmatched: string[] = [];

      for (const boatName of reportedBoats) {
        const rosterEntry = FLEET_ROSTER.find(
          (b) => b.name.toLowerCase() === boatName.toLowerCase(),
        );

        if (rosterEntry && rosterEntry.mmsi > 0) {
          matched.push({
            name: rosterEntry.name,
            mmsi: rosterEntry.mmsi,
            landing: rosterEntry.landing,
          });
        } else if (!rosterEntry) {
          unmatched.push(boatName);
        }
        // mmsi === 0 boats (Grande, Malihini) are silently skipped — no AIS
      }

      return {
        boats: matched,
        unmatchedBoats: unmatched,
        totalReports: reports.length,
        scrapedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/fleet/active-boats] Error:', message);
    return NextResponse.json({ error: message, boats: [] }, { status: 500 });
  }
}
