import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/fish-reports/nearby?lat=X&lng=Y&radius=5 — public, proximity alert feed
// radius is in nautical miles (default 5)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const radius = parseFloat(searchParams.get('radius') ?? '5');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng query params are required' }, { status: 400 });
  }

  if (isNaN(radius) || radius <= 0) {
    return NextResponse.json({ error: 'radius must be a positive number' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Haversine distance filter in nautical miles (3440.065 nm = Earth radius in nm)
  const { data, error } = await supabase.rpc('fish_reports_nearby', {
    p_lat: lat,
    p_lng: lng,
    p_radius_nm: radius,
  });

  // Fall back to fetching all active reports and filtering in JS if RPC not available
  if (error) {
    const { data: allReports, error: fetchError } = await supabase
      .from('fish_reports')
      .select(`
        id, user_id, lat, lng, species, quantity, bait, technique, description, photo_url,
        verification_count, status, created_at, expires_at,
        profiles!user_id ( display_name, avatar_key )
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // Compute haversine distance in JS and filter
    const filtered = (allReports ?? [])
      .map((r: Record<string, unknown>) => {
        const dLat = ((r.lat as number) - lat) * (Math.PI / 180);
        const dLng = ((r.lng as number) - lng) * (Math.PI / 180);
        const a =
          Math.pow(Math.sin(dLat / 2), 2) +
          Math.cos(lat * (Math.PI / 180)) *
            Math.cos((r.lat as number) * (Math.PI / 180)) *
            Math.pow(Math.sin(dLng / 2), 2);
        const distanceNm = 3440.065 * 2 * Math.asin(Math.sqrt(a));
        return { ...r, distance_nm: distanceNm };
      })
      .filter((r) => r.distance_nm <= radius)
      .sort((a, b) => a.distance_nm - b.distance_nm)
      .slice(0, 50);

    return NextResponse.json(filtered);
  }

  return NextResponse.json(data ?? []);
}
