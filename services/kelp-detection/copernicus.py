"""Copernicus Data Space API client for Sentinel-2 imagery.

Handles OAuth2 authentication, scene search with ocean-tile filtering,
and selective band download (avoids downloading full ~800MB products).
"""
import os
import logging
import time
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

from typing import Optional

import requests

# Lazy imports for heavy dependencies (not needed for search/dry-run)
np = None
rasterio = None


def _ensure_numpy():
    global np
    if np is None:
        import numpy as _np
        np = _np

log = logging.getLogger('kelp-detection')

TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'
DOWNLOAD_URL = 'https://zipper.dataspace.copernicus.eu/odata/v1/Products'

# Full SoCal + Baja California coverage (down to Cabo San Lucas)
BBOX = {
    'west': -121.0,
    'south': 22.0,
    'east': -109.0,
    'north': 35.0,
}

# Sentinel-2 bands we need for kelp paddy detection
# B03 (Green) + B08 (NIR) → NDWI water mask
# B04 (Red) + B08 (NIR) → NDVI
# B04 + B06 (Red Edge) + B08 + B11 (SWIR) → FAI, FDI
# SCL → cloud/shadow/water classification mask
BANDS = {
    'B02': {'name': 'Blue', 'resolution': 10, 'wavelength': 490},
    'B03': {'name': 'Green', 'resolution': 10, 'wavelength': 560},
    'B04': {'name': 'Red', 'resolution': 10, 'wavelength': 665},
    'B06': {'name': 'Red Edge 2', 'resolution': 20, 'wavelength': 740},
    'B08': {'name': 'NIR', 'resolution': 10, 'wavelength': 842},
    'B11': {'name': 'SWIR 1', 'resolution': 20, 'wavelength': 1610},
    'SCL': {'name': 'Scene Classification', 'resolution': 20, 'wavelength': None},
}

# Maximum ocean coverage percentage below which we skip the tile
# (tiles that are mostly land won't have useful ocean data)
MIN_OCEAN_FRACTION = 0.10  # At least 10% ocean pixels

# Token cache
_token_cache = {'token': None, 'expires_at': 0}


def get_access_token() -> str:
    """Get OAuth2 access token with caching (tokens last ~10 min).

    Supports two auth flows:
    1. Password grant (COPERNICUS_USERNAME + COPERNICUS_PASSWORD) — required for downloads
    2. Client credentials (COPERNICUS_CLIENT_ID + COPERNICUS_CLIENT_SECRET) — search only

    The CDSE zipper/download API requires a user token (password grant).
    Client credentials tokens only work for the catalog search API.
    """
    now = time.time()
    if _token_cache['token'] and _token_cache['expires_at'] > now + 60:
        return _token_cache['token']

    username = os.environ.get('COPERNICUS_USERNAME')
    password = os.environ.get('COPERNICUS_PASSWORD')
    client_id = os.environ.get('COPERNICUS_CLIENT_ID')
    client_secret = os.environ.get('COPERNICUS_CLIENT_SECRET')

    if username and password:
        # Password grant — works for both search and download
        resp = requests.post(TOKEN_URL, data={
            'grant_type': 'password',
            'username': username,
            'password': password,
            'client_id': 'cdse-public',
        }, timeout=30)
    elif client_id and client_secret:
        # Client credentials — works for search only, NOT downloads
        resp = requests.post(TOKEN_URL, data={
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
        }, timeout=30)
    else:
        raise EnvironmentError(
            'Set COPERNICUS_USERNAME + COPERNICUS_PASSWORD (for full access) '
            'or COPERNICUS_CLIENT_ID + COPERNICUS_CLIENT_SECRET (search only). '
            'Get free credentials at https://dataspace.copernicus.eu/'
        )

    resp.raise_for_status()

    data = resp.json()
    _token_cache['token'] = data['access_token']
    _token_cache['expires_at'] = now + data.get('expires_in', 600)

    auth_type = 'password' if username else 'client_credentials'
    log.debug(f'Refreshed Copernicus access token ({auth_type} grant)')
    return _token_cache['token']


