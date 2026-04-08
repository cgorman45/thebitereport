#!/usr/bin/env python3
"""
Prepare MARIDA dataset for kelp paddy detection training.

MARIDA contains labeled Sentinel-2 patches with classes including:
- Marine Debris
- Dense Sargassum
- Sparse Sargassum
- Natural Organic Material
- Ship
- Cloud
- Marine Water
- Turbid Water
- Shallow Water
- Foam/Waves

We map Sargassum classes to "floating_vegetation" since kelp paddies
have the same spectral signature as Sargassum at Sentinel-2 resolution.

Usage:
    python prepare_marida.py --marida-dir data/MARIDA --output-dir data/training
"""
import os
import sys
import argparse
import json
import logging
from pathlib import Path

import numpy as np

log = logging.getLogger('ml-training')

# MARIDA class mapping
# Classes we care about for floating kelp detection
MARIDA_CLASSES = {
    1: 'marine_debris',
    2: 'dense_sargassum',      # → floating_vegetation (same as kelp)
    3: 'sparse_sargassum',     # → floating_vegetation (same as kelp)
    4: 'natural_organic_material',
    5: 'ship',
    6: 'cloud',
    7: 'marine_water',
    8: 'turbid_water',
    9: 'shallow_water',
    10: 'foam_waves',
    11: 'sediment_laden_water',
    12: 'clear_water',
    15: 'wakes',
}

# Binary mapping: floating vegetation vs everything else
BINARY_MAP = {
    2: 1,   # dense Sargassum → positive (floating vegetation)
    3: 1,   # sparse Sargassum → positive (floating vegetation)
    4: 1,   # natural organic material → positive
}
# Everything else → 0 (not floating vegetation)


def extract_marida(marida_dir, output_dir):
    """Extract and prepare MARIDA patches for training."""
    marida_path = Path(marida_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # Find patches directory — handle various extraction structures
    scenes_dir = None
    for candidate in [
        marida_path / 'patches',
        marida_path / 'MARIDA' / 'patches',
        marida_path.parent / 'patches',
    ]:
        if candidate.exists():
            scenes_dir = candidate
            break

    if scenes_dir is None:
        log.error(f'Could not find patches directory. Searched in {marida_dir}')
        if marida_path.exists():
            log.error(f'Contents: {[p.name for p in marida_path.iterdir()]}')
        sys.exit(1)

    log.info(f'Found patches at: {scenes_dir}')

    try:
        import rasterio
    except ImportError:
        log.error('rasterio required: pip install rasterio')
        sys.exit(1)

    positive_patches = []
    negative_patches = []
    total = 0

    for scene_dir in sorted(scenes_dir.iterdir()):
        if not scene_dir.is_dir():
            continue

        # Find class mask files (*_cl.tif)
        mask_files = list(scene_dir.glob('*_cl.tif'))

        for mask_file in mask_files:
            total += 1

            # Read the mask
            with rasterio.open(mask_file) as src:
                mask = src.read(1)

            # Check if this patch contains floating vegetation
            has_sargassum = np.any(np.isin(mask, [2, 3, 4]))

            # Count pixels
            sarg_pixels = np.sum(np.isin(mask, [2, 3, 4]))
            water_pixels = np.sum(np.isin(mask, [7, 8, 12]))
            total_pixels = mask.size

            patch_info = {
                'mask_file': str(mask_file),
                'scene_dir': str(scene_dir),
                'has_floating_veg': bool(has_sargassum),
                'floating_veg_pixels': int(sarg_pixels),
                'water_pixels': int(water_pixels),
                'total_pixels': int(total_pixels),
                'floating_veg_fraction': float(sarg_pixels / total_pixels) if total_pixels > 0 else 0,
            }

            # Find corresponding image file
            img_name = mask_file.name.replace('_cl.tif', '.tif')
            img_file = scene_dir / img_name
            if img_file.exists():
                patch_info['image_file'] = str(img_file)

            if has_sargassum:
                positive_patches.append(patch_info)
            else:
                negative_patches.append(patch_info)

    # Save manifest
    manifest = {
        'total_patches': total,
        'positive_patches': len(positive_patches),
        'negative_patches': len(negative_patches),
        'positive_rate': len(positive_patches) / total if total > 0 else 0,
        'class_mapping': {
            'target_classes': [2, 3, 4],
            'class_names': ['dense_sargassum', 'sparse_sargassum', 'natural_organic_material'],
            'binary_label': 'floating_vegetation',
            'note': 'Sargassum has same spectral signature as floating kelp at Sentinel-2 resolution',
        },
        'patches': {
            'positive': positive_patches,
            'negative': negative_patches[:len(positive_patches) * 3],  # 3:1 ratio
        },
    }

    manifest_path = out_path / 'marida_manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    log.info(f'MARIDA preparation complete:')
    log.info(f'  Total patches: {total}')
    log.info(f'  Positive (floating vegetation): {len(positive_patches)}')
    log.info(f'  Negative (water/other): {len(negative_patches)}')
    log.info(f'  Positive rate: {len(positive_patches)/total*100:.1f}%')
    log.info(f'  Manifest saved to: {manifest_path}')

    return manifest


def main():
    parser = argparse.ArgumentParser(description='Prepare MARIDA dataset for kelp detection')
    parser.add_argument('--marida-dir', type=str, default='data/MARIDA',
                        help='Path to extracted MARIDA dataset')
    parser.add_argument('--output-dir', type=str, default='data/training',
                        help='Output directory for prepared training data')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='[%(asctime)s] %(levelname)s: %(message)s')

    extract_marida(args.marida_dir, args.output_dir)


if __name__ == '__main__':
    main()
