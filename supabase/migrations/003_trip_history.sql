-- 003_trip_history.sql
-- Creates tables for AIS position history and trip tracking.
-- Positions are recorded by the AIS collector; trips are detected
-- automatically when a boat departs from / returns to its home port.

-- ============================================================
-- TRIPS — one row per departure-to-return cycle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi integer NOT NULL,
  boat_name text NOT NULL,
  landing text NOT NULL,           -- home port key (seaforth, fishermans, etc.)
  started_at timestamptz NOT NULL,
  ended_at timestamptz,            -- NULL while boat is still out
  point_count integer DEFAULT 0,   -- running tally of positions recorded
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_mmsi_started
  ON public.trips (mmsi, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_active
  ON public.trips (mmsi) WHERE ended_at IS NULL;

-- ============================================================
-- POSITIONS — raw AIS breadcrumbs, one row per position report
-- ============================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mmsi integer NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed real NOT NULL,             -- SOG in knots
  heading real NOT NULL,           -- COG in degrees
  recorded_at timestamptz NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_positions_trip
  ON public.positions (trip_id, recorded_at ASC);

CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time
  ON public.positions (mmsi, recorded_at DESC);

-- ============================================================
-- CLEANUP FUNCTION — delete positions & trips older than 7 days
-- Called by cron endpoint: /api/cron/cleanup-positions
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_positions()
RETURNS jsonb AS $$
DECLARE
  pos_deleted integer;
  trips_deleted integer;
BEGIN
  -- Delete old positions
  DELETE FROM public.positions
  WHERE recorded_at < now() - interval '7 days';
  GET DIAGNOSTICS pos_deleted = ROW_COUNT;

  -- Delete trips that have no remaining positions and ended > 7 days ago
  DELETE FROM public.trips
  WHERE ended_at IS NOT NULL
    AND ended_at < now() - interval '7 days';
  GET DIAGNOSTICS trips_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'positions_deleted', pos_deleted,
    'trips_deleted', trips_deleted,
    'cleaned_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER: Atomic increment for trip point_count
-- Called from the AIS collector after batch-inserting positions.
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_trip_points(
  trip_uuid uuid,
  amount integer
)
RETURNS void AS $$
BEGIN
  UPDATE public.trips
  SET point_count = point_count + amount
  WHERE id = trip_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No RLS on these tables — they're written by the collector (service role)
-- and read by the API (service role). No user-specific data.
