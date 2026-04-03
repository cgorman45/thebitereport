'use client';

import { useState, useEffect, useMemo } from 'react';
import type { TrackedBoat, BoatStatus } from '@/lib/fleet/types';

interface SidebarProps {
  boats: TrackedBoat[];
  connectionStatus: string;
  lastUpdate: number | null;
  onSelectBoat: (mmsi: number) => void;
  selectedMmsi: number | null;
}

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<BoatStatus, number> = {
  catching_fish: 0,
  circling: 1,
  transit: 2,
  drifting: 3,
  in_port: 4,
  unknown: 5,
};

const STATUS_DOT_COLOR: Record<BoatStatus, string> = {
  catching_fish: '#22c55e',
  circling: '#f97316',
  transit: '#3b82f6',
  drifting: '#06b6d4',
  in_port: '#6b7280',
  unknown: '#6b7280',
};

const STATUS_LABEL_COLOR: Record<BoatStatus, string> = {
  catching_fish: '#22c55e',
  circling: '#f97316',
  transit: '#3b82f6',
  drifting: '#06b6d4',
  in_port: '#6b7280',
  unknown: '#6b7280',
};

type FilterKey = 'all' | 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens' | 'catching_fish' | 'circling';

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'seaforth', label: 'Seaforth' },
  { key: 'fishermans', label: "Fisherman's" },
  { key: 'hm_landing', label: 'H&M Landing' },
  { key: 'point_loma', label: 'Point Loma' },
  { key: 'helgrens', label: "Helgren's" },
  { key: 'catching_fish', label: 'Catching Fish' },
  { key: 'circling', label: 'Circling' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getRelativeSeconds(ts: number | null): string {
  if (ts === null) return 'Never';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function matchesFilter(boat: TrackedBoat, activeFilters: Set<FilterKey>): boolean {
  if (activeFilters.has('all') || activeFilters.size === 0) return true;
  if (activeFilters.has('seaforth') && boat.landing === 'seaforth') return true;
  if (activeFilters.has('fishermans') && boat.landing === 'fishermans') return true;
  if (activeFilters.has('catching_fish') && boat.status === 'catching_fish') return true;
  if (activeFilters.has('circling') && boat.status === 'circling') return true;
  return false;
}

function sortBoats(boats: TrackedBoat[]): TrackedBoat[] {
  return [...boats].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ConnectionIndicator({ status }: { status: string }) {
  const isLive = status === 'connected';
  const isReconnecting = status === 'reconnecting';

  const dotColor = isLive ? '#22c55e' : isReconnecting ? '#f97316' : '#6b7280';
  const label = isLive ? 'Live' : isReconnecting ? 'Reconnecting...' : 'Disconnected';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${isLive ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-xs font-medium" style={{ color: isLive ? '#22c55e' : '#8899aa' }}>
        {label}
      </span>
    </div>
  );
}

function BoatRow({
  boat,
  selected,
  onClick,
}: {
  boat: TrackedBoat;
  selected: boolean;
  onClick: () => void;
}) {
  const dotColor = STATUS_DOT_COLOR[boat.status];
  const labelColor = STATUS_LABEL_COLOR[boat.status];
  const LANDING_NAMES: Record<string, string> = {
    seaforth: 'Seaforth', fishermans: "Fisherman's", hm_landing: 'H&M Landing',
    point_loma: 'Point Loma', helgrens: "Helgren's",
  };
  const landingLabel = LANDING_NAMES[boat.landing] || boat.landing;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
      style={{
        borderLeft: selected ? '3px solid #00d4ff' : '3px solid transparent',
        backgroundColor: selected ? 'rgba(0,212,255,0.06)' : 'transparent',
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <span
          className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <div className="min-w-0 flex-1">
          {/* Boat name */}
          <div
            className="truncate text-sm font-bold leading-snug"
            style={{ color: '#e2e8f0' }}
          >
            {boat.name}
          </div>
          {/* Status label + speed */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-medium" style={{ color: labelColor }}>
              {boat.statusLabel}
            </span>
            <span className="text-xs" style={{ color: '#8899aa' }}>
              {boat.speed.toFixed(1)} kts
            </span>
          </div>
          {/* Landing */}
          <div className="text-xs mt-0.5" style={{ color: '#8899aa' }}>
            {landingLabel}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Sidebar({
  boats,
  connectionStatus,
  lastUpdate,
  onSelectBoat,
  selectedMmsi,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['all']));
  const [relativeTime, setRelativeTime] = useState<string>(getRelativeSeconds(lastUpdate));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Tick every second to keep relative time fresh
  useEffect(() => {
    const id = setInterval(() => {
      setRelativeTime(getRelativeSeconds(lastUpdate));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  // Filter pill toggle — toggling 'all' clears others; toggling others deactivates 'all'
  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (key === 'all') {
        return new Set<FilterKey>(['all']);
      }
      next.delete('all');
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) next.add('all');
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const filteredBoats = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    const byFilter = boats.filter((b) => matchesFilter(b, activeFilters));
    const bySearch = lowerSearch
      ? byFilter.filter((b) => b.name.toLowerCase().includes(lowerSearch))
      : byFilter;
    return sortBoats(bySearch);
  }, [boats, activeFilters, search]);

  const sidebarContent = (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 border-b px-4 py-3 space-y-1"
        style={{ borderColor: '#1e2a42' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8899aa' }}>
            Fleet Tracker
          </span>
          {/* Mobile close button */}
          <button
            className="block md:hidden p-1 rounded"
            style={{ color: '#8899aa' }}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close fleet sidebar"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <ConnectionIndicator status={connectionStatus} />
        <div className="text-xs" style={{ color: '#8899aa' }}>
          Last updated: {relativeTime}
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 border-b px-3 py-2.5" style={{ borderColor: '#1e2a42' }}>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: '#8899aa' }}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search boats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
            style={{
              backgroundColor: '#0a0f1a',
              color: '#e2e8f0',
              border: '1px solid #1e2a42',
            }}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div
        className="flex-shrink-0 border-b px-3 py-2 flex flex-wrap gap-1.5"
        style={{ borderColor: '#1e2a42' }}
      >
        {FILTER_PILLS.map(({ key, label }) => {
          const isActive = activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              style={{
                backgroundColor: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#00d4ff' : '#8899aa',
                border: `1px solid ${isActive ? 'rgba(0,212,255,0.45)' : '#1e2a42'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <div
        className="flex-shrink-0 border-b px-3 py-1.5"
        style={{ borderColor: '#1e2a42' }}
      >
        <span className="text-xs" style={{ color: '#8899aa' }}>
          Showing {filteredBoats.length} of {boats.length} boats
        </span>
      </div>

      {/* Boat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredBoats.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-xs"
            style={{ color: '#8899aa' }}
          >
            No boats match your filters.
          </div>
        ) : (
          filteredBoats.map((boat) => (
            <BoatRow
              key={boat.mmsi}
              boat={boat}
              selected={boat.mmsi === selectedMmsi}
              onClick={() => onSelectBoat(boat.mmsi)}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible at md+ */}
      <aside
        className="hidden md:flex flex-col h-full flex-shrink-0 border-r overflow-hidden"
        style={{
          width: '320px',
          borderColor: '#1e2a42',
          backgroundColor: '#131b2e',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile: toggle button */}
      <button
        className="fixed bottom-4 left-4 z-[1100] flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg md:hidden"
        style={{
          backgroundColor: '#00d4ff',
          color: '#0a0f1a',
        }}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open fleet sidebar"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Fleet
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[1050] bg-black/60 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="fixed inset-y-0 left-0 z-[1060] w-80 max-w-full flex flex-col md:hidden shadow-2xl"
            style={{ backgroundColor: '#131b2e' }}
          >
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
