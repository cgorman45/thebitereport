-- Confirmed kelp paddies with drift tracking
-- Created when an admin confirms a boat-stop signal as a real kelp paddy
CREATE TABLE IF NOT EXISTS public.kelp_paddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Origin: which boat stop signal triggered this
  source_boat_stop_id uuid REFERENCES public.boat_stops(id),
  -- Current known position
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  -- Initial detection
  first_detected_at timestamptz NOT NULL,
  confirmed_at timestamptz DEFAULT now(),
  confirmed_by text, -- admin user or 'auto'
  -- Status
  status text NOT NULL DEFAULT 'active', -- active, drifting, dispersed, lost
  -- Drift tracking
  drift_path jsonb DEFAULT '[]', -- array of {lat, lng, timestamp, source}
  predicted_path jsonb DEFAULT '[]', -- array of {lat, lng, timestamp} from HYCOM
  last_position_update timestamptz DEFAULT now(),
  -- Satellite imagery tracking
  satellite_images jsonb DEFAULT '[]', -- array of {scene_id, order_id, acquired, status, url}
  next_satellite_request_at timestamptz, -- when to request next 24h image
  -- Metadata
  estimated_area_m2 double precision,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kelp_paddies_status ON kelp_paddies (status);
CREATE INDEX IF NOT EXISTS idx_kelp_paddies_location ON kelp_paddies (lat, lng);
CREATE INDEX IF NOT EXISTS idx_kelp_paddies_active ON kelp_paddies (status) WHERE status = 'active';
