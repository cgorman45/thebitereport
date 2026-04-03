'use client';

import type { ScheduledTrip, TripLanding } from '@/lib/trips/types';
import { getLandingName } from '@/lib/landings';

export interface FilterState {
  charterType: ('party_boat' | 'private_charter')[];
  durations: string[];
  landings: TripLanding[];
  priceRange: 'any' | 'under100' | '100to200' | '200to500' | 'over500';
  species: string[];
  timeOfDay: ('morning' | 'afternoon')[];
}

interface TripFiltersProps {
  trips: ScheduledTrip[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const ALL_SPECIES = [
  'Yellowtail',
  'Bluefin Tuna',
  'Yellowfin Tuna',
  'Calico Bass',
  'Rockfish',
  'White Seabass',
  'Lingcod',
  'Barracuda',
];

const PRICE_OPTIONS: { label: string; value: FilterState['priceRange'] }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Under $100', value: 'under100' },
  { label: '$100 – $200', value: '100to200' },
  { label: '$200 – $500', value: '200to500' },
  { label: '$500+', value: 'over500' },
];

function SectionHeader({ label }: { label: string }) {
  return (
    <span
      className="block text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: '#8899aa' }}
    >
      {label}
    </span>
  );
}

interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

function CustomCheckbox({ checked, onChange, label }: CustomCheckboxProps) {
  return (
    <label
      className="flex items-center gap-2.5 cursor-pointer group select-none"
      style={{ color: checked ? '#e2e8f0' : '#8899aa' }}
    >
      <span
        className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: checked ? '#00d4ff' : 'transparent',
          border: `1.5px solid ${checked ? '#00d4ff' : '#1e2a42'}`,
        }}
        onClick={onChange}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(); }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4l2.5 2.5L9 1"
              stroke="#0a0f1a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-sm transition-colors duration-150">{label}</span>
    </label>
  );
}

interface CustomRadioProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

function CustomRadio({ checked, onChange, label }: CustomRadioProps) {
  return (
    <label
      className="flex items-center gap-2.5 cursor-pointer select-none"
      style={{ color: checked ? '#e2e8f0' : '#8899aa' }}
    >
      <span
        className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: 'transparent',
          border: `1.5px solid ${checked ? '#00d4ff' : '#1e2a42'}`,
        }}
        onClick={onChange}
        role="radio"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(); }}
      >
        {checked && (
          <span
            className="block w-2 h-2 rounded-full"
            style={{ backgroundColor: '#00d4ff' }}
          />
        )}
      </span>
      <span className="text-sm transition-colors duration-150">{label}</span>
    </label>
  );
}

