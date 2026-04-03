'use client';

import { useEffect, useState } from 'react';
import type { TripWindow, FishingEvent } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TripPlannerProps {
  tripWindow: TripWindow | null;
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score < 4) return '#ef4444';
  if (score < 7) return '#eab308';
  if (score < 9) return '#22c55e';
  return '#00d4ff';
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

function getEventIcon(type: string): string {
  if (type === 'tide_high') return '▲';
  if (type === 'tide_low') return '▼';
  if (type === 'sunrise') return '☀';
  if (type === 'sunset') return '🌅';
  if (type === 'moonrise' || type === 'moonset') return '◐';
  if (type === 'pressure_drop') return '⬇';
  return '•';
}

function getEventColor(type: string): string {
  if (type === 'tide_high' || type === 'tide_low') return '#4fc3f7';
  if (type === 'sunrise' || type === 'sunset') return '#ffa726';
  if (type === 'moonrise' || type === 'moonset') return '#b0bec5';
  if (type === 'pressure_drop') return '#ef5350';
  return '#8899aa';
}

function getScoreLabel(score: number): string {
  if (score < 4) return 'Poor';
  if (score < 7) return 'Fair';
  if (score < 9) return 'Good';
  return 'Excellent';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCell({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-4 py-3 gap-0.5"
      style={{ backgroundColor: '#0a0f1a', border: '1px solid #1e2a42' }}
    >
      <span className="text-xs" style={{ color: '#8899aa' }}>
        {label}
      </span>
      <span
        className="text-xl font-black tabular-nums leading-tight"
        style={{ color: valueColor ?? '#e2e8f0' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs font-medium" style={{ color: valueColor ?? '#8899aa' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function EventBadge({ event }: { event: FishingEvent }) {
  const color = getEventColor(event.type);
  const icon = getEventIcon(event.type);
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
      style={{ backgroundColor: `${color}18`, border: `1px solid ${color}44`, color }}
    >
      <span aria-hidden>{icon}</span>
      <span className="font-medium">{event.label}</span>
      <span style={{ color: `${color}99` }}>{formatHour(event.hour)}</span>
    </div>
  );
}

function SpeciesBadge({ species }: { species: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: '#00d4ff18', border: '1px solid #00d4ff44', color: '#00d4ff' }}
    >
      {species}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TripPlanner({ tripWindow, onClear }: TripPlannerProps) {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Animate in when tripWindow becomes non-null
  useEffect(() => {
    if (tripWindow) {
      const id1 = setTimeout(() => setRendered(true), 0);
      const id2 = setTimeout(() => setVisible(true), 20);
      return () => { clearTimeout(id1); clearTimeout(id2); };
    } else {
      const id1 = setTimeout(() => setVisible(false), 0);
      const id2 = setTimeout(() => setRendered(false), 300);
      return () => { clearTimeout(id1); clearTimeout(id2); };
    }
  }, [tripWindow]);

  if (!rendered || !tripWindow) return null;

  const scoreColor = getScoreColor(tripWindow.averageScore);
  const avg = tripWindow.averageScore;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300 ease-out"
      style={{
        backgroundColor: '#131b2e',
        border: `1px solid ${scoreColor}55`,
        boxShadow: `0 0 24px ${scoreColor}18`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {/* Accent top bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, transparent, ${scoreColor}, transparent)` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#8899aa' }}>
              Trip Window
            </p>
            <h2 className="text-lg font-bold" style={{ color: '#e2e8f0' }}>
              {formatHour(tripWindow.startHour)}{' '}
              <span style={{ color: '#8899aa' }}>—</span>{' '}
              {formatHour(tripWindow.endHour)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              backgroundColor: '#1e2a42',
              color: '#8899aa',
              border: '1px solid #1e2a42',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#8899aa';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#8899aa';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2a42';
            }}
          >
            Clear Selection
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCell
            label="Avg Score"
            value={avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(1)}
            valueColor={scoreColor}
            sub={getScoreLabel(avg)}
          />
          <StatCell
            label="Best Hour"
            value={formatHour(tripWindow.bestHour)}
            valueColor="#e2e8f0"
          />
        </div>

        {/* Events during window */}
        {tripWindow.events.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8899aa' }}>
              Events During Window
            </p>
            <div className="flex flex-wrap gap-2">
              {tripWindow.events.map((ev, i) => (
                <EventBadge key={i} event={ev} />
              ))}
            </div>
          </div>
        )}

        {/* Suggested species */}
        {tripWindow.suggestedSpecies.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8899aa' }}>
              Target Species
            </p>
            <div className="flex flex-wrap gap-2">
              {tripWindow.suggestedSpecies.map((sp) => (
                <SpeciesBadge key={sp} species={sp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
