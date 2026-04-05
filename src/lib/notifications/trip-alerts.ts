import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendTripAlert } from './email';
import { TRIP_SCHEDULE } from '@/lib/trips/schedule';

// Minimal trip shape needed for alert processing — works with both
// ScheduledTrip (static schedule) and scraped trip data (different duration type).
interface AlertTrip {
  id: string;
  boatName: string;
  duration: string;
  spotsLeft: number;
}

export async function processTripWatchAlerts(liveTrips: AlertTrip[]) {
  const today = new Date().toISOString().split('T')[0];

  // All available trips (static + scraped)
  const allTrips = [...TRIP_SCHEDULE, ...liveTrips];
  const tripMap = new Map(allTrips.map(t => [t.id, t]));

  // Get all active watches with user emails
  const { data: watches, error } = await getSupabaseAdmin()
    .from('trip_watches')
    .select('*, profiles!inner(id)')
    .gte('trip_date', today);

  if (error || !watches?.length) return { processed: 0, alerts: 0 };

  let alertsSent = 0;

  for (const watch of watches) {
    const trip = tripMap.get(watch.trip_id);
    if (!trip) continue;

    const spotsLeft = trip.spotsLeft;
    const prevSpots = watch.last_known_spots;

    // Update last_known_spots
    await getSupabaseAdmin()
      .from('trip_watches')
      .update({ last_known_spots: spotsLeft })
      .eq('id', watch.id);

    // Get user email
    const { data: userData } = await getSupabaseAdmin().auth.admin.getUserById(watch.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    // Selling out alert: spots <= 5, not yet notified
    if (spotsLeft <= 5 && spotsLeft > 0 && !watch.notified_selling_out_at) {
      try {
        await sendTripAlert({
          to: email,
          boatName: watch.boat_name,
          tripDate: watch.trip_date,
          duration: trip.duration,
          spotsLeft,
          type: 'selling_out',
        });
        await getSupabaseAdmin()
          .from('trip_watches')
          .update({ notified_selling_out_at: new Date().toISOString() })
          .eq('id', watch.id);
        alertsSent++;
      } catch {
        // Log but don't fail the whole batch
        console.error(`Failed to send selling-out alert for watch ${watch.id}`);
      }
    }

    // Spots opened alert: was 0, now > 0, not yet notified
    if (prevSpots === 0 && spotsLeft > 0 && !watch.notified_spots_opened_at) {
      try {
        await sendTripAlert({
          to: email,
          boatName: watch.boat_name,
          tripDate: watch.trip_date,
          duration: trip.duration,
          spotsLeft,
          type: 'spots_opened',
        });
        await getSupabaseAdmin()
          .from('trip_watches')
          .update({ notified_spots_opened_at: new Date().toISOString() })
          .eq('id', watch.id);
        alertsSent++;
      } catch {
        console.error(`Failed to send spots-opened alert for watch ${watch.id}`);
      }
    }
  }

  // Cleanup: remove watches for past trips
  await getSupabaseAdmin()
    .from('trip_watches')
    .delete()
    .lt('trip_date', today);

  return { processed: watches.length, alerts: alertsSent };
}
