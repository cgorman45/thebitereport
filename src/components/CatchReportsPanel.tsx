'use client';

import { useState, useEffect } from 'react';
import { SPECIES_COLORS as SPECIES_COLOR_MAP } from '@/lib/constants';
import FavoriteButton from '@/components/auth/FavoriteButton';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
import { FLEET_ROSTER } from '@/lib/fleet/boats';

interface CatchReport {
  id: string;
  boat: string;
  landing: string;
  date: string;
  species: string;
  count: number;
  anglers: number;
  area: string;
}

// Derive flat text-color map from the shared species color definitions
const SPECIES_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_COLOR_MAP).map(([k, v]) => [k, v.text]),
);

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function fishPerAngler(count: number, anglers: number): string {
  return (count / anglers).toFixed(1);
}

// Look up MMSI by boat name for favorite matching
const boatMmsiMap = new Map(FLEET_ROSTER.map(b => [b.name.toLowerCase(), b.mmsi]));

export default function CatchReportsPanel() {
  const auth = useOptionalAuth();
  const [filter, setFilter] = useState<'all' | 'seaforth' | 'fishermans'>('all');
  const [reports, setReports] = useState<CatchReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live catch data
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catch-reports', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: CatchReport[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
        }
      })
      .catch(() => {/* no data available */})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = filter === 'all'
    ? reports
    : filter === 'seaforth'
      ? reports.filter((r) => r.landing.toLowerCase().includes('seaforth'))
      : reports.filter((r) => r.landing.toLowerCase().includes('fisherman'));

  // Sort: favorited boats first
  const sorted = [...filtered].sort((a, b) => {
    const aFav = auth?.favorites.has(boatMmsiMap.get(a.boat.toLowerCase()) ?? 0) ? 0 : 1;
    const bFav = auth?.favorites.has(boatMmsiMap.get(b.boat.toLowerCase()) ?? 0) ? 0 : 1;
    return aFav - bFav;
  });

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs" style={{ color: '#8899aa' }}>Loading catch reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-4 text-center">
        <div style={{ fontSize: '20px', marginBottom: '6px' }}>🎣</div>
        <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Reports updating</p>
        <p className="text-[10px] mt-1" style={{ color: '#8899aa' }}>
          Live catch data refreshes every 4 hours. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {(['all', 'seaforth', 'fishermans'] as const).map((f) => {
          const isActive = filter === f;
          const label = f === 'all' ? 'All' : f === 'seaforth' ? 'Seaforth' : "Fisherman's";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? '#00d4ff18' : '#1e2a42',
                color: isActive ? '#00d4ff' : '#8899aa',
                border: `1px solid ${isActive ? '#00d4ff44' : '#1e2a4200'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Report count */}
      <p className="text-xs mb-3" style={{ color: '#8899aa' }}>
        {sorted.length} recent reports
      </p>

      {/* Reports list */}
      <div className="flex flex-col gap-3">
        {sorted.map((report) => {
          const speciesColor = SPECIES_COLORS[report.species] || '#8899aa';
          const mmsi = boatMmsiMap.get(report.boat.toLowerCase());
          const isFav = mmsi ? (auth?.favorites.has(mmsi) ?? false) : false;
          return (
            <div
              key={report.id}
              className="rounded-lg p-3 transition-colors"
              style={{
                backgroundColor: '#131b2e',
                border: isFav ? '1px solid #f0c04033' : '1px solid #1e2a42',
                borderLeft: isFav ? '3px solid #f0c040' : undefined,
              }}
            >
              {/* Top row: boat + date */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {mmsi && <FavoriteButton mmsi={mmsi} size={13} />}
                  <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                    {report.boat}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: report.landing.toLowerCase().includes('seaforth') ? '#00d4ff15' : '#f9731615',
                      color: report.landing.toLowerCase().includes('seaforth') ? '#00d4ff' : '#f97316',
                    }}
                  >
                    {report.landing}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: '#8899aa' }}>
                  {formatDate(report.date)}
                </span>
              </div>

              {/* Species + count */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: speciesColor }}
                />
                <span className="text-sm font-semibold" style={{ color: speciesColor }}>
                  {report.species}
                </span>
                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                  {report.count}
                </span>
                <span className="text-[10px]" style={{ color: '#8899aa' }}>
                  caught
                </span>
              </div>

              {/* Details row */}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: '#8899aa' }}>
                <span>{report.anglers} anglers</span>
                <span>&middot;</span>
                <span>{fishPerAngler(report.count, report.anglers)} per rod</span>
                <span>&middot;</span>
                <span>{report.area}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[10px] mt-4 text-center" style={{ color: '#8899aa' }}>
        Data from Seaforth Sportfishing &amp; Fisherman&apos;s Landing
      </p>
    </div>
  );
}
