'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const CesiumGlobe = dynamic(() => import('@/components/admin/CesiumGlobe'), { ssr: false });

export default function FishingIntelligencePage() {
  // Prevent page scrolling so Cesium gets wheel events
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: '#050a15' }}>
      <CesiumGlobe cesiumIonToken={process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN} />
    </div>
  );
}
