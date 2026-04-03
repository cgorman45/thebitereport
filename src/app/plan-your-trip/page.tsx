'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import TripSearch from '@/components/trip-planner/TripSearch';
import PriceCalendar from '@/components/trip-planner/PriceCalendar';
import TripFilters, { type FilterState } from '@/components/trip-planner/TripFilters';
import TripResults from '@/components/trip-planner/TripResults';
import ChatBubble from '@/components/trip-planner/ChatBubble';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';

const DEFAULT_FILTERS: FilterState = {
  charterType: [],
  durations: [],
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
  const searchParams = useSearchParams();
  const boatParam = searchParams.get('boat');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(1);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[] | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Fetch live trip data from scraper
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/trips', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ScheduledTrip[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveTrips(data);
        }
      })
      .catch(() => {/* use static fallback */})
      .finally(() => setTripsLoading(false));
    return () => controller.abort();
  }, []);

  // Use live data for scraped landings; keep static schedule for unscraped ones (H&M, Helgren's)
  const allTrips = useMemo(() => {
    if (!liveTrips?.length) return TRIP_SCHEDULE;
    const scrapedLandings = new Set(liveTrips.map((t) => t.landing));
    const staticFallback = TRIP_SCHEDULE.filter(
      (t) => !scrapedLandings.has(t.landing) && t.charterType !== 'private_charter'
    );
    const privateCharters = TRIP_SCHEDULE.filter((t) => t.charterType === 'private_charter');
    return [...liveTrips, ...staticFallback, ...privateCharters];
  }, [liveTrips]);

  const isLiveData = liveTrips !== null && liveTrips.length > 0;

  const filteredTrips = useMemo(() => {
    let results: ScheduledTrip[] = [...allTrips];

    // If a boat name was passed via query param, filter to that boat first
    if (boatParam) {
      const boatLower = boatParam.toLowerCase();
      const boatMatches = results.filter((t) => t.boatName.toLowerCase().includes(boatLower));
      if (boatMatches.length > 0) {
        results = boatMatches;
      }
    }

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

    // Charter type filter
    if (filters.charterType.length > 0) {
      results = results.filter((t) => {
        const ct = t.charterType || 'party_boat';
        return filters.charterType.includes(ct);
      });
    }

    // Duration filter
    if (filters.durations.length > 0) {
      results = results.filter((t) => {
        const td = t.duration.toLowerCase();
        return filters.durations.some((d) => {
          const dl = d.toLowerCase();
          if (dl === '1/2 day') return td.includes('1/2');
          if (dl === '3/4 day') return td.includes('3/4');
          if (dl === 'full day') return td === 'full day';
          if (dl === 'overnight') return td === 'overnight';
          if (dl === 'multi-day') return td.includes('1.5') || td.includes('2 day') || td.includes('3 day');
          if (dl === 'long range') return td === 'long range';
          return false;
        });
      });
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
  }, [allTrips, boatParam, selectedDate, selectedDuration, anglers, filters]);

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
          <p className="text-sm mt-1 flex items-center justify-center gap-2" style={{ color: '#8899aa' }}>
            {boatParam
              ? `Showing trips on the ${boatParam}`
              : 'Find the perfect San Diego sportfishing trip'}
            {!boatParam && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{
                  color: tripsLoading ? '#8899aa' : isLiveData ? '#22c55e' : '#f97316',
                  backgroundColor: tripsLoading ? '#8899aa15' : isLiveData ? '#22c55e15' : '#f9731615',
                  border: `1px solid ${tripsLoading ? '#8899aa33' : isLiveData ? '#22c55e33' : '#f9731633'}`,
                }}
              >
                {tripsLoading ? 'Loading...' : isLiveData ? `${allTrips.length} Live Trips` : 'Sample Data'}
              </span>
            )}
          </p>
          {boatParam && (
            <button
              onClick={() => router.push('/plan-your-trip')}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: '#00d4ff18',
                color: '#00d4ff',
                border: '1px solid #00d4ff33',
              }}
            >
              Show all trips &times;
            </button>
          )}
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
          trips={allTrips}
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
            {(filters.charterType.length > 0 || filters.durations.length > 0 || filters.landings.length > 0 || filters.priceRange !== 'any' || filters.species.length > 0 || filters.timeOfDay.length > 0) && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00d4ff' }} />
            )}
          </button>
        </div>

        {/* Results area */}
        <div className="flex gap-5">
          <div className={`flex-shrink-0 w-[240px] ${showFilters ? 'block' : 'hidden'} md:block`}>
            <TripFilters trips={allTrips} filters={filters} onFilterChange={setFilters} />
          </div>
          <div className="flex-1 min-w-0">
            <TripResults trips={filteredTrips} onViewOnMap={handleViewOnMap} />
          </div>
        </div>
      </main>

      <footer className="mt-8 py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
        <p className="mt-1 text-xs">
          Trips depart from San Diego &middot; Seaforth Sportfishing &amp; Fisherman&apos;s Landing
        </p>
      </footer>

      <ChatBubble />
    </div>
  );
}
