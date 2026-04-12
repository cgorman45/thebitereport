'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('@/components/admin/LocationMap'), { ssr: false });

interface SatelliteOrder {
  id: string;
  zone_id: string | null;
  lat: number;
  lng: number;
  tier: string;
  provider: string;
  scene_id: string;
  order_id: string;
  status: string;
  resolution: number;
  cloud_cover: number;
  acquired_at: string;
  image_url: string | null;
  thumbnail_b64: string | null;
  ordered_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

const tierColors: Record<string, string> = {
  sentinel: '#0ea5e9',
  planetscope: '#ef4444',
  up42: '#a855f7',
};

const providerLinks: Record<string, string> = {
  up42: 'https://console.up42.com/catalog/data-management',
  planetscope: 'https://www.planet.com/account/',
};

export default function SatelliteOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<SatelliteOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/satellite-orders/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setOrder(d);
          setNotes(d.review_notes || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/satellite-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: notes, reviewed_at: new Date().toISOString() }),
      });
      const updated = await res.json();
      if (updated.id) setOrder(updated);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/satellite-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await res.json();
      if (updated.id) setOrder(updated);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <Header />
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Order not found</div>
      </div>
    );
  }

  const tierColor = tierColors[order.tier] || '#667788';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/admin/satellite-review"
              style={{ color: '#667788', textDecoration: 'none', fontSize: 13 }}
            >
              ← All Orders
            </Link>
            <span style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: tierColor + '22', color: tierColor,
            }}>
              {order.provider}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: order.status === 'ready' ? '#22c55e22' : '#eab30822',
              color: order.status === 'ready' ? '#22c55e' : '#eab308',
              textTransform: 'uppercase',
            }}>
              {order.status}
            </span>
          </div>
          {providerLinks[order.tier] && (
            <a
              href={providerLinks[order.tier]}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: tierColor, color: '#fff', textDecoration: 'none',
              }}
            >
              Open in {order.tier === 'up42' ? 'UP42' : 'Planet'} Console →
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16 }}>
          {/* Left: Image or map */}
          <div>
            {/* Image viewer area */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
              overflow: 'hidden', marginBottom: 16, height: '50vh', position: 'relative',
            }}>
              {order.thumbnail_b64 ? (
                <img
                  src={`data:image/png;base64,${order.thumbnail_b64}`}
                  alt="Satellite imagery"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', color: '#4a5568',
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🛰</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Imagery Not Yet Available</div>
                  <div style={{ fontSize: 12, maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
                    {order.tier === 'up42'
                      ? 'Check UP42 Data Management for download when ready. Processing typically takes 10 minutes to 24 hours.'
                      : order.tier === 'sentinel'
                        ? 'Sentinel-2 imagery is freely available. Use the Process API to generate the image.'
                        : 'Check Planet Explorer for download when ready.'}
                  </div>
                </div>
              )}
            </div>

            {/* Location map */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
              overflow: 'hidden', height: 300,
            }}>
              <LocationMap lat={order.lat} lng={order.lng} area_m2={1000000} />
            </div>
          </div>

          {/* Right: Details panel */}
          <div>
            {/* Order info */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
              padding: 20, marginBottom: 16,
            }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Order Details</h3>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                {[
                  ['Provider', order.provider],
                  ['Resolution', order.resolution ? `${order.resolution}m` : '—'],
                  ['Cloud Cover', order.cloud_cover != null ? `${order.cloud_cover.toFixed(1)}%` : '—'],
                  ['Acquired', order.acquired_at ? new Date(order.acquired_at).toLocaleString() : '—'],
                  ['Ordered', new Date(order.ordered_at).toLocaleString()],
                  ['Location', `${order.lat.toFixed(4)}°N, ${Math.abs(order.lng).toFixed(4)}°W`],
                  ['Scene ID', order.scene_id || '—'],
                  ['Order ID', order.order_id || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#667788' }}>{label}</span>
                    <span style={{ color: '#e2e8f0', textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status actions */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
              padding: 20, marginBottom: 16,
            }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Update Status</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['placed', 'processing', 'ready', 'failed'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={order.status === s}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: order.status === s ? '#00d4ff22' : '#1e2a42',
                      color: order.status === s ? '#00d4ff' : '#667788',
                      border: order.status === s ? '1px solid #00d4ff33' : '1px solid #1e2a42',
                      cursor: order.status === s ? 'default' : 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Review notes */}
            <div style={{
              background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12,
              padding: 20,
            }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Review Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this imagery order..."
                rows={4}
                style={{
                  width: '100%', padding: 12, borderRadius: 8, fontSize: 13,
                  background: '#0a0f1a', border: '1px solid #1e2a42', color: '#e2e8f0',
                  resize: 'vertical', outline: 'none',
                }}
              />
              <button
                onClick={saveNotes}
                disabled={saving}
                style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: saving ? '#4a5568' : '#00d4ff', color: '#0a0f1a',
                  border: 'none', cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
              {order.reviewed_at && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#4a5568' }}>
                  Last reviewed: {new Date(order.reviewed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
