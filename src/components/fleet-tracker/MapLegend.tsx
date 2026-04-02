'use client';

import { useState } from 'react';

const LEGEND_ITEMS = [
  { color: '#22c55e', label: 'On The Bite \u2014 Catching Fish' },
  { color: '#f97316', label: 'Throwing Bait \u2014 Circling' },
  { color: '#3b82f6', label: 'Transit \u2014 Moving' },
  { color: '#06b6d4', label: 'Drifting \u2014 Slow' },
  { color: '#6b7280', label: 'In Port \u2014 Docked' },
];

export default function MapLegend() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="absolute bottom-6 right-3 z-[1000] w-52 rounded-lg border text-sm select-none"
      style={{
        backgroundColor: '#131b2e',
        borderColor: '#1e2a42',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 font-semibold tracking-wide"
        style={{ color: '#e2e8f0' }}
        aria-expanded={open}
      >
        <span className="text-xs uppercase tracking-widest" style={{ color: '#8899aa' }}>
          Fleet Legend
        </span>
        <svg
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{
            color: '#8899aa',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div
          className="border-t px-3 pb-3 pt-2 space-y-1.5"
          style={{ borderColor: '#1e2a42' }}
        >
          {LEGEND_ITEMS.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs leading-snug" style={{ color: '#e2e8f0' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
