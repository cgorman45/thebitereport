'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { ScheduledTrip } from '@/lib/trips/types';

interface DateCalendarProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  selectedDuration: string | null;
  onDurationChange: (dur: string | null) => void;
  trips: ScheduledTrip[];
}

const DURATION_OPTIONS = [
  { label: 'Any Duration', value: '' },
  { label: 'Half Day', value: 'Half Day' },
  { label: '3/4 Day', value: '3/4 Day' },
  { label: 'Full Day', value: 'Full Day' },
  { label: 'Overnight', value: 'Overnight' },
  { label: 'Multi-Day', value: 'Multi-Day' },
  { label: 'Long Range', value: 'Long Range' },
];

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function matchesDuration(tripDuration: string, filterDuration: string): boolean {
  const td = tripDuration.toLowerCase();
  const fd = filterDuration.toLowerCase();
  if (fd === 'half day') return td.includes('1/2') || td.includes('half');
  if (fd === '3/4 day') return td.includes('3/4');
  if (fd === 'full day') return td.includes('full') && td.includes('day');
  if (fd === 'overnight') return td.includes('overnight');
  if (fd === 'multi-day') {
    // Avoid matching "1/2 day" as "2 day" — require word boundary before the digit
    return td.includes('1.5') || td.includes('2.5')
      || /(?<![/\d])2\s*day/i.test(td)
      || /(?<![/\d])3\s*day/i.test(td);
  }
  if (fd === 'long range') return td.includes('long range') || /(?<![/\d])([8-9]|1[0-9]|2\d)\s*day/i.test(td);
  return true;
}

interface MonthData {
  year: number;
  month: number; // 0-indexed
  label: string;
  days: (DayData | null)[];
}

interface DayData {
  date: number;
  iso: string;
  cheapest: number | null;
  tripCount: number;
  isPast: boolean;
}

function buildMonthData(
  year: number,
  month: number,
  priceMap: Record<string, { cheapest: number; count: number }>,
  todayIso: string
): MonthData {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });

  const days: (DayData | null)[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const stats = priceMap[iso];
    days.push({
      date: d,
      iso,
      cheapest: stats?.cheapest ?? null,
      tripCount: stats?.count ?? 0,
      isPast: iso < todayIso,
    });
  }

  return { year, month, label, days };
}

