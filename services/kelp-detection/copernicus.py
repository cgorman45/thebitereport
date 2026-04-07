"""Copernicus Data Space API client for Sentinel-2 imagery."""
import os
import logging
import tempfile
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

import requests
import rasterio
from rasterio.transform import Affine
import numpy as np

log = logging.getLogger('kelp-detection')

TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'
DOWNLOAD_URL = 'https://zipper.dataspace.copernicus.eu/odata/v1/Products'

# SoCal bounding box
BBOX = {
    'west': -121.0,
    'south': 32.0,
    'east': -117.0,
    'north': 35.0,
}

# Sentinel-2 bands we need
BANDS = {
    'B03': {'name': 'Green', 'resolution': 10},
    'B04': {'name': 'Red', 'resolution': 10},
    'B08': {'name': 'NIR', 'resolution': 10},
    'B11': {'name': 'SWIR', 'resolution': 20},
}


def get_access_token() -> str:
    """Get OAuth2 access token from Copernicus Data Space."""
    client_id = os.environ['COPERNICUS_CLIENT_ID']
    client_secret = os.environ['COPERNICUS_CLIENT_SECRET']

    resp = requests.post(TOKEN_URL, data={
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    })
    resp.raise_for_status()
    return resp.json()['access_token']


def search_scenes(since: str | None = None, max_cloud: float = 20.0) -> list[dict]:
    """
    Search for Sentinel-2 L2A scenes over SoCal.
    Returns list of scene metadata dicts.
    """
    token = get_access_token()

    # Default: look back 10 days
    if since:
        start_date = since
    else:
        start_date = (datetime.utcnow() - timedelta(days=10)).strftime('%Y-%m-%dT00:00:00Z')

    end_date = datetime.utcnow().strftime('%Y-%m-%dT23:59:59Z')

    # OData filter for Sentinel-2 L2A over SoCal
    bbox_wkt = (
        f"POLYGON(({BBOX['west']} {BBOX['south']},"
        f"{BBOX['east']} {BBOX['south']},"
        f"{BBOX['east']} {BBOX['north']},"
        f"{BBOX['west']} {BBOX['north']},"
        f"{BBOX['west']} {BBOX['south']}))"
    )

    filter_str = (
        f"Collection/Name eq 'SENTINEL-2' "
        f"and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A') "
        f"and OData.CSC.Intersects(area=geography'SRID=4326;{bbox_wkt}') "
        f"and ContentDate/Start gt {start_date} "
        f"and ContentDate/Start lt {end_date} "
        f"and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value lt {max_cloud})"
    )

    resp = requests.get(
        CATALOG_URL,
        params={'$filter': filter_str, '$top': 20, '$orderby': 'ContentDate/Start desc'},
        headers={'Authorization': f'Bearer {token}'},
    )
    resp.raise_for_status()

    scenes = []
    for item in resp.json().get('value', []):
        scenes.append({
            'id': item['Id'],
            'name': item['Name'],
            'date': item['ContentDate']['Start'],
            'cloud_cover': next(
                (a['Value'] for a in item.get('Attributes', [])
                 if a.get('Name') == 'cloudCover'), None
            ),
        })

    log.info(f'Found {len(scenes)} Sentinel-2 scenes since {start_date}')
    return scenes


def download_bands(scene_id: str, work_dir: Path) -> dict:
    """
    Download and read required bands for a scene.
    Returns dict with:
      - 'bands': dict of band name → numpy array
      - 'transform': rasterio Affine transform for georeferencing
      - 'crs': coordinate reference system string
    """
    token = get_access_token()

    # Download the full product as a zip
    download_url = f'{DOWNLOAD_URL}({scene_id})/$value'
    resp = requests.get(
        download_url,
        headers={'Authorization': f'Bearer {token}'},
        stream=True,
    )
    resp.raise_for_status()

    zip_path = work_dir / 'scene.zip'
    with open(zip_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    log.info(f'Downloaded scene {scene_id} ({zip_path.stat().st_size / 1e6:.1f} MB)')

    # Extract and read bands
    extract_dir = work_dir / 'extracted'
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)

    bands = {}
    target_shape = None
    transform = None
    crs = None

    for band_name in BANDS:
        # Find the band file in the extracted directory
        # Sentinel-2 L2A structure: .SAFE/GRANULE/*/IMG_DATA/R10m/*_B04_10m.jp2
        band_files = list(extract_dir.rglob(f'*_{band_name}_*.jp2'))
        if not band_files:
            band_files = list(extract_dir.rglob(f'*{band_name}*.jp2'))

        if not band_files:
            log.warning(f'Band {band_name} not found in scene {scene_id}')
            continue

        with rasterio.open(band_files[0]) as src:
            data = src.read(1).astype(np.float32)

            # Store 10m resolution shape and transform as reference
            if BANDS[band_name]['resolution'] == 10 and target_shape is None:
                target_shape = data.shape
                transform = src.transform
                crs = str(src.crs)

            bands[band_name] = data

    # Resample 20m bands to 10m resolution
    if target_shape and 'B11' in bands:
        from scipy.ndimage import zoom
        scale = target_shape[0] / bands['B11'].shape[0]
        bands['B11'] = zoom(bands['B11'], scale, order=1)
        log.info(f'Resampled B11 from 20m to 10m (scale={scale:.1f})')

    # Clean up zip to save disk space
    zip_path.unlink(missing_ok=True)

    log.info(f'Read {len(bands)} bands from scene {scene_id}, shape={target_shape}, crs={crs}')
    return {
        'bands': bands,
        'transform': transform,
        'crs': crs or 'EPSG:32611',  # Default to UTM Zone 11N (SoCal)
    }
