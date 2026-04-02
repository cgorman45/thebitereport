'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Location, LocationType, Region } from '@/types';

interface LocationSearchProps {
  locations: Location[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

const TYPE_LABELS: Record<LocationType, string> = {
  port: 'Port',
  pier: 'Pier',
  shore: 'Shore',
  offshore: 'Offshore',
};

const REGIONS: Region[] = ['San Diego', 'Orange County', 'LA County', 'Ventura County'];

function distanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationSearch({
  locations,
  selectedSlug,
  onSelect,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLocation = locations.find((l) => l.slug === selectedSlug);

  const filtered = query.trim()
    ? locations.filter((l) =>
        l.name.toLowerCase().includes(query.toLowerCase())
      )
    : locations;

  const grouped = REGIONS.reduce<Record<Region, Location[]>>(
    (acc, region) => {
      acc[region] = filtered.filter((l) => l.region === region);
      return acc;
    },
    { 'San Diego': [], 'Orange County': [], 'LA County': [], 'Ventura County': [] }
  );

  const hasResults = filtered.length > 0;

  const handleSelect = useCallback(
    (slug: string) => {
      onSelect(slug);
      setOpen(false);
      setQuery('');
    },
    [onSelect]
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = locations[0];
        let minDist = Infinity;
        for (const loc of locations) {
          const d = distanceBetween(latitude, longitude, loc.lat, loc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = loc;
          }
        }
        setGeoLoading(false);
        handleSelect(nearest.slug);
      },
      () => {
        setGeoLoading(false);
        setGeoError('Unable to retrieve your location.');
      }
    );
  }, [locations, handleSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Input */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          backgroundColor: '#131b2e',
          border: `1px solid ${open ? '#00d4ff60' : '#1e2a42'}`,
          transition: 'border-color 0.15s',
        }}
      >
        {/* Search icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8899aa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-sm"
          style={{ color: '#e2e8f0' }}
          placeholder={selectedLocation ? selectedLocation.name : 'Search locations…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            className="flex-shrink-0 text-xs"
            style={{ color: '#8899aa' }}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            &#10005;
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a42',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            maxHeight: 360,
            overflowY: 'auto',
          }}
        >
          {/* Use My Location */}
          <div style={{ borderBottom: '1px solid #1e2a42' }}>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors duration-150"
              style={{ color: '#00d4ff' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#1a2540')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
              onClick={handleGeolocate}
              disabled={geoLoading}
            >
              {/* Location pin icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {geoLoading ? 'Finding nearest spot…' : 'Use My Location'}
            </button>
            {geoError && (
              <p className="px-4 pb-2 text-xs" style={{ color: '#ef4444' }}>
                {geoError}
              </p>
            )}
          </div>

          {/* Location groups */}
          {!hasResults ? (
            <p className="px-4 py-3 text-sm" style={{ color: '#8899aa' }}>
              No locations found.
            </p>
          ) : (
            REGIONS.map((region) => {
              const items = grouped[region];
              if (items.length === 0) return null;
              return (
                <div key={region}>
                  <div
                    className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: '#8899aa', backgroundColor: '#0a0f1a' }}
                  >
                    {region}
                  </div>
                  {items.map((loc) => {
                    const isSelected = loc.slug === selectedSlug;
                    return (
                      <button
                        key={loc.slug}
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors duration-150"
                        style={{
                          color: isSelected ? '#00d4ff' : '#e2e8f0',
                          backgroundColor: isSelected ? '#00d4ff10' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.backgroundColor = '#1a2540';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => handleSelect(loc.slug)}
                      >
                        <span className="truncate">{loc.name}</span>
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: '#1e2a42',
                            color: '#8899aa',
                          }}
                        >
                          {TYPE_LABELS[loc.type]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
