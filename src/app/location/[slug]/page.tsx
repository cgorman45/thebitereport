'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import FishingScore from '@/components/FishingScore';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import TimelineGraph from '@/components/TimelineGraph';
import TripPlanner from '@/components/TripPlanner';
import { getLocationBySlug } from '@/lib/locations';
import { computeTripWindow } from '@/lib/scoring';
import type { DailyScore, TripWindow, FishingEvent } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return 'Day After';
}

function getOffsetDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Day tabs skeleton */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-10 w-28 rounded-full"
            style={{ backgroundColor: '#131b2e' }}
          />
        ))}
      </div>

      {/* Score circle skeleton */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="rounded-full"
          style={{ width: 200, height: 200, backgroundColor: '#131b2e' }}
        />
        <div
          className="h-5 w-24 rounded"
          style={{ backgroundColor: '#131b2e' }}
        />
      </div>

      {/* Breakdown skeleton */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: '#131b2e' }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="h-4 w-28 rounded"
              style={{ backgroundColor: '#1e2a42' }}
            />
            <div
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: '#1e2a42' }}
            />
            <div
              className="h-4 w-8 rounded"
              style={{ backgroundColor: '#1e2a42' }}
            />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div
        className="rounded-2xl"
        style={{ height: 320, backgroundColor: '#131b2e' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LocationPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : '';

  const [scores, setScores] = useState<(DailyScore | null)[]>([null, null, null]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [tripWindow, setTripWindow] = useState<TripWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the location metadata client-side for the header (slug lookup is sync)
  const location = slug ? getLocationBySlug(slug) : undefined;

  useEffect(() => {
    if (!slug) return;

    async function loadScores() {
      setLoading(true);
      setError(null);
      setTripWindow(null);
      setSelectedDayIndex(0);

      try {
        const dates = [0, 1, 2].map(getOffsetDate);

        const results = await Promise.all(
          dates.map(async (date) => {
            const res = await fetch(
              `/api/score?location=${encodeURIComponent(slug)}&date=${date}`
            );
            if (!res.ok) {
              throw new Error(
                `Failed to fetch score for ${date}: ${res.status} ${res.statusText}`
              );
            }
            return res.json() as Promise<DailyScore>;
          })
        );

        setScores(results);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load fishing data'
        );
      } finally {
        setLoading(false);
      }
    }

    loadScores();
  }, [slug]);

  // Clear trip window when day changes
  useEffect(() => {
    setTripWindow(null);
  }, [selectedDayIndex]);

  const selectedScore = scores[selectedDayIndex];

  const allEvents: FishingEvent[] =
    selectedScore?.hourlyScores.flatMap((h) => h.events) ?? [];

  function handleTripWindowSelect(startHour: number, endHour: number) {
    if (!selectedScore) return;

    const result = computeTripWindow(
      selectedScore.hourlyScores,
      startHour,
      endHour,
      null
    );

    setTripWindow({
      startHour,
      endHour,
      ...result,
    });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a', color: '#e2e8f0' }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* Back link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors duration-150 hover:text-[#00d4ff]"
            style={{ color: '#8899aa' }}
          >
            <span aria-hidden>&#8592;</span>
            Back to overview
          </Link>
        </div>

        {/* Location header */}
        <div className="text-center space-y-1">
          {location ? (
            <>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#e2e8f0' }}>
                {location.name}
              </h1>
              <p className="text-sm" style={{ color: '#8899aa' }}>
                {location.region}
                {' '}
                <span style={{ color: '#1e2a42' }}>&middot;</span>
                {' '}
                <span className="capitalize">{location.type}</span>
              </p>
            </>
          ) : (
            <h1 className="text-3xl font-black tracking-tight capitalize" style={{ color: '#e2e8f0' }}>
              {slug.replace(/-/g, ' ')}
            </h1>
          )}
        </div>

        {/* Error state */}
        {error && !loading && (
          <div
            className="rounded-xl px-6 py-8 text-center space-y-4"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #ef444440',
            }}
          >
            <p className="text-base font-medium" style={{ color: '#ef4444' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                // Re-trigger effect by re-setting slug (same value forces no re-render trick)
                // Instead we use a state toggle; simplest approach: reload
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]"
              style={{
                backgroundColor: '#1e2a42',
                color: '#e2e8f0',
                border: '1px solid #1e2a42',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Day tab selector */}
            <div className="flex justify-center gap-2 flex-wrap">
              {[0, 1, 2].map((idx) => {
                const dayScore = scores[idx];
                const isActive = selectedDayIndex === idx;
                const dateStr = dayScore?.date ?? getOffsetDate(idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className="flex flex-col items-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]"
                    style={{
                      backgroundColor: isActive ? '#00d4ff1a' : '#131b2e',
                      border: isActive ? '1px solid #00d4ff' : '1px solid #1e2a42',
                      color: isActive ? '#00d4ff' : '#8899aa',
                      boxShadow: isActive ? '0 0 12px #00d4ff30' : 'none',
                    }}
                  >
                    <span className="leading-tight">{getDateLabel(idx)}</span>
                    <span
                      className="text-xs font-normal leading-tight mt-0.5"
                      style={{ color: isActive ? '#00d4ff99' : '#8899aa80' }}
                    >
                      {formatDateDisplay(dateStr)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected day content */}
            {selectedScore ? (
              <div className="space-y-8">

                {/* Score circle */}
                <div className="flex flex-col items-center gap-2">
                  <FishingScore
                    score={selectedScore.overall}
                    label={selectedScore.label}
                    size="lg"
                  />
                  <p className="text-sm" style={{ color: '#8899aa' }}>
                    Best time:{' '}
                    <span style={{ color: '#e2e8f0' }}>
                      {selectedScore.bestHour === 0
                        ? '12:00 AM'
                        : selectedScore.bestHour === 12
                          ? '12:00 PM'
                          : selectedScore.bestHour < 12
                            ? `${selectedScore.bestHour}:00 AM`
                            : `${selectedScore.bestHour - 12}:00 PM`}
                    </span>
                  </p>
                </div>

                {/* Score breakdown */}
                <section>
                  <h2
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: '#8899aa' }}
                  >
                    Conditions Breakdown
                  </h2>
                  <ScoreBreakdown factors={selectedScore.factors} />
                </section>

                {/* Timeline graph — full width */}
                <section>
                  <TimelineGraph
                    hourlyScores={selectedScore.hourlyScores}
                    events={allEvents}
                    onTripWindowSelect={handleTripWindowSelect}
                  />
                </section>

                {/* Trip planner */}
                <TripPlanner
                  tripWindow={tripWindow}
                  onClear={() => setTripWindow(null)}
                />

              </div>
            ) : (
              /* Score not yet available for this day (should rarely happen) */
              <div
                className="rounded-xl px-6 py-12 text-center"
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e2a42',
                }}
              >
                <p style={{ color: '#8899aa' }}>No data available for this day.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-auto py-8 text-center text-sm"
        style={{
          color: '#8899aa',
          borderTop: '1px solid #1e2a42',
        }}
      >
        <p>The Bite Report &middot; Southern California Fishing Intelligence</p>
        <p className="mt-1 text-xs">
          Data from NOAA, Open-Meteo, NDBC, and public fishing reports
        </p>
      </footer>
    </div>
  );
}
