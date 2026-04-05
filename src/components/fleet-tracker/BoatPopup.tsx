'use client';

import type { TrackedBoat, BoatStatus } from '@/lib/fleet/types';
import FavoriteButton from '@/components/auth/FavoriteButton';
import { useOptionalAuth } from '@/components/auth/AuthProvider';

interface BoatPopupProps {
  boat: TrackedBoat;
}

const STATUS_COLORS: Record<BoatStatus, { color: string; bg: string; border: string }> = {
  catching_fish: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.4)',
  },
  circling: {
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.4)',
  },
  transit: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.4)',
  },
  drifting: {
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.4)',
  },
  in_port: {
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.35)',
  },
  unknown: {
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.35)',
  },
};

const LANDING_DISPLAY: Record<string, string> = {
  seaforth: 'Seaforth Sportfishing',
  fishermans: "Fisherman's Landing",
  unknown: 'Unknown Landing',
};

function getRelativeTime(timestampMs: number): string {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function formatCoord(val: number): string {
  return val.toFixed(4);
}

export default function BoatPopup({ boat }: BoatPopupProps) {
  const auth = useOptionalAuth();
  const isFav = auth?.favorites.has(boat.mmsi) ?? false;
  const sc = STATUS_COLORS[boat.status];
  const landingName = LANDING_DISPLAY[boat.landing] ?? boat.landing;
  const relativeTime = getRelativeTime(boat.lastUpdate);

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        color: '#e2e8f0',
        borderRadius: '10px',
        border: '1px solid #1e2a42',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        minWidth: '220px',
        maxWidth: '280px',
        padding: '14px 16px',
        lineHeight: '1.5',
      }}
    >
      {/* Boat name */}
      <div
        style={{
          fontWeight: '700',
          fontSize: '16px',
          color: '#e2e8f0',
          marginBottom: '2px',
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {boat.name}
        <FavoriteButton mmsi={boat.mmsi} size={14} />
      </div>

      {/* Landing */}
      <div
        style={{
          fontSize: '11px',
          color: '#8899aa',
          marginBottom: '10px',
        }}
      >
        {landingName}
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: '6px' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: '600',
            color: sc.color,
            backgroundColor: sc.bg,
            border: `1px solid ${sc.border}`,
            borderRadius: '9999px',
            padding: '2px 10px',
            lineHeight: '1.4',
          }}
        >
          {boat.statusLabel}
        </span>
      </div>

      {/* Status detail */}
      {boat.statusDetail && (
        <div
          style={{
            fontSize: '12px',
            color: '#8899aa',
            marginBottom: '10px',
            fontStyle: 'italic',
          }}
        >
          {boat.statusDetail}
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid #1e2a42',
          marginBottom: '8px',
        }}
      />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px' }}>
        <PopupStat label="Speed" value={`${boat.speed.toFixed(1)} kts`} />
        <PopupStat label="Course" value={`${Math.round(boat.heading)}\u00b0`} />
        <PopupStat label="Lat" value={formatCoord(boat.lat)} />
        <PopupStat label="Lng" value={formatCoord(boat.lng)} />
      </div>

      {/* Trip type */}
      {boat.vesselType && (
        <div style={{ marginTop: '6px' }}>
          <PopupStat label="Trip" value={boat.vesselType} />
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid #1e2a42',
          marginTop: '10px',
          paddingTop: '7px',
          fontSize: '11px',
          color: '#8899aa',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            flexShrink: 0,
          }}
        />
        Updated {relativeTime}
      </div>

      {/* FOLLOWING badge for favorited boats */}
      {isFav && (
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <span style={{
            backgroundColor: '#22c55e20', color: '#22c55e',
            fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
          }}>FOLLOWING</span>
        </div>
      )}
    </div>
  );
}

function PopupStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: '#8899aa', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '12px' }}>{value}</div>
    </div>
  );
}
