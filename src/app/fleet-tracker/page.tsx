import type { Metadata } from 'next';
import Header from '@/components/Header';
import FleetMapLoader from '@/components/fleet-tracker/FleetMapLoader';

export const metadata: Metadata = {
  title: 'Fleet Tracker | The Bite Report',
  description:
    'Live tracking of San Diego sportfishing fleet. See which boats are catching fish right now with real-time AIS data from Seaforth Landing and Fisherman\'s Landing.',
};

export default function FleetTrackerPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Header />
      <FleetMapLoader />
    </div>
  );
}
