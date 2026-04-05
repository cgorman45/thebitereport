// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';
import { AVATAR_KEYS } from '@/lib/avatars';

export const dynamic = 'force-dynamic';

const ALERT_KEYS = ['bluefin_spotted', 'spots_opening', 'ideal_weather', 'new_reports'];

// GET /api/profile
export async function GET(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const { data, error: dbError } = await supabase!
    .from('profiles')
    .select('display_name, avatar_key, phone, notification_prefs, created_at')
    .eq('id', user!.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({
    displayName: data.display_name,
    email: user!.email,
    avatarKey: data.avatar_key ?? 'captain',
    phone: data.phone,
    notificationPrefs: data.notification_prefs ?? {
      bluefin_spotted: { email: false, sms: false },
      spots_opening: { email: false, sms: false },
      ideal_weather: { email: false, sms: false },
      new_reports: { email: false, sms: false },
    },
    createdAt: data.created_at,
  });
}

// PATCH /api/profile
export async function PATCH(req: NextRequest) {
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Validate and collect displayName
  if ('displayName' in body) {
    if (typeof body.displayName !== 'string' || body.displayName.length < 1 || body.displayName.length > 50) {
      return NextResponse.json({ error: 'displayName must be 1-50 characters' }, { status: 400 });
    }
    updates.display_name = body.displayName;
  }

  // Validate and collect avatarKey
  if ('avatarKey' in body) {
    if (!AVATAR_KEYS.has(body.avatarKey)) {
      return NextResponse.json({ error: 'avatarKey must be in the avatar registry' }, { status: 400 });
    }
    updates.avatar_key = body.avatarKey;
  }

  // Validate and collect phone
  if ('phone' in body) {
    if (body.phone !== null && (typeof body.phone !== 'string' || !/^\d{10}$/.test(body.phone))) {
      return NextResponse.json({ error: 'phone must be exactly 10 digits or null' }, { status: 400 });
    }
    updates.phone = body.phone;
  }

  // Validate and collect notificationPrefs (full replace)
  if ('notificationPrefs' in body) {
    const prefs = body.notificationPrefs;
    if (typeof prefs !== 'object' || prefs === null) {
      return NextResponse.json({ error: 'notificationPrefs must be an object' }, { status: 400 });
    }
    for (const key of ALERT_KEYS) {
      if (!(key in prefs) || typeof prefs[key]?.email !== 'boolean' || typeof prefs[key]?.sms !== 'boolean') {
        return NextResponse.json({ error: `notificationPrefs.${key} must have boolean email and sms fields` }, { status: 400 });
      }
    }
    updates.notification_prefs = prefs;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error: dbError } = await supabase!
    .from('profiles')
    .update(updates)
    .eq('id', user!.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
