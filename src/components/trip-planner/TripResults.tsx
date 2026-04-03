'use client';

import { useState } from 'react';
import { getLandingName, getLandingColor } from '@/lib/landings';
import type { ScheduledTrip } from '@/lib/trips/types';

// Booking URLs for each landing
const BOOKING_URLS: Record<string, string> = {
  seaforth: 'https://seaforthlanding.com/schedule',
  fishermans: 'https://fishermanslanding.com/schedule',
  hm_landing: 'https://www.hmlanding.com/book-a-trip/',
  point_loma: 'https://pointloma.fishingreservations.net/sales/',
  helgrens: 'https://helgrensportfishing.com/',
  private_charter: '#', // Private charters book directly with operator
};

function getBookingUrl(landing: string, boatName: string): string {
  // Private charters — try to link to operator website
  if (landing === 'private_charter') {
    const name = boatName.toLowerCase();
    if (name.includes('clowers')) return 'https://www.captainclowers.com/';
    if (name.includes('boundless')) return 'https://www.boundlessboatcharters.com/';
    if (name.includes('coletta')) return 'https://www.colettasportfishing.com/';
    if (name.includes('ironclad')) return 'https://www.ironcladsportfishing.com/';
  }
  return BOOKING_URLS[landing] || '#';
}

interface TripResultsProps {
  trips: ScheduledTrip[];
  onViewOnMap?: (mmsi: number) => void;
}

type SortOption = 'departure' | 'price-asc' | 'price-desc' | 'duration' | 'spots';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Departure Time', value: 'departure' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Duration', value: 'duration' },
  { label: 'Spots Left', value: 'spots' },
];

function formatDepartureDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function sortTrips(trips: ScheduledTrip[], sort: SortOption): ScheduledTrip[] {
  const copy = [...trips];
  switch (sort) {
    case 'departure':
      return copy.sort((a, b) => {
        const dateCompare = a.departureDate.localeCompare(b.departureDate);
        if (dateCompare !== 0) return dateCompare;
        return a.departureTime.localeCompare(b.departureTime);
      });
    case 'price-asc':
      return copy.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
    case 'price-desc':
      return copy.sort((a, b) => b.pricePerPerson - a.pricePerPerson);
    case 'duration':
      return copy.sort((a, b) => a.durationHours - b.durationHours);
    case 'spots':
      return copy.sort((a, b) => a.spotsLeft - b.spotsLeft);
    default:
      return copy;
  }
}

