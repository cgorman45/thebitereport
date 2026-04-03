'use client';

import type { ScheduledTrip } from '@/lib/trips/types';

interface PriceCalendarProps {
  trips: ScheduledTrip[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

/** Build 7 calendar days starting from 2026-04-03 (first day in the schedule). */
function buildCalendarDays(): { iso: string; dayName: string; dateLabel: string }[] {
  const start = new Date('2026-04-03T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dayName  = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Thu"
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Apr 3"
    return { iso, dayName, dateLabel };
  });
}

const CALENDAR_DAYS = buildCalendarDays();

export default function PriceCalendar({
  trips,
  selectedDate,
  onSelectDate,
}: PriceCalendarProps) {
  // Pre-compute cheapest price + count per day
  const dayStats: Record<string, { cheapest: number; count: number }> = {};

  for (const trip of trips) {
    const d = trip.departureDate;
    if (!dayStats[d]) {
      dayStats[d] = { cheapest: trip.pricePerPerson, count: 1 };
    } else {
      dayStats[d].count += 1;
      if (trip.pricePerPerson < dayStats[d].cheapest) {
        dayStats[d].cheapest = trip.pricePerPerson;
      }
    }
  }

  function handleDayClick(iso: string, hasTrips: boolean) {
    if (!hasTrips) return;
    onSelectDate(selectedDate === iso ? null : iso);
  }

  return (
    <div
      className="rounded-xl"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        padding: '16px 20px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: '#8899aa' }}
      >
        Best Prices by Day
      </p>

      {/* Scrollable strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e2a42 transparent' }}
      >
        {CALENDAR_DAYS.map(({ iso, dayName, dateLabel }) => {
          const stats = dayStats[iso];
          const hasTrips = Boolean(stats && stats.count > 0);
          const isSelected = selectedDate === iso;

          return (
            <button
              key={iso}
              onClick={() => handleDayClick(iso, hasTrips)}
              disabled={!hasTrips}
              className="flex flex-col items-center justify-between rounded-xl transition-all duration-150 shrink-0"
              style={{
                width: '112px',
                minWidth: '112px',
                padding: '12px 10px',
                cursor: hasTrips ? 'pointer' : 'default',
                backgroundColor: isSelected
                  ? 'rgba(0, 212, 255, 0.10)'
                  : hasTrips
                  ? 'rgba(30, 42, 66, 0.6)'
                  : 'rgba(20, 28, 46, 0.4)',
                border: isSelected
                  ? '1px solid #00d4ff'
                  : '1px solid #1e2a42',
                boxShadow: isSelected ? '0 0 12px rgba(0, 212, 255, 0.15)' : 'none',
                opacity: hasTrips ? 1 : 0.5,
              }}
              onMouseEnter={e => {
                if (hasTrips && !isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 255, 0.4)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2a42';
                }
              }}
              aria-label={
                hasTrips
                  ? `${dayName} ${dateLabel} — from $${stats.cheapest}, ${stats.count} trip${stats.count === 1 ? '' : 's'}`
                  : `${dayName} ${dateLabel} — no trips`
              }
              aria-pressed={isSelected}
            >
              {/* Day name */}
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: isSelected ? '#00d4ff' : '#8899aa' }}
              >
                {dayName}
              </span>

              {/* Date */}
              <span
                className="text-sm font-bold mt-0.5"
                style={{ color: isSelected ? '#e2e8f0' : hasTrips ? '#e2e8f0' : '#8899aa' }}
              >
                {dateLabel}
              </span>

              {/* Price or No Trips */}
              <div className="mt-2 text-center">
                {hasTrips ? (
                  <>
                    <div
                      className="text-xs font-bold"
                      style={{ color: isSelected ? '#00d4ff' : '#22c55e' }}
                    >
                      From ${stats.cheapest}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: '#8899aa', fontSize: '10px' }}
                    >
                      {stats.count} trip{stats.count === 1 ? '' : 's'}
                    </div>
                  </>
                ) : (
                  <div
                    className="text-xs"
                    style={{ color: '#8899aa', fontSize: '10px' }}
                  >
                    No trips
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
