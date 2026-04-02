'use client';

import type { FactorName } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FactorToggleProps {
  enabledFactors: string[];
  onToggle: (factorName: string) => void;
}

// ---------------------------------------------------------------------------
// Factor metadata
// ---------------------------------------------------------------------------

interface FactorMeta {
  name: FactorName;
  label: string;
  color: string;
}

const FACTORS: FactorMeta[] = [
  { name: 'weather',           label: 'Weather',        color: '#64b5f6' },
  { name: 'tides',             label: 'Tides',          color: '#4fc3f7' },
  { name: 'barometricPressure',label: 'Pressure',       color: '#ce93d8' },
  { name: 'pressureDelta',     label: 'Pressure Shift', color: '#ef5350' },
  { name: 'waterTemp',         label: 'Water Temp',     color: '#ff8a65' },
  { name: 'moonPhase',         label: 'Moon Phase',     color: '#b0bec5' },
  { name: 'timeOfDay',         label: 'Time of Day',    color: '#ffa726' },
  { name: 'wind',              label: 'Wind',           color: '#a5d6a7' },
  { name: 'catchReports',      label: 'Catch Reports',  color: '#22c55e' },
];

// ---------------------------------------------------------------------------
// Single toggle pill
// ---------------------------------------------------------------------------

interface TogglePillProps {
  meta: FactorMeta;
  enabled: boolean;
  onToggle: (name: string) => void;
}

function TogglePill({ meta, enabled, onToggle }: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(meta.name)}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        backgroundColor: enabled ? `${meta.color}22` : '#0a0f1a',
        border: `1px solid ${enabled ? meta.color : '#1e2a42'}`,
        color: enabled ? meta.color : '#8899aa',
        outlineColor: meta.color,
      }}
      aria-pressed={enabled}
      aria-label={`${enabled ? 'Hide' : 'Show'} ${meta.label}`}
    >
      {/* Color swatch / checkbox indicator */}
      <span
        className="inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-sm transition-colors duration-200"
        style={{
          backgroundColor: enabled ? meta.color : 'transparent',
          border: `1.5px solid ${enabled ? meta.color : '#1e2a42'}`,
        }}
        aria-hidden
      >
        {enabled && (
          <svg
            width="7"
            height="6"
            viewBox="0 0 7 6"
            fill="none"
            aria-hidden
          >
            <path
              d="M1 3l1.5 1.5L6 1"
              stroke="#0a0f1a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {meta.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FactorToggle({ enabledFactors, onToggle }: FactorToggleProps) {
  const enabledSet = new Set(enabledFactors);

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#8899aa' }}
        >
          Factor Layers
        </h3>
        {/* Quick-toggle all */}
        <button
          type="button"
          onClick={() => {
            const allEnabled = FACTORS.every((f) => enabledSet.has(f.name));
            FACTORS.forEach((f) => {
              if (allEnabled) {
                // disable all
                if (enabledSet.has(f.name)) onToggle(f.name);
              } else {
                // enable all
                if (!enabledSet.has(f.name)) onToggle(f.name);
              }
            });
          }}
          className="text-xs transition-colors duration-150 focus:outline-none"
          style={{ color: '#8899aa' }}
        >
          {FACTORS.every((f) => enabledSet.has(f.name)) ? 'Hide all' : 'Show all'}
        </button>
      </div>

      {/* Pill grid */}
      <div className="flex flex-wrap gap-2">
        {FACTORS.map((meta) => (
          <TogglePill
            key={meta.name}
            meta={meta}
            enabled={enabledSet.has(meta.name)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