export default function TripFilters({ trips, filters, onFilterChange }: TripFiltersProps) {
  // Derive which species actually exist in the current trips array
  const availableSpecies = ALL_SPECIES.filter(s =>
    trips.some(t =>
      t.targetSpecies.some(ts => ts.toLowerCase() === s.toLowerCase())
    )
  );

  function toggleLanding(landing: TripLanding) {
    const current = filters.landings;
    const next = current.includes(landing)
      ? current.filter(l => l !== landing)
      : [...current, landing];
    onFilterChange({ ...filters, landings: next });
  }

  function toggleSpecies(species: string) {
    const current = filters.species;
    const next = current.includes(species)
      ? current.filter(s => s !== species)
      : [...current, species];
    onFilterChange({ ...filters, species: next });
  }

  function toggleTimeOfDay(time: 'morning' | 'afternoon') {
    const current = filters.timeOfDay;
    const next = current.includes(time)
      ? current.filter(t => t !== time)
      : [...current, time];
    onFilterChange({ ...filters, timeOfDay: next });
  }

  function clearAll() {
    onFilterChange({
      charterType: [],
      durations: [],
      landings: [],
      priceRange: 'any',
      species: [],
      timeOfDay: [],
    });
  }

  const hasActiveFilters =
    filters.charterType.length > 0 ||
    filters.durations.length > 0 ||
    filters.landings.length > 0 ||
    filters.priceRange !== 'any' ||
    filters.species.length > 0 ||
    filters.timeOfDay.length > 0;

  return (
    <div
      className="rounded-xl flex flex-col gap-0"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
      }}
    >
      {/* Panel header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1e2a42' }}
      >
        <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
          Filters
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold transition-colors duration-150 hover:brightness-125"
            style={{ color: '#00d4ff', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* ── Section 1: Trip Duration ── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a42' }}>
        <SectionHeader label="Trip Duration" />
        <div className="flex flex-col gap-2.5">
          {['1/2 Day', '3/4 Day', 'Full Day', 'Overnight', 'Multi-Day', 'Long Range'].map((dur) => (
            <CustomCheckbox
              key={dur}
              checked={filters.durations.length === 0 || filters.durations.includes(dur)}
              onChange={() => {
                const durations = filters.durations.includes(dur)
                  ? filters.durations.filter((d) => d !== dur)
                  : [...filters.durations, dur];
                onFilterChange({ ...filters, durations });
              }}
              label={dur}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: Charter Type ── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a42' }}>
        <SectionHeader label="Charter Type" />
        <div className="flex flex-col gap-2.5">
          <CustomCheckbox
            checked={filters.charterType.length === 0 || filters.charterType.includes('party_boat')}
            onChange={() => {
              const ct = filters.charterType.includes('party_boat')
                ? filters.charterType.filter((c) => c !== 'party_boat')
                : [...filters.charterType, 'party_boat'] as ('party_boat' | 'private_charter')[];
              onFilterChange({ ...filters, charterType: ct });
            }}
            label="Party Boats"
          />
          <CustomCheckbox
            checked={filters.charterType.length === 0 || filters.charterType.includes('private_charter')}
            onChange={() => {
              const ct = filters.charterType.includes('private_charter')
                ? filters.charterType.filter((c) => c !== 'private_charter')
                : [...filters.charterType, 'private_charter'] as ('party_boat' | 'private_charter')[];
              onFilterChange({ ...filters, charterType: ct });
            }}
            label="Private Charters (6-pack)"
          />
        </div>
      </div>

      {/* ── Section 3: Landing ── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a42' }}>
        <SectionHeader label="Landing" />
        <div className="flex flex-col gap-2.5">
          {(['seaforth', 'fishermans', 'hm_landing', 'point_loma', 'helgrens', 'private_charter'] as TripLanding[]).map((landing) => (
            <CustomCheckbox
              key={landing}
              checked={filters.landings.length === 0 || filters.landings.includes(landing)}
              onChange={() => toggleLanding(landing)}
              label={getLandingName(landing)}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: Price Range ── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a42' }}>
        <SectionHeader label="Price Range" />
        <div className="flex flex-col gap-2.5">
          {PRICE_OPTIONS.map(opt => (
            <CustomRadio
              key={opt.value}
              checked={filters.priceRange === opt.value}
              onChange={() => onFilterChange({ ...filters, priceRange: opt.value })}
              label={opt.label}
            />
          ))}
        </div>
      </div>

      {/* ── Section 3: Target Species ── */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e2a42' }}>
        <SectionHeader label="Target Species" />
        {availableSpecies.length === 0 ? (
          <p className="text-xs" style={{ color: '#4a5a6e' }}>
            No species data available.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {availableSpecies.map(species => (
              <CustomCheckbox
                key={species}
                checked={filters.species.includes(species)}
                onChange={() => toggleSpecies(species)}
                label={species}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: Departure Time ── */}
      <div className="px-5 py-4">
        <SectionHeader label="Departure Time" />
        <div className="flex flex-col gap-2.5">
          <CustomCheckbox
            checked={filters.timeOfDay.length === 0 || filters.timeOfDay.includes('morning')}
            onChange={() => toggleTimeOfDay('morning')}
            label="Morning (before 12 PM)"
          />
          <CustomCheckbox
            checked={filters.timeOfDay.length === 0 || filters.timeOfDay.includes('afternoon')}
            onChange={() => toggleTimeOfDay('afternoon')}
            label="Afternoon (12 PM+)"
          />
        </div>
      </div>

      {/* ── Bottom: Clear All link (always visible at bottom) ── */}
      <div
        className="px-5 py-3 flex justify-center"
        style={{ borderTop: '1px solid #1e2a42' }}
      >
        <button
          onClick={clearAll}
          className="text-xs font-medium transition-colors duration-150"
          style={{
            color: hasActiveFilters ? '#00d4ff' : '#4a5a6e',
            background: 'none',
            border: 'none',
            cursor: hasActiveFilters ? 'pointer' : 'default',
          }}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
