'use client';

import { useState } from 'react';
import { getLandingName, getLandingColor } from '@/lib/landings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatchEntry {
  id: string;
  boat: string;
  landing: 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens';
  date: string; // ISO date
  species: string;
  count: number;
  anglers: number;
  area: string;
  highlight?: boolean;
}

// ---------------------------------------------------------------------------
// Hardcoded catch data — ~25 entries across all 5 landings
// ---------------------------------------------------------------------------

const CATCH_DATA: CatchEntry[] = [
  // --- Seaforth ---
  {
    id: 'sf-01',
    boat: 'New Seaforth',
    landing: 'seaforth',
    date: '2026-04-02',
    species: 'Yellowtail',
    count: 48,
    anglers: 32,
    area: 'Coronado Islands',
    highlight: true,
  },
  {
    id: 'sf-02',
    boat: 'San Diego',
    landing: 'seaforth',
    date: '2026-04-02',
    species: 'Calico Bass',
    count: 61,
    anglers: 28,
    area: 'La Jolla Kelp',
  },
  {
    id: 'sf-03',
    boat: 'Cortez',
    landing: 'seaforth',
    date: '2026-04-01',
    species: 'Bluefin Tuna',
    count: 22,
    anglers: 25,
    area: '9-Mile Bank',
    highlight: true,
  },
  {
    id: 'sf-04',
    boat: 'Apollo',
    landing: 'seaforth',
    date: '2026-04-01',
    species: 'Rockfish',
    count: 187,
    anglers: 34,
    area: 'Point Loma Kelp',
  },
  {
    id: 'sf-05',
    boat: 'Sea Watch',
    landing: 'seaforth',
    date: '2026-04-02',
    species: 'White Seabass',
    count: 11,
    anglers: 18,
    area: 'Coronado Islands',
    highlight: true,
  },
  // --- Fisherman's Landing ---
  {
    id: 'fl-01',
    boat: 'Liberty',
    landing: 'fishermans',
    date: '2026-04-02',
    species: 'Bluefin Tuna',
    count: 34,
    anglers: 26,
    area: 'Offshore Bight',
    highlight: true,
  },
  {
    id: 'fl-02',
    boat: 'Pacific Queen',
    landing: 'fishermans',
    date: '2026-04-02',
    species: 'Yellowtail',
    count: 57,
    anglers: 36,
    area: 'Coronado Islands',
    highlight: true,
  },
  {
    id: 'fl-03',
    boat: 'Excel',
    landing: 'fishermans',
    date: '2026-04-01',
    species: 'Yellowfin Tuna',
    count: 41,
    anglers: 22,
    area: '43-Mile Bank',
  },
  {
    id: 'fl-04',
    boat: 'Polaris Supreme',
    landing: 'fishermans',
    date: '2026-04-01',
    species: 'Bluefin Tuna',
    count: 18,
    anglers: 20,
    area: 'Offshore Bight',
  },
  {
    id: 'fl-05',
    boat: 'Fortune',
    landing: 'fishermans',
    date: '2026-04-02',
    species: 'Barracuda',
    count: 76,
    anglers: 29,
    area: 'La Jolla Kelp',
  },
  {
    id: 'fl-06',
    boat: 'Pacific Queen',
    landing: 'fishermans',
    date: '2026-04-01',
    species: 'Rockfish',
    count: 142,
    anglers: 33,
    area: 'Pt Loma Deep',
  },
  // --- H&M Landing ---
  {
    id: 'hm-01',
    boat: 'Mission Belle',
    landing: 'hm_landing',
    date: '2026-04-02',
    species: 'Calico Bass',
    count: 44,
    anglers: 21,
    area: 'Mission Bay Kelp',
  },
  {
    id: 'hm-02',
    boat: 'Patriot',
    landing: 'hm_landing',
    date: '2026-04-02',
    species: 'Yellowtail',
    count: 39,
    anglers: 27,
    area: 'Coronado Islands',
    highlight: true,
  },
  {
    id: 'hm-03',
    boat: 'Daily Double',
    landing: 'hm_landing',
    date: '2026-04-01',
    species: 'White Seabass',
    count: 8,
    anglers: 14,
    area: 'La Jolla Kelp',
    highlight: true,
  },
  {
    id: 'hm-04',
    boat: 'Mission Belle',
    landing: 'hm_landing',
    date: '2026-04-01',
    species: 'Rockfish',
    count: 93,
    anglers: 19,
    area: 'Point Loma 200ft',
  },
  {
    id: 'hm-05',
    boat: 'Patriot',
    landing: 'hm_landing',
    date: '2026-04-01',
    species: 'Lingcod',
    count: 14,
    anglers: 16,
    area: 'Pt Loma Deep',
  },
  // --- Point Loma SF ---
  {
    id: 'pl-01',
    boat: 'Point Loma',
    landing: 'point_loma',
    date: '2026-04-02',
    species: 'Yellowtail',
    count: 52,
    anglers: 31,
    area: 'Coronado Islands',
    highlight: true,
  },
  {
    id: 'pl-02',
    boat: 'New Lo-An',
    landing: 'point_loma',
    date: '2026-04-02',
    species: 'Bluefin Tuna',
    count: 27,
    anglers: 24,
    area: '9-Mile Bank',
  },
  {
    id: 'pl-03',
    boat: 'Point Loma',
    landing: 'point_loma',
    date: '2026-04-01',
    species: 'Barracuda',
    count: 65,
    anglers: 28,
    area: 'La Jolla Kelp',
  },
  {
    id: 'pl-04',
    boat: 'New Lo-An',
    landing: 'point_loma',
    date: '2026-04-01',
    species: 'Rockfish',
    count: 116,
    anglers: 22,
    area: 'Pt Loma Reef',
  },
  // --- Helgren's ---
  {
    id: 'hg-01',
    boat: 'Oceanside 95',
    landing: 'helgrens',
    date: '2026-04-02',
    species: 'Yellowtail',
    count: 33,
    anglers: 20,
    area: 'Oceanside Kelp',
    highlight: true,
  },
  {
    id: 'hg-02',
    boat: 'Sea Star',
    landing: 'helgrens',
    date: '2026-04-02',
    species: 'Calico Bass',
    count: 58,
    anglers: 24,
    area: 'Carlsbad Kelp',
  },
  {
    id: 'hg-03',
    boat: 'Oceanside 95',
    landing: 'helgrens',
    date: '2026-04-01',
    species: 'Rockfish',
    count: 201,
    anglers: 30,
    area: 'Oceanside Deep',
  },
  {
    id: 'hg-04',
    boat: 'Sea Star',
    landing: 'helgrens',
    date: '2026-04-01',
    species: 'Lingcod',
    count: 17,
    anglers: 18,
    area: 'Camp Pendleton Reef',
  },
  {
    id: 'hg-05',
    boat: 'Oceanside 95',
    landing: 'helgrens',
    date: '2026-04-02',
    species: 'White Seabass',
    count: 9,
    anglers: 15,
    area: 'Carlsbad Kelp',
    highlight: true,
  },
];

