'use client';

import { useMemo } from 'react';
import FavoriteButton from '@/components/auth/FavoriteButton';
import WatchTripButton from '@/components/auth/WatchTripButton';
import type { ScheduledTrip } from '@/lib/trips/types';

// Matches the shape returned by /api/catch-reports (from tuna976 scraper)
interface CatchReport {
  boat: string;
  date: string;
  species: string;
  count: number;
  anglers: number;
  tripType: string;
  also?: { species: string; count: number }[];
  [key: string]: unknown;  // allow extra fields from scraper
}

interface BoatCardProps {
  boatName: string;
  mmsi: number;
  landing: string;
  vesselType?: string;
  reports: CatchReport[];
  trips: ScheduledTrip[];
}

export default function BoatCard({ boatName, mmsi, landing, vesselType, reports, trips }: BoatCardProps) {
  const landingLabel: Record<string, string> = {
    seaforth: 'Seaforth Landing',
    fishermans: "Fisherman's Landing",
    hm_landing: 'H&M Landing',
    point_loma: 'Point Loma Sportfishing',
    helgrens: "Helgren's Sportfishing",
  };

  const recentReports = useMemo(() => reports.slice(0, 3), [reports]);
  const upcomingTrips = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return trips
      .filter(t => t.departureDate >= today)
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .slice(0, 3);
  }, [trips]);

  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}>
      {/* Header */}
      <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid #1e2a42' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#e2e8f0]">{boatName}</span>
            <FavoriteButton mmsi={mmsi} size={16} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8899aa' }}>
            {landingLabel[landing] || landing}{vesselType ? ` \u00b7 ${vesselType}` : ''}
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Latest Reports */}
        <div className="p-4" style={{ borderRight: '1px solid #1e2a42' }}>
          <div className="text-[10px] uppercase font-semibold tracking-wide mb-3" style={{ color: '#556677' }}>
            Latest Reports
          </div>
          {recentReports.length === 0 ? (
            <div className="text-xs" style={{ color: '#556677' }}>No recent reports</div>
          ) : (
            recentReports.map((r, i) => (
              <div key={i} className="mb-3">
                <div className="text-[10px]" style={{ color: '#8899aa' }}>{r.date}</div>
                <div className="text-sm font-medium" style={{ color: '#22c55e' }}>
                  {r.count} {r.species}
                </div>
                {r.also && r.also.length > 0 && (
                  <div className="text-xs text-[#e2e8f0]">
                    {r.also.map(a => `${a.count} ${a.species}`).join(' \u00b7 ')}
                  </div>
                )}
                <div className="text-[11px]" style={{ color: '#556677' }}>{r.anglers} anglers</div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Trips */}
        <div className="p-4">
          <div className="text-[10px] uppercase font-semibold tracking-wide mb-3" style={{ color: '#556677' }}>
            Upcoming Trips
          </div>
          {upcomingTrips.length === 0 ? (
            <div className="text-xs" style={{ color: '#556677' }}>No upcoming trips</div>
          ) : (
            upcomingTrips.map((t) => (
              <div key={t.id} className="mb-2.5 p-2 rounded-md" style={{ backgroundColor: '#0a0f1a' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#e2e8f0]">
                    {new Date(t.departureDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#00d4ff' }}>${t.pricePerPerson}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#8899aa' }}>{t.duration} \u00b7 {t.departureTime}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px]" style={{ color: t.spotsLeft <= 5 ? '#f97316' : '#e2e8f0' }}>
                    {t.spotsLeft} spots left
                  </span>
                  <WatchTripButton tripId={t.id} boatName={t.boatName} tripDate={t.departureDate} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
