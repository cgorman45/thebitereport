-- Community kelp paddy sightings ("Waze for Kelp")

CREATE TABLE public.kelp_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  verification_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '48 hours')
);

CREATE TABLE public.sighting_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id uuid NOT NULL REFERENCES public.kelp_sightings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.sighting_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id uuid NOT NULL REFERENCES public.kelp_sightings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sighting_id, user_id)
);

CREATE TABLE public.user_contributions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sightings_count integer NOT NULL DEFAULT 0,
  verifications_count integer NOT NULL DEFAULT 0,
  photos_count integer NOT NULL DEFAULT 0,
  contribution_score integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kelp_sightings_location ON kelp_sightings (lat, lng);
CREATE INDEX idx_kelp_sightings_status ON kelp_sightings (status, created_at DESC);
CREATE INDEX idx_kelp_sightings_user ON kelp_sightings (user_id);
CREATE INDEX idx_sighting_photos_sighting ON sighting_photos (sighting_id);
CREATE INDEX idx_sighting_verifications_sighting ON sighting_verifications (sighting_id);

-- RLS
ALTER TABLE kelp_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contributions ENABLE ROW LEVEL SECURITY;

-- Sightings: anyone can read, owner can insert
CREATE POLICY "sightings_select" ON kelp_sightings FOR SELECT USING (true);
CREATE POLICY "sightings_insert" ON kelp_sightings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sightings_update" ON kelp_sightings FOR UPDATE USING (auth.uid() = user_id);

-- Photos: anyone can read, owner can insert
CREATE POLICY "photos_select" ON sighting_photos FOR SELECT USING (true);
CREATE POLICY "photos_insert" ON sighting_photos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verifications: anyone can read, authenticated users can insert their own
CREATE POLICY "verifications_select" ON sighting_verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON sighting_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verifications_delete" ON sighting_verifications FOR DELETE USING (auth.uid() = user_id);

-- Contributions: owner only
CREATE POLICY "contributions_select" ON user_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contributions_all" ON user_contributions FOR ALL USING (auth.uid() = user_id);

-- Auto-expire sightings older than 48 hours
CREATE OR REPLACE FUNCTION expire_old_sightings()
RETURNS void AS $$
  UPDATE kelp_sightings SET status = 'expired'
  WHERE status != 'expired' AND expires_at < now();
$$ LANGUAGE sql;

-- Auto-verify sightings with 3+ verifications
CREATE OR REPLACE FUNCTION auto_verify_sighting()
RETURNS trigger AS $$
BEGIN
  UPDATE kelp_sightings
  SET verification_count = (
    SELECT count(*) FROM sighting_verifications WHERE sighting_id = NEW.sighting_id
  ),
  status = CASE
    WHEN (SELECT count(*) FROM sighting_verifications WHERE sighting_id = NEW.sighting_id) >= 3
    THEN 'verified'
    ELSE status
  END
  WHERE id = NEW.sighting_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_verify
  AFTER INSERT ON sighting_verifications
  FOR EACH ROW EXECUTE FUNCTION auto_verify_sighting();

-- Auto-create user_contributions row on first sighting
CREATE OR REPLACE FUNCTION ensure_user_contributions()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_contributions (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_contributions
  BEFORE INSERT ON kelp_sightings
  FOR EACH ROW EXECUTE FUNCTION ensure_user_contributions();
