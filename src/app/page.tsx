'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HeroTripSearch from '@/components/HeroTripSearch';
import CatchFeed from '@/components/CatchFeed';
import ScoreSidebar from '@/components/ScoreSidebar';
import ForecastCard from '@/components/ForecastCard';
import LocationSearch from '@/components/LocationSearch';
import { locations } from '@/lib/locations';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';
import type { DailyScore, FishingEvent } from '@/types';

export default function Home() {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState('hm-landing-san-diego');
  const [dailyScore, setDailyScore] = useState<DailyScore | null>(null);
  const [forecast, setForecast] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Trip search state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(1);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [departureCity, setDepartureCity] = useState('San Diego');
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[] | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);

  const fetchScore = useCallback(async (slug: string, date?: string) => {
    const params = new URLSearchParams({ location: slug });
    if (date) params.set('date', date);
    const res = await fetch(`/api/score?${params}`);
    if (!res.ok) throw new Error('Failed to fetch score');
    return res.json() as Promise<DailyScore>;
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const today = new Date();
        const dates = [0, 1, 2].map((offset) => {
          const d = new Date(today);
          d.setDate(d.getDate() + offset);
          return d.toISOString().split('T')[0];
        });

        const [todayScore, ...forecastScores] = await Promise.all(
          dates.map((date) => fetchScore(selectedSlug, date))
        );

        setDailyScore(todayScore);
        setForecast(forecastScores);
      } catch {
        // Score fetch failed — feed still works
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedSlug, fetchScore]);

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
    if (selectedDate) params.set('date', selectedDate);
    if (selectedDuration) params.set('duration', selectedDuration);
    if (selectedSpecies) params.set('species', selectedSpecies);
    if (anglers > 1) params.set('anglers', String(anglers));
    params.set('city', departureCity);
    const qs = params.toString();
    router.push(`/plan-your-trip?${qs}`);
  }

  // Extract conditions from score data
  const currentHour = new Date().getHours();
  const allEvents: FishingEvent[] =
    dailyScore?.hourlyScores.flatMap((h) => h.events) || [];
  const tideEvents = allEvents.filter(
    (e) => e.type === 'tide_high' || e.type === 'tide_low'
  );
  const nextTide = tideEvents.find((e) => e.hour >= currentHour);
  const tideStatus = nextTide
    ? `${nextTide.type === 'tide_high' ? 'High' : 'Low'} at ${nextTide.hour > 12 ? nextTide.hour - 12 : nextTide.hour}${nextTide.hour >= 12 ? ' PM' : ' AM'}`
    : 'Loading...';

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

          {/* Right: Score Sidebar (compact, sticky) */}
          <div className="w-full md:w-[320px] flex-shrink-0">
            {/* Location search in sidebar */}
            <div className="mb-4">
              <LocationSearch
                locations={locations}
                selectedSlug={selectedSlug}
                onSelect={setSelectedSlug}
              />
            </div>

            <ScoreSidebar
              score={loading ? null : dailyScore?.overall ?? null}
              label={loading ? null : dailyScore?.label ?? null}
              location={dailyScore?.location.name ?? 'Loading...'}
              bestHour={dailyScore?.bestHour ?? null}
              waterTemp={null}
              tideStatus={tideStatus}
              moonPhase="New Moon"
              windCondition="Light winds, 5-10 mph"
              bestSpecies={['Yellowtail', 'Bluefin Tuna', 'Calico Bass', 'Rockfish', 'White Seabass', 'Barracuda']}
            />

            {/* Forecast cards in sidebar */}
            {forecast.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8899aa' }}>
                  Forecast
                </h3>
                {forecast.map((day) => (
                  <ForecastCard
                    key={day.date}
                    date={day.date}
                    score={day.overall}
                    label={day.label}
                    bestHour={day.bestHour}
                    highTemp={75}
                    lowTemp={60}
                    onClick={() => router.push(`/location/${selectedSlug}`)}
                  />
                ))}
              </div>
            )}
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
