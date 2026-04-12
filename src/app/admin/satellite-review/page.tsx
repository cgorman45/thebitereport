'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

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
  ordered_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

const tierColors: Record<string, string> = {
  sentinel: '#0ea5e9',
  planetscope: '#ef4444',
  up42: '#a855f7',
};

const tierLabels: Record<string, string> = {
  sentinel: 'Sentinel 10m',
  planetscope: 'Planet 3m',
  up42: 'Pléiades 50cm',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  placed: { bg: '#eab30822', text: '#eab308' },
  processing: { bg: '#3b82f622', text: '#3b82f6' },
  ready: { bg: '#22c55e22', text: '#22c55e' },
  failed: { bg: '#ef444422', text: '#ef4444' },
};

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SatelliteReviewPage() {
  const [orders, setOrders] = useState<SatelliteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const params = filter !== 'all' ? `?tier=${filter}` : '';
    fetch(`/api/admin/satellite-orders${params}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: 0 }}>
              Satellite Orders
            </h1>
            <p style={{ color: '#667788', fontSize: 13, marginTop: 4 }}>
              Review and manage satellite imagery orders
            </p>
          </div>
          <Link
            href="/"
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#1e2a42', color: '#8899aa', textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['all', 'sentinel', 'planetscope', 'up42'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: filter === f ? '#00d4ff22' : '#131b2e',
                color: filter === f ? '#00d4ff' : '#667788',
                border: `1px solid ${filter === f ? '#00d4ff33' : '#1e2a42'}`,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All Orders' : tierLabels[f] || f}
            </button>
          ))}
        </div>

        {/* Orders table */}
        <div style={{ background: '#131b2e', border: '1px solid #1e2a42', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
              No satellite orders yet. Order imagery from the admin dashboard.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2a42' }}>
                    {['Tier', 'Scene ID', 'Location', 'Acquired', 'Cloud %', 'Resolution', 'Status', 'Ordered', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#667788', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const sc = statusColors[order.status] || statusColors.placed;
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #1e2a4222' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: (tierColors[order.tier] || '#666') + '22',
                            color: tierColors[order.tier] || '#666',
                          }}>
                            {tierLabels[order.tier] || order.tier}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#8899aa', fontSize: 11, fontFamily: 'monospace' }}>
                          {order.scene_id ? order.scene_id.substring(0, 16) + '...' : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#38bdf8', fontSize: 12 }}>
                          {order.lat.toFixed(4)}°N, {Math.abs(order.lng).toFixed(4)}°W
                        </td>
                        <td style={{ padding: '12px 14px', color: '#e2e8f0', fontSize: 12 }}>
                          {order.acquired_at ? new Date(order.acquired_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                          {order.cloud_cover != null ? `${order.cloud_cover.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                          {order.resolution ? `${order.resolution}m` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: sc.bg, color: sc.text, textTransform: 'uppercase',
                          }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#667788', fontSize: 12 }}>
                          {relativeTime(order.ordered_at)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Link
                            href={`/admin/satellite-review/${order.id}`}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: '#00d4ff', color: '#0a0f1a', textDecoration: 'none',
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
