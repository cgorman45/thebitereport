CREATE TABLE public.kelp_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id text NOT NULL,
  detected_at timestamptz NOT NULL,
  processed_at timestamptz DEFAULT now(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  area_m2 double precision NOT NULL,
  confidence double precision NOT NULL,
  method text NOT NULL DEFAULT 'threshold',
  polygon jsonb NOT NULL,
  indices jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kelp_detections_location ON kelp_detections (lat, lng);
CREATE INDEX idx_kelp_detections_time ON kelp_detections (detected_at DESC);

CREATE OR REPLACE FUNCTION cleanup_old_kelp_detections()
RETURNS void AS $$
  DELETE FROM kelp_detections WHERE detected_at < now() - interval '30 days';
$$ LANGUAGE sql;