def search_scenes(
    since: Optional[str] = None,
    days_back: int = 10,
    max_cloud: float = 20.0,
    max_results: int = 50,
    bbox: Optional[dict] = None,
) -> list[dict]:
    """
    Search for recent Sentinel-2 L2A scenes over the coverage area.

    Args:
        since: ISO timestamp — only scenes after this date
        days_back: fallback lookback if 'since' is not set
        max_cloud: maximum cloud cover percentage (0-100)
        max_results: max scenes to return
        bbox: override bounding box (default: full SoCal+Baja)

    Returns list of scene metadata dicts sorted by date (newest first).
    """
    token = get_access_token()
    bounds = bbox or BBOX

    if since:
        start_date = since
    else:
        start_date = (datetime.utcnow() - timedelta(days=days_back)).strftime('%Y-%m-%dT00:00:00Z')

    end_date = datetime.utcnow().strftime('%Y-%m-%dT23:59:59Z')

    bbox_wkt = (
        f"POLYGON(({bounds['west']} {bounds['south']},"
        f"{bounds['east']} {bounds['south']},"
        f"{bounds['east']} {bounds['north']},"
        f"{bounds['west']} {bounds['north']},"
        f"{bounds['west']} {bounds['south']}))"
    )

    filter_str = (
        f"Collection/Name eq 'SENTINEL-2' "
        f"and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' "
        f"and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A') "
        f"and OData.CSC.Intersects(area=geography'SRID=4326;{bbox_wkt}') "
        f"and ContentDate/Start gt {start_date} "
        f"and ContentDate/Start lt {end_date} "
        f"and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' "
        f"and att/OData.CSC.DoubleAttribute/Value lt {max_cloud})"
    )

    resp = requests.get(
        CATALOG_URL,
        params={
            '$filter': filter_str,
            '$top': max_results,
            '$orderby': 'ContentDate/Start desc',
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=30,
    )
    resp.raise_for_status()

    scenes = []
    for item in resp.json().get('value', []):
        cloud = next(
            (a['Value'] for a in item.get('Attributes', [])
             if a.get('Name') == 'cloudCover'), None
        )
        scenes.append({
            'id': item['Id'],
            'name': item['Name'],
            'date': item['ContentDate']['Start'],
            'cloud_cover': cloud,
            'footprint': item.get('Footprint'),
            'size_mb': item.get('ContentLength', 0) / 1e6,
        })

    log.info(f'Found {len(scenes)} Sentinel-2 scenes since {start_date} '
             f'(max cloud: {max_cloud}%)')
    return scenes


def download_bands(scene_id: str, work_dir: Path) -> dict:
    """
    Download and read required bands from a Sentinel-2 scene.

    Downloads the full product zip (CDSE doesn't support per-band download),
    extracts only the bands we need, then cleans up.

    Returns dict with:
      - 'bands': dict of band name → numpy array (float32, DN values)
      - 'transform': rasterio Affine for 10m grid
      - 'crs': coordinate reference system string
      - 'scl': scene classification layer (if available)
    """
    token = get_access_token()

    download_url = f'{DOWNLOAD_URL}({scene_id})/$value'

    _ensure_numpy()

    log.info(f'Downloading scene {scene_id}...')
    resp = requests.get(
        download_url,
        headers={'Authorization': f'Bearer {token}'},
        stream=True,
        timeout=600,  # 10 min timeout for large files
    )
    resp.raise_for_status()

    zip_path = work_dir / 'scene.zip'
    downloaded = 0
    with open(zip_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=65536):
            f.write(chunk)
            downloaded += len(chunk)

    size_mb = zip_path.stat().st_size / 1e6
    log.info(f'Downloaded {size_mb:.0f} MB')

    # Lazy import rasterio (heavy dependency, only needed for band reading)
    global rasterio
    if rasterio is None:
        import rasterio as _rasterio
        rasterio = _rasterio

    # Extract only the band files we need (skip everything else)
    extract_dir = work_dir / 'extracted'
    band_patterns = [f'_{b}_' for b in BANDS] + [f'{b}_' for b in BANDS]

    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            # Only extract .jp2 files matching our band patterns
            if member.endswith('.jp2'):
                if any(pat in member for pat in band_patterns):
                    zf.extract(member, extract_dir)

    # Free disk space immediately
    zip_path.unlink(missing_ok=True)

    # Read bands into memory
    bands = {}
    target_shape = None
    transform = None
    crs = None
    scl = None

    # First pass: read 10m bands to establish reference grid
    for band_name, band_info in BANDS.items():
        if band_info['resolution'] != 10:
            continue

        # Prefer R10m directory for 10m bands
        band_files = list(extract_dir.rglob(f'*R10m/*_{band_name}_*.jp2'))
        if not band_files:
            band_files = list(extract_dir.rglob(f'*_{band_name}_*.jp2'))
        if not band_files:
            band_files = list(extract_dir.rglob(f'*{band_name}*.jp2'))

        if not band_files:
            log.warning(f'Band {band_name} (10m) not found')
            continue

        with rasterio.open(band_files[0]) as src:
            data = src.read(1).astype(np.float32)
            if target_shape is None:
                target_shape = data.shape
                transform = src.transform
                crs = str(src.crs)
                log.debug(f'Reference grid: {target_shape} from {band_name}')
            bands[band_name] = data

    # Second pass: read 20m bands
    for band_name, band_info in BANDS.items():
        if band_info['resolution'] != 20:
            continue

        # Prefer R20m directory for 20m bands
        band_files = list(extract_dir.rglob(f'*R20m/*_{band_name}_*.jp2'))
        if not band_files:
            band_files = list(extract_dir.rglob(f'*_{band_name}_*.jp2'))
        if not band_files:
            band_files = list(extract_dir.rglob(f'*{band_name}*.jp2'))

        if not band_files:
            log.warning(f'Band {band_name} (20m) not found')
            continue

        with rasterio.open(band_files[0]) as src:
            data = src.read(1).astype(np.float32)
            if band_name == 'SCL':
                scl = data
            else:
                bands[band_name] = data

    # Resample 20m bands to 10m resolution
    if target_shape:
        from scipy.ndimage import zoom as scipy_zoom
        for band_name in ['B06', 'B11']:
            if band_name in bands and bands[band_name].shape != target_shape:
                scale = target_shape[0] / bands[band_name].shape[0]
                bands[band_name] = scipy_zoom(bands[band_name], scale, order=1)
                log.debug(f'Resampled {band_name} from 20m to 10m')

        # Resample SCL too (nearest-neighbor to preserve class labels)
        if scl is not None and scl.shape != target_shape:
            scale = target_shape[0] / scl.shape[0]
            scl = scipy_zoom(scl, scale, order=0)  # order=0 = nearest

    # Clean up extracted files
    import shutil
    shutil.rmtree(extract_dir, ignore_errors=True)

    log.info(f'Read {len(bands)} bands, shape={target_shape}, crs={crs}')
    return {
        'bands': bands,
        'transform': transform,
        'crs': crs or 'EPSG:32611',
        'scl': scl,
    }


def estimate_ocean_fraction(scl, bands: dict) -> float:
    """
    Estimate what fraction of the scene is ocean (vs land).
    Uses SCL if available, otherwise falls back to NDWI from bands.

    SCL classes: 6 = water, 0 = no_data, 1 = saturated/defective
    """
    _ensure_numpy()

    if scl is not None:
        total = scl.size
        water = np.sum(scl == 6)
        no_data = np.sum((scl == 0) | (scl == 1))
        valid = total - no_data
        if valid == 0:
            return 0.0
        return float(water / valid)

    # Fallback: NDWI
    if 'B03' in bands and 'B08' in bands:
        green = bands['B03']
        nir = bands['B08']
        with np.errstate(divide='ignore', invalid='ignore'):
            ndwi = (green - nir) / (green + nir)
            ndwi = np.where(np.isfinite(ndwi), ndwi, 0.0)
        water_pixels = np.sum(ndwi > 0)
        return float(water_pixels / ndwi.size)

    return 1.0  # Assume ocean if we can't tell


def generate_thumbnail(
    bands: dict,
    transform,
    crs: str,
    lat: float,
    lng: float,
    width_px: int = 2000,
    height_px: int = 1500,
) -> Optional[str]:
    """
    Generate a large RGB crop centered on a detection location.

    Saves at native 10m resolution for admin review with zoom capability.
    At 10m/pixel, 2000px wide = 20km, 1500px tall = 15km of ocean context.
    This gives admins plenty of surrounding ocean to zoom out into for context.

    Returns base64-encoded JPEG string, or None if bands aren't available.
    Uses B04 (Red), B03 (Green), B02 (Blue) for true-color,
    or B08 (NIR), B04 (Red), B03 (Green) for false-color if B02 missing.
    """
    _ensure_numpy()

    try:
        from pyproj import Transformer as _Transformer
        import io
        import base64
        from PIL import Image
    except ImportError:
        log.warning('PIL not available — skipping thumbnail generation')
        return None

    # Convert lat/lng to pixel coordinates
    need_reproject = crs and crs != 'EPSG:4326' and not crs.startswith('4326')
    if need_reproject:
        transformer = _Transformer.from_crs('EPSG:4326', crs, always_xy=True)
        x, y = transformer.transform(lng, lat)
    else:
        x, y = lng, lat

    # Convert projected coords to pixel coords
    inv_transform = ~transform
    col, row = inv_transform * (x, y)
    col, row = int(col), int(row)

    # Crop a large region for context (wider than tall, 16:10 aspect)
    # At 10m resolution: 512px = 5.1km, 320px = 3.2km
    half_w = width_px // 2
    half_h = height_px // 2

    # True-color RGB for raw satellite view
    if 'B04' in bands and 'B03' in bands and 'B02' in bands:
        r, g, b = bands['B04'], bands['B03'], bands['B02']
    elif 'B08' in bands and 'B04' in bands and 'B03' in bands:
        r, g, b = bands['B08'], bands['B04'], bands['B03']
    else:
        return None

    h, w = r.shape

    # Clamp to image bounds
    r0 = max(0, row - half_h)
    r1 = min(h, row + half_h)
    c0 = max(0, col - half_w)
    c1 = min(w, col + half_w)

    if r1 - r0 < 32 or c1 - c0 < 32:
        return None

    # Raw satellite image — Sentinel-2 L2A values are surface reflectance * 10000
    # Divide by 10000 to get 0-1 reflectance, then scale to 0-255
    # Apply a brightness boost (multiply by 3) because ocean reflectance is very low (~0.02-0.05)
    def to_uint8(band):
        crop = band[r0:r1, c0:c1].copy().astype(np.float32)
        # Convert DN to reflectance and boost for visibility
        crop = crop / 10000.0  # Now 0-1 reflectance
        crop = crop * 3.0      # Brightness boost — makes ocean blues visible
        crop = np.clip(crop * 255, 0, 255).astype(np.uint8)
        return crop

    rgb = np.stack([to_uint8(r), to_uint8(g), to_uint8(b)], axis=-1)

    img = Image.fromarray(rgb)

    # Only annotation: red circle around detected area
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    cx = img.width // 2
    cy = img.height // 2
    # Red circle — 60px radius (~600m at 10m/px), thick enough to see when zoomed out
    for radius in [57, 58, 59, 60, 61, 62, 63]:
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            outline=(255, 0, 0), width=1,
        )

    # Encode as JPEG with good quality for review
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')

    log.debug(f'Generated {img.width}x{img.height} thumbnail ({len(b64)//1024}KB b64)')
    return b64
