'use client';

import { useOptionalAuth } from './AuthProvider';

interface WatchTripButtonProps {
  tripId: string;
  boatName: string;
  tripDate: string;  // ISO date string
}

export default function WatchTripButton({ tripId, boatName, tripDate }: WatchTripButtonProps) {
  const auth = useOptionalAuth();
  const isWatched = auth?.tripWatches.has(tripId) ?? false;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        auth?.toggleTripWatch(tripId, boatName, tripDate);
      }}
      className="text-xs rounded px-2.5 py-1 transition-colors font-medium"
      style={isWatched ? {
        backgroundColor: '#00d4ff15',
        color: '#00d4ff',
        border: '1px solid #00d4ff33',
      } : {
        backgroundColor: '#1e2a4233',
        color: '#556677',
        border: '1px solid #1e2a42',
      }}
    >
      {isWatched ? 'Watching' : 'Watch Trip'}
    </button>
  );
}
