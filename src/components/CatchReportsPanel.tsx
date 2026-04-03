'use client';

import { useState } from 'react';

// Simulated recent catch reports — in production these come from the scraper
const SAMPLE_REPORTS = [
  { id: '1', boat: 'Cortez', landing: 'Seaforth', date: '2026-04-02', species: 'Yellowtail', count: 38, anglers: 28, area: 'Coronado Islands' },
  { id: '2', boat: 'Liberty', landing: "Fisherman's", date: '2026-04-02', species: 'Bluefin Tuna', count: 12, anglers: 30, area: '9 Mile Bank' },
  { id: '3', boat: 'New Seaforth', landing: 'Seaforth', date: '2026-04-02', species: 'Rockfish', count: 185, anglers: 40, area: 'Point Loma Kelp' },
  { id: '4', boat: 'Pacific Queen', landing: "Fisherman's", date: '2026-04-02', species: 'Yellowfin Tuna', count: 22, anglers: 25, area: '43 Fathom Spot' },
  { id: '5', boat: 'San Diego', landing: 'Seaforth', date: '2026-04-01', species: 'Calico Bass', count: 64, anglers: 35, area: 'La Jolla Kelp' },
  { id: '6', boat: 'Excel', landing: "Fisherman's", date: '2026-04-01', species: 'Yellowtail', count: 55, anglers: 28, area: 'Coronado Islands' },
  { id: '7', boat: 'Highliner', landing: 'Seaforth', date: '2026-04-01', species: 'White Seabass', count: 8, anglers: 32, area: 'Catalina Island' },
  { id: '8', boat: 'Polaris Supreme', landing: "Fisherman's", date: '2026-04-01', species: 'Bluefin Tuna', count: 45, anglers: 22, area: 'Tanner Bank' },
  { id: '9', boat: 'Apollo', landing: 'Seaforth', date: '2026-03-31', species: 'Barracuda', count: 72, anglers: 30, area: 'Point Loma' },
  { id: '10', boat: 'Constitution', landing: "Fisherman's", date: '2026-03-31', species: 'Lingcod', count: 15, anglers: 28, area: '9 Mile Bank' },
  { id: '11', boat: 'Fortune', landing: "Fisherman's", date: '2026-03-31', species: 'Yellowtail', count: 42, anglers: 25, area: 'Coronado Islands' },
  { id: '12', boat: 'Sea Watch', landing: 'Seaforth', date: '2026-03-31', species: 'Rockfish', count: 210, anglers: 42, area: 'Point Loma Kelp' },
];

const SPECIES_COLORS: Record<string, string> = {
  'Yellowtail': '#eab308',
  'Bluefin Tuna': '#3b82f6',
  'Yellowfin Tuna': '#f97316',
  'Rockfish': '#ef4444',
  'Calico Bass': '#22c55e',
  'White Seabass': '#8b5cf6',
  'Barracuda': '#06b6d4',
  'Lingcod': '#14b8a6',
  'Dorado': '#84cc16',
};

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

export default function CatchReportsPanel() {
  const [filter, setFilter] = useState<'all' | 'seaforth' | 'fishermans'>('all');
  const reports = filter === 'all'
    ? SAMPLE_REPORTS
    : filter === 'seaforth'
      ? SAMPLE_REPORTS.filter((r) => r.landing === 'Seaforth')
      : SAMPLE_REPORTS.filter((r) => r.landing === "Fisherman's");

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
        {reports.length} recent reports
      </p>

      {/* Reports list */}
      <div className="flex flex-col gap-3">
        {reports.map((report) => {
          const speciesColor = SPECIES_COLORS[report.species] || '#8899aa';
          return (
            <div
              key={report.id}
              className="rounded-lg p-3 transition-colors"
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e2a42',
              }}
            >
              {/* Top row: boat + date */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                    {report.boat}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: report.landing === 'Seaforth' ? '#00d4ff15' : '#f9731615',
                      color: report.landing === 'Seaforth' ? '#00d4ff' : '#f97316',
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
