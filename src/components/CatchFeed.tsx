'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLandingName, getLandingColor } from '@/lib/landings';
import { SPECIES_COLORS, DEFAULT_SPECIES_COLOR } from '@/lib/constants';
import { getBoatPhotoUrl, getBoatInitials, FLEET_ROSTER } from '@/lib/fleet/boats';
import BoatTripModal from '@/components/fleet-tracker/BoatTripModalLoader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatchEntry {
  id: string;
  boat: string;
  landing: 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens';
  tripType: string;
  date: string;
  species: string;    // primary/highlighted species
  count: number;      // count for primary species
  anglers: number;
  area: string;
  highlight?: boolean;
  also?: { species: string; count: number }[]; // other species caught on same trip
}

// Priority order for primary species display
// Bluefin & Yellowtail first, then Calico/Barracuda, then Rockfish last
const _SPECIES_PRIORITY: Record<string, number> = {
  'Bluefin Tuna': 1,
  'Yellowfin Tuna': 2,
  'Yellowtail': 3,
  'White Seabass': 4,
  'Dorado': 5,
  'Calico Bass': 6,
  'Barracuda': 7,
  'Lingcod': 8,
  'Rockfish': 9,
};

// Species colors imported from @/lib/constants

// ---------------------------------------------------------------------------
// Filter tab config
// ---------------------------------------------------------------------------

type LandingFilter = 'all' | 'seaforth' | 'fishermans' | 'hm_landing' | 'point_loma' | 'helgrens';

