'use client';

import { useState } from 'react';
import type { FactorScore, FactorName } from '@/types';

interface ScoreBreakdownProps {
  factors: FactorScore[];
}

const FACTOR_LABELS: Record<FactorName, string> = {
  weather: 'Weather',
  tides: 'Tides',
  barometricPressure: 'Pressure',
  pressureDelta: 'Pressure Shift',
  waterTemp: 'Water Temp',
  moonPhase: 'Moon Phase',
  timeOfDay: 'Time of Day',
  wind: 'Wind',
  catchReports: 'Catch Reports',
};

function getScoreColor(score: number): string {
  if (score < 4) return '#ef4444';
  if (score < 7) return '#eab308';
  if (score < 9) return '#22c55e';
  return '#00d4ff';
}

function FactorRow({ factor }: { factor: FactorScore }) {
  const [expanded, setExpanded] = useState(false);
  const color = getScoreColor(factor.score);
  const pct = Math.max(0, Math.min(100, (factor.score / 10) * 100));
  const label = FACTOR_LABELS[factor.name] ?? factor.name;

  return (
    <div
      className="group cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-3 py-2">
        {/* Factor name */}
        <span
          className="w-32 flex-shrink-0 text-sm font-medium"
          style={{ color: '#8899aa' }}
        >
          {label}
        </span>

        {/* Bar */}
        <div
          className="flex-1 rounded-full overflow-hidden"
          style={{ height: 8, backgroundColor: '#1e2a42' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}60`,
            }}
          />
        </div>

        {/* Score number */}
        <span
          className="w-8 flex-shrink-0 text-right text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {factor.score % 1 === 0
            ? factor.score.toFixed(0)
            : factor.score.toFixed(1)}
        </span>

        {/* Label badge */}
        <span
          className="hidden sm:inline-block w-20 flex-shrink-0 text-xs text-right truncate"
          style={{ color: '#8899aa' }}
        >
          {factor.label}
        </span>

        {/* Expand toggle */}
        <span
          className="flex-shrink-0 text-xs transition-transform duration-200"
          style={{
            color: '#8899aa',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          &#9660;
        </span>
      </div>

      {/* Details row */}
      {expanded && factor.details && (
        <div
          className="ml-[140px] mb-2 text-xs leading-relaxed rounded px-3 py-2"
          style={{ color: '#8899aa', backgroundColor: '#0a0f1a', border: '1px solid #1e2a42' }}
        >
          {factor.details}
        </div>
      )}
    </div>
  );
}

export default function ScoreBreakdown({ factors }: ScoreBreakdownProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#8899aa' }}
      >
        Score Breakdown
      </h3>
      <div className="divide-y" style={{ borderColor: '#1e2a4220' }}>
        {factors.map((factor) => (
          <FactorRow key={factor.name} factor={factor} />
        ))}
      </div>
      <p
        className="mt-3 text-xs"
        style={{ color: '#8899aa' }}
      >
        Tap any factor to see details.
      </p>
    </div>
  );
}
