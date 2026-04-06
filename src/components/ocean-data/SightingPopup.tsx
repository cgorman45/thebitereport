'use client';

import { useState } from 'react';
import VerifyButton from './VerifyButton';

interface SightingPopupProps {
  id: string;
  lat: number;
  lng: number;
  description: string | null;
  status: 'pending' | 'verified' | 'expired';
  verification_count: number;
  display_name: string;
  avatar_key: string;
  photo_url: string | null;
  created_at: string;
  onVerify: (id: string) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SightingPopup({
  id,
  description,
  status,
  verification_count,
  display_name,
  avatar_key,
  photo_url,
  created_at,
  onVerify,
}: SightingPopupProps) {
  const [photoExpanded, setPhotoExpanded] = useState(false);

  const statusColor = status === 'verified' ? '#22c55e' : status === 'expired' ? '#8899aa' : '#eab308';
  const statusLabel = status === 'verified' ? 'Verified ✓' : status === 'expired' ? 'Expired' : 'Pending';

  return (
    <>
      <style>{`
        .sighting-popup-photo:hover { opacity: 0.85; }
      `}</style>
      <div
        style={{
          background: 'rgba(13,19,32,0.97)',
          border: '1px solid #1e2a42',
          borderRadius: 10,
          padding: 12,
          maxWidth: 280,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
        }}
      >
        {/* Header: avatar + name + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <img
            src={`/avatars/${avatar_key}.svg`}
            alt={display_name}
            width={28}
            height={28}
            style={{ borderRadius: '50%', border: '1px solid #1e2a42', flexShrink: 0 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/avatars/default.svg';
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {display_name}
            </div>
            <div style={{ fontSize: 10, color: '#8899aa' }}>{relativeTime(created_at)}</div>
          </div>
          {/* Status badge */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: statusColor,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}44`,
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Photo thumbnail */}
        {photo_url && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={photo_url}
              alt="Kelp sighting"
              className="sighting-popup-photo"
              onClick={() => setPhotoExpanded(true)}
              style={{
                width: '100%',
                height: 120,
                objectFit: 'cover',
                borderRadius: 6,
                cursor: 'pointer',
                border: '1px solid #1e2a42',
                transition: 'opacity 0.15s',
              }}
            />
          </div>
        )}

        {/* Description */}
        {description && (
          <p style={{ margin: '0 0 8px', color: '#c4cfe0', fontSize: 12, lineHeight: 1.4 }}>
            {description}
          </p>
        )}

        {/* Verify row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#8899aa' }}>
            {verification_count} verification{verification_count !== 1 ? 's' : ''}
          </span>
          <VerifyButton
            verified={false}
            count={verification_count}
            onToggle={() => onVerify(id)}
          />
        </div>
      </div>

      {/* Expanded photo overlay */}
      {photoExpanded && photo_url && (
        <div
          onClick={() => setPhotoExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={photo_url}
            alt="Kelp sighting"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, border: '1px solid #1e2a42' }}
          />
        </div>
      )}
    </>
  );
}