// Sort newest first
const SORTED_DATA = [...CATCH_DATA].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

// ---------------------------------------------------------------------------
// Species color map
// ---------------------------------------------------------------------------

const SPECIES_COLORS: Record<string, { bg: string; text: string }> = {
  'Yellowtail':     { bg: 'rgba(234,179,8,0.15)',   text: '#eab308' },
  'Bluefin Tuna':   { bg: 'rgba(0,212,255,0.12)',   text: '#00d4ff' },
  'Yellowfin Tuna': { bg: 'rgba(0,212,255,0.09)',   text: '#38bdf8' },
  'Calico Bass':    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  'Rockfish':       { bg: 'rgba(249,115,22,0.13)',  text: '#f97316' },
  'White Seabass':  { bg: 'rgba(168,85,247,0.13)',  text: '#a855f7' },
  'Barracuda':      { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  'Lingcod':        { bg: 'rgba(136,153,170,0.13)', text: '#94a3b8' },
};

const DEFAULT_SPECIES_COLOR = { bg: 'rgba(136,153,170,0.15)', text: '#8899aa' };

// ---------------------------------------------------------------------------
// Filter tab config
// ---------------------------------------------------------------------------

type LandingFilter = 'all' | 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens';

const FILTER_TABS: { key: LandingFilter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'seaforth',   label: 'Seaforth' },
  { key: 'fishermans', label: "Fisherman's" },
  { key: 'hm_landing', label: 'H&M' },
  { key: 'point_loma', label: 'Point Loma' },
  { key: 'helgrens',   label: "Helgren's" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeDate(iso: string): string {
  const today = new Date('2026-04-02');
  const d = new Date(iso);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function getPerRod(count: number, anglers: number): string {
  if (!anglers) return '—';
  return (count / anglers).toFixed(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FireIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="#f97316"
      stroke="none"
      aria-hidden="true"
      style={{ display: 'inline', flexShrink: 0 }}
    >
      <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0C17 7 12 2 12 2zM9.5 14.5a2.5 2.5 0 0 0 5 0c0-2.5-2.5-5-2.5-5S9.5 12 9.5 14.5z" />
    </svg>
  );
}

function CatchRow({ entry }: { entry: CatchEntry }) {
  const landingColor = getLandingColor(entry.landing);
  const landingName  = getLandingName(entry.landing);
  const relDate      = getRelativeDate(entry.date);
  const perRod       = getPerRod(entry.count, entry.anglers);
  const speciesColor = SPECIES_COLORS[entry.species] ?? DEFAULT_SPECIES_COLOR;

  const isToday = relDate === 'Today';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderLeft: entry.highlight ? '3px solid #f97316' : '3px solid transparent',
        backgroundColor: entry.highlight ? 'rgba(249,115,22,0.04)' : 'transparent',
        borderBottom: '1px solid #1e2a42',
        minHeight: '64px',
        boxShadow: entry.highlight
          ? 'inset 0 0 0 1px rgba(249,115,22,0.12)'
          : undefined,
      }}
    >
      {/* LEFT: date badge */}
      <div style={{ flexShrink: 0, width: '68px', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: isToday ? 'rgba(0,212,255,0.12)' : 'rgba(136,153,170,0.12)',
            color: isToday ? '#00d4ff' : '#8899aa',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {relDate}
        </span>
      </div>

      {/* MIDDLE: boat + landing + area + stats */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
          {/* Hot bite icon */}
          {entry.highlight && <FireIcon />}

          {/* Boat name */}
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#e2e8f0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.boat}
          </span>

          {/* Landing pill */}
          <span
            style={{
              display: 'inline-block',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: `${landingColor}1a`,
              color: landingColor,
              border: `1px solid ${landingColor}33`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {landingName}
          </span>
        </div>

        {/* Area + stats */}
        <p style={{ fontSize: '12px', color: '#8899aa', margin: 0, lineHeight: 1.4 }}>
          {entry.area}
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {entry.anglers} anglers
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {perRod} per rod
        </p>
      </div>

      {/* RIGHT: species + count */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px',
        }}
      >
        {/* Species name */}
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: speciesColor.bg,
            color: speciesColor.text,
            whiteSpace: 'nowrap',
          }}
        >
          {entry.species}
        </span>

        {/* Count */}
        <span
          style={{
            fontSize: '22px',
            fontWeight: 900,
            color: speciesColor.text,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: entry.highlight ? `0 0 12px ${speciesColor.text}60` : undefined,
          }}
        >
          {entry.count}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CatchFeed() {
  const [activeFilter, setActiveFilter] = useState<LandingFilter>('all');

  const filtered =
    activeFilter === 'all'
      ? SORTED_DATA
      : SORTED_DATA.filter((e) => e.landing === activeFilter);

  return (
    <div style={{ width: '100%' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
          Catch Reports
        </h2>
        <span style={{ fontSize: '13px', color: '#8899aa' }}>
          Live fleet feed · Updated hourly
        </span>
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {FILTER_TABS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          const color = key === 'all' ? '#00d4ff' : getLandingColor(key);
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                padding: '5px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${isActive ? color : '#1e2a42'}`,
                backgroundColor: isActive ? `${color}1a` : 'transparent',
                color: isActive ? color : '#8899aa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Feed card */}
      <div
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#8899aa', fontSize: '14px' }}>
            No reports found for this landing.
          </div>
        ) : (
          filtered.map((entry) => <CatchRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