export default function DateCalendar({
  open,
  onClose,
  selectedDate,
  onDateChange,
  selectedDuration,
  onDurationChange,
  trips,
}: DateCalendarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid the click that opened the popup from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Compute price map: for each day, find cheapest price matching duration
  const priceMap = useMemo(() => {
    const map: Record<string, { cheapest: number; count: number }> = {};
    for (const trip of trips) {
      // Skip trips with no valid price
      if (!trip.pricePerPerson || trip.pricePerPerson <= 0) continue;
      // Filter by duration if one is selected
      if (selectedDuration && !matchesDuration(trip.duration, selectedDuration)) {
        continue;
      }
      const d = trip.departureDate;
      if (!map[d]) {
        map[d] = { cheapest: trip.pricePerPerson, count: 1 };
      } else {
        map[d].count += 1;
        if (trip.pricePerPerson < map[d].cheapest) {
          map[d].cheapest = trip.pricePerPerson;
        }
      }
    }
    return map;
  }, [trips, selectedDuration]);

  // Find the global cheapest price to highlight in green
  const globalCheapest = useMemo(() => {
    let min = Infinity;
    for (const key of Object.keys(priceMap)) {
      if (priceMap[key].cheapest < min) min = priceMap[key].cheapest;
    }
    return min === Infinity ? null : min;
  }, [priceMap]);

  // Build two months: current and next
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const month1 = buildMonthData(currentYear, currentMonth, priceMap, todayIso);
  const month2 = buildMonthData(nextYear, nextMonth, priceMap, todayIso);

  if (!open) return null;

  function handleDayClick(day: DayData) {
    if (day.isPast || day.tripCount === 0) return;
    onDateChange(selectedDate === day.iso ? null : day.iso);
    onClose();
  }

  function handleReset() {
    onDateChange(null);
    onDurationChange(null);
  }

  function renderMonth(data: MonthData) {
    return (
      <div className="flex-1 min-w-[260px]">
        {/* Month name */}
        <h3 className="text-center text-sm font-bold mb-2" style={{ color: '#e2e8f0' }}>
          {data.label}
        </h3>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {DAY_NAMES.map((name, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold py-1"
              style={{ color: '#8899aa' }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {data.days.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="h-11" />;
            }

            const isSelected = selectedDate === day.iso;
            const hasTrips = day.tripCount > 0 && !day.isPast;
            const isCheapest = day.cheapest !== null && globalCheapest !== null && day.cheapest <= globalCheapest * 1.05;
            const isDisabled = day.isPast || day.tripCount === 0;

            return (
              <button
                key={day.iso}
                onClick={() => handleDayClick(day)}
                disabled={isDisabled}
                className="relative flex flex-col items-center justify-center h-11 transition-all duration-100"
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(0, 212, 255, 0.15)'
                    : 'transparent',
                  borderRadius: isSelected ? '8px' : '0',
                  cursor: isDisabled ? 'default' : 'pointer',
                  opacity: day.isPast ? 0.3 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled && !isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0, 212, 255, 0.06)';
                    (e.currentTarget as HTMLButtonElement).style.borderRadius = '8px';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderRadius = '0';
                  }
                }}
              >
                {/* Date number */}
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: isSelected ? '#00d4ff' : isDisabled ? '#4a5a6e' : '#e2e8f0',
                  }}
                >
                  {day.date}
                </span>

                {/* Price */}
                {hasTrips && day.cheapest !== null && (
                  <span
                    className="text-[10px] font-bold leading-tight"
                    style={{
                      color: isSelected
                        ? '#00d4ff'
                        : isCheapest
                          ? '#22c55e'
                          : '#8899aa',
                    }}
                  >
                    ${Math.round(day.cheapest)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Calendar popup */}
      <div
        ref={ref}
        className="fixed left-1/2 top-14 -translate-x-1/2 z-50 w-[95vw] max-w-[680px] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl"
        style={{
          backgroundColor: '#0d1320',
          border: '1px solid #1e2a42',
          boxShadow: '0 16px 64px rgba(0, 0, 0, 0.7)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#1e2a42 transparent',
        }}
      >
        {/* ── Header bar ── */}
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid #1e2a42' }}
        >
          {/* Duration dropdown */}
          <div
            className="flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ border: '1px solid #1e2a42', backgroundColor: 'rgba(30,42,66,0.4)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <select
              value={selectedDuration ?? ''}
              onChange={(e) => onDurationChange(e.target.value === '' ? null : e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium focus:outline-none cursor-pointer pr-1"
              style={{ color: selectedDuration ? '#e2e8f0' : '#8899aa' }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value} style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#8899aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="text-sm font-medium transition-colors hover:brightness-125"
            style={{ color: '#8899aa', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Departure field indicator */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              border: '2px solid #00d4ff',
              backgroundColor: 'rgba(0, 212, 255, 0.05)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm font-medium" style={{ color: selectedDate ? '#e2e8f0' : '#00d4ff' }}>
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Departure'}
            </span>
          </div>
        </div>

        {/* ── Calendar body: two months side by side ── */}
        <div className="px-5 py-3">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {renderMonth(month1)}
            {renderMonth(month2)}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid #1e2a42' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-[10px]" style={{ color: '#8899aa' }}>Cheapest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8899aa' }} />
              <span className="text-[10px]" style={{ color: '#8899aa' }}>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4a5a6e' }} />
              <span className="text-[10px]" style={{ color: '#8899aa' }}>No trips</span>
            </div>
          </div>
        </div>

        {/* ── Bottom: Done button ── */}
        <div
          className="flex justify-end px-5 py-3"
          style={{ borderTop: '1px solid #1e2a42' }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:brightness-110"
            style={{
              backgroundColor: '#00d4ff',
              color: '#0a0f1a',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
