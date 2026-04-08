"""Compute spectral indices for floating kelp paddy detection from Sentinel-2 bands.

Indices computed:
  NDVI  — Normalized Difference Vegetation Index (NIR vs Red)
  FAI   — Floating Algae Index (NIR baseline from Red + SWIR)
  FDI   — Floating Debris Index (NIR baseline from Red Edge + SWIR)

All indices are designed to highlight floating organic material on the
ocean surface while suppressing water, cloud, and land signals.
"""
import numpy as np
import logging

log = logging.getLogger('kelp-detection')


def compute_ndvi(b4_red: np.ndarray, b8_nir: np.ndarray) -> np.ndarray:
    """NDVI = (NIR - Red) / (NIR + Red)

    Floating kelp: NDVI ~0.2-0.5 (green vegetation on water)
    Open water: NDVI < 0 (water absorbs NIR)
    Land vegetation: NDVI > 0.5
    """
    with np.errstate(divide='ignore', invalid='ignore'):
        ndvi = (b8_nir - b4_red) / (b8_nir + b4_red)
        ndvi = np.where(np.isfinite(ndvi), ndvi, 0.0)
    return ndvi


def compute_fai(b4_red: np.ndarray, b8_nir: np.ndarray, b11_swir: np.ndarray) -> np.ndarray:
    """Floating Algae Index.

    FAI = NIR - (Red + (SWIR - Red) * (λ_NIR - λ_Red) / (λ_SWIR - λ_Red))

    Uses a baseline between Red (665nm) and SWIR (1610nm) to detect
    material floating above the water surface. Positive FAI = something
    floating (kelp, Sargassum, debris).

    Wavelengths: B4=665nm, B8=842nm, B11=1610nm
    """
    lambda_red = 665.0
    lambda_nir = 842.0
    lambda_swir = 1610.0

    ratio = (lambda_nir - lambda_red) / (lambda_swir - lambda_red)
    baseline = b4_red + (b11_swir - b4_red) * ratio
    fai = b8_nir - baseline
    return np.where(np.isfinite(fai), fai, 0.0)


def compute_fdi(
    b8_nir: np.ndarray,
    b6_rededge: np.ndarray | None,
    b11_swir: np.ndarray,
    b4_red: np.ndarray | None = None,
) -> np.ndarray:
    """Floating Debris Index.

    Proper FDI (with Red Edge B06):
      FDI = NIR - (RedEdge + (SWIR - RedEdge) * (λ_NIR - λ_RE) / (λ_SWIR - λ_RE))
      Wavelengths: B6=740nm, B8=842nm, B11=1610nm

    Fallback FDI (without B06):
      FDI = NIR - (Red + (SWIR - Red) * 0.5)

    The Red Edge band (B06) provides a tighter spectral baseline that
    better discriminates floating debris from turbid water.
    """
    if b6_rededge is not None:
        # Proper FDI with Red Edge baseline
        lambda_re = 740.0
        lambda_nir = 842.0
        lambda_swir = 1610.0

        ratio = (lambda_nir - lambda_re) / (lambda_swir - lambda_re)
        baseline = b6_rededge + (b11_swir - b6_rededge) * ratio
    elif b4_red is not None:
        # Fallback without Red Edge
        baseline = b4_red + (b11_swir - b4_red) * 0.5
    else:
        raise ValueError('Need either B06 (Red Edge) or B04 (Red) for FDI')

    fdi = b8_nir - baseline
    return np.where(np.isfinite(fdi), fdi, 0.0)


def compute_all_indices(bands: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """Compute all spectral indices from Sentinel-2 band arrays.

    Required bands: B04, B08, B11
    Optional bands: B03 (for water mask), B06 (for improved FDI)

    Returns dict with 'ndvi', 'fai', 'fdi' arrays.
    """
    required = ['B04', 'B08', 'B11']
    missing = [b for b in required if b not in bands]
    if missing:
        raise ValueError(f'Missing required bands: {missing}')

    b4 = bands['B04']
    b8 = bands['B08']
    b11 = bands['B11']
    b6 = bands.get('B06')  # Optional Red Edge

    ndvi = compute_ndvi(b4, b8)
    fai = compute_fai(b4, b8, b11)
    fdi = compute_fdi(b8, b6_rededge=b6, b11_swir=b11, b4_red=b4)

    log.info(
        f'Indices computed — '
        f'NDVI: [{ndvi.min():.3f}, {ndvi.max():.3f}], '
        f'FAI: [{fai.min():.4f}, {fai.max():.4f}], '
        f'FDI: [{fdi.min():.4f}, {fdi.max():.4f}]'
        f'{" (with Red Edge B06)" if b6 is not None else " (fallback, no B06)"}'
    )

    return {'ndvi': ndvi, 'fai': fai, 'fdi': fdi}
