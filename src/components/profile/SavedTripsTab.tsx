'use client';

import Link from 'next/link';
import { FLEET_ROSTER } from '@/lib/fleet/boats';
import { getLandingColor, getLandingName } from '@/lib/landings';
import type { ScheduledTrip } from '@/lib/trips/types';

interface TripWatch {
  id: string;
  trip_id: string;
  boat_name: string;
  trip_date: string;
  created_at: string;
}

interface SavedTripsTabProps {
  tripWatches: TripWatch[];
  favorites: Set<number>;
  allTrips: ScheduledTrip[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  // Parse as local date to avoid UTC-offset shift
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ emoji, label, count }: { emoji: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <h2
        style={{
          color: '#e2e8f0',
          fontSize: 15,
          fontWeight: 700,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </h2>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          border: '1px solid rgba(0, 212, 255, 0.25)',
          borderRadius: 20,
          padding: '1px 8px',
        }}
      >
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p
      style={{
        color: '#8899aa',
        fontSize: 14,
        margin: 0,
        padding: '16px 0',
      }}
    >
      {message}
    </p>
  );
}

interface TripCardProps {
  watch: TripWatch;
  trip: ScheduledTrip | undefined;
  dimmed?: boolean;
  badge?: React.ReactNode;
}

function TripCard({ watch, trip, dimmed = false, badge }: TripCardProps) {
  const spotsColor =
    trip && trip.spotsLeft > 5 ? '#22c55e' : '#ef4444';

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        borderRadius: 10,
        padding: '16px 20px',
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left: boat name + details */}
        <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>
              {watch.boat_name}
            </span>
            {badge}
            {!trip && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8899aa',
                  backgroundColor: 'rgba(136, 153, 170, 0.12)',
                  border: '1px solid rgba(136, 153, 170, 0.25)',
                  borderRadius: 20,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                Details unavailable
              </span>
            )}
          </div>

          {trip ? (
            <div
              className="flex flex-wrap gap-x-4 gap-y-1"
              style={{ color: '#8899aa', fontSize: 13 }}
            >
              <span>
                <span style={{ color: '#e2e8f0' }}>{formatDate(trip.departureDate)}</span>
                {trip.departureTime && (
                  <span> &middot; {trip.departureTime}</span>
                )}
              </span>
              <span>{trip.duration}</span>
              <span>{getLandingName(trip.landing)}</span>
              <span style={{ color: '#00d4ff', fontWeight: 600 }}>
                ${trip.pricePerPerson}/person
              </span>
            </div>
          ) : (
            <span style={{ color: '#8899aa', fontSize: 13 }}>
              {formatDate(watch.trip_date)}
            </span>
          )}
        </div>

        {/* Right: spots */}
        {trip && (
          <div
            style={{
              textAlign: 'right',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: spotsColor,
              }}
            >
              {trip.spotsLeft} spot{trip.spotsLeft !== 1 ? 's' : ''} left
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SavedTripsTab({ tripWatches, favorites, allTrips }: SavedTripsTabProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Split into upcoming vs past
  const upcomingWatches = tripWatches.filter((w) => {
    const [y, m, d] = w.trip_date.split('-').map(Number);
    return new Date(y, m - 1, d) >= today;
  });

  const pastWatches = tripWatches
    .filter((w) => {
      const [y, m, d] = w.trip_date.split('-').map(Number);
      return new Date(y, m - 1, d) < today;
    })
    .sort((a, b) => b.trip_date.localeCompare(a.trip_date)); // newest first

  // Map trip_id -> ScheduledTrip for O(1) lookup
  const tripById = new Map<string, ScheduledTrip>(allTrips.map((t) => [t.id, t]));

  // Favorited boats
  const favoritedBoats = FLEET_ROSTER.filter((b) => favorites.has(b.mmsi));

  return (
    <div className="flex flex-col gap-8">

      {/* ── Watched Trips ── */}
      <section>
        <SectionHeader emoji="🎯" label="Watched Trips" count={upcomingWatches.length} />
        {upcomingWatches.length === 0 ? (
          <EmptyState message="No trips watched yet. Watch a trip to get notified of changes." />
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingWatches.map((watch) => (
              <TripCard
                key={watch.id}
                watch={watch}
                trip={tripById.get(watch.trip_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Favorited Boats ── */}
      <section>
        <SectionHeader emoji="⭐" label="Favorited Boats" count={favoritedBoats.length} />
        {favoritedBoats.length === 0 ? (
          <EmptyState message="No boats favorited. Favorite a boat from the fleet tracker to see it here." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoritedBoats.map((boat) => {
              const color = getLandingColor(boat.landing);
              return (
                <Link
                  key={boat.mmsi}
                  href="/my-boats"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e2a42',
                    borderRadius: 20,
                    padding: '6px 14px',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = color;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#1e2a42';
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                    {boat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Trip History ── */}
      <section>
        <SectionHeader emoji="📋" label="Trip History" count={pastWatches.length} />
        {pastWatches.length === 0 ? (
          <EmptyState message="No trip history yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {pastWatches.map((watch) => (
              <TripCard
                key={watch.id}
                watch={watch}
                trip={tripById.get(watch.trip_id)}
                dimmed
                badge={
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 20,
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Completed
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
