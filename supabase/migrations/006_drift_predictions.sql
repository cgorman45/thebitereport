CREATE TABLE public.drift_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_min double precision NOT NULL,
  lat_max double precision NOT NULL,
  lng_min double precision NOT NULL,
  lng_max double precision NOT NULL,
  grid_data jsonb NOT NULL,
  forecast_hours integer NOT NULL DEFAULT 48,
  computed_at timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL
);

CREATE TABLE public.current_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vectors jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL
);

CREATE INDEX idx_drift_predictions_time ON drift_predictions (computed_at DESC);
CREATE INDEX idx_current_vectors_time ON current_vectors (computed_at DESC);
