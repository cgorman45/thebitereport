'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SatelliteViewer from '@/components/admin/SatelliteViewer';
import LocationMap from '@/components/admin/LocationMap';
import { useOptionalAuth } from '@/components/auth/AuthProvider';
import type { Detection } from '@/components/admin/DetectionCard';

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
      background: c.bg, color: c.text,
      padding: '4px 12px', borderRadius: 6,
      fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const,
    }}>
      {status}
    </span>
  );
}

function formatCaptureTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function formatArea(m2: number) {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} hectares`;
  return `${m2.toLocaleString()} m²`;
}

function tier2Likelihood(d: Detection): { pct: number; label: string; color: string; reasoning: string[] } {
  let score = 0;
  const reasons: string[] = [];

  score += d.confidence * 40;
  if (d.confidence > 0.7) reasons.push('High confidence detection');
  else if (d.confidence > 0.4) reasons.push('Moderate confidence — may be debris or turbidity');
  else reasons.push('Low confidence — likely noise');

  if (d.area_m2 > 200) { score += 15; reasons.push(`Large area (${formatArea(d.area_m2)}) — easier to verify at 3m`); }
  else if (d.area_m2 > 100) { score += 10; reasons.push('Medium area — visible at 3m'); }
  else { score += 5; reasons.push('Small area — may be below PlanetScope detection threshold'); }

  if (d.indices) {
    if (d.indices.fai > 0.02) { score += 15; reasons.push('Strong FAI signal — likely floating organic material'); }
    else if (d.indices.fai > 0.01) { score += 8; reasons.push('Moderate FAI — possible kelp'); }

    if (d.indices.ndvi > 0.3) { score += 10; reasons.push('Strong NDVI — active photosynthesis (green vegetation)'); }
    else if (d.indices.ndvi > 0.2) { score += 5; reasons.push('Weak NDVI — could be decaying kelp or sediment'); }

    if (d.indices.fdi > 0.01) { score += 10; reasons.push('Positive FDI — floating debris signature'); }
  } else {
    reasons.push('No spectral indices available');
  }

  const ageHours = (Date.now() - new Date(d.detected_at).getTime()) / 3600000;
  if (ageHours > 72) { score -= 15; reasons.push('Detection is >3 days old — paddy may have dispersed or drifted'); }
  else if (ageHours > 24) { score -= 5; reasons.push('Detection is >24h old — paddy may have moved'); }
  else { reasons.push('Fresh detection — paddy likely still in area'); }

  const pct = Math.min(95, Math.max(5, Math.round(score)));
  let label: string;
  let color: string;
  if (pct >= 70) { label = 'High'; color = '#22c55e'; }
  else if (pct >= 40) { label = 'Medium'; color = '#eab308'; }
  else { label = 'Low'; color = '#ef4444'; }

  return { pct, label, color, reasoning: reasons };
}

const LABEL: React.CSSProperties = { color: '#8899aa', fontSize: 12, marginBottom: 2 };
const VALUE: React.CSSProperties = { color: '#e2e8f0', fontSize: 15, fontWeight: 600 };

export default function DetectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useOptionalAuth();
  const [detection, setDetection] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchDetection = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (auth?.session?.access_token) {
      headers.Authorization = `Bearer ${auth.session.access_token}`;
    }

    const res = await fetch(`/api/admin/kelp-detections?status=all&limit=100`, { headers });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    const found = data.detections.find((d: Detection) => d.id === params.id);
    setDetection(found || null);
    setLoading(false);
  }, [params.id, auth?.session?.access_token]);

  useEffect(() => { fetchDetection(); }, [fetchDetection]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!detection) return;
    setReviewLoading(true);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth?.session?.access_token) {
      headers.Authorization = `Bearer ${auth.session.access_token}`;
    }

    const res = await fetch(`/api/admin/kelp-detections/${detection.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, notes }),
    });

    if (res.ok) {
      setDetection({ ...detection, status, reviewed_at: new Date().toISOString(), review_notes: notes || null });
    }
    setReviewLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: '#8899aa' }}>Loading...</div>
      </div>
    );
  }

  if (!detection) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: '#ef4444' }}>Detection not found</div>
      </div>
    );
  }

  const d = detection;
  const t2 = tier2Likelihood(d);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
      <Header />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Back button */}
        <button
          onClick={() => router.push('/admin/kelp-review')}
          style={{
            background: 'none', border: 'none', color: '#00d4ff',
            fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0,
          }}
        >
          ← Back to review
        </button>

        {/* Satellite image viewer with zoom/pan */}
        <div style={{ marginBottom: 24 }}>
          {d.thumbnail_b64 ? (
            <SatelliteViewer
              thumbnailB64={d.thumbnail_b64}
              sceneId={d.scene_id}
              captureTime={formatCaptureTime(d.detected_at)}
              metersPerPixel={10}
            />
          ) : (
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                width: '100%', height: 500,
                background: '#0d1320',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8, color: '#4a5568',
              }}>
                <div style={{ fontSize: 64 }}>🛰️</div>
                <div style={{ fontSize: 16 }}>No satellite image available</div>
                <div style={{ fontSize: 13, color: '#3a4a5a' }}>
                  Sentinel-2 10m resolution · {d.scene_id.split('_')[0]}
                </div>
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid #1e2a42', fontSize: 12, color: '#667788' }}>
                {formatCaptureTime(d.detected_at)}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 16 }}>
          {/* Left: Location info */}
          <div>
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42',
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                Detection Location
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div><div style={LABEL}>Coordinates</div><div style={VALUE}>{d.lat.toFixed(4)}°N, {Math.abs(d.lng).toFixed(4)}°W</div></div>
                <div><div style={LABEL}>Area</div><div style={VALUE}>{formatArea(d.area_m2)}</div></div>
                <div><div style={LABEL}>Detection Method</div><div style={VALUE}>{d.method === 'yolov8' ? 'AI (YOLOv8)' : 'Threshold Detection'}</div></div>
                <div><div style={LABEL}>Scene ID</div><div style={{ color: '#8899aa', fontSize: 10, wordBreak: 'break-all' }}>{d.scene_id}</div></div>
              </div>
            </div>

            {/* Interactive satellite map showing detection location */}
            <LocationMap lat={d.lat} lng={d.lng} area_m2={d.area_m2} />

            {/* Spectral indices */}
            {d.indices && (
              <div style={{
                background: '#131b2e', border: '1px solid #1e2a42',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                  Spectral Analysis
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    { name: 'NDVI', value: d.indices.ndvi, desc: 'Vegetation Index', good: 0.3 },
                    { name: 'FAI', value: d.indices.fai, desc: 'Floating Algae Index', good: 0.02 },
                    { name: 'FDI', value: d.indices.fdi, desc: 'Floating Debris Index', good: 0.01 },
                  ].map((idx) => (
                    <div key={idx.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#8899aa' }}>{idx.desc}</div>
                        <div style={{ fontSize: 10, color: '#4a5568' }}>{idx.name}</div>
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 700,
                        color: idx.value != null && idx.value > idx.good ? '#22c55e' : '#eab308',
                      }}>
                        {idx.value != null ? idx.value.toFixed(4) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Confidence + Spectral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42',
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ color: confidenceColor(d.confidence), fontSize: 36, fontWeight: 800 }}>
                  {Math.round(d.confidence * 100)}%
                </span>
                {statusBadge(d.status)}
              </div>
              <div style={LABEL}>Confidence Score</div>
              <div style={{
                height: 6, borderRadius: 3, background: '#1e2a42', marginTop: 4, marginBottom: 16,
              }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${d.confidence * 100}%`,
                  background: confidenceColor(d.confidence),
                }} />
              </div>
              <div><div style={LABEL}>Captured</div><div style={VALUE}>{formatCaptureTime(d.detected_at)}</div></div>
            </div>

            {/* Tier 2 likelihood */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42',
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
                Tier 2 Confirmation Likelihood
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: t2.color,
                }}>
                  {t2.pct}%
                </div>
                <span style={{
                  background: t2.color + '22', color: t2.color,
                  padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                }}>
                  {t2.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8899aa', marginBottom: 4 }}>
                If promoted to PlanetScope (3m):
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#8899aa', lineHeight: 1.8 }}>
                {t2.reasoning.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Review actions */}
            {d.status === 'pending' ? (
              <div style={{
                background: '#131b2e', border: '1px solid #1e2a42',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                  Review Decision
                </div>
                <textarea
                  placeholder="Add review notes (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', background: '#0d1320', border: '1px solid #1e2a42',
                    borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 13,
                    resize: 'vertical', outline: 'none', marginBottom: 12,
                    fontFamily: 'system-ui',
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={reviewLoading}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: '#22c55e22', color: '#22c55e',
                      border: '1px solid #22c55e44', borderRadius: 8,
                      fontSize: 14, fontWeight: 700, cursor: reviewLoading ? 'wait' : 'pointer',
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={reviewLoading}
                    style={{
                      flex: 1, padding: '10px 0',
                      background: '#ef444422', color: '#ef4444',
                      border: '1px solid #ef444444', borderRadius: 8,
                      fontSize: 14, fontWeight: 700, cursor: reviewLoading ? 'wait' : 'pointer',
                    }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#131b2e', border: '1px solid #1e2a42',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
                  Review Complete
                </div>
                <div style={{ fontSize: 12, color: '#8899aa' }}>
                  {d.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                  {d.reviewed_at && ` on ${new Date(d.reviewed_at).toLocaleDateString()}`}
                </div>
                {d.review_notes && (
                  <div style={{ fontSize: 12, color: '#8899aa', marginTop: 6, fontStyle: 'italic' }}>
                    "{d.review_notes}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
