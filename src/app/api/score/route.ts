import { NextRequest, NextResponse } from 'next/server';
import { getLocationBySlug } from '@/lib/locations';
import { computeDailyScore } from '@/lib/scoring';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationSlug = searchParams.get('location');
  const date = searchParams.get('date') || undefined;

  if (!locationSlug) {
    return NextResponse.json(
      { error: 'location parameter is required' },
      { status: 400 }
    );
  }

  const location = getLocationBySlug(locationSlug);
  if (!location) {
    return NextResponse.json(
      { error: `Location "${locationSlug}" not found` },
      { status: 404 }
    );
  }

  try {
    const score = await computeDailyScore(location, date);
    return NextResponse.json(score);
  } catch (error) {
    console.error('Score computation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute fishing score' },
      { status: 500 }
    );
  }
}
