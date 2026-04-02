'use client';

import dynamic from 'next/dynamic';

const FleetMap = dynamic(
  () => import('@/components/fleet-tracker/FleetMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#0a0f1a]">
        <div className="text-[#8899aa] text-sm">Loading fleet tracker...</div>
      </div>
    ),
  }
);

export default function FleetMapLoader() {
  return <FleetMap />;
}
