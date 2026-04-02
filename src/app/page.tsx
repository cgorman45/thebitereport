'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import FishingScore from '@/components/FishingScore';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import TimelineGraph from '@/components/TimelineGraph';
import TripPlanner from '@/components/TripPlanner';
import ForecastCard from '@/components/ForecastCard';
import LocationSearch from '@/components/LocationSearch';
import CurrentConditions from '@/components/CurrentConditions';
import { locations } from '@/lib/locations';
import { computeTripWindow } from '@/lib/scoring';
import type { DailyScore, TripWindow, FishingEvent } from '@/types';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-[200px] h-[200px] rounded-full bg-[#131b2e]" />
        <div className="h-6 w-32 rounded bg-[#131b2e]" />
      </div>
      <div className="h-64 rounded-xl bg-[#131b2e]" />
      <div className="h-80 rounded-xl bg-[#131b2e]" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState('hm-landing-san-diego');
  const [dailyScore, setDailyScore] = useState<DailyScore | null>(null);
  const [forecast, setForecast] = useState<DailyScore[]>([]);
  const [tripWindow, setTripWindow] = useState<TripWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      setTripWindow(null);

      try {
        // Fetch today and next 2 days
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load fishing data'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedSlug, fetchScore]);

  const handleTripWindowSelect = (startHour: number, endHour: number) => {
    if (!dailyScore) return;

    const result = computeTripWindow(
      dailyScore.hourlyScores,
      startHour,
      endHour,
      null // TODO: pass actual water temp when available
    );

    setTripWindow({
      startHour,
      endHour,
      ...result,
    });
  };

  // Extract current conditions from the current hour's data
  const currentHour = new Date().getHours();
  const currentHourData = dailyScore?.hourlyScores.find(
    (h) => h.hour === currentHour
  );

  // Gather all events for the day
  const allEvents: FishingEvent[] =
    dailyScore?.hourlyScores.flatMap((h) => h.events) || [];

  // Get current tide status
  const tideEvents = allEvents.filter(
    (e) => e.type === 'tide_high' || e.type === 'tide_low'
  );
  const nextTide = tideEvents.find((e) => e.hour >= currentHour);
  const tideStatus = nextTide
    ? `${nextTide.type === 'tide_high' ? 'High' : 'Low'} at ${nextTide.hour > 12 ? nextTide.hour - 12 : nextTide.hour}${nextTide.hour >= 12 ? ' PM' : ' AM'}`
    : 'No tide data';

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Location Search */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <LocationSearch
              locations={locations}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg">{error}</p>
            <button
              onClick={() => setSelectedSlug(selectedSlug)}
              className="mt-4 px-6 py-2 rounded-lg bg-[#131b2e] border border-[#1e2a42] hover:border-[#00d4ff] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : dailyScore ? (
          <>
            {/* Location Name */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">{dailyScore.location.name}</h2>
              <p className="text-[#8899aa] text-sm">
                {dailyScore.location.region} &middot;{' '}
                {dailyScore.location.type.charAt(0).toUpperCase() +
                  dailyScore.location.type.slice(1)}
              </p>
            </div>

            {/* Hero Score */}
            <div className="flex flex-col items-center">
              <FishingScore
                score={dailyScore.overall}
                label={dailyScore.label}
                size="lg"
              />
              <p className="mt-3 text-[#8899aa] text-sm">
                Best time: {dailyScore.bestHour > 12 ? dailyScore.bestHour - 12 : dailyScore.bestHour === 0 ? 12 : dailyScore.bestHour}
                :00 {dailyScore.bestHour >= 12 ? 'PM' : 'AM'}
              </p>
            </div>

            {/* Current Conditions */}
            {currentHourData && (
              <CurrentConditions
                temperature={65}
                windSpeed={
                  currentHourData.factors.find((f) => f.name === 'wind')?.score ?? 0 > 8
                    ? 5
                    : currentHourData.factors.find((f) => f.name === 'wind')?.score ?? 0 > 6
                      ? 10
                      : 18
                }
                windDirection={270}
                waterTemp={null}
                tideStatus={tideStatus}
                moonPhase={
                  currentHourData.factors.find((f) => f.name === 'moonPhase')?.score ?? 5 > 7
                    ? 0
                    : 0.25
                }
                pressure={1013}
              />
            )}

            {/* Score Breakdown */}
            <section>
              <h3 className="text-lg font-semibold mb-4 text-[#8899aa] uppercase tracking-wider text-sm">
                Score Breakdown
              </h3>
              <ScoreBreakdown factors={dailyScore.factors} />
            </section>

            {/* Timeline Graph */}
            <section>
              <h3 className="text-lg font-semibold mb-4 text-[#8899aa] uppercase tracking-wider text-sm">
                Daily Timeline
              </h3>
              <p className="text-[#8899aa] text-xs mb-2">
                Click and drag to select a fishing window
              </p>
              <TimelineGraph
                hourlyScores={dailyScore.hourlyScores}
                events={allEvents}
                onTripWindowSelect={handleTripWindowSelect}
              />
            </section>

            {/* Trip Planner */}
            <TripPlanner
              tripWindow={tripWindow}
              onClear={() => setTripWindow(null)}
            />

            {/* Forecast Preview */}
            <section>
              <h3 className="text-lg font-semibold mb-4 text-[#8899aa] uppercase tracking-wider text-sm">
                Forecast
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {forecast.map((day) => (
                  <ForecastCard
                    key={day.date}
                    date={day.date}
                    score={day.overall}
                    label={day.label}
                    bestHour={day.bestHour}
                    highTemp={75}
                    lowTemp={60}
                    onClick={() =>
                      router.push(`/location/${selectedSlug}`)
                    }
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Southern California Fishing Intelligence</p>
        <p className="mt-1 text-xs">
          Data from NOAA, Open-Meteo, NDBC, and public fishing reports
        </p>
      </footer>
    </div>
  );
}
