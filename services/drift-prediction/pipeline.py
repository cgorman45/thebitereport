"""Drift prediction pipeline orchestrator."""
import logging
from hycom import fetch_surface_currents, get_current_field
from kelpwatch import load_kelp_forests
from drift_sim import run_drift_simulation
from vectors import generate_vectors
from db import write_drift_prediction, write_current_vectors

log = logging.getLogger('drift-prediction')

# Full SoCal + Baja California coverage (down to Cabo San Lucas)
BBOX = {
    'lat_min': 22.0, 'lat_max': 35.0,
    'lng_min': -121.0, 'lng_max': -109.0,
}


def run_pipeline() -> dict:
    """
    Run the full drift prediction pipeline:
    1. Fetch HYCOM surface currents
    2. Load kelp forest seed points
    3. Run drift simulation
    4. Generate current vectors
    5. Write results to Supabase
    """
    # 1. Fetch ocean currents
    log.info('Fetching HYCOM surface currents...')
    hycom_ds = fetch_surface_currents()
    current_field = get_current_field(hycom_ds)
    log.info(f'Current field: {current_field["u"].shape} grid')

    # 2. Load kelp forest seed points
    seed_points = load_kelp_forests()
    log.info(f'Loaded {len(seed_points)} drift seed points')

    # 3. Run drift simulation
    log.info('Running 48-hour drift simulation...')
    grid_data = run_drift_simulation(seed_points, current_field, forecast_hours=48)
    log.info(f'Drift grid: {len(grid_data["lat"])}x{len(grid_data["lng"])} cells')

    # 4. Generate current vectors for map
    log.info('Generating current vectors...')
    vectors_geojson = generate_vectors(current_field)
    log.info(f'Generated {len(vectors_geojson["features"])} vectors')

    # 5. Write to Supabase
    write_drift_prediction(grid_data, BBOX)
    write_current_vectors(vectors_geojson)

    return {
        'seed_points': len(seed_points),
        'grid_cells': len(grid_data['lat']) * len(grid_data['lng']),
        'vectors': len(vectors_geojson['features']),
    }
