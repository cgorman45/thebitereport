import { NextResponse } from 'next/server';

// TODO: Integrate with Twilio once API key is configured. For now, we collect signups.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory store for subscriptions until a database / Twilio is wired up.
const subscribers = new Set<string>();

interface SubscribePayload {
  phone: string;
  preferences: string[];
}

const VALID_PREFERENCES = new Set([
  'bluefin_spotted',
  'spots_opening',
  'ideal_weather',
  'new_reports',
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribePayload;

    const { phone, preferences } = body;

    // Validate phone — must be exactly 10 US digits
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please provide a 10-digit US number.' },
        { status: 400 },
      );
    }

    // Validate preferences
    if (!Array.isArray(preferences) || preferences.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one alert preference.' },
        { status: 400 },
      );
    }

    const invalidPrefs = preferences.filter((p) => !VALID_PREFERENCES.has(p));
    if (invalidPrefs.length > 0) {
      return NextResponse.json(
        { error: `Invalid preferences: ${invalidPrefs.join(', ')}` },
        { status: 400 },
      );
    }

    // Store subscription
    const key = `${phone}:${preferences.sort().join(',')}`;
    subscribers.add(key);

    console.log(
      `[api/alerts/subscribe] New subscription — phone: ***${phone.slice(-4)}, preferences: [${preferences.join(', ')}], total subscribers: ${subscribers.size}`,
    );

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/alerts/subscribe] Error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
