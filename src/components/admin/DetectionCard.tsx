'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Detection {
  id: string;
  scene_id: string;
  detected_at: string;
  lat: number;
  lng: number;
  area_m2: number;
  confidence: number;
  method: string;
  indices: { ndvi: number; fai: number; fdi: number } | null;
  thumbnail_b64: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  review_notes: string | null;
}

interface DetectionCardProps {
  detection: Detection;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onReview: (id: string, status: 'approved' | 'rejected', notes: string) => Promise<void>;
}

function confidenceColor(c: number) {
  if (c > 0.7) return '#22c55e';
  if (c >= 0.4) return '#eab308';
  return '#ef4444';
}

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#eab30822', text: '#eab308' },
    approved: { bg: '#22c55e22', text: '#22c55e' },
    rejected: { bg: '#ef444422', text: '#ef4444' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    }}>
      {status}
    </span>
  );
}

function formatArea(m2: number) {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toLocaleString()} m²`;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCaptureTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Estimate likelihood that a Tier 2 (PlanetScope 3m) scan would confirm this detection.
 * Based on:
 * - Confidence score (higher = more likely real)
 * - Area (larger paddies are easier to confirm)
 * - Age (older detections may have drifted or dispersed)
 * - Spectral strength (strong FAI/FDI = more likely real kelp)
 */
function tier2Likelihood(d: Detection): { pct: number; label: string; color: string } {
  let score = 0;

  // Confidence is the strongest signal
  score += d.confidence * 40;

  // Larger area = easier to find at higher res
  if (d.area_m2 > 200) score += 15;
  else if (d.area_m2 > 100) score += 10;
  else score += 5;

  // Spectral index strength
  if (d.indices) {
    if (d.indices.fai > 0.02) score += 15;
    else if (d.indices.fai > 0.01) score += 8;

    if (d.indices.ndvi > 0.3) score += 10;
    else if (d.indices.ndvi > 0.2) score += 5;

    if (d.indices.fdi > 0.01) score += 10;
    else if (d.indices.fdi > 0) score += 5;
  }

  // Freshness penalty — kelp paddies drift and disperse
  const ageHours = (Date.now() - new Date(d.detected_at).getTime()) / 3600000;
  if (ageHours > 72) score -= 15;
  else if (ageHours > 24) score -= 5;

  const pct = Math.min(95, Math.max(5, Math.round(score)));

  let label: string;
  let color: string;
  if (pct >= 70) { label = 'High'; color = '#22c55e'; }
  else if (pct >= 40) { label = 'Medium'; color = '#eab308'; }
  else { label = 'Low'; color = '#ef4444'; }

  return { pct, label, color };
}

export default function DetectionCard({ detection, selected, onToggleSelect, onReview }: DetectionCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setLoading(true);
    await onReview(detection.id, status, notes);
    setLoading(false);
  };

  const d = detection;
  const t2 = tier2Likelihood(d);

  return (
    <div style={{
      background: selected ? '#1a2540' : '#131b2e',
      border: `1px solid ${selected ? '#00d4ff' : '#1e2a42'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Thumbnail — click to open detail page */}
      <div
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => router.push(`/admin/kelp-review/${d.id}`)}
      >
        {d.thumbnail_b64 ? (
          <img
            src={`data:image/jpeg;base64,${d.thumbnail_b64}`}
            alt="Satellite view"
            style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: 160,
            background: '#0d1320',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4a5568',
            fontSize: 12,
          }}>
            No satellite image
          </div>
        )}
        {/* Select checkbox overlay */}
        <div
          onClick={() => onToggleSelect(d.id)}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 20,
            height: 20,
            borderRadius: 4,
            border: `2px solid ${selected ? '#00d4ff' : '#667788'}`,
            background: selected ? '#00d4ff' : 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {selected && '\u2713'}
        </div>
        {/* Status badge overlay */}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          {statusBadge(d.status)}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: confidenceColor(d.confidence), fontWeight: 700, fontSize: 16 }}>
            {Math.round(d.confidence * 100)}%
          </span>
          <span style={{ color: '#8899aa', fontSize: 11 }}>
            {relativeTime(d.detected_at)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#8899aa', marginBottom: 8 }}>
          <div>Area: <span style={{ color: '#e2e8f0' }}>{formatArea(d.area_m2)}</span></div>
          <div>Method: <span style={{ color: '#e2e8f0' }}>{d.method === 'yolov8' ? 'AI' : 'Threshold'}</span></div>
          <div style={{ gridColumn: '1 / -1' }}>
            {d.lat.toFixed(4)}°N, {Math.abs(d.lng).toFixed(4)}°W
          </div>
        </div>

        {/* Capture timestamp */}
        <div style={{ fontSize: 11, color: '#8899aa', marginBottom: 6 }}>
          Captured: <span style={{ color: '#c8d4e0' }}>{formatCaptureTime(d.detected_at)}</span>
        </div>

        {d.indices && (
          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#667788', marginBottom: 8 }}>
            <span>NDVI: {d.indices.ndvi?.toFixed(3)}</span>
            <span>FAI: {d.indices.fai?.toFixed(3)}</span>
            <span>FDI: {d.indices.fdi?.toFixed(3)}</span>
          </div>
        )}

        {/* Tier 2 likelihood */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          background: '#0d1320',
          borderRadius: 6,
          marginBottom: 8,
          fontSize: 11,
        }}>
          <span style={{ color: '#8899aa' }}>Tier 2 confirmation</span>
          <span style={{ color: t2.color, fontWeight: 700 }}>
            {t2.pct}% {t2.label}
          </span>
        </div>

        {d.review_notes && (
          <div style={{ fontSize: 11, color: '#8899aa', marginBottom: 8, fontStyle: 'italic' }}>
            Note: {d.review_notes}
          </div>
        )}

        {/* Review controls */}
        {d.status === 'pending' && (
          <div>
            <input
              type="text"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                background: '#0d1320',
                border: '1px solid #1e2a42',
                borderRadius: 6,
                padding: '6px 8px',
                color: '#e2e8f0',
                fontSize: 11,
                marginBottom: 6,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleReview('approved')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: '#22c55e22',
                  color: '#22c55e',
                  border: '1px solid #22c55e44',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                Approve
              </button>
              <button
                onClick={() => handleReview('rejected')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: '#ef444422',
                  color: '#ef4444',
                  border: '1px solid #ef444444',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
