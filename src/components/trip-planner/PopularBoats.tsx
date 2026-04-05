'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ScheduledTrip } from '@/lib/trips/types';

interface PopularBoatsProps {
  trips: ScheduledTrip[];
}

interface BoatSummary {
  boatName: string;
  landing: string;
  nextDate: string;
  nextTime: string;
  duration: string;
  price: number;
  spotsLeft: number;
  species: string;
  tripCount: number;
}

const TARGET_SPECIES = [
  { key: 'Bluefin Tuna', label: 'Bluefin Tuna', emoji: '🔵', color: '#3b82f6', minDays: 1.5 },
  { key: 'Yellowtail', label: 'Yellowtail', emoji: '🟢', color: '#22c55e', minDays: 0 },
];

/** Return approximate trip length in days from the duration string. */
function parseDurationDays(duration: string): number {
  const d = duration.toLowerCase();
  if (d.includes('half day')) return 0.5;
  if (d.includes('3/4 day')) return 0.75;
  if (d.includes('full day') || d.includes('halibut')) return 1;
  const match = d.match(/([\d.]+)\s*day/);
  if (match) return parseFloat(match[1]);
  return 1; // fallback
}

const LANDING_NAMES: Record<string, string> = {
  seaforth: 'Seaforth',
  fishermans: "Fisherman's",
  hm_landing: 'H&M Landing',
  point_loma: 'Point Loma',
  helgrens: "Helgren's",
  private_charter: 'Private Charter',
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PopularBoats({ trips }: PopularBoatsProps) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const sections = useMemo(() => {
    return TARGET_SPECIES.map(({ key, label, emoji, color, minDays }) => {
      // Find upcoming trips for this species (with minimum duration filter)
      const speciesTrips = trips.filter(
        (t) =>
          t.departureDate >= today &&
          t.targetSpecies.some((s) => s.toLowerCase().includes(key.toLowerCase())) &&
          parseDurationDays(t.duration) >= minDays
      );

      // Group by boat name, pick the soonest trip per boat
      const boatMap = new Map<string, ScheduledTrip & { tripCount: number }>();
      for (const t of speciesTrips) {
        const existing = boatMap.get(t.boatName);
        if (!existing || t.departureDate < existing.departureDate) {
          boatMap.set(t.boatName, { ...t, tripCount: speciesTrips.filter((x) => x.boatName === t.boatName).length });
        }
      }

      // Sort by soonest departure, take top 4
      const boats: BoatSummary[] = [...boatMap.values()]
        .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
        .slice(0, 4)
        .map((t) => ({
          boatName: t.boatName,
          landing: LANDING_NAMES[t.landing] || t.landing,
          nextDate: t.departureDate,
          nextTime: t.departureTime,
          duration: t.duration,
          price: t.pricePerPerson,
          spotsLeft: t.spotsLeft,
          species: key,
          tripCount: t.tripCount,
        }));

      return { key, label, emoji, color, boats };
    });
  }, [trips, today]);

  if (sections.every((s) => s.boats.length === 0)) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8899aa' }}>
        Popular Boats Departing Soon
      </h2>

      {sections.map(({ key, label, emoji, color, boats }) => {
        if (boats.length === 0) return null;
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <span>{emoji}</span>
              <span className="text-sm font-bold" style={{ color }}>{label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boats.map((boat) => (
                <button
                  key={`${boat.boatName}-${boat.nextDate}`}
                  onClick={() => router.push(`/plan-your-trip?boat=${encodeURIComponent(boat.boatName)}`)}
                  className="text-left rounded-xl p-4 transition-all duration-200 hover:brightness-110 active:scale-[0.99]"
                  style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e2a42',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{boat.boatName}</p>
                      <p className="text-[10px]" style={{ color: '#8899aa' }}>{boat.landing}</p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: boat.spotsLeft <= 5 ? '#ef4444' : '#22c55e',
                        backgroundColor: boat.spotsLeft <= 5 ? '#ef444415' : '#22c55e15',
                      }}
                    >
                      {boat.spotsLeft} spots
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#8899aa' }}>
                    <span>{formatDate(boat.nextDate)}</span>
                    <span>&middot;</span>
                    <span>{boat.nextTime}</span>
                    <span>&middot;</span>
                    <span>{boat.duration}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold" style={{ color: '#00d4ff' }}>
                      ${boat.price}<span className="text-[10px] font-normal" style={{ color: '#8899aa' }}>/person</span>
                    </span>
                    <span className="text-[10px]" style={{ color: '#8899aa' }}>
                      {boat.tripCount} upcoming trips
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
