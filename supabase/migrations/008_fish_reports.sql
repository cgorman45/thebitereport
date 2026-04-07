-- Live fish activity reports ("Waze for Fishing")

CREATE TABLE public.fish_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  species text NOT NULL,
  quantity text NOT NULL DEFAULT 'some' CHECK (quantity IN ('few', 'some', 'lots', 'wide-open')),
  bait text,
  technique text,
  description text,
  photo_url text,
  verification_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'verified', 'expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '6 hours')
);

CREATE TABLE public.fish_report_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.fish_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Indexes
CREATE INDEX idx_fish_reports_location ON fish_reports (lat, lng);
CREATE INDEX idx_fish_reports_status ON fish_reports (status, created_at DESC);
CREATE INDEX idx_fish_reports_species ON fish_reports (species);
CREATE INDEX idx_fish_report_verifications_report ON fish_report_verifications (report_id);

-- RLS
ALTER TABLE fish_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_report_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fish_reports_select" ON fish_reports FOR SELECT USING (true);
CREATE POLICY "fish_reports_insert" ON fish_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fish_reports_update" ON fish_reports FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "fish_verifications_select" ON fish_report_verifications FOR SELECT USING (true);
CREATE POLICY "fish_verifications_insert" ON fish_report_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fish_verifications_delete" ON fish_report_verifications FOR DELETE USING (auth.uid() = user_id);

-- Auto-expire old reports
CREATE OR REPLACE FUNCTION expire_old_fish_reports()
RETURNS void AS $$
  UPDATE fish_reports SET status = 'expired'
  WHERE status != 'expired' AND expires_at < now();
$$ LANGUAGE sql;

-- Auto-verify with 3+ verifications
CREATE OR REPLACE FUNCTION auto_verify_fish_report()
RETURNS trigger AS $$
BEGIN
  UPDATE fish_reports
  SET verification_count = (
    SELECT count(*) FROM fish_report_verifications WHERE report_id = NEW.report_id
  ),
  status = CASE
    WHEN (SELECT count(*) FROM fish_report_verifications WHERE report_id = NEW.report_id) >= 3
    THEN 'verified'
    ELSE status
  END
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_verify_fish_report
  AFTER INSERT ON fish_report_verifications
  FOR EACH ROW EXECUTE FUNCTION auto_verify_fish_report();

-- Update user contributions when reporting fish
CREATE OR REPLACE FUNCTION fish_report_contribution()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_contributions (user_id, sightings_count, contribution_score)
  VALUES (NEW.user_id, 1, 5)
  ON CONFLICT (user_id) DO UPDATE SET
    sightings_count = user_contributions.sightings_count + 1,
    contribution_score = user_contributions.contribution_score + 5,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fish_report_contribution
  AFTER INSERT ON fish_reports
  FOR EACH ROW EXECUTE FUNCTION fish_report_contribution();
