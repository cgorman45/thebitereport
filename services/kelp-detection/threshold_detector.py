"""Threshold-based kelp mat detection from spectral indices."""
import logging
import numpy as np
from scipy import ndimage
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
import rasterio
from rasterio.features import shapes

log = logging.getLogger('kelp-detection')

# Calibrated thresholds for floating kelp detection
THRESHOLDS = {
    'fai_min': 0.0,
    'ndvi_min': 0.2,
    'fdi_min': -0.01,
}

# Minimum cluster size in pixels (filter noise)
MIN_CLUSTER_PIXELS = 5


def detect(
    indices: dict[str, np.ndarray],
    transform: rasterio.Affine | None = None,
    crs: str = 'EPSG:4326',
) -> list[dict]:
    """
    Apply threshold detection to spectral indices.
    Returns list of detection dicts with polygon, centroid, area, confidence.
    """
    ndvi = indices['ndvi']
    fai = indices['fai']
    fdi = indices['fdi']

    # Apply thresholds
    mask = (
        (fai > THRESHOLDS['fai_min']) &
        (ndvi > THRESHOLDS['ndvi_min']) &
        (fdi > THRESHOLDS['fdi_min'])
    ).astype(np.uint8)

    total_positive = mask.sum()
    log.info(f'Threshold detection: {total_positive} positive pixels')

    if total_positive == 0:
        return []

    # Label connected components
    labeled, num_features = ndimage.label(mask)
    log.info(f'Found {num_features} clusters')

    # Filter small clusters
    detections = []

    for cluster_id in range(1, num_features + 1):
        cluster_mask = (labeled == cluster_id)
        pixel_count = cluster_mask.sum()

        if pixel_count < MIN_CLUSTER_PIXELS:
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
            # Fallback: pixel coordinates (will need manual georeferencing)
            ys, xs = np.where(cluster_mask)
            from shapely.geometry import box
            polygons = [box(xs.min(), ys.min(), xs.max(), ys.max())]

        if not polygons:
            continue

        merged = unary_union(polygons)
        centroid = merged.centroid

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
