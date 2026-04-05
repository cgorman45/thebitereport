'use client';

import dynamic from 'next/dynamic';

const BoatTripModal = dynamic(
  () => import('@/components/fleet-tracker/BoatTripModal'),
  {
    ssr: false,
    loading: () => (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 9998,
            backdropFilter: 'blur(4px)',
          }}
        />
        {/* Loading placeholder */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90vw, 800px)',
            height: 'min(85vh, 640px)',
            backgroundColor: '#0d1526',
            borderRadius: '16px',
            border: '1px solid #1e2a42',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '14px', color: '#8899aa' }}>Loading map...</div>
        </div>
      </>
    ),
  },
);

export default BoatTripModal;
