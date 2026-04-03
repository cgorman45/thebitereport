'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TripSearch from '@/components/trip-planner/TripSearch';
import PriceCalendar from '@/components/trip-planner/PriceCalendar';
import TripFilters, { type FilterState } from '@/components/trip-planner/TripFilters';
import TripResults from '@/components/trip-planner/TripResults';
import ChatBubble from '@/components/trip-planner/ChatBubble';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';

const DEFAULT_FILTERS: FilterState = {
  landings: [],
  priceRange: 'any',
  species: [],
  timeOfDay: [],
};

function parseHour(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h;
}

export default function PlanYourTripPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(1);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const filteredTrips = useMemo(() => {
    let results: ScheduledTrip[] = [...TRIP_SCHEDULE];

    if (selectedDate) {
      results = results.filter((t) => t.departureDate === selectedDate);
    }

    if (selectedDuration) {
      results = results.filter((t) => {
        const dur = selectedDuration.toLowerCase();
        const td = t.duration.toLowerCase();
        if (dur === 'half day') return td.includes('1/2') || td.includes('half');
        if (dur === '3/4 day') return td.includes('3/4');
        if (dur === 'full day') return td === 'full day';
        if (dur === 'overnight') return td === 'overnight';
        if (dur === 'multi-day') return td.includes('1.5') || td.includes('2 day') || td.includes('3 day');
        if (dur === 'long range') return td === 'long range';
        return true;
      });
    }

    if (anglers > 1) {
      results = results.filter((t) => t.spotsLeft >= anglers);
    }

    if (filters.landings.length > 0) {
      results = results.filter((t) => filters.landings.includes(t.landing));
    }

    if (filters.priceRange !== 'any') {
      results = results.filter((t) => {
        const p = t.pricePerPerson;
        switch (filters.priceRange) {
          case 'under100': return p < 100;
          case '100to200': return p >= 100 && p < 200;
          case '200to500': return p >= 200 && p < 500;
          case 'over500': return p >= 500;
          default: return true;
        }
      });
    }

    if (filters.species.length > 0) {
      results = results.filter((t) =>
        t.targetSpecies.some((s) =>
          filters.species.some((fs) => s.toLowerCase().includes(fs.toLowerCase()))
        )
      );
    }

    if (filters.timeOfDay.length > 0) {
      results = results.filter((t) => {
        const hour = parseHour(t.departureTime);
        if (filters.timeOfDay.includes('morning') && hour < 12) return true;
        if (filters.timeOfDay.includes('afternoon') && hour >= 12) return true;
        return false;
      });
    }

    return results;
  }, [selectedDate, selectedDuration, anglers, filters]);

  const handleViewOnMap = useCallback(
    (mmsi: number) => {
      sessionStorage.setItem('focusMMSI', String(mmsi));
      router.push('/fleet-tracker');
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Page title */}
        <div className="text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#e2e8f0' }}>
            Plan Your <span style={{ color: '#00d4ff' }}>Trip</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8899aa' }}>
            Find the perfect San Diego sportfishing trip
          </p>
        </div>

        {/* Search bar */}
        <TripSearch
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          anglers={anglers}
          onAnglersChange={setAnglers}
        />

        {/* Price calendar */}
        <PriceCalendar
          trips={TRIP_SCHEDULE}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Mobile filter toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              color: '#8899aa',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {(filters.landings.length > 0 || filters.priceRange !== 'any' || filters.species.length > 0 || filters.timeOfDay.length > 0) && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00d4ff' }} />
            )}
          </button>
        </div>

        {/* Results area */}
        <div className="flex gap-5">
          <div className={`flex-shrink-0 w-[240px] ${showFilters ? 'block' : 'hidden'} md:block`}>
            <TripFilters trips={TRIP_SCHEDULE} filters={filters} onFilterChange={setFilters} />
          </div>
          <div className="flex-1 min-w-0">
            <TripResults trips={filteredTrips} onViewOnMap={handleViewOnMap} />
          </div>
        </div>
      </main>

      <footer className="mt-8 py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Southern California Fishing Intelligence</p>
        <p className="mt-1 text-xs">
          Trips depart from San Diego &middot; Seaforth Sportfishing &amp; Fisherman&apos;s Landing
        </p>
      </footer>

      <ChatBubble />
    </div>
  );
}
