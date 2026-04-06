"""Run OpenDrift particle simulation for kelp paddy drift prediction."""
import logging
import tempfile
from pathlib import Path
import numpy as np
from datetime import datetime, timedelta

log = logging.getLogger('drift-prediction')

# Grid parameters for probability density
GRID_RESOLUTION = 0.05  # degrees
BBOX = {
    'lat_min': 32.0, 'lat_max': 35.0,
    'lng_min': -121.0, 'lng_max': -117.0,
}


def run_drift_simulation(
    seed_points: list[dict],
    current_field: dict,
    forecast_hours: int = 48,
) -> dict:
    """
    Run OpenDrift simulation seeding particles at kelp forest edges.

    Returns:
        dict with { lat: [], lng: [], values: [][] } probability grid
    """
    try:
        from opendrift.models.oceandrift import OceanDrift
    except ImportError:
        log.warning('OpenDrift not installed — generating mock drift from current field')
        return _simple_advection(seed_points, current_field, forecast_hours)

    log.info(f'Running OpenDrift simulation: {len(seed_points)} seeds, {forecast_hours}h forecast')

    o = OceanDrift(loglevel=30)  # WARNING level to reduce noise

    # Write current field to temporary netCDF for OpenDrift
    with tempfile.TemporaryDirectory() as tmp:
        nc_path = _write_current_nc(current_field, Path(tmp))

        o.add_readers_from_file(str(nc_path))

        # Seed particles
        lats = [p['lat'] for p in seed_points]
        lngs = [p['lng'] for p in seed_points]

        o.seed_elements(
            lon=lngs,
            lat=lats,
            time=datetime.utcnow(),
            number=len(seed_points),
        )

        # Run simulation
        o.run(
            duration=timedelta(hours=forecast_hours),
            time_step=3600,  # 1 hour
            time_step_output=3600,
        )

        # Get final particle positions
        final_lons = o.elements.lon
        final_lats = o.elements.lat

    return _bin_to_grid(final_lats, final_lons)


def _simple_advection(
    seed_points: list[dict],
    current_field: dict,
    forecast_hours: int,
) -> dict:
    """
    Simple particle advection fallback when OpenDrift is not available.
    Uses bilinear interpolation of the current field.
    """
    from scipy.interpolate import RegularGridInterpolator

    lat = current_field['lat']
    lon = current_field['lon']
    u = current_field['u']
    v = current_field['v']

    # Create interpolators
    u_interp = RegularGridInterpolator((lat, lon), u, bounds_error=False, fill_value=0.0)
    v_interp = RegularGridInterpolator((lat, lon), v, bounds_error=False, fill_value=0.0)

    # Advect particles
    dt = 3600  # 1 hour in seconds
    steps = forecast_hours

    # m/s to degrees/s (approximate)
    m_per_deg_lat = 111320
    m_per_deg_lon = 111320 * np.cos(np.radians(33.5))  # mid-latitude

    positions = np.array([[p['lat'], p['lng']] for p in seed_points])

    for _ in range(steps):
        u_vals = u_interp(positions)
        v_vals = v_interp(positions)

        # Convert m/s to deg/s and advect
        positions[:, 1] += u_vals * dt / m_per_deg_lon  # longitude
        positions[:, 0] += v_vals * dt / m_per_deg_lat  # latitude

    return _bin_to_grid(positions[:, 0], positions[:, 1])


def _bin_to_grid(lats: np.ndarray, lons: np.ndarray) -> dict:
    """Bin particle endpoints into a probability density grid."""
    lat_bins = np.arange(BBOX['lat_min'], BBOX['lat_max'] + GRID_RESOLUTION, GRID_RESOLUTION)
    lon_bins = np.arange(BBOX['lng_min'], BBOX['lng_max'] + GRID_RESOLUTION, GRID_RESOLUTION)

    density, _, _ = np.histogram2d(
        lats, lons,
        bins=[lat_bins, lon_bins],
    )

    # Normalize to 0-1 probability
    max_val = density.max()
    if max_val > 0:
        density = density / max_val

    # Convert to serializable format
    lat_centers = ((lat_bins[:-1] + lat_bins[1:]) / 2).tolist()
    lon_centers = ((lon_bins[:-1] + lon_bins[1:]) / 2).tolist()

    return {
        'lat': lat_centers,
        'lng': lon_centers,
        'values': density.tolist(),
    }


def _write_current_nc(current_field: dict, work_dir: Path) -> Path:
    """Write current field to a NetCDF file for OpenDrift."""
    import xarray as xr

    ds = xr.Dataset(
        {
            'x_sea_water_velocity': (['lat', 'lon'], current_field['u']),
            'y_sea_water_velocity': (['lat', 'lon'], current_field['v']),
        },
        coords={
            'lat': current_field['lat'],
            'lon': current_field['lon'],
            'time': [np.datetime64('now')],
        },
    )

    nc_path = work_dir / 'currents.nc'
    ds.to_netcdf(nc_path)
    return nc_path
