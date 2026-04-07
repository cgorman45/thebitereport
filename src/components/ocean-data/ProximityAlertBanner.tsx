'use client';

import React from 'react';
import type { ProximityAlert } from '@/lib/ocean-data/proximity';
import { bearingToCompass } from '@/lib/ocean-data/proximity';

interface Props {
  alerts: ProximityAlert[];
  onDismiss: (detectionId: string) => void;
  onTap: (lat: number, lng: number) => void;
}

export default function ProximityAlertBanner({ alerts, onDismiss, onTap }: Props) {
  if (alerts.length === 0) return null;

  const typeLabels: Record<string, string> = {
    'kelp-satellite': '🌿 Kelp Paddy',
    'kelp-sighting': '📍 Reported Kelp',
    'current-break': '🌊 Current Break',
    'drift-zone': '🔮 Drift Zone',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 76, // below header
        left: 12,
        right: 12,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {alerts.slice(0, 3).map((alert) => {
        const dir = bearingToCompass(alert.bearing);
        const dist = alert.distanceNM < 1
          ? `${(alert.distanceNM * 2025.37).toFixed(0)}yds`
          : `${alert.distanceNM.toFixed(1)}nm`;
        const label = typeLabels[alert.detection.type] ?? 'Detection';

        return (
          <div
            key={alert.detection.id}
            onClick={() => onTap(alert.detection.lat, alert.detection.lng)}
            style={{
              background: 'rgba(13,19,32,0.95)',
              border: '1px solid #22c55e',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 20px rgba(34,197,94,0.3)',
              animation: 'proximityPulse 2s ease-in-out infinite',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 700 }}>
                {label} — {dist} {dir}
              </div>
              <div style={{ color: '#8899aa', fontSize: 11, marginTop: 2 }}>
                {alert.detection.label}
                {alert.detection.confidence != null && ` · ${(alert.detection.confidence * 100).toFixed(0)}% confidence`}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alert.detection.id); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8899aa',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