function TripResultCard({
  trip,
  onViewOnMap,
}: {
  trip: ScheduledTrip;
  onViewOnMap?: (mmsi: number) => void;
}) {
  const landingLabel = getLandingName(trip.landing);
  const landingColor = getLandingColor(trip.landing);
  const urgentSpots = trip.spotsLeft < 5;

  return (
    <div
      className="group rounded-xl transition-all duration-200 p-5"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 212, 255, 0.35)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2a42';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Main row: 3 columns on desktop */}
      <div className="flex flex-col md:flex-row gap-4">

      {/* ── Left: Boat info ── */}
      <div className="flex-shrink-0 flex flex-col gap-2 md:w-52">
        <h3 className="text-lg font-black leading-tight" style={{ color: '#e2e8f0' }}>
          {trip.boatName}
        </h3>

        {/* Landing badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{
              backgroundColor: `${landingColor}1e`,
              color: landingColor,
              border: `1px solid ${landingColor}4d`,
            }}
          >
            {landingLabel}
          </span>
          {trip.charterType === 'private_charter' && (
            <span
              className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={{
                backgroundColor: '#ec489922',
                color: '#ec4899',
                border: '1px solid #ec48994d',
              }}
            >
              Private 6-Pack
            </span>
          )}
        </div>

        {/* Date + time */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: '#8899aa', flexShrink: 0 }}
            >
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              {formatDepartureDate(trip.departureDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: '#8899aa', flexShrink: 0 }}
            >
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 5v3.5l2.5 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm" style={{ color: '#8899aa' }}>
              {trip.departureTime}
            </span>
          </div>
        </div>

        {/* Duration badge */}
        <span
          className="inline-flex items-center self-start text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{
            backgroundColor: 'rgba(30, 42, 66, 0.8)',
            border: '1px solid #1e2a42',
            color: '#8899aa',
          }}
        >
          {trip.duration}
        </span>
      </div>

      {/* ── Middle: Description + species ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: '#8899aa' }}
        >
          {trip.description}
        </p>

        {trip.targetSpecies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trip.targetSpecies.map(species => (
              <span
                key={species}
                className="text-xs px-2.5 py-1 rounded-full capitalize"
                style={{
                  backgroundColor: 'rgba(0, 212, 255, 0.07)',
                  color: '#8899aa',
                  border: '1px solid rgba(0, 212, 255, 0.15)',
                }}
              >
                {species}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Price + spots + actions ── */}
      <div className="flex flex-col items-start md:items-end gap-3 md:w-44 shrink-0">
        {/* Price */}
        <div className="flex flex-col items-start md:items-end">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black" style={{ color: '#00d4ff' }}>
              ${trip.pricePerPerson}
            </span>
            <span className="text-xs" style={{ color: '#8899aa' }}>
              / person
            </span>
          </div>
          {trip.privateBoatRate && (
            <span className="text-[10px] mt-0.5" style={{ color: '#8899aa' }}>
              ${trip.privateBoatRate.toLocaleString()} whole boat
            </span>
          )}
        </div>

        {/* Spots indicator */}
        {urgentSpots ? (
          <span className="text-xs font-bold" style={{ color: '#f97316' }}>
            Only {trip.spotsLeft} left!
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
            {trip.spotsLeft} spots
          </span>
        )}

        {/* Action buttons */}
        <div className="flex flex-row md:flex-col gap-2 w-full">
          <a
            href={getBookingUrl(trip.landing, trip.boatName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none text-xs font-bold py-2 px-4 rounded-lg text-center transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: '#00d4ff',
              color: '#0a0f1a',
            }}
          >
            Book Now
          </a>
          {trip.mmsi && onViewOnMap && (
            <button
              onClick={() => onViewOnMap(trip.mmsi!)}
              className="flex-1 md:flex-none text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-150 hover:brightness-110 active:scale-95"
              style={{
                backgroundColor: 'transparent',
                color: '#00d4ff',
                border: '1px solid rgba(0, 212, 255, 0.3)',
              }}
            >
              View on Map
            </button>
          )}
        </div>
      </div>

      </div>{/* end main row */}

      {/* Fish Processing — inline recommendation */}
      <div
        className="w-full mt-3 pt-3 flex flex-col sm:flex-row sm:items-center gap-2"
        style={{ borderTop: '1px solid #1e2a4266' }}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8899aa" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#8899aa' }}>
            Fish Processing
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.fivestar.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all hover:brightness-125"
            style={{ backgroundColor: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}
          >
            5 Star Fish Processing
          </a>
          <a
            href="https://www.fishermansprocessing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all hover:brightness-125"
            style={{ backgroundColor: '#00d4ff18', color: '#00d4ff', border: '1px solid #00d4ff33' }}
          >
            Fisherman&apos;s Processing
          </a>
        </div>
        <span className="text-[10px]" style={{ color: '#8899aa' }}>
          Reserve your fillet service before your trip
        </span>
      </div>
    </div>
  );
}

export default function TripResults({ trips, onViewOnMap }: TripResultsProps) {
  const [sort, setSort] = useState<SortOption>('departure');

  const sorted = sortTrips(trips, sort);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top bar: count + sort ── */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold" style={{ color: '#8899aa' }}>
          <span style={{ color: '#e2e8f0' }}>{trips.length}</span>{' '}
          {trips.length === 1 ? 'trip' : 'trips'} found
        </span>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="appearance-none rounded-lg px-3 py-2 pr-8 text-xs font-semibold cursor-pointer focus:outline-none transition-colors duration-150"
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e2a42',
              color: '#e2e8f0',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option
                key={opt.value}
                value={opt.value}
                style={{ backgroundColor: '#131b2e', color: '#e2e8f0' }}
              >
                {opt.label}
              </option>
            ))}
          </select>
          {/* Caret */}
          <div
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#8899aa' }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Results list ── */}
      {sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a42',
          }}
        >
          {/* Empty state icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.15)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#00d4ff' }}>
              <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: '#e2e8f0' }}>
            No trips match your search.
          </p>
          <p className="text-sm" style={{ color: '#8899aa' }}>
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((trip, idx) => (
            <div key={trip.id}>
              <TripResultCard trip={trip} onViewOnMap={onViewOnMap} />
              {idx < sorted.length - 1 && (
                <div className="mt-3" style={{ borderBottom: '1px solid #1e2a42' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
