'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';

// CesiumJS requires browser APIs — must disable SSR
const CesiumGlobe = dynamic(() => import('@/components/admin/CesiumGlobe'), { ssr: false });

interface NextPass {
  satellite: string;
  name: string;
  provider: string;
  resolution: string;
  color: string;
  passTime: string;
  timeUntil: string;
}

export default function SatelliteViewPage() {
  const [nextPasses, setNextPasses] = useState<NextPass[]>([]);
  const [totalSats, setTotalSats] = useState(0);
  const [inView, setInView] = useState(0);
  const [view, setView] = useState<'3d' | '2d'>('3d');

  useEffect(() => {
    fetch('/api/ocean-data/satellite-orbits')
      .then(r => r.json())
      .then(d => {
        setNextPasses(d.nextPasses || []);
        setTotalSats(d.meta?.total_satellites || 0);
        setInView(d.meta?.in_view || 0);
      })
      .catch(() => {});
  }, []);

  // Prevent page scrolling so Cesium gets wheel events
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{ height: '100vh', background: '#050a15', overflow: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Left panel */}
        <div
          onWheel={e => e.stopPropagation()}
          style={{
            width: 300, flexShrink: 0, background: '#0a0f1a',
            borderRight: '1px solid #1e2a42', overflowY: 'auto',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: 0 }}>
              🛰 Satellite Tracker
            </h2>
            <Link href="/" style={{ color: '#667788', fontSize: 11, textDecoration: 'none' }}>← Back</Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: '#131b2e', borderRadius: 8, padding: '8px 12px', border: '1px solid #1e2a42' }}>
              <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase' }}>Tracked</div>
              <div style={{ color: '#00d4ff', fontSize: 20, fontWeight: 800 }}>{totalSats || '—'}</div>
            </div>
            <div style={{ background: '#131b2e', borderRadius: 8, padding: '8px 12px', border: '1px solid #1e2a42' }}>
              <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase' }}>In View</div>
              <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 800 }}>{inView || '—'}</div>
            </div>
          </div>

          {/* Next passes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#667788', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
              Next Passes Over Coverage Area
            </div>
            {nextPasses.slice(0, 10).map((pass, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', marginBottom: 4,
                background: '#131b2e', borderRadius: 6,
                border: '1px solid #1e2a4244',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: pass.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{pass.name}</div>
                  <div style={{ color: '#667788', fontSize: 9 }}>{pass.provider} · {pass.resolution}</div>
                </div>
                <div style={{ color: pass.color, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                  {pass.timeUntil}
                </div>
              </div>
            ))}
            {nextPasses.length === 0 && (
              <div style={{ color: '#4a5568', fontSize: 11 }}>Computing passes...</div>
            )}
          </div>

          {/* Info */}
          <div style={{
            background: '#131b2e', borderRadius: 8, padding: 12,
            border: '1px solid #1e2a42', fontSize: 11, color: '#667788', lineHeight: 1.8,
          }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 4, fontSize: 12 }}>About</div>
            <p style={{ margin: 0 }}>
              Real-time tracking of Earth observation satellites over our
              Channel Islands to Guadalupe coverage area.
            </p>
            <p style={{ margin: '6px 0 0' }}>
              Click satellites on the globe to view details. Use camera
              presets at bottom to jump to different views.
            </p>
            <p style={{ margin: '6px 0 0' }}>
              Swath footprints show the area each satellite can image in
              a single pass.
            </p>
          </div>
        </div>

        {/* Right — 3D Globe */}
        <div style={{ flex: 1, position: 'relative' }}>
          <CesiumGlobe
            cesiumIonToken={process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN}
          />
        </div>
      </div>
    </div>
  );
}
