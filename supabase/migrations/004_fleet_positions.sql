-- 004_fleet_positions.sql
-- Real-time fleet position table.  The AIS collector upserts the latest
-- position for each tracked vessel here; the /api/fleet/positions route
-- reads from it directly — no HTTP proxy or file-based handoff needed.

CREATE TABLE IF NOT EXISTS public.fleet_positions (
  mmsi       integer PRIMARY KEY,
  name       text NOT NULL,
  landing    text NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  speed      real NOT NULL DEFAULT 0,     -- SOG in knots
  heading    real NOT NULL DEFAULT 0,     -- true heading or COG
  course     real NOT NULL DEFAULT 0,     -- COG in degrees
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for stale-position pruning
CREATE INDEX IF NOT EXISTS idx_fleet_positions_updated
  ON public.fleet_positions (updated_at DESC);
