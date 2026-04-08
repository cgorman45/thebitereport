"""Threshold-based kelp mat detection from spectral indices.

Detects FLOATING kelp paddies (detached kelp rafts) in open ocean water.
NOT kelp forests/beds. Paddies are small (3-30m), transient (hours to days),
and drift with currents. They attract bait and pelagic gamefish.

Critical: Ocean masking is applied to exclude land pixels and nearshore
kelp forests. Only open-water anomalies are flagged as paddy candidates.
"""
import logging
import numpy as np
from scipy import ndimage
from shapely.geometry import shape, mapping
from shapely.ops import unary_union, transform as shapely_transform
import rasterio
from rasterio.features import shapes
from pyproj import Transformer

log = logging.getLogger('kelp-detection')

# Calibrated thresholds for floating kelp detection on ocean pixels
THRESHOLDS = {
    'fai_min': 0.0,
    'ndvi_min': 0.2,
    'fdi_min': -0.01,
}

# Minimum cluster size in pixels to filter single-pixel noise
MIN_CLUSTER_PIXELS = 5  # 5 pixels * 100m² = 500m² minimum

# Maximum area — anything larger is probably cloud shadow, land, or kelp forest
MAX_CLUSTER_PIXELS = 3000  # 3000 * 100m² = 300,000m² = 30 hectares

# Minimum distance from shore in meters to exclude nearshore kelp forests
# 1 mile = 1,609m — only detect floating paddies in open ocean
MIN_OFFSHORE_DISTANCE_M = 1609

# Minimum distance from scene edge in pixels to exclude stitch-line artifacts
# Sentinel-2 scenes have overlap zones where swaths stitch together —
# these create edge artifacts that false-positive as detections
MIN_EDGE_DISTANCE_PX = 20  # 20px * 10m = 200m buffer from scene edges

# Full coverage bounding box (SoCal + Baja California)
DETECTION_BBOX = {
    'lat_min': 22.0, 'lat_max': 35.0,
    'lng_min': -121.0, 'lng_max': -109.0,
}


def _build_water_mask(
    bands: dict[str, np.ndarray],
    ndvi: np.ndarray,
) -> np.ndarray:
    """
    Build a water mask to exclude land pixels.

    Uses multiple criteria:
    1. NDWI (Normalized Difference Water Index) from Green and NIR bands
    2. Low NDVI (vegetation on land has high NDVI)
    3. Low NIR reflectance (water absorbs NIR)

    Returns boolean mask where True = water pixel.
    """
    b03_green = bands.get('B03')
    b08_nir = bands.get('B08')

    if b03_green is not None and b08_nir is not None:
        # NDWI = (Green - NIR) / (Green + NIR) — water is positive
        with np.errstate(divide='ignore', invalid='ignore'):
            ndwi = (b03_green - b08_nir) / (b03_green + b08_nir)
            ndwi = np.where(np.isfinite(ndwi), ndwi, 0.0)

        # Water: NDWI > -0.1 AND NIR reflectance is low
        nir_reflectance = b08_nir / 10000.0  # Convert to reflectance
        water = (ndwi > -0.1) & (nir_reflectance < 0.15)
    else:
        # Fallback: low NDVI means not vegetated land
        water = ndvi < 0.4

    # Erode the water mask slightly to create a nearshore buffer
    # This removes kelp forest pixels right at the coastline
    if MIN_OFFSHORE_DISTANCE_M > 0:
        # Each pixel is ~10m, so buffer = distance / 10
        buffer_pixels = max(1, int(MIN_OFFSHORE_DISTANCE_M / 10))
        # Erode: shrink water mask by buffer_pixels from land edges
        eroded = ndimage.binary_erosion(water, iterations=buffer_pixels)
        water = eroded

    log.info(f'Water mask: {water.sum()} of {water.size} pixels '
             f'({100 * water.sum() / water.size:.1f}% water)')

    return water


def _build_scl_mask(scl: np.ndarray) -> np.ndarray:
    """
    Build a valid-ocean mask from the Sentinel-2 Scene Classification Layer.

    SCL classes:
      0 = no_data, 1 = saturated, 2 = dark/shadow, 3 = cloud_shadow,
      4 = vegetation, 5 = bare_soil, 6 = water, 7 = unclassified,
      8 = cloud_medium, 9 = cloud_high, 10 = cirrus, 11 = snow

    We ONLY keep class 6 (water) — everything else is masked out.
    This removes clouds, cloud shadows, land, and snow in one step.
    """
    water = (scl == 6)
    log.info(f'SCL mask: {water.sum()} water pixels of {scl.size} '
             f'({100 * water.sum() / scl.size:.1f}% water)')
    return water


