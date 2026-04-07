'use client';

import React, { useState } from 'react';
import type { AlertRadius } from '@/lib/ocean-data/proximity';
import { ALERT_RADII } from '@/lib/ocean-data/proximity';

interface Props {
  enabled: boolean;
  alertRadius: AlertRadius;
  speed: number | null;
  onToggle: () => void;
  onRadiusChange: (r: AlertRadius) => void;
}

export default function GPSToggle({ enabled, alertRadius, speed, onToggle, onRadiusChange }: Props) {
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {/* Radius picker */}
      {showRadiusPicker && enabled && (
        <div
          style={{
            background: 'rgba(13,19,32,0.92)',
            border: '1px solid #1e2a42',
            borderRadius: 10,
            padding: 10,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            gap: 6,
          }}
        >
          {ALERT_RADII.map((r) => (
            <button
              key={r}
              onClick={() => { onRadiusChange(r); setShowRadiusPicker(false); }}
              style={{
                background: r === alertRadius ? '#22c55e20' : 'transparent',
                border: `1px solid ${r === alertRadius ? '#22c55e' : '#1e2a42'}`,
                borderRadius: 8,
                padding: '6px 10px',
                color: r === alertRadius ? '#22c55e' : '#8899aa',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r}nm
            </button>
          ))}
        </div>
      )}

      {/* GPS toggle button */}
      <button
        onClick={onToggle}
        onContextMenu={(e) => { e.preventDefault(); setShowRadiusPicker(v => !v); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: enabled ? 'rgba(34,197,94,0.1)' : 'rgba(13,19,32,0.92)',
          border: `1px solid ${enabled ? '#22c55e' : '#1e2a42'}`,
          borderRadius: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          color: enabled ? '#22c55e' : '#8899aa',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
        {enabled ? (
          <>
            GPS · {alertRadius}nm
            {speed != null && speed > 1 && ` · ${speed.toFixed(0)}kts`}
          </>
        ) : (
          'GPS Off'
        )}
      </button>
    </div>
  );
}
