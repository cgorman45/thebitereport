'use client';

import { useState } from 'react';
import Header from '@/components/Header';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type WindyOverlay = 'wind' | 'waves' | 'temp' | 'rain' | 'pressure' | 'currents' | 'swell';

interface OverlayOption {
  key: WindyOverlay;
  label: string;
  description: string;
}

const OVERLAYS: OverlayOption[] = [
  { key: 'wind', label: 'Wind', description: 'Wind speed and direction' },
  { key: 'waves', label: 'Waves', description: 'Wave height and direction' },
  { key: 'temp', label: 'Temperature', description: 'Air temperature' },
  { key: 'rain', label: 'Rain', description: 'Precipitation forecast' },
  { key: 'pressure', label: 'Pressure', description: 'Barometric pressure' },
  { key: 'currents', label: 'Currents', description: 'Ocean currents' },
  { key: 'swell', label: 'Swell', description: 'Swell period and height' },
];

interface FishingSpot {
  name: string;
  lat: number;
  lon: number;
  description: string;
}

const SPOTS: FishingSpot[] = [
  { name: 'Point Loma', lat: 32.67, lon: -117.24, description: 'Kelp beds, yellowtail, calico bass' },
  { name: '9 Mile Bank', lat: 32.58, lon: -117.40, description: 'Bluefin tuna, yellowtail' },
  { name: 'Coronado Islands', lat: 32.42, lon: -117.25, description: 'Yellowtail, white seabass, calico' },
  { name: '43 Fathom Spot', lat: 32.28, lon: -117.38, description: 'Yellowfin tuna, bluefin tuna' },
  { name: 'La Jolla', lat: 32.85, lon: -117.28, description: 'Calico bass, yellowtail, barracuda' },
  { name: 'Tanner Bank', lat: 32.68, lon: -119.10, description: 'Bluefin tuna (long range)' },
  { name: 'Oceanside', lat: 33.19, lon: -117.40, description: 'White seabass, yellowtail, calico' },
  { name: 'San Diego Bay', lat: 32.71, lon: -117.17, description: 'Spotted bay bass, halibut' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildWindyUrl(overlay: WindyOverlay, lat: number, lon: number, zoom: number): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=imperial&metricTemp=imperial&metricWind=mph&zoom=${zoom}&overlay=${overlay}&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&marker=true&calendar=now&pressure=true&type=map&menu=&message=true&forecast=12&theme=dark`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ConditionCard({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
    >
      <span className="text-xs uppercase tracking-wider" style={{ color: '#8899aa' }}>{label}</span>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: '#8899aa' }}>{detail}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WeatherPage() {
  const [overlay, setOverlay] = useState<WindyOverlay>('wind');
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot>(SPOTS[0]);
  const [zoom, setZoom] = useState(10);

  const windyUrl = buildWindyUrl(overlay, selectedSpot.lat, selectedSpot.lon, zoom);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#e2e8f0' }}>
            Weather &amp; <span style={{ color: '#00d4ff' }}>Forecast</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8899aa' }}>
            Wind, waves, swell, and ocean conditions for San Diego fishing grounds
          </p>
        </div>

        {/* Quick conditions bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ConditionCard label="Wind" value="8 mph" detail="WNW, light and fishable" color="#22c55e" />
          <ConditionCard label="Waves" value="3-4 ft" detail="W swell, 12s period" color="#eab308" />
          <ConditionCard label="Water Temp" value="64&deg;F" detail="Prime SoCal range" color="#00d4ff" />
          <ConditionCard label="Pressure" value="30.12" detail="Stable, good fishing" color="#22c55e" />
        </div>

        {/* Controls row */}
        <div
          className="rounded-xl p-4 flex flex-col sm:flex-row gap-4"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
        >
          {/* Overlay selector */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8899aa' }}>Map Overlay</p>
            <div className="flex flex-wrap gap-2">
              {OVERLAYS.map((o) => {
                const isActive = o.key === overlay;
                return (
                  <button
                    key={o.key}
                    onClick={() => setOverlay(o.key)}
                    title={o.description}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={{
                      backgroundColor: isActive ? '#00d4ff' : '#0a0f1a',
                      color: isActive ? '#0a0f1a' : '#8899aa',
                      border: `1px solid ${isActive ? '#00d4ff' : '#1e2a42'}`,
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spot selector */}
          <div className="sm:w-64">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#8899aa' }}>Fishing Spot</p>
            <select
              value={selectedSpot.name}
              onChange={(e) => {
                const spot = SPOTS.find((s) => s.name === e.target.value);
                if (spot) {
                  setSelectedSpot(spot);
                  setZoom(spot.name === 'Tanner Bank' ? 8 : 10);
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-sm cursor-pointer"
              style={{
                backgroundColor: '#0a0f1a',
                color: '#e2e8f0',
                border: '1px solid #1e2a42',
                outline: 'none',
              }}
            >
              {SPOTS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} — {s.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Windy map */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #1e2a42', height: '500px' }}
        >
          <iframe
            key={`${overlay}-${selectedSpot.name}`}
            title="Windy weather forecast"
            width="100%"
            height="100%"
            src={windyUrl}
            frameBorder="0"
            style={{ border: 'none' }}
          />
        </div>

        {/* Fishing spots grid */}
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: '#e2e8f0' }}>
            Fishing Spots
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SPOTS.map((spot) => {
              const isActive = spot.name === selectedSpot.name;
              return (
                <button
                  key={spot.name}
                  onClick={() => {
                    setSelectedSpot(spot);
                    setZoom(spot.name === 'Tanner Bank' ? 8 : 10);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl p-4 text-left transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? '#00d4ff12' : '#131b2e',
                    border: `1px solid ${isActive ? '#00d4ff44' : '#1e2a42'}`,
                    boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
                  }}
                >
                  <h3 className="text-sm font-bold mb-1" style={{ color: isActive ? '#00d4ff' : '#e2e8f0' }}>
                    {spot.name}
                  </h3>
                  <p className="text-xs" style={{ color: '#8899aa' }}>{spot.description}</p>
                  <p className="text-[10px] mt-1.5" style={{ color: '#8899aa' }}>
                    {spot.lat.toFixed(2)}, {spot.lon.toFixed(2)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fishing forecast tips */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42', borderLeft: '3px solid #00d4ff' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#00d4ff' }}>
            How to Read Weather for Fishing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: '#8899aa' }}>
            <div>
              <strong style={{ color: '#e2e8f0' }}>Wind under 10 mph</strong> — Ideal fishing conditions. Calm seas, easy casting, comfortable ride.
            </div>
            <div>
              <strong style={{ color: '#e2e8f0' }}>Wind 10-15 mph</strong> — Fishable but choppy. Consider motion sickness meds. Shorter trips preferred.
            </div>
            <div>
              <strong style={{ color: '#e2e8f0' }}>Dropping barometric pressure</strong> — Fish feed aggressively before a front. Best bite window.
            </div>
            <div>
              <strong style={{ color: '#e2e8f0' }}>Swell period 10s+</strong> — Long-period swell means cleaner, more organized waves. Safer offshore travel.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
        <p className="mt-1 text-xs">Weather data powered by Windy.com &middot; ECMWF forecast model</p>
      </footer>
    </div>
  );
}
