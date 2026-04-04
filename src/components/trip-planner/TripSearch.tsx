'use client';

import { useState, useRef, useEffect } from 'react';
import DateCalendar from './DateCalendar';
import type { ScheduledTrip } from '@/lib/trips/types';

interface TripSearchProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  selectedDuration: string | null;
  onDurationChange: (dur: string | null) => void;
  anglers: number;
  onAnglersChange: (n: number) => void;
  selectedSpecies: string | null;
  onSpeciesChange: (species: string | null) => void;
  departureCity: string;
  onDepartureCityChange: (city: string) => void;
  onSearch: () => void;
  trips: ScheduledTrip[];
}

const SPECIES_OPTIONS = [
  { label: 'Any Species', value: null, icon: '🐟' },
  { label: 'Bluefin Tuna', value: 'Bluefin Tuna', icon: '🔵' },
  { label: 'Yellowfin Tuna', value: 'Yellowfin Tuna', icon: '🟡' },
  { label: 'Yellowtail', value: 'Yellowtail', icon: '🟢' },
  { label: 'White Seabass', value: 'White Seabass', icon: '⚪' },
  { label: 'Calico Bass', value: 'Calico Bass', icon: '🟤' },
  { label: 'Rockfish', value: 'Rockfish', icon: '🔴' },
  { label: 'Lingcod', value: 'Lingcod', icon: '🟠' },
  { label: 'Barracuda', value: 'Barracuda', icon: '⚡' },
  { label: 'Dorado', value: 'Dorado', icon: '💛' },
] as const;

const DEPARTURE_CITIES = [
  'San Diego',
  'Oceanside',
  'Dana Point',
  'Long Beach',
  'San Pedro',
  'Marina del Rey',
  'Ventura',
  'Santa Barbara',
];

const DURATION_OPTIONS = [
  { label: 'Any Duration', value: '' },
  { label: 'Half Day', value: 'Half Day' },
  { label: '3/4 Day', value: '3/4 Day' },
  { label: 'Full Day', value: 'Full Day' },
  { label: 'Overnight', value: 'Overnight' },
  { label: 'Multi-Day', value: 'Multi-Day' },
  { label: 'Long Range', value: 'Long Range' },
];

/* ────────────────────────────────────────
   Dropdown component (reusable)
   ──────────────────────────────────────── */
function Dropdown({
  items,
  value,
  onSelect,
  placeholder,
}: {
  items: { label: string; value: string }[];
  value: string;
  onSelect: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = items.find(i => i.value === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
        style={{
          backgroundColor: 'transparent',
          color: selected ? '#e2e8f0' : '#8899aa',
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-full rounded-lg py-1 z-50 max-h-56 overflow-y-auto"
          style={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a42',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {items.map(item => (
            <button
              key={item.value}
              onClick={() => { onSelect(item.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm transition-colors duration-100"
              style={{
                color: item.value === value ? '#00d4ff' : '#e2e8f0',
                backgroundColor: item.value === value ? 'rgba(0,212,255,0.08)' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,212,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = item.value === value ? 'rgba(0,212,255,0.08)' : 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────
   Main TripSearch (Google Flights style)
   ──────────────────────────────────────── */
export default function TripSearch({
  selectedDate,
  onDateChange,
  selectedDuration,
  onDurationChange,
  anglers,
  onAnglersChange,
  selectedSpecies,
  onSpeciesChange,
  departureCity,
  onDepartureCityChange,
  onSearch,
  trips,
}: TripSearchProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Format selected date for display
  const dateDisplay = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ── Top controls row: Duration, Anglers ── */}
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid #1e2a42' }}
        >
          {/* Duration dropdown chip */}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ border: '1px solid #1e2a42' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <select
              value={selectedDuration ?? ''}
              onChange={e => onDurationChange(e.target.value === '' ? null : e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium focus:outline-none cursor-pointer pr-1"
              style={{ color: selectedDuration ? '#e2e8f0' : '#8899aa' }}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.value} style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Anglers chip */}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ border: '1px solid #1e2a42' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <button
              onClick={() => { if (anglers > 1) onAnglersChange(anglers - 1); }}
              disabled={anglers <= 1}
              className="text-xs font-bold disabled:opacity-30 w-4 h-4 flex items-center justify-center"
              style={{ color: '#00d4ff' }}
            >
              -
            </button>
            <span className="text-sm font-medium tabular-nums min-w-[16px] text-center" style={{ color: '#e2e8f0' }}>
              {anglers}
            </span>
            <button
              onClick={() => { if (anglers < 20) onAnglersChange(anglers + 1); }}
              disabled={anglers >= 20}
              className="text-xs font-bold disabled:opacity-30 w-4 h-4 flex items-center justify-center"
              style={{ color: '#00d4ff' }}
            >
              +
            </button>
          </div>
        </div>

        {/* ── Main search row: City | Species | Date ── */}
        <div className="px-5 py-4">
          <div
            className="flex flex-col sm:flex-row items-stretch rounded-xl overflow-visible"
            style={{ border: '1px solid #1e2a42' }}
          >
            {/* Departure City */}
            <div
              className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0 relative"
              style={{ borderBottom: '1px solid #1e2a42' }}
            >
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full" style={{ border: '2px solid #8899aa' }} />
              </div>
              <Dropdown
                items={DEPARTURE_CITIES.map(c => ({ label: c, value: c }))}
                value={departureCity}
                onSelect={onDepartureCityChange}
                placeholder="Departure city"
              />
              {/* Swap icon */}
              <div
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            {/* Target Species */}
            <div
              className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0"
              style={{ borderBottom: '1px solid #1e2a42' }}
            >
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <Dropdown
                items={SPECIES_OPTIONS.map(s => ({ label: `${s.icon} ${s.label}`, value: s.value ?? '' }))}
                value={selectedSpecies ?? ''}
                onSelect={val => onSpeciesChange(val === '' ? null : val)}
                placeholder="Target species"
              />
            </div>

            {/* Departure Date — opens calendar popup */}
            <div
              className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0 cursor-pointer transition-colors duration-150"
              onClick={() => setCalendarOpen(true)}
              style={{
                backgroundColor: calendarOpen ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!calendarOpen) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0, 212, 255, 0.03)';
              }}
              onMouseLeave={e => {
                if (!calendarOpen) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
              }}
            >
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={calendarOpen || selectedDate ? '#00d4ff' : '#8899aa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span
                className="text-sm font-medium flex-1"
                style={{ color: dateDisplay ? '#e2e8f0' : '#8899aa' }}
              >
                {dateDisplay ?? 'Departure'}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#8899aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Search button */}
          <div className="flex justify-center mt-5">
            <button
              onClick={onSearch}
              className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: '#00d4ff',
                color: '#0a0f1a',
                boxShadow: '0 2px 12px rgba(0, 212, 255, 0.3)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search Trips
            </button>
          </div>
        </div>
      </div>

      {/* Calendar popup */}
      <DateCalendar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        selectedDuration={selectedDuration}
        onDurationChange={onDurationChange}
        trips={trips}
      />
    </>
  );
}
