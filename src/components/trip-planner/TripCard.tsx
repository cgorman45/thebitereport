'use client';

import type { ScheduledTrip } from '@/lib/trips/types';

interface TripCardProps {
  trip: ScheduledTrip;
  onViewOnMap?: (mmsi: number) => void;
}

function formatDepartureDate(iso: string): string {
  // Parse as local noon to avoid any DST/UTC offset flipping the day
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TripCard({ trip, onViewOnMap }: TripCardProps) {
  const isSeaforth = trip.landing === 'seaforth';
  const landingLabel = isSeaforth ? 'Seaforth' : "Fisherman's";

  const urgentSpots = trip.spotsLeft < 5;
  const lowSpots = trip.spotsLeft >= 5 && trip.spotsLeft <= 12;

  return (
    <div
      className="group relative rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e2a42',
        padding: '16px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#00d4ff';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 16px rgba(0, 212, 255, 0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2a42';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Top row: boat name + landing badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-bold leading-tight" style={{ color: '#e2e8f0' }}>
          {trip.boatName}
        </h3>
        <span
          className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{
            backgroundColor: isSeaforth ? 'rgba(0, 212, 255, 0.12)' : 'rgba(249, 115, 22, 0.12)',
            color: isSeaforth ? '#00d4ff' : '#f97316',
            border: `1px solid ${isSeaforth ? 'rgba(0, 212, 255, 0.25)' : 'rgba(249, 115, 22, 0.25)'}`,
          }}
        >
          {landingLabel}
        </span>
      </div>

      {/* Departure row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          {/* Calendar icon */}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: '#8899aa' }}>
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
            {formatDepartureDate(trip.departureDate)}
          </span>
        </div>
        <span style={{ color: '#1e2a42' }}>|</span>
        <div className="flex items-center gap-1.5">
          {/* Clock icon */}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: '#8899aa' }}>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ color: '#8899aa' }}>
            {trip.departureTime}
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'rgba(30, 42, 66, 0.8)',
            color: '#8899aa',
            border: '1px solid #1e2a42',
          }}
        >
          {trip.duration}
        </span>
      </div>

      {/* Price + spots row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xl font-black" style={{ color: '#00d4ff' }}>
            ${trip.pricePerPerson}
          </span>
          <span className="text-xs ml-1" style={{ color: '#8899aa' }}>
            / person
          </span>
        </div>
        <div>
          {urgentSpots ? (
            <span className="text-xs font-bold" style={{ color: '#f97316' }}>
              Only {trip.spotsLeft} spot{trip.spotsLeft === 1 ? '' : 's'} left!
            </span>
          ) : lowSpots ? (
            <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
              {trip.spotsLeft} spots remaining
            </span>
          ) : (
            <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
              {trip.spotsLeft} spots available
            </span>
          )}
        </div>
      </div>

      {/* Target species pills */}
      {trip.targetSpecies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {trip.targetSpecies.map(species => (
            <span
              key={species}
              className="text-xs px-2 py-0.5 rounded-full capitalize"
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

      {/* Description */}
      <p
        className="text-xs leading-relaxed mb-4 line-clamp-2"
        style={{ color: '#8899aa' }}
      >
        {trip.description}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        {trip.mmsi && onViewOnMap && (
          <button
            onClick={() => onViewOnMap(trip.mmsi!)}
            className="flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: 'rgba(0, 212, 255, 0.08)',
              color: '#00d4ff',
              border: '1px solid rgba(0, 212, 255, 0.25)',
            }}
          >
            View on Map
          </button>
        )}
        <a
          href="#"
          className="flex-1 text-xs font-bold py-2 px-3 rounded-lg text-center transition-all duration-150 hover:brightness-110 active:scale-95"
          style={{
            backgroundColor: '#00d4ff',
            color: '#0a0f1a',
          }}
        >
          Book Now
        </a>
      </div>
    </div>
  );
}
