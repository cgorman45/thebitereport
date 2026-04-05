'use client';

import { useState, useRef, useEffect } from 'react';

interface HeroTripSearchProps {
  selectedDuration: string | null;
  onDurationChange: (dur: string | null) => void;
  anglers: number;
  onAnglersChange: (n: number) => void;
  selectedSpecies: string | null;
  onSpeciesChange: (species: string | null) => void;
  departureCity: string;
  onDepartureCityChange: (city: string) => void;
  onSearch: () => void;
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

const SPECIES_OPTIONS = [
  { label: 'Any Species', value: '' },
  { label: 'Bluefin Tuna', value: 'Bluefin Tuna' },
  { label: 'Yellowfin Tuna', value: 'Yellowfin Tuna' },
  { label: 'Yellowtail', value: 'Yellowtail' },
  { label: 'White Seabass', value: 'White Seabass' },
  { label: 'Calico Bass', value: 'Calico Bass' },
  { label: 'Rockfish', value: 'Rockfish' },
  { label: 'Dorado', value: 'Dorado' },
];

const CITIES = [
  'San Diego',
  'Oceanside',
  'Dana Point',
  'Long Beach',
  'San Pedro',
  'Marina del Rey',
  'Ventura',
  'Santa Barbara',
];

/* Compact inline select styled as a pill */
function PillSelect({
  icon,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ border: '1px solid #1e2a42' }}>
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-0.5"
        style={{ color: value ? '#e2e8f0' : '#8899aa' }}
      >
        {options.map((opt) => (
          <option key={opt.label} value={opt.value} style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function HeroTripSearch({
  selectedDuration,
  onDurationChange,
  anglers,
  onAnglersChange,
  selectedSpecies,
  onSpeciesChange,
  departureCity,
  onDepartureCityChange,
  onSearch,
}: HeroTripSearchProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 rounded-2xl"
      style={{
        backgroundColor: 'rgba(19, 27, 46, 0.85)',
        border: '1px solid #1e2a42',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* City */}
      <PillSelect
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        }
        value={departureCity}
        options={CITIES.map((c) => ({ label: c, value: c }))}
        onChange={onDepartureCityChange}
      />

      {/* Duration */}
      <PillSelect
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
        value={selectedDuration ?? ''}
        options={DURATION_OPTIONS}
        onChange={(v) => onDurationChange(v === '' ? null : v)}
      />

      {/* Species */}
      <PillSelect
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a4 4 0 0 0 4 0 4 4 0 0 0 4 0 4 4 0 0 0 4 0 4 4 0 0 0 4 0" />
            <path d="M4 14 3 8l9-4 9 4-1 6" />
            <path d="M12 4v6" />
          </svg>
        }
        value={selectedSpecies ?? ''}
        options={SPECIES_OPTIONS}
        onChange={(v) => onSpeciesChange(v === '' ? null : v)}
      />

      {/* Anglers */}
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ border: '1px solid #1e2a42' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <button
          onClick={() => { if (anglers > 1) onAnglersChange(anglers - 1); }}
          disabled={anglers <= 1}
          className="text-[10px] font-bold disabled:opacity-30 w-4 h-4 flex items-center justify-center"
          style={{ color: '#00d4ff' }}
        >
          -
        </button>
        <span className="text-xs font-medium tabular-nums min-w-[14px] text-center" style={{ color: '#e2e8f0' }}>
          {anglers}
        </span>
        <button
          onClick={() => { if (anglers < 20) onAnglersChange(anglers + 1); }}
          disabled={anglers >= 20}
          className="text-[10px] font-bold disabled:opacity-30 w-4 h-4 flex items-center justify-center"
          style={{ color: '#00d4ff' }}
        >
          +
        </button>
      </div>

      {/* Search button */}
      <button
        onClick={onSearch}
        className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        style={{
          backgroundColor: '#00d4ff',
          color: '#0a0f1a',
          boxShadow: '0 2px 12px rgba(0, 212, 255, 0.25)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search Trips
      </button>
    </div>
  );
}
