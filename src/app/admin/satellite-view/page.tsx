'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FISHING_SPOTS } from '@/lib/ocean-data/fishing-spots';

const CesiumGlobe = dynamic(() => import('@/components/admin/CesiumGlobe'), { ssr: false });

export default function FishingIntelligencePage() {
  const [spotsOpen, setSpotsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSpotClick = (spot: typeof FISHING_SPOTS[0]) => {
    window.dispatchEvent(new CustomEvent('flyToSpot', { detail: spot }));
    setSpotsOpen(false);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#050a15' }}>
      {/* Map takes remaining space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <CesiumGlobe cesiumIonToken={process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN} />
      </div>

      {/* Collapsible fishing spots bar */}
      <div style={{ flexShrink: 0, background: '#0a0f1a', borderTop: '1px solid #1e2a42' }}>
        <button
          onClick={() => setSpotsOpen(!spotsOpen)}
          style={{
            width: '100%', padding: '8px 16px', background: 'none', border: 'none',
            color: '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>🎣 Offshore Fishing Locations ({FISHING_SPOTS.length})</span>
          <span style={{ color: '#667788', fontSize: 10 }}>{spotsOpen ? '▼ Hide' : '▶ Show'}</span>
        </button>
        {spotsOpen && (
          <div style={{ padding: '4px 12px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FISHING_SPOTS.map(spot => (
              <button
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: '#131b2e', color: '#8899aa',
                  border: '1px solid #1e2a42', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {spot.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
