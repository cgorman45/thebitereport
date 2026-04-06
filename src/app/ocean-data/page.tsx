import type { Metadata } from 'next';
import Header from '@/components/Header';
import OceanDataMapLoader from '@/components/ocean-data/OceanDataMapLoader';

export const metadata: Metadata = {
  title: 'Ocean Data | The Bite Report',
  description:
    'Live sea surface temperature, chlorophyll concentration, and current break detection for Southern California offshore fishing.',
};

export default function OceanDataPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />
      <OceanDataMapLoader />
    </div>
  );
}
