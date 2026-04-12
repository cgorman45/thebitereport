CREATE TABLE IF NOT EXISTS vessel_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi INTEGER NOT NULL,
  boat_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading REAL,
  cog REAL,
  timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vessel_traj_mmsi_time ON vessel_trajectories(mmsi, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vessel_traj_time ON vessel_trajectories(timestamp DESC);
