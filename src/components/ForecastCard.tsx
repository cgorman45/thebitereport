'use client';

import FishingScore from '@/components/FishingScore';

interface ForecastCardProps {
  date: string;
  score: number;
  label: string;
  bestHour: number;
  highTemp: number;
  lowTemp: number;
  onClick?: () => void;
}

function formatDayName(dateStr: string): string {
  // dateStr is an ISO date like '2026-04-02'
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatBestHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export default function ForecastCard({
  date,
  score,
  label,
  bestHour,
  highTemp,
  lowTemp,
  onClick,
}: ForecastCardProps) {
  const dayName = formatDayName(date);
  const bestTimeLabel = `Best: ${formatBestHour(bestHour)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl p-4 text-left w-full transition-all duration-200 focus:outline-none focus-visible:ring-2"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        // Focus ring color via CSS variable fallback is tricky; handled inline below
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = '#1a2540';
        el.style.border = '1px solid #00d4ff40';
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 8px 24px rgba(0, 212, 255, 0.08)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = '#131b2e';
        el.style.border = '1px solid #1e2a42';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Day name */}
      <span
        className="text-sm font-semibold uppercase tracking-wider self-start"
        style={{ color: '#e2e8f0' }}
      >
        {dayName}
      </span>

      {/* Score circle */}
      <FishingScore score={score} label={label} size="sm" />

      {/* Best time */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-xs font-medium"
          style={{ color: '#00d4ff' }}
        >
          {bestTimeLabel}
        </span>

        {/* Temp range */}
        <span
          className="text-xs tabular-nums"
          style={{ color: '#8899aa' }}
        >
          {highTemp}&deg;
          <span className="mx-1" style={{ color: '#1e2a42' }}>/</span>
          {lowTemp}&deg;
        </span>
      </div>
    </button>
  );
}
