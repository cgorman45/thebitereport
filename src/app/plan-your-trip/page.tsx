'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const resultsRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(1);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[] | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // New search fields
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [departureCity, setDepartureCity] = useState('San Diego');

  // Auto-show results if boat param is set
  useEffect(() => {
    if (boatParam) {
      setTimeout(() => setHasSearched(true), 0);
    }
  }, [boatParam]);

  // Fetch live trip data from scraper
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/trips', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ScheduledTrip[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTimeout(() => setLiveTrips(data), 0);
        }
      })
      .catch(() => {/* use static fallback */})
      .finally(() => setTimeout(() => setTripsLoading(false), 0));
    return () => controller.abort();
  }, []);

  // Use live data for scraped landings; keep static schedule for unscraped ones
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

    // Boat name query param filter
    if (boatParam) {
      const boatLower = boatParam.toLowerCase();
      const boatMatches = results.filter((t) => t.boatName.toLowerCase().includes(boatLower));
      if (boatMatches.length > 0) {
        results = boatMatches;
      }
    }

    // Species from hero search
    if (selectedSpecies) {
      results = results.filter((t) =>
        t.targetSpecies.some((s) => s.toLowerCase().includes(selectedSpecies.toLowerCase()))
      );
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
  }, [allTrips, boatParam, selectedDate, selectedDuration, selectedSpecies, anglers, filters]);

  const handleViewOnMap = useCallback(
    (mmsi: number) => {
      sessionStorage.setItem('focusMMSI', String(mmsi));
      router.push('/fleet-tracker');
    },
    [router]
  );

  function handleSearch() {
    setHasSearched(true);
    // Scroll to results after a short delay
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />

      {/* ═══════════════════════════════════════
          Google Flights-style Hero + Search
          ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
          }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(10,15,26,0.6) 0%, rgba(10,15,26,0.45) 30%, rgba(10,15,26,0.7) 70%, #0a0f1a 100%)',
          }}
        />
        {/* Subtle cyan glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 80%, rgba(0,212,255,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24">
          {/* Hero heading */}
          <div className="text-center mb-10">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight"
              style={{ color: '#ffffff' }}
            >
              Trips
            </h1>
            {boatParam ? (
              <div className="mt-3">
                <p className="text-sm" style={{ color: '#8899aa' }}>
                  Showing trips on the <span style={{ color: '#00d4ff' }}>{boatParam}</span>
                </p>
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
              </div>
            ) : (
              <p className="text-sm sm:text-base mt-2" style={{ color: '#8899aa' }}>
                Find the perfect Southern California sportfishing trip
              </p>
            )}
            {!boatParam && (
              <span
                className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{
                  color: tripsLoading ? '#8899aa' : isLiveData ? '#22c55e' : '#f97316',
                  backgroundColor: tripsLoading ? '#8899aa15' : isLiveData ? '#22c55e15' : '#f9731615',
                  border: `1px solid ${tripsLoading ? '#8899aa33' : isLiveData ? '#22c55e33' : '#f9731633'}`,
                }}
              >
                {tripsLoading ? 'Loading...' : isLiveData ? `${allTrips.length} Live Trips` : 'Sample Data'}
              </span>
            )}
          </div>

          {/* Search card */}
          <div className="max-w-3xl mx-auto">
            <TripSearch
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedDuration={selectedDuration}
              onDurationChange={setSelectedDuration}
              anglers={anglers}
              onAnglersChange={setAnglers}
              selectedSpecies={selectedSpecies}
              onSpeciesChange={setSelectedSpecies}
              departureCity={departureCity}
              onDepartureCityChange={setDepartureCity}
              onSearch={handleSearch}
            />
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ height: '32px' }}>
          <svg
            className="relative block w-full"
            style={{ height: '32px' }}
            viewBox="0 0 1440 32"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0,16 C120,28 240,4 360,16 C480,28 600,4 720,16 C840,28 960,4 1080,16 C1200,28 1320,4 1440,16 L1440,32 L0,32 Z"
              fill="#0a0f1a"
            />
          </svg>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          Trending species / quick picks
          ═══════════════════════════════════════ */}
      {!hasSearched && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8899aa' }}>
            Trending This Week
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { species: 'Bluefin Tuna', emoji: '🔵', hot: true },
              { species: 'Yellowtail', emoji: '🟢', hot: true },
              { species: 'Yellowfin Tuna', emoji: '🟡', hot: false },
              { species: 'White Seabass', emoji: '⚪', hot: false },
              { species: 'Calico Bass', emoji: '🟤', hot: false },
              { species: 'Rockfish', emoji: '🔴', hot: false },
            ].map(({ species, emoji, hot }) => (
              <button
                key={species}
                onClick={() => {
                  setSelectedSpecies(species);
                  setHasSearched(true);
                  setTimeout(() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e2a42',
                  color: '#e2e8f0',
                }}
              >
                <span>{emoji}</span>
                <span>{species}</span>
                {hot && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                    style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444433' }}
                  >
                    Hot
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Popular destinations */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 mt-8" style={{ color: '#8899aa' }}>
            Popular Departures from {departureCity}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: '9 Mile Bank', species: 'Yellowtail, Bluefin Tuna', time: '~45 min', img: 'https://images.unsplash.com/photo-1534575859189-5a12e2a537c9?auto=format&fit=crop&w=400&q=70' },
              { name: 'Coronado Islands', species: 'Yellowtail, Calico Bass', time: '~1 hr', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=70' },
              { name: '302 / 371 Kelp', species: 'Bluefin Tuna, Yellowfin', time: '~2 hr', img: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=400&q=70' },
              { name: 'Tanner / Cortez Bank', species: 'Bluefin, Yellowtail', time: '~8 hr', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=70' },
            ].map((spot) => (
              <button
                key={spot.name}
                onClick={() => {
                  setHasSearched(true);
                  setTimeout(() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="flex items-center gap-4 p-3 rounded-xl text-left transition-all duration-200 hover:brightness-110 group"
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e2a42',
                }}
              >
                <div
                  className="shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: `url(${spot.img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#e2e8f0' }}>
                    {spot.name}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#00d4ff' }}>
                    {spot.species}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#8899aa' }}>
                    {spot.time} from {departureCity}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          Results Section (shown after search)
          ═══════════════════════════════════════ */}
      {hasSearched && (
        <div ref={resultsRef}>
          <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
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
        </div>
      )}

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