const FILTER_TABS: { key: LandingFilter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'seaforth',   label: 'Seaforth' },
  { key: 'fishermans', label: "Fisherman's" },
  { key: 'hm_landing', label: 'H&M' },
  { key: 'point_loma', label: 'Point Loma' },
  { key: 'helgrens',   label: "Helgren's" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeDate(iso: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function getPerRod(count: number, anglers: number): string {
  if (!anglers) return '—';
  return (count / anglers).toFixed(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FireIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="#f97316"
      stroke="none"
      aria-hidden="true"
      style={{ display: 'inline', flexShrink: 0 }}
    >
      <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0C17 7 12 2 12 2zM9.5 14.5a2.5 2.5 0 0 0 5 0c0-2.5-2.5-5-2.5-5S9.5 12 9.5 14.5z" />
    </svg>
  );
}

function BoatPhoto({ boatName, onClick }: { boatName: string; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getBoatPhotoUrl(boatName);
  const initials = getBoatInitials(boatName);

  return (
    <button
      onClick={onClick}
      title={`View ${boatName} trip history`}
      style={{
        width: '60px',
        height: '60px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        border: '1px solid #1e3a5a',
        background: 'linear-gradient(135deg, #1a3a5c, #0d2240)',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={boatName}
          width={60}
          height={60}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: '18px', fontWeight: 800, color: '#4a6a8a', letterSpacing: '-0.02em' }}>
          {initials}
        </span>
      )}
    </button>
  );
}

// Look up MMSI from boat name for trip modal
function getBoatMmsi(boatName: string): number | null {
  const lower = boatName.toLowerCase();
  const boat = FLEET_ROSTER.find(b => b.name.toLowerCase() === lower);
  return boat?.mmsi && boat.mmsi > 0 ? boat.mmsi : null;
}

function CatchRow({ entry, onBookTrip, onViewTrip }: { entry: CatchEntry; onBookTrip: (boatName: string) => void; onViewTrip: (boatName: string) => void }) {
  const landingColor = getLandingColor(entry.landing);
  const landingName  = getLandingName(entry.landing);
  const relDate      = getRelativeDate(entry.date);
  const perRod       = getPerRod(entry.count, entry.anglers);
  // Case-insensitive species color lookup (live data is lowercase, map is capitalized)
  const speciesKey = Object.keys(SPECIES_COLORS).find(
    (k) => k.toLowerCase() === entry.species.toLowerCase()
  );
  const speciesColor = speciesKey ? SPECIES_COLORS[speciesKey] : DEFAULT_SPECIES_COLOR;

  const isToday = relDate === 'Today';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderLeft: entry.highlight ? '3px solid #f97316' : '3px solid transparent',
        backgroundColor: entry.highlight ? 'rgba(249,115,22,0.04)' : 'transparent',
        borderBottom: '1px solid #1e2a42',
        minHeight: '64px',
        boxShadow: entry.highlight
          ? 'inset 0 0 0 1px rgba(249,115,22,0.12)'
          : undefined,
      }}
    >
      {/* LEFT: date badge */}
      <div style={{ flexShrink: 0, width: '68px', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: isToday ? 'rgba(0,212,255,0.12)' : 'rgba(136,153,170,0.12)',
            color: isToday ? '#00d4ff' : '#8899aa',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {relDate}
        </span>
      </div>

      {/* BOAT PHOTO — opens trip history modal */}
      <BoatPhoto boatName={entry.boat} onClick={() => onViewTrip(entry.boat)} />

      {/* MIDDLE: boat + landing + area + stats */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
          {/* Hot bite icon */}
          {entry.highlight && <FireIcon />}

          {/* Boat name — clickable to book trip */}
          <button
            onClick={() => onBookTrip(entry.boat)}
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#e2e8f0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textDecorationColor: '#1e2a42',
              textUnderlineOffset: '2px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.textDecorationColor = '#00d4ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.textDecorationColor = '#1e2a42'; }}
            title={`Book a trip on ${entry.boat}`}
          >
            {entry.boat}
          </button>

          {/* Landing pill */}
          <span
            style={{
              display: 'inline-block',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: `${landingColor}1a`,
              color: landingColor,
              border: `1px solid ${landingColor}33`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {landingName}
          </span>
        </div>

        {/* Trip type + area + stats */}
        <p style={{ fontSize: '12px', color: '#8899aa', margin: 0, lineHeight: 1.4 }}>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{entry.tripType}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {entry.area}
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {entry.anglers} anglers
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {perRod} per rod
        </p>
      </div>

      {/* RIGHT: primary species + count + secondary species */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {/* Primary catch — large */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: speciesColor.bg,
              color: speciesColor.text,
              whiteSpace: 'nowrap',
            }}
          >
            {entry.species}
          </span>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: speciesColor.text,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              textShadow: entry.highlight ? `0 0 12px ${speciesColor.text}60` : undefined,
            }}
          >
            {entry.count}
          </span>
        </div>

        {/* Secondary catches — smaller, stacked */}
        {entry.also && entry.also.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderLeft: '1px solid #1e2a42', paddingLeft: '8px' }}>
            {entry.also.map((a, i) => (
              <span key={`${a.species}-${i}`} style={{ fontSize: '10px', color: '#8899aa', whiteSpace: 'nowrap' }}>
                {a.species} <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{a.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CatchFeed() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<LandingFilter>('all');
  const [liveData, setLiveData] = useState<CatchEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripModalMmsi, setTripModalMmsi] = useState<number | null>(null);

  // Fetch live data from scraper API
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catch-reports', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: CatchEntry[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTimeout(() => setLiveData(data), 0);
        }
      })
      .catch(() => {/* use fallback */})
      .finally(() => setTimeout(() => setLoading(false), 0));
    return () => controller.abort();
  }, []);

  // Use live data only — no sample fallback
  const sourceData = liveData ?? [];
  const isLive = liveData !== null && liveData.length > 0;

  function handleBookTrip(boatName: string) {
    router.push(`/plan-your-trip?boat=${encodeURIComponent(boatName)}`);
  }

  function handleViewTrip(boatName: string) {
    const mmsi = getBoatMmsi(boatName);
    if (mmsi) {
      setTripModalMmsi(mmsi);
    } else {
      // Fallback: navigate to plan-your-trip if no MMSI
      handleBookTrip(boatName);
    }
  }

  const filtered =
    activeFilter === 'all'
      ? sourceData
      : sourceData.filter((e) => e.landing === activeFilter);

  return (
    <div style={{ width: '100%' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
          Catch Reports
        </h2>
        {(loading || isLive) && (
          <span
            style={{
              fontSize: '10px',
              color: loading ? '#8899aa' : '#22c55e',
              backgroundColor: loading ? '#8899aa15' : '#22c55e15',
              border: `1px solid ${loading ? '#8899aa33' : '#22c55e33'}`,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {loading ? 'Loading...' : 'Live Data'}
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {FILTER_TABS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          const color = key === 'all' ? '#00d4ff' : getLandingColor(key);
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                padding: '5px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                border: `1px solid ${isActive ? color : '#1e2a42'}`,
                backgroundColor: isActive ? `${color}1a` : 'transparent',
                color: isActive ? color : '#8899aa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Feed card */}
      <div
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e2a42',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#8899aa' }}>Loading catch reports...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎣</div>
            <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>
              {sourceData.length === 0 ? 'Reports updating' : 'No reports for this landing'}
            </div>
            <div style={{ fontSize: '12px', color: '#8899aa' }}>
              {sourceData.length === 0
                ? 'Live catch data refreshes every 4 hours. Check back soon!'
                : 'Try selecting a different landing above.'}
            </div>
          </div>
        ) : (
          filtered.map((entry) => <CatchRow key={entry.id} entry={entry} onBookTrip={handleBookTrip} onViewTrip={handleViewTrip} />)
        )}
      </div>

      {/* Trip history modal */}
      {tripModalMmsi && (
        <BoatTripModal mmsi={tripModalMmsi} onClose={() => setTripModalMmsi(null)} />
      )}
    </div>
  );
}
