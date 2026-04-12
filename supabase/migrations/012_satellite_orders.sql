-- Satellite imagery orders tracking
CREATE TABLE IF NOT EXISTS satellite_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  tier TEXT NOT NULL,
  provider TEXT,
  scene_id TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'placed',
  resolution DOUBLE PRECISION,
  cloud_cover DOUBLE PRECISION,
  acquired_at TIMESTAMPTZ,
  image_url TEXT,
  thumbnail_b64 TEXT,
  ordered_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_satellite_orders_status ON satellite_orders(status);
CREATE INDEX IF NOT EXISTS idx_satellite_orders_tier ON satellite_orders(tier);
CREATE INDEX IF NOT EXISTS idx_satellite_orders_ordered_at ON satellite_orders(ordered_at DESC);
