-- Track boat stops in open ocean for kelp paddy ground truth collection
CREATE TABLE IF NOT EXISTS public.boat_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi integer NOT NULL,
  boat_name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed double precision NOT NULL DEFAULT 0,
  stopped_at timestamptz NOT NULL,
  duration_minutes integer,
  -- Validation: confirmed when 2+ boats stop within 1km within 24h
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirming_mmsi integer,
  confirming_boat text,
  -- Satellite imagery request
  satellite_requested boolean NOT NULL DEFAULT false,
  satellite_scene_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boat_stops_location ON boat_stops (lat, lng);
CREATE INDEX IF NOT EXISTS idx_boat_stops_time ON boat_stops (stopped_at DESC);
CREATE INDEX IF NOT EXISTS idx_boat_stops_confirmed ON boat_stops (confirmed) WHERE confirmed = true;
