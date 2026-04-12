'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HeroTripSearch from '@/components/HeroTripSearch';
import CatchFeed from '@/components/CatchFeed';
import InstagramFeed from '@/components/InstagramFeed';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';

export default function Home() {
  const router = useRouter();

  // Trip search state
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(1);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [departureCity, setDepartureCity] = useState('San Diego');
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[] | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Fetch live trip data for the hero search widget
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

  const allTrips = useMemo(() => {
    if (!liveTrips?.length) return TRIP_SCHEDULE;
    return [...TRIP_SCHEDULE, ...liveTrips];
  }, [liveTrips]);

  const isLiveData = liveTrips !== null && liveTrips.length > 0;

  function handleTripSearch() {
    const params = new URLSearchParams();
    if (selectedDuration) params.set('duration', selectedDuration);
    if (selectedSpecies) params.set('species', selectedSpecies);
    if (anglers > 1) params.set('anglers', String(anglers));
    params.set('city', departureCity);
    const qs = params.toString();
    router.push(`/plan-your-trip?${qs}`);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection>
        <div className="w-full max-w-4xl mx-auto mt-8">
          {!tripsLoading && (
            <div className="text-center mb-3">
              <span
                className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{
                  color: isLiveData ? '#22c55e' : '#f97316',
                  backgroundColor: isLiveData ? '#22c55e15' : '#f9731615',
                  border: `1px solid ${isLiveData ? '#22c55e33' : '#f9731633'}`,
                }}
              >
                {isLiveData ? `${allTrips.length} Live Trips` : 'Sample Data'}
              </span>
            </div>
          )}
          <HeroTripSearch
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            anglers={anglers}
            onAnglersChange={setAnglers}
            selectedSpecies={selectedSpecies}
            onSpeciesChange={setSelectedSpecies}
            departureCity={departureCity}
            onDepartureCityChange={setDepartureCity}
            onSearch={handleTripSearch}
          />
        </div>
      </HeroSection>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Two-column layout: Feed + Sidebar */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Catch Report Feed (primary content) */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#e2e8f0' }}>
              Recent Catch Reports
            </h2>
            <CatchFeed />
          </div>

          {/* Right: Instagram Feed Sidebar */}
          <div className="w-full md:w-[320px] flex-shrink-0">
            <InstagramFeed />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
        <p className="mt-1 text-xs">
          Data from NOAA, Open-Meteo, NDBC, Windy.com, and public fishing reports
        </p>
      </footer>
    </div>
  );
}