def detect(
    indices: dict[str, np.ndarray],
    transform: rasterio.Affine | None = None,
    crs: str = 'EPSG:4326',
    bands: dict[str, np.ndarray] | None = None,
    scl: np.ndarray | None = None,
) -> list[dict]:
    """
    Apply threshold detection to spectral indices on ocean pixels only.
    Returns list of detection dicts with polygon, centroid, area, confidence.
    All coordinates are in EPSG:4326 (WGS84 lat/lng).

    Args:
        indices: dict with 'ndvi', 'fai', 'fdi' arrays
        transform: rasterio Affine for georeferencing
        crs: source coordinate reference system
        bands: raw Sentinel-2 band arrays (for water masking)
        scl: Scene Classification Layer (best mask — excludes clouds, shadows, land)
    """
    ndvi = indices['ndvi']
    fai = indices['fai']
    fdi = indices['fdi']

    # Build ocean mask — prefer SCL (most accurate), fall back to NDWI
    if scl is not None:
        water_mask = _build_scl_mask(scl)
        # Still apply nearshore erosion to exclude kelp forests
        if MIN_OFFSHORE_DISTANCE_M > 0:
            buffer_pixels = max(1, int(MIN_OFFSHORE_DISTANCE_M / 10))
            water_mask = ndimage.binary_erosion(water_mask, iterations=buffer_pixels)
    elif bands is not None:
        water_mask = _build_water_mask(bands, ndvi)
    else:
        water_mask = ndvi < 0.4
        log.warning('No SCL or bands available — using NDVI-only water mask')

    # Exclude scene edges to avoid stitch-line artifacts
    h, w = ndvi.shape
    edge_mask = np.ones((h, w), dtype=bool)
    if MIN_EDGE_DISTANCE_PX > 0:
        d = MIN_EDGE_DISTANCE_PX
        edge_mask[:d, :] = False   # top
        edge_mask[-d:, :] = False  # bottom
        edge_mask[:, :d] = False   # left
        edge_mask[:, -d:] = False  # right

        # Also mask near no-data boundaries within the scene (internal stitch lines)
        # No-data pixels in Sentinel-2 have value 0 across all bands
        if bands is not None and 'B04' in bands:
            nodata = (bands['B04'] == 0)
            # Dilate the no-data mask to create a buffer around internal edges
            nodata_buffer = ndimage.binary_dilation(nodata, iterations=MIN_EDGE_DISTANCE_PX // 2)
            edge_mask[nodata_buffer] = False

        edge_excluded = h * w - edge_mask.sum()
        log.info(f'Edge exclusion: masked {edge_excluded} pixels ({100*edge_excluded/(h*w):.1f}%) near scene edges/stitches')

    # Apply thresholds on ocean pixels only, excluding edges
    mask = (
        water_mask &
        edge_mask &
        (fai > THRESHOLDS['fai_min']) &
        (ndvi > THRESHOLDS['ndvi_min']) &
        (fdi > THRESHOLDS['fdi_min'])
    ).astype(np.uint8)

    total_positive = mask.sum()
    log.info(f'Threshold detection: {total_positive} positive ocean pixels')

    if total_positive == 0:
        return []

    # Label connected components
    labeled, num_features = ndimage.label(mask)
    log.info(f'Found {num_features} clusters')

    # Set up CRS transformer if source isn't WGS84
    need_reproject = crs and crs != 'EPSG:4326' and not crs.startswith('4326')
    transformer = None
    if need_reproject:
        try:
            transformer = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
            log.info(f'Will reproject from {crs} to EPSG:4326')
        except Exception as e:
            log.warning(f'Could not create CRS transformer: {e}')
            transformer = None

    detections = []

    for cluster_id in range(1, num_features + 1):
        cluster_mask = (labeled == cluster_id)
        pixel_count = cluster_mask.sum()

        if pixel_count < MIN_CLUSTER_PIXELS:
            continue
        if pixel_count > MAX_CLUSTER_PIXELS:
            continue

        # Compute mean index values for confidence scoring
        mean_fai = float(fai[cluster_mask].mean())
        mean_ndvi = float(ndvi[cluster_mask].mean())
        mean_fdi = float(fdi[cluster_mask].mean())

        # Confidence: weighted combination of index strengths
        confidence = min(1.0, max(0.0,
            0.4 * min(mean_fai / 0.05, 1.0) +
            0.4 * min(mean_ndvi / 0.5, 1.0) +
            0.2 * min((mean_fdi + 0.01) / 0.05, 1.0)
        ))

        # Convert cluster to polygon
        if transform is not None:
            # Use rasterio to vectorize with proper georeferencing
            cluster_uint8 = cluster_mask.astype(np.uint8)
            geom_gen = shapes(cluster_uint8, mask=cluster_mask, transform=transform)
            polygons = [shape(geom) for geom, val in geom_gen if val == 1]
        else:
            # Fallback: pixel coordinates
            ys, xs = np.where(cluster_mask)
            from shapely.geometry import box
            polygons = [box(float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max()))]

        if not polygons:
            continue

        merged = unary_union(polygons)

        # Reproject to WGS84 if needed (Sentinel-2 is usually in UTM)
        if transformer:
            merged = shapely_transform(transformer.transform, merged)

        centroid = merged.centroid

        # Validate coordinates are within SoCal + Baja coverage area
        if not (DETECTION_BBOX['lat_min'] <= centroid.y <= DETECTION_BBOX['lat_max']
                and DETECTION_BBOX['lng_min'] <= centroid.x <= DETECTION_BBOX['lng_max']):
            continue

        # Area estimate (10m pixel = 100m²)
        area_m2 = float(pixel_count * 100)

        detections.append({
            'lat': float(centroid.y),
            'lng': float(centroid.x),
            'area_m2': area_m2,
            'confidence': round(confidence, 3),
            'polygon': mapping(merged),
            'indices': {
                'ndvi': round(mean_ndvi, 4),
                'fai': round(mean_fai, 4),
                'fdi': round(mean_fdi, 4),
            },
        })

    log.info(f'Detected {len(detections)} kelp mats (filtered from {num_features} clusters)')
    return detections
