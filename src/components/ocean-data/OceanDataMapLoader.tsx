'use client';

import dynamic from 'next/dynamic';

const OceanDataMap = dynamic(
  () => import('@/components/ocean-data/OceanDataMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#0a0f1a]">
        <div className="text-[#8899aa] text-sm">Loading ocean data map...</div>
      </div>
    ),
  },
);

export default function OceanDataMapLoader() {
  return <OceanDataMap />;
}
