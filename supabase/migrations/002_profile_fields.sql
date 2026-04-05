-- 002_profile_fields.sql
-- Add avatar, phone, and notification preferences to profiles table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_key text DEFAULT 'captain',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{
    "bluefin_spotted": {"email": false, "sms": false},
    "spots_opening": {"email": false, "sms": false},
    "ideal_weather": {"email": false, "sms": false},
    "new_reports": {"email": false, "sms": false}
  }'::jsonb;
