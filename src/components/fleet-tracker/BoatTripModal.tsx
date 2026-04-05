'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBoatPhotoUrl, getBoatInitials } from '@/lib/fleet/boats';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TripPosition {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  recordedAt: string;
}

interface Trip {
  id: string;
  startedAt: string;
  endedAt: string | null;
  duration: string;
  pointCount: number;
  positions: TripPosition[];
}

interface BoatInfo {
  name: string;
  mmsi: number;
  landing: string;
  vesselType: string | null;
  photo: string | null;
}

interface CurrentPosition {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: number;
}

interface TripApiResponse {
  boat: BoatInfo;
  currentPosition: CurrentPosition | null;
  trips: Trip[];
}

interface BoatTripModalProps {
  mmsi: number;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIP_COLORS = [
  '#00d4ff', // Latest trip — bright cyan
  '#f97316', // 2nd trip — orange
  '#a855f7', // 3rd trip — purple
];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTripDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function boatMarkerSvg(color: string, heading: number): string {
  return `<div style="transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L8 10H16L12 2Z" fill="${color}" stroke="${color}" stroke-width="0.5"/>
      <path d="M6 12L12 22L18 12H6Z" fill="${color}" opacity="0.6"/>
    </svg>
  </div>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BoatTripModal({ mmsi, onClose }: BoatTripModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const markerRef = useRef<L.Marker | null>(null);

  const [data, setData] = useState<TripApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  // Fetch trip data
  const fetchData = useCallback(async (limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fleet/trips?mmsi=${mmsi}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TripApiResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  }, [mmsi]);

  // Initial fetch (last trip only)
  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Refetch with more trips when toggling
  useEffect(() => {
    if (showPrevious) fetchData(3);
  }, [showPrevious, fetchData]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.71, -117.23],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, {
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw route lines and markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    // Clear previous routes
    routeLinesRef.current.forEach((line) => line.remove());
    routeLinesRef.current = [];
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const allBounds: L.LatLng[] = [];

    // Draw trip routes (newest first = index 0)
    data.trips.forEach((trip, idx) => {
      if (trip.positions.length < 2) return;

      const latLngs: L.LatLngExpression[] = trip.positions.map((p) => [p.lat, p.lng]);
      const color = TRIP_COLORS[idx] || '#6b7280';
      const opacity = idx === 0 ? 0.9 : 0.4;
      const weight = idx === 0 ? 3 : 2;

      const polyline = L.polyline(latLngs, {
        color,
        weight,
        opacity,
        smoothFactor: 1,
        dashArray: idx === 0 ? undefined : '8 6',
      }).addTo(map);

      routeLinesRef.current.push(polyline);

      // Add start/end markers for the latest trip
      if (idx === 0) {
        // Start marker (green circle)
        const startPos = trip.positions[0];
        const startCircle = L.circleMarker([startPos.lat, startPos.lng], {
          radius: 6,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.8,
          weight: 2,
        }).addTo(map);
        startCircle.bindTooltip('Departed', { direction: 'top', offset: [0, -8] });
        routeLinesRef.current.push(startCircle as unknown as L.Polyline);

        // End marker (red circle) — only if trip is completed
        if (trip.endedAt) {
          const endPos = trip.positions[trip.positions.length - 1];
          const endCircle = L.circleMarker([endPos.lat, endPos.lng], {
            radius: 6,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.8,
            weight: 2,
          }).addTo(map);
          endCircle.bindTooltip('Returned', { direction: 'top', offset: [0, -8] });
          routeLinesRef.current.push(endCircle as unknown as L.Polyline);
        }
      }

      // Collect bounds
      trip.positions.forEach((p) => allBounds.push(L.latLng(p.lat, p.lng)));
    });

    // Current position marker (boat icon)
    if (data.currentPosition) {
      const { lat, lng, heading } = data.currentPosition;
      const icon = L.divIcon({
        html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#00d4ff33;animation:pulseRing 2s ease-in-out infinite;"></div>
          ${boatMarkerSvg('#00d4ff', heading)}
        </div>`,
        className: 'boat-trip-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      markerRef.current.bindTooltip(
        `<strong>${data.boat.name}</strong><br/>Current position`,
        { direction: 'top', offset: [0, -20] },
      );
      allBounds.push(L.latLng(lat, lng));
    }

    // Fit map to show all routes + current position
    if (allBounds.length > 0) {
      const bounds = L.latLngBounds(allBounds);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [data]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Photo or initials for the header
  const photoUrl = data?.boat ? getBoatPhotoUrl(data.boat.name) : null;
  const initials = data?.boat ? getBoatInitials(data.boat.name) : '??';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(90vw, 800px)',
          height: 'min(85vh, 640px)',
          backgroundColor: '#0d1526',
          borderRadius: '16px',
          border: '1px solid #1e2a42',
          overflow: 'hidden',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #1e2a42',
            flexShrink: 0,
          }}
        >
          {/* Boat photo */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1px solid #1e3a5a',
              background: 'linear-gradient(135deg, #1a3a5c, #0d2240)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={data?.boat.name || ''}
                width={44}
                height={44}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#4a6a8a' }}>
                {initials}
              </span>
            )}
          </div>

          {/* Boat info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
              {data?.boat.name || 'Loading...'}
            </div>
            {data?.boat && (
              <div style={{ fontSize: '12px', color: '#8899aa' }}>
                {data.boat.vesselType || 'Fishing Vessel'}
                {data.currentPosition && (
                  <span style={{ color: '#22c55e', marginLeft: '8px' }}>
                    {data.currentPosition.speed.toFixed(1)} kts
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Toggle previous trips */}
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              border: `1px solid ${showPrevious ? '#00d4ff33' : '#1e2a42'}`,
              backgroundColor: showPrevious ? '#00d4ff1a' : 'transparent',
              color: showPrevious ? '#00d4ff' : '#8899aa',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {showPrevious ? 'Showing 3 trips' : 'Show previous trips'}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #1e2a42',
              backgroundColor: 'transparent',
              color: '#8899aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Loading overlay */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(13,21,38,0.8)',
                zIndex: 10,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#8899aa', marginBottom: '4px' }}>
                  Loading trip data...
                </div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(13,21,38,0.8)',
                zIndex: 10,
              }}
            >
              <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>
                  {error}
                </div>
                <button
                  onClick={() => fetchData(showPrevious ? 3 : 1)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid #1e2a42',
                    backgroundColor: '#1e2a42',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* No trips message */}
          {!loading && !error && data && data.trips.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(13,21,38,0.6)',
                zIndex: 10,
              }}
            >
              <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎣</div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>
                  No trip history yet
                </div>
                <div style={{ fontSize: '12px', color: '#8899aa' }}>
                  Trip routes will appear here once {data.boat.name} completes a tracked trip.
                  {data.currentPosition && ' Current position is shown on the map.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trip legend footer */}
        {data && data.trips.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid #1e2a42',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {data.trips.map((trip, idx) => (
              <div
                key={trip.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#8899aa',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '3px',
                    backgroundColor: TRIP_COLORS[idx] || '#6b7280',
                    borderRadius: '2px',
                    opacity: idx === 0 ? 1 : 0.5,
                  }}
                />
                <span>
                  {formatTripDate(trip.startedAt)}
                  {' — '}
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                    {trip.duration}
                  </span>
                  {!trip.endedAt && (
                    <span style={{ color: '#22c55e', marginLeft: '4px' }}>Active</span>
                  )}
                </span>
              </div>
            ))}

            {/* Legend: start/end markers */}
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', fontSize: '10px', color: '#8899aa' }}>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '4px', verticalAlign: 'middle' }} />
                Departed
              </span>
              <span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', marginRight: '4px', verticalAlign: 'middle' }} />
                Returned
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .boat-trip-marker { background: transparent !important; border: none !important; }
        .fleet-tooltip { background: #131b2e !important; border: 1px solid #1e2a42 !important; color: #e2e8f0 !important; font-family: system-ui, sans-serif !important; font-size: 11px !important; border-radius: 6px !important; padding: 6px 8px !important; }
        .fleet-tooltip::before { border-top-color: #1e2a42 !important; }
      `}</style>
    </>
  );
}
