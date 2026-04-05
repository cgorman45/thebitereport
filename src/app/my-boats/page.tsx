'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import Header from '@/components/Header';
import BoatCard from '@/components/my-boats/BoatCard';
import { FLEET_ROSTER } from '@/lib/fleet/boats';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
import type { ScheduledTrip } from '@/lib/trips/types';
import Link from 'next/link';

export default function MyBoatsPage() {
  const { user, loading, favorites, openAuthModal } = useAuth();
  const router = useRouter();
  const [liveTrips, setLiveTrips] = useState<ScheduledTrip[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [catchReports, setCatchReports] = useState<Record<string, any[]>>({});

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      openAuthModal();
    }
  }, [loading, user, router, openAuthModal]);

  // Fetch live trips
  useEffect(() => {
    fetch('/api/trips')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLiveTrips(data); })
      .catch(() => {});
  }, []);

  // Fetch catch reports
  useEffect(() => {
    fetch('/api/catch-reports')
      .then(r => r.json())
      .then((data: { boat: string }[]) => {
        if (!Array.isArray(data)) return;
        const grouped: Record<string, unknown[]> = {};
        for (const report of data) {
          const key = report.boat.toLowerCase();
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(report);
        }
        setCatchReports(grouped);
      })
      .catch(() => {});
  }, []);

  // Build boat data for favorites
  const favBoats = useMemo(() => {
    return FLEET_ROSTER
      .filter(b => favorites.has(b.mmsi))
      .map(b => {
        const allTrips = [...TRIP_SCHEDULE, ...liveTrips];
        const boatTrips = allTrips.filter(t =>
          t.boatName.toLowerCase() === b.name.toLowerCase()
        );
        const boatReports = catchReports[b.name.toLowerCase()] || [];
        return { ...b, trips: boatTrips, reports: boatReports };
      });
  }, [favorites, liveTrips, catchReports]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm" style={{ color: '#8899aa' }}>Loading...</div>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div style={{ background: 'linear-gradient(180deg, #131b2e 0%, #0a0f1a 100%)' }} className="px-6 pt-8 pb-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#f0c040', fontSize: 20 }}>&#9733;</span>
              <h1 className="text-2xl font-extrabold text-[#e2e8f0]">My Boats</h1>
            </div>
            <p className="text-sm" style={{ color: '#8899aa' }}>
              Tracking {favorites.size} boat{favorites.size !== 1 ? 's' : ''} across San Diego landings
            </p>
          </div>
        </div>

        {/* Boat Cards */}
        <div className="max-w-3xl mx-auto px-6 pb-8">
          {favBoats.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-lg font-semibold text-[#e2e8f0] mb-2">No boats followed yet</div>
              <p className="text-sm mb-4" style={{ color: '#8899aa' }}>
                Follow boats to see their latest reports and upcoming trips here.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/plan-your-trip" className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#00d4ff', color: '#0a0f1a' }}>
                  Plan a Trip
                </Link>
                <Link href="/fleet-tracker" className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1e2a42', color: '#e2e8f0', border: '1px solid #1e2a42' }}>
                  Fleet Map
                </Link>
              </div>
            </div>
          ) : (
            <>
              {favBoats.map(b => (
                <BoatCard
                  key={b.mmsi}
                  boatName={b.name}
                  mmsi={b.mmsi}
                  landing={b.landing}
                  vesselType={b.vesselType}
                  reports={b.reports}
                  trips={b.trips}
                />
              ))}
              <div className="text-center text-sm mt-4" style={{ color: '#556677' }}>
                Follow more boats from{' '}
                <Link href="/plan-your-trip" style={{ color: '#00d4ff' }}>Plan Trip</Link>
                {' '}or{' '}
                <Link href="/fleet-tracker" style={{ color: '#00d4ff' }}>Fleet Map</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
