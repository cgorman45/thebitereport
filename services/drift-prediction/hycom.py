"""Fetch HYCOM ocean surface currents via OPeNDAP."""
import logging
import xarray as xr
import numpy as np

log = logging.getLogger('drift-prediction')

HYCOM_URL = 'https://tds.hycom.org/thredds/dodsC/GLBy0.08/expt_93.0'

BBOX = {
    'lat_min': 32.0,
    'lat_max': 35.0,
    'lng_min': -121.0,
    'lng_max': -117.0,
}


def fetch_surface_currents() -> xr.Dataset:
    """
    Fetch latest HYCOM surface currents (u, v) for SoCal.
    Returns xarray Dataset with water_u, water_v variables.
    """
    log.info(f'Fetching HYCOM surface currents for SoCal...')

    ds = xr.open_dataset(HYCOM_URL, engine='netcdf4')

    # Select latest time, surface depth, SoCal region
    subset = ds.sel(
        depth=0.0,
        lat=slice(BBOX['lat_min'], BBOX['lat_max']),
        lon=slice(BBOX['lng_min'] + 360, BBOX['lng_max'] + 360),  # HYCOM uses 0-360 longitude
        time=ds.time[-1],
    )

    # Load into memory
    subset = subset.load()

    # Convert longitude back to -180 to 180
    subset = subset.assign_coords(lon=subset.lon - 360)

    log.info(f'HYCOM data: {subset.dims}, time={str(subset.time.values)[:19]}')

    ds.close()
    return subset


def get_current_field(ds: xr.Dataset) -> dict:
    """Extract u/v arrays and coordinates from HYCOM dataset."""
    lat = ds.lat.values.astype(float)
    lon = ds.lon.values.astype(float)
    u = ds.water_u.values.astype(float)
    v = ds.water_v.values.astype(float)

    # Replace NaN (land) with 0
    u = np.nan_to_num(u, nan=0.0)
    v = np.nan_to_num(v, nan=0.0)

    return {
        'lat': lat,
        'lon': lon,
        'u': u,  # eastward velocity (m/s)
        'v': v,  # northward velocity (m/s)
    }
