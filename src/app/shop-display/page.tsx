'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ScheduledTrip } from '@/lib/trips/types';
import { getLandingName, getLandingColor } from '@/lib/landings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatchReport {
  id: string;
  boat: string;
  landing: string;
  tripType?: string;
  date: string;
  species: string;
  count: number;
  anglers: number;
  area: string;
  also?: { species: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const T = {
  bg: '#0a0f1a',
  surface: '#131b2e',
  border: '#1e2a42',
  primary: '#00d4ff',
  text: '#e2e8f0',
  muted: '#8899aa',
} as const;

// ---------------------------------------------------------------------------
// Species bar colors (kiosk leaderboard)
// ---------------------------------------------------------------------------

const SPECIES_BAR_COLORS: Record<string, string> = {
  'Bluefin Tuna': '#3b82f6',
  'Yellowfin Tuna': '#eab308',
  'Yellowtail': '#22c55e',
  'White Seabass': '#94a3b8',
  'Dorado': '#f59e0b',
  'Calico Bass': '#a855f7',
  'Barracuda': '#06b6d4',
  'Rockfish': '#ef4444',
  'Lingcod': '#f97316',
  'Sculpin': '#ec4899',
  'Bonito': '#14b8a6',
};

function speciesColor(name: string): string {
  return SPECIES_BAR_COLORS[name] ?? T.muted;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrice(cents: number): string {
  if (!cents || cents <= 0) return '';
  return `$${cents}`;
}

/** Aggregate all species counts (primary + also) from catch reports. */
function buildSpeciesLeaderboard(
  reports: CatchReport[],
): { species: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of reports) {
    map.set(r.species, (map.get(r.species) ?? 0) + r.count);
    if (r.also) {
      for (const a of r.also) {
        map.set(a.species, (map.get(a.species) ?? 0) + a.count);
      }
    }
  }
  return Array.from(map.entries())
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ShopDisplayPage() {
  // ---- state ---------------------------------------------------------------
  const [now, setNow] = useState(new Date());
  const [reports, setReports] = useState<CatchReport[]>([]);
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [tripPage, setTripPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // ---- data fetching -------------------------------------------------------
  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, tripsRes] = await Promise.all([
        fetch('/api/catch-reports'),
        fetch('/api/trips'),
      ]);
      const reportsData = await reportsRes.json();
      const tripsData = await tripsRes.json();
      if (Array.isArray(reportsData)) setReports(reportsData);
      if (Array.isArray(tripsData)) setTrips(tripsData);
    } catch {
      /* silently retry on next interval */
    } finally {
      setLoading(false);
    }
  }, []);

  // Clock tick — every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Initial fetch + 5 min refresh
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Trip carousel — rotate every 10 seconds
  const TRIPS_PER_PAGE = 8;
  const futureTrips = trips
    .filter((t) => t.spotsLeft > 0)
    .sort(
      (a, b) =>
        new Date(`${a.departureDate}T00:00`).getTime() -
        new Date(`${b.departureDate}T00:00`).getTime(),
    );
  const totalTripPages = Math.max(1, Math.ceil(futureTrips.length / TRIPS_PER_PAGE));

  useEffect(() => {
    if (totalTripPages <= 1) return;
    const id = setInterval(() => {
      setTripPage((p) => (p + 1) % totalTripPages);
    }, 10_000);
    return () => clearInterval(id);
  }, [totalTripPages]);

  const visibleTrips = futureTrips.slice(
    tripPage * TRIPS_PER_PAGE,
    tripPage * TRIPS_PER_PAGE + TRIPS_PER_PAGE,
  );

  // ---- derived data --------------------------------------------------------
  const totalFish = reports.reduce((sum, r) => {
    let extra = 0;
    if (r.also) {
      for (const a of r.also) extra += a.count;
    }
    return sum + r.count + extra;
  }, 0);
  const totalAnglers = reports.reduce((sum, r) => sum + r.anglers, 0);
  const tripsOut = new Set(reports.map((r) => `${r.boat}-${r.date}`)).size;
  const leaderboard = buildSpeciesLeaderboard(reports).slice(0, 6);
  const maxCount = leaderboard[0]?.count ?? 1;

  // ---- render --------------------------------------------------------------
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: T.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: T.muted, fontSize: '1.5rem', fontFamily: 'sans-serif' }}>
          Loading display...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: T.bg,
        color: T.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ================================================================== */}
      {/* HEADER BAR                                                         */}
      {/* ================================================================== */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: `1px solid ${T.border}`,
          backgroundColor: T.surface,
          flexShrink: 0,
        }}
      >
        {/* Branding + live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: T.text,
            }}
          >
            The Bite Report
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'livePulse 1.5s ease-in-out infinite',
              }}
            />
            Live
          </span>
        </div>

        {/* Clock + date */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: T.text,
              lineHeight: 1.2,
            }}
          >
            {formatClock(now)}
          </div>
          <div style={{ fontSize: '0.95rem', color: T.muted, marginTop: '2px' }}>
            {formatDate(now)}
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                       */}
      {/* ================================================================== */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto 1fr',
          gap: '24px',
          padding: '24px 32px',
          overflow: 'hidden',
        }}
      >
        {/* ---- TODAY'S CATCH SUMMARY (top-left) ---- */}
        <section>
          <SectionTitle>Today&apos;s Catch Summary</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginTop: '12px',
            }}
          >
            <StatCard label="Total Fish" value={totalFish.toLocaleString()} color={T.primary} />
            <StatCard label="Trips Out" value={String(tripsOut)} color="#22c55e" />
            <StatCard label="Total Anglers" value={String(totalAnglers)} color="#eab308" />
          </div>
        </section>

        {/* ---- SPECIES LEADERBOARD (top-right) ---- */}
        <section>
          <SectionTitle>Species Leaderboard</SectionTitle>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            {leaderboard.length === 0 && (
              <p style={{ color: T.muted, fontSize: '1.1rem' }}>
                No catch data available yet.
              </p>
            )}
            {leaderboard.map((entry, idx) => {
              const barPct = Math.max(8, (entry.count / maxCount) * 100);
              const color = speciesColor(entry.species);
              return (
                <div key={entry.species} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Rank */}
                  <span
                    style={{
                      width: '28px',
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: idx < 3 ? color : T.muted,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {idx + 1}
                  </span>

                  {/* Bar + label container */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '3px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          color: T.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.species}
                      </span>
                      <span
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color,
                          fontVariantNumeric: 'tabular-nums',
                          marginLeft: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {entry.count.toLocaleString()}
                      </span>
                    </div>
                    {/* Bar */}
                    <div
                      style={{
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: T.border,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barPct}%`,
                          borderRadius: '5px',
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}66`,
                          transition: 'width 0.8s ease-out',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- UPCOMING TRIPS (full bottom row) ---- */}
        <section style={{ gridColumn: '1 / -1', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <SectionTitle>Upcoming Trips</SectionTitle>
            {totalTripPages > 1 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {Array.from({ length: totalTripPages }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: i === tripPage ? '20px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: i === tripPage ? T.primary : T.border,
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {visibleTrips.length === 0 && (
            <p style={{ color: T.muted, fontSize: '1.1rem' }}>
              No upcoming trips available.
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {visibleTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      </main>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderTop: `1px solid ${T.border}`,
          backgroundColor: T.surface,
          flexShrink: 0,
        }}
      >
        <div>
          <span style={{ color: T.text, fontWeight: 700, fontSize: '1rem' }}>
            thebitereport.com
          </span>
          <span style={{ color: T.muted, margin: '0 12px' }}>&middot;</span>
          <span style={{ color: T.muted, fontSize: '0.95rem', fontStyle: 'italic' }}>
            Make Memories. Have Fun.
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: T.muted,
            fontSize: '0.9rem',
          }}
        >
          {/* QR placeholder */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '6px',
              border: `2px dashed ${T.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.55rem',
              textAlign: 'center',
              lineHeight: 1.2,
              color: T.muted,
            }}
          >
            QR
          </div>
          <span>Scan to book trips</span>
        </div>
      </footer>

      {/* Pulse animation for the LIVE badge */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: T.muted,
      }}
    >
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: '0 0 6px 0',
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: T.muted,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '2.8rem',
          fontWeight: 900,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function TripCard({ trip }: { trip: ScheduledTrip }) {
  const depDate = new Date(`${trip.departureDate}T00:00`);
  const dayStr = depDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const landingColor = getLandingColor(trip.landing);
  const landingName = getLandingName(trip.landing);
  const spotsLow = trip.spotsLeft <= 5;
  const price = formatPrice(trip.pricePerPerson);

  return (
    <div
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Boat name + landing badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: T.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trip.boatName}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: `${landingColor}18`,
            color: landingColor,
            whiteSpace: 'nowrap',
          }}
        >
          {landingName}
        </span>
      </div>

      {/* Date + time */}
      <div style={{ fontSize: '0.85rem', color: T.muted }}>
        {dayStr} &middot; {trip.departureTime}
      </div>

      {/* Duration + price row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '2px',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: T.text, fontWeight: 600 }}>
          {trip.duration}
        </span>
        {price && (
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: T.primary }}>
            {price}
          </span>
        )}
      </div>

      {/* Spots left */}
      <div
        style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: spotsLow ? '#ef4444' : '#22c55e',
        }}
      >
        {trip.spotsLeft} spot{trip.spotsLeft !== 1 ? 's' : ''} left
      </div>
    </div>
  );
}
