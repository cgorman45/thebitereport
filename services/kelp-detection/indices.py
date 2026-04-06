"""Compute spectral indices for kelp detection from Sentinel-2 bands."""
import numpy as np
import logging

log = logging.getLogger('kelp-detection')


def compute_ndvi(b4_red: np.ndarray, b8_nir: np.ndarray) -> np.ndarray:
    """NDVI = (NIR - Red) / (NIR + Red)"""
    with np.errstate(divide='ignore', invalid='ignore'):
        ndvi = (b8_nir - b4_red) / (b8_nir + b4_red)
        ndvi = np.where(np.isfinite(ndvi), ndvi, 0.0)
    return ndvi


def compute_fai(b4_red: np.ndarray, b8_nir: np.ndarray, b11_swir: np.ndarray) -> np.ndarray:
    """
    Floating Algae Index.
    FAI = NIR - (Red + (SWIR - Red) * (833 - 665) / (1614 - 665))
    Wavelengths: B4=665nm, B8=833nm, B11=1614nm
    """
    lambda_red = 665.0
    lambda_nir = 833.0
    lambda_swir = 1614.0

    baseline = b4_red + (b11_swir - b4_red) * (lambda_nir - lambda_red) / (lambda_swir - lambda_red)
    fai = b8_nir - baseline
    return np.where(np.isfinite(fai), fai, 0.0)


def compute_fdi(b4_red: np.ndarray, b8_nir: np.ndarray, b11_swir: np.ndarray) -> np.ndarray:
    """
    Floating Debris Index.
    FDI = NIR - (Red + (SWIR - Red) * 0.5)
    """
    baseline = b4_red + (b11_swir - b4_red) * 0.5
    fdi = b8_nir - baseline
    return np.where(np.isfinite(fdi), fdi, 0.0)


def compute_all_indices(bands: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """Compute all spectral indices from band arrays."""
    required = ['B03', 'B04', 'B08', 'B11']
    missing = [b for b in required if b not in bands]
    if missing:
        raise ValueError(f'Missing bands: {missing}')

    b4 = bands['B04']
    b8 = bands['B08']
    b11 = bands['B11']

    ndvi = compute_ndvi(b4, b8)
    fai = compute_fai(b4, b8, b11)
    fdi = compute_fdi(b4, b8, b11)

    log.info(f'Computed indices — NDVI range: [{ndvi.min():.3f}, {ndvi.max():.3f}], '
             f'FAI range: [{fai.min():.3f}, {fai.max():.3f}], '
             f'FDI range: [{fdi.min():.3f}, {fdi.max():.3f}]')

    return {'ndvi': ndvi, 'fai': fai, 'fdi': fdi}
