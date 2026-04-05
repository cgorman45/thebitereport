'use client';

import {
  SOCAL_APRIL_SPECIES,
  SPECIES_COLORS,
  DEFAULT_SPECIES_COLOR,
  MOON_SYMBOLS,
  PRO_TIPS,
} from '@/lib/constants';

interface TodaysSummaryProps {
  location: string;
  region: string;
  waterTemp: number | null;
  bestSpecies: string[];
  tideEvents: string[];
  moonPhase: string;
  windCondition: string;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: '#8899aa' }}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — What&apos;s Biting
// ---------------------------------------------------------------------------

function WhatsBiting({ speciesOverride }: { speciesOverride: string[] }) {
  // Prefer the passed-in species but fall back to defaults when the array is empty
  const displaySpecies =
    speciesOverride && speciesOverride.length > 0
      ? speciesOverride.slice(0, 6)
      : SOCAL_APRIL_SPECIES;

  return (
    <div
      className="rounded-xl p-5 col-span-2"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      <SectionLabel>What&apos;s Biting</SectionLabel>

      <div className="flex flex-wrap gap-2 mb-4">
        {displaySpecies.map((species) => {
          const colors = SPECIES_COLORS[species] ?? DEFAULT_SPECIES_COLOR;
          return (
            <span
              key={species}
              className="px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {species}
            </span>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: '#8899aa' }}>
        Based on water temperature and season
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — Tide Schedule
// ---------------------------------------------------------------------------

// Parse a tide event string like "Low 2:15 AM" into a numeric hour (0-23).
function parseTideHour(event: string): number {
  const match = event.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour;
}

function isHighTide(event: string): boolean {
  return /high/i.test(event);
}

function TideSchedule({ tideEvents }: { tideEvents: string[] }) {
  const events =
    tideEvents && tideEvents.length > 0
      ? tideEvents
      : ['Low 2:15 AM', 'High 8:30 AM', 'Low 2:45 PM', 'High 9:00 PM'];

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      <SectionLabel>Tide Schedule</SectionLabel>

      {/* Event list */}
      <ul className="space-y-2 mb-4">
        {events.map((event, idx) => {
          const high = isHighTide(event);
          return (
            <li key={idx} className="flex items-center gap-3">
              {/* Direction arrow */}
              <span
                className="text-base leading-none"
                style={{ color: high ? '#00d4ff' : '#8899aa' }}
                aria-label={high ? 'high tide' : 'low tide'}
              >
                {high ? '▲' : '▼'}
              </span>
              <span
                className="text-sm font-medium flex-1"
                style={{ color: '#e2e8f0' }}
              >
                {event}
              </span>
              {high && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
                >
                  High
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Mini CSS timeline bar */}
      <div className="mt-3">
        <div
          className="relative h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: '#1e2a42' }}
          aria-hidden="true"
        >
          {events.map((event, idx) => {
            const hour = parseTideHour(event);
            const pct = (hour / 24) * 100;
            const high = isHighTide(event);
            return (
              <div
                key={idx}
                className="absolute top-0 w-2 h-2 rounded-full"
                style={{
                  left: `calc(${pct}% - 4px)`,
                  backgroundColor: high ? '#00d4ff' : '#8899aa',
                  boxShadow: high ? '0 0 4px #00d4ff' : 'none',
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: '#8899aa' }}>12 AM</span>
          <span className="text-xs" style={{ color: '#8899aa' }}>12 PM</span>
          <span className="text-xs" style={{ color: '#8899aa' }}>11 PM</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — Water Conditions
// ---------------------------------------------------------------------------

function WaterConditions({
  waterTemp,
  windCondition,
  moonPhase,
}: {
  waterTemp: number | null;
  windCondition: string;
  moonPhase: string;
}) {
  // Normalise temp to a 0-100 scale for a visual bar (50–75°F range)
  const tempPct =
    waterTemp !== null
      ? Math.min(100, Math.max(0, ((waterTemp - 50) / 25) * 100))
      : null;

  // Color the bar: cold = blue, warm = cyan/green
  const tempColor =
    waterTemp === null
      ? '#8899aa'
      : waterTemp < 58
      ? '#3b82f6'
      : waterTemp < 65
      ? '#00d4ff'
      : '#22c55e';

  const moonSymbol = MOON_SYMBOLS[moonPhase] ?? '🌙';

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      <SectionLabel>Water Conditions</SectionLabel>

      {/* Water temperature */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8899aa' }}>
            Water Temp
          </span>
          <span className="text-lg font-bold tabular-nums" style={{ color: '#e2e8f0' }}>
            {waterTemp !== null ? `${Math.round(waterTemp)}°F` : '—'}
          </span>
        </div>
        {/* Thermometer bar */}
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: '#1e2a42' }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: tempPct !== null ? `${tempPct}%` : '0%',
              backgroundColor: tempColor,
              boxShadow: `0 0 6px ${tempColor}80`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: '#8899aa' }}>50°F</span>
          <span className="text-xs" style={{ color: '#8899aa' }}>75°F</span>
        </div>
      </div>

      {/* Wind */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8899aa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8899aa' }}>
          Wind
        </span>
        <span className="text-sm ml-auto font-semibold" style={{ color: '#e2e8f0' }}>
          {windCondition || '—'}
        </span>
      </div>

      {/* Moon phase */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden="true">{moonSymbol}</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8899aa' }}>
          Moon
        </span>
        <span className="text-sm ml-auto font-semibold" style={{ color: '#e2e8f0' }}>
          {moonPhase || '—'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Pro Tip
// ---------------------------------------------------------------------------

function ProTip() {
  const dayIndex = new Date().getDay(); // 0 = Sunday … 6 = Saturday
  const tip = PRO_TIPS[dayIndex] ?? PRO_TIPS[0];

  return (
    <div
      className="rounded-xl p-5 col-span-2"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderLeft: '3px solid #00d4ff',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {/* Lightbulb icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="9" y1="18" x2="15" y2="18" />
          <line x1="10" y1="22" x2="14" y2="22" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
        <SectionLabel>Pro Tip</SectionLabel>
      </div>

      <p
        className="text-sm italic leading-relaxed"
        style={{ color: '#e2e8f0', fontSize: '0.95rem' }}
      >
        {tip}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function TodaysSummary({
  location,
  region,
  waterTemp,
  bestSpecies,
  tideEvents,
  moonPhase,
  windCondition,
}: TodaysSummaryProps) {
  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-lg font-bold" style={{ color: '#e2e8f0' }}>
          Today&apos;s Fishing Summary
        </h2>
        {(location || region) && (
          <span className="text-sm" style={{ color: '#8899aa' }}>
            {[location, region].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/*
        Grid layout:
        - Mobile: 1 column, cards stacked
        - Desktop (sm+): 2 columns
        "What&apos;s Biting" and "Pro Tip" each span 2 columns (col-span-2).
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WhatsBiting speciesOverride={bestSpecies} />
        <TideSchedule tideEvents={tideEvents} />
        <WaterConditions
          waterTemp={waterTemp}
          windCondition={windCondition}
          moonPhase={moonPhase}
        />
        <ProTip />
      </div>
    </section>
  );
}
