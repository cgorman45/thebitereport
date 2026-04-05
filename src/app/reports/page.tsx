'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';

interface CatchReport {
  id: string;
  boat: string;
  landing: string;
  tripType: string;
  date: string;
  species: string;
  count: number;
  anglers: number;
  area: string;
  also?: { species: string; count: number }[];
}

interface SpeciesSummary {
  species: string;
  totalCaught: number;
  trips: number;
  topBoat: string;
  topCount: number;
}

interface LandingSummary {
  landing: string;
  totalFish: number;
  totalTrips: number;
  totalAnglers: number;
  topSpecies: string;
}

const SPECIES_COLORS: Record<string, string> = {
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
  'Sheephead': '#d946ef',
};

function getSpeciesColor(species: string): string {
  return SPECIES_COLORS[species] || '#8899aa';
}

export default function ReportsPage() {
  const [reports, setReports] = useState<CatchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    fetch('/api/catch-reports')
      .then((r) => r.json())
      .then((data: CatchReport[]) => {
        if (Array.isArray(data)) setReports(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group reports by date
  const reportsByDate = useMemo(() => {
    const groups: Record<string, CatchReport[]> = {};
    for (const r of reports) {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    }
    return groups;
  }, [reports]);

  const dates = useMemo(
    () => Object.keys(reportsByDate).sort((a, b) => b.localeCompare(a)),
    [reportsByDate]
  );

  // Compute species summary across all reports (or filtered by view)
  const speciesSummary = useMemo(() => {
    const filteredReports = view === 'daily' && dates[0]
      ? reportsByDate[dates[0]] || []
      : reports;

    const map = new Map<string, { total: number; trips: number; topBoat: string; topCount: number }>();

    for (const r of filteredReports) {
      // Primary species
      const existing = map.get(r.species) || { total: 0, trips: 0, topBoat: '', topCount: 0 };
      existing.total += r.count;
      existing.trips += 1;
      if (r.count > existing.topCount) {
        existing.topBoat = r.boat;
        existing.topCount = r.count;
      }
      map.set(r.species, existing);

      // Also-caught species
      if (r.also) {
        for (const a of r.also) {
          const ex = map.get(a.species) || { total: 0, trips: 0, topBoat: '', topCount: 0 };
          ex.total += a.count;
          ex.trips += 1;
          if (a.count > ex.topCount) {
            ex.topBoat = r.boat;
            ex.topCount = a.count;
          }
          map.set(a.species, ex);
        }
      }
    }

    const result: SpeciesSummary[] = [];
    for (const [species, data] of map) {
      result.push({
        species,
        totalCaught: data.total,
        trips: data.trips,
        topBoat: data.topBoat,
        topCount: data.topCount,
      });
    }
    return result.sort((a, b) => b.totalCaught - a.totalCaught);
  }, [reports, reportsByDate, dates, view]);

  // Landing summary
  const landingSummary = useMemo(() => {
    const filteredReports = view === 'daily' && dates[0]
      ? reportsByDate[dates[0]] || []
      : reports;

    const map = new Map<string, { fish: number; trips: number; anglers: number; speciesCounts: Map<string, number> }>();

    for (const r of filteredReports) {
      const existing = map.get(r.landing) || { fish: 0, trips: 0, anglers: 0, speciesCounts: new Map() };
      existing.fish += r.count;
      existing.trips += 1;
      existing.anglers += r.anglers;
      existing.speciesCounts.set(r.species, (existing.speciesCounts.get(r.species) || 0) + r.count);
      if (r.also) {
        for (const a of r.also) {
          existing.fish += a.count;
          existing.speciesCounts.set(a.species, (existing.speciesCounts.get(a.species) || 0) + a.count);
        }
      }
      map.set(r.landing, existing);
    }

    const result: LandingSummary[] = [];
    for (const [landing, data] of map) {
      let topSpecies = '';
      let topCount = 0;
      for (const [sp, cnt] of data.speciesCounts) {
        if (cnt > topCount) { topSpecies = sp; topCount = cnt; }
      }
      result.push({
        landing,
        totalFish: data.fish,
        totalTrips: data.trips,
        totalAnglers: data.anglers,
        topSpecies,
      });
    }
    return result.sort((a, b) => b.totalFish - a.totalFish);
  }, [reports, reportsByDate, dates, view]);

  const totalFish = speciesSummary.reduce((s, x) => s + x.totalCaught, 0);
  const totalTrips = (view === 'daily' && dates[0] ? reportsByDate[dates[0]] : reports)?.length || 0;
  const totalAnglers = landingSummary.reduce((s, x) => s + x.totalAnglers, 0);

  const dateLabel = view === 'daily' && dates[0]
    ? new Date(dates[0] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'This Week';

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />

      {/* Hero */}
      <div className="border-b border-[#1e2a42] px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: '#ffffff' }}>
            Catch Report <span style={{ color: '#00d4ff' }}>Summary</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: '#8899aa' }}>
            Aggregated fishing data from all San Diego landings
          </p>

          {/* Toggle */}
          <div className="flex justify-center gap-2 mt-6">
            {(['daily', 'weekly'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: view === v ? '#00d4ff' : '#131b2e',
                  color: view === v ? '#0a0f1a' : '#8899aa',
                  border: `1px solid ${view === v ? '#00d4ff' : '#1e2a42'}`,
                }}
              >
                {v === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <p style={{ color: '#8899aa' }}>Loading catch data...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎣</div>
            <p className="font-semibold" style={{ color: '#e2e8f0' }}>Reports updating</p>
            <p className="text-sm mt-1" style={{ color: '#8899aa' }}>
              Live catch data refreshes every hour. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* Date header */}
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: '#8899aa' }}>
              {dateLabel}
            </p>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
                <p className="text-2xl font-black" style={{ color: '#00d4ff' }}>{totalFish.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: '#8899aa' }}>Total Fish</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
                <p className="text-2xl font-black" style={{ color: '#22c55e' }}>{totalTrips}</p>
                <p className="text-xs mt-1" style={{ color: '#8899aa' }}>Trips</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
                <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>{totalAnglers.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: '#8899aa' }}>Anglers</p>
              </div>
            </div>

            {/* Species breakdown */}
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8899aa' }}>
              Species Breakdown
            </h2>
            <div className="rounded-xl overflow-hidden mb-8" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
              {speciesSummary.map((s, i) => {
                const pct = totalFish > 0 ? (s.totalCaught / totalFish) * 100 : 0;
                return (
                  <div
                    key={s.species}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid #1e2a42' : undefined }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getSpeciesColor(s.species) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{s.species}</span>
                        <span className="text-xs" style={{ color: '#8899aa' }}>{s.trips} trips</span>
                      </div>
                      {/* Bar */}
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e2a42' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: getSpeciesColor(s.species) }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{s.totalCaught.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: '#8899aa' }}>
                        Best: {s.topBoat} ({s.topCount})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Landing breakdown */}
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8899aa' }}>
              By Landing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {landingSummary.map((l) => (
                <div
                  key={l.landing}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: '#e2e8f0' }}>{l.landing}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#00d4ff' }}>{l.totalFish.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: '#8899aa' }}>fish</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#e2e8f0' }}>{l.totalTrips}</p>
                      <p className="text-[10px]" style={{ color: '#8899aa' }}>trips</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#e2e8f0' }}>{l.totalAnglers}</p>
                      <p className="text-[10px]" style={{ color: '#8899aa' }}>anglers</p>
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#8899aa' }}>
                    Top species: <span style={{ color: getSpeciesColor(l.topSpecies) }}>{l.topSpecies}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Daily breakdown (weekly view) */}
            {view === 'weekly' && dates.length > 0 && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8899aa' }}>
                  Daily Breakdown
                </h2>
                <div className="space-y-3 mb-8">
                  {dates.map((date) => {
                    const dayReports = reportsByDate[date];
                    const dayFish = dayReports.reduce((sum, r) => {
                      let total = r.count;
                      if (r.also) total += r.also.reduce((s, a) => s + a.count, 0);
                      return sum + total;
                    }, 0);
                    const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    });
                    return (
                      <div
                        key={date}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{dayLabel}</p>
                          <p className="text-xs" style={{ color: '#8899aa' }}>{dayReports.length} trips</p>
                        </div>
                        <p className="text-lg font-bold" style={{ color: '#00d4ff' }}>{dayFish.toLocaleString()} fish</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className="mt-auto py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
      </footer>
    </div>
  );
}
