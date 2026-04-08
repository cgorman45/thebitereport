#!/usr/bin/env python3
"""
Fetch kelp annotations from the Floating Forests citizen science project.

Floating Forests (Zooniverse) provides crowdsourced kelp canopy labels
on Landsat imagery covering the California coast. These annotations
can be used to:
1. Validate our Sentinel-2 detection pipeline
2. Fine-tune the ML model for California-specific kelp

Data source: https://www.zooniverse.org/projects/zooniverse/floating-forests
Published data: https://doi.org/10.1594/PANGAEA.968425

Usage:
    python fetch_floating_forests.py --output-dir data/floating-forests
"""
import os
import sys
import argparse
import logging
from pathlib import Path

log = logging.getLogger('ml-training')

# Floating Forests exports from published research
# These contain labeled Landsat tiles with kelp/no-kelp classifications
DATASET_URLS = {
    # PANGAEA dataset — kelp canopy classifications
    'pangaea': 'https://doi.pangaea.de/10.1594/PANGAEA.968425',
    # Zooniverse project page
    'zooniverse': 'https://www.zooniverse.org/projects/zooniverse/floating-forests',
}

# Known California kelp forest regions from Floating Forests
# These coordinates identify areas with high-quality kelp labels
CALIFORNIA_REGIONS = [
    {'name': 'Point Loma', 'lat': 32.69, 'lng': -117.27},
    {'name': 'La Jolla', 'lat': 32.85, 'lng': -117.28},
    {'name': 'Catalina Island', 'lat': 33.39, 'lng': -118.40},
    {'name': 'Santa Cruz Island', 'lat': 34.00, 'lng': -119.55},
    {'name': 'Channel Islands', 'lat': 34.05, 'lng': -119.80},
    {'name': 'Palos Verdes', 'lat': 33.74, 'lng': -118.42},
    {'name': 'San Clemente Island', 'lat': 32.93, 'lng': -118.53},
]


def fetch_floating_forests_data(output_dir):
    """
    Download Floating Forests kelp classification data.

    Note: The actual data download requires visiting the PANGAEA
    or Zooniverse links. This script documents the process and
    prepares the directory structure.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    readme = out_path / 'README.md'
    readme.write_text(f"""# Floating Forests Kelp Data

## How to get the data

1. **PANGAEA (published research data)**
   Visit: {DATASET_URLS['pangaea']}
   Download the kelp classification dataset
   Place files in this directory

2. **Zooniverse (raw citizen science annotations)**
   Visit: {DATASET_URLS['zooniverse']}
   Request data export from the project
   Place exported CSV in this directory

## California regions with labels

These kelp forests have extensive Floating Forests annotations:

| Region | Lat | Lng |
|--------|-----|-----|
""" + '\n'.join(f"| {r['name']} | {r['lat']} | {r['lng']} |" for r in CALIFORNIA_REGIONS) + """

## Using the data

After placing files here, run:
    python prepare_floating_forests.py --data-dir data/floating-forests

This will extract kelp/no-kelp labels and create training patches
aligned with our Sentinel-2 pipeline.
""")

    log.info(f'Created data directory at {out_path}')
    log.info(f'Download data from:')
    log.info(f'  PANGAEA: {DATASET_URLS["pangaea"]}')
    log.info(f'  Zooniverse: {DATASET_URLS["zooniverse"]}')
    log.info(f'Place downloaded files in {out_path}')

    return out_path


def main():
    parser = argparse.ArgumentParser(description='Fetch Floating Forests kelp data')
    parser.add_argument('--output-dir', type=str, default='data/floating-forests')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='[%(asctime)s] %(levelname)s: %(message)s')

    fetch_floating_forests_data(args.output_dir)


if __name__ == '__main__':
    main()
