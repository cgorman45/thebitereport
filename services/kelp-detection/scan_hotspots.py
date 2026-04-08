#!/usr/bin/env python3
"""
Targeted kelp paddy scan — searches for Sentinel-2 scenes over known
kelp hotspots and processes them for floating paddy detection.

These are validated locations where kelp paddies are known to accumulate
based on ocean currents, kelp forest proximity, and fishing reports.

Usage:
    python scan_hotspots.py --verbose
    python scan_hotspots.py --dry-run
    python scan_hotspots.py --spot "catalina" --verbose
"""
import os
import sys
import argparse
import logging

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from copernicus import search_scenes, download_bands, estimate_ocean_fraction, generate_thumbnail, MIN_OCEAN_FRACTION
from db import write_detections, mark_scene_processed, is_scene_processed

log = logging.getLogger('kelp-detection')

# Known kelp paddy hotspots — small bounding boxes centered on each area
# Each box is ~50km x 50km to capture the local ocean area
HOTSPOTS = {
    'channel-islands': {
        'name': 'Channel Islands',
        'desc': 'Santa Cruz, Santa Rosa, San Miguel — massive kelp forests and paddy accumulation.',
        'bbox': {'west': -120.5, 'south': 33.8, 'east': -119.0, 'north': 34.3},
    },
    'san-clemente-island': {
        'name': 'San Clemente Island',
        'desc': 'Kelp rafts accumulate in the lee of the island. Yellowtail, dorado, yellowfin.',
        'bbox': {'west': -119.0, 'south': 32.7, 'east': -118.2, 'north': 33.2},
    },
    'catalina': {
        'name': 'Santa Catalina Island',
        'desc': 'Paddies drift through channel between Catalina and mainland.',
        'bbox': {'west': -118.7, 'south': 33.2, 'east': -118.2, 'north': 33.6},
    },
    'palos-verdes': {
        'name': 'Palos Verdes Shelf',
        'desc': 'Large kelp forest produces paddies that drift into the San Pedro Channel.',
        'bbox': {'west': -118.7, 'south': 33.5, 'east': -118.1, 'north': 33.9},
    },
    'point-loma': {
        'name': 'Point Loma / La Jolla Offshore',
        'desc': 'Major kelp forest. Paddies drift SW with California Current.',
        'bbox': {'west': -117.6, 'south': 32.5, 'east': -117.1, 'north': 33.0},
    },
    'coronado-islands': {
        'name': 'Coronado Islands',
        'desc': 'Mexican islands south of San Diego with kelp beds. Paddies drift north.',
        'bbox': {'west': -117.5, 'south': 32.3, 'east': -117.1, 'north': 32.5},
    },
    'ensenada': {
        'name': 'Ensenada / Punta Banda',
        'desc': 'Baja kelp forest. Paddies drift offshore into open water.',
        'bbox': {'west': -117.0, 'south': 31.5, 'east': -116.4, 'north': 32.0},
    },
    'san-quintin': {
        'name': 'San Quintin',
        'desc': 'Baja kelp beds. Open coast with strong current drift.',
        'bbox': {'west': -116.4, 'south': 30.3, 'east': -115.8, 'north': 30.8},
    },
    'isla-cedros': {
        'name': 'Isla Cedros',
        'desc': 'One of the largest kelp forests in the world. Produces massive offshore rafts.',
        'bbox': {'west': -116.0, 'south': 27.8, 'east': -115.0, 'north': 28.5},
    },
    'isla-guadalupe': {
        'name': 'Isla Guadalupe',
        'desc': 'Remote volcanic island 240km offshore. Kelp forests on north/west side, paddies drift into open Pacific.',
        'bbox': {'west': -118.7, 'south': 28.7, 'east': -118.1, 'north': 29.3},
    },
    # --- Ground truth validation targets (from fishing reports Apr 2026) ---
    'nine-mile-bank': {
        'name': 'Nine Mile Bank (Ground Truth)',
        'desc': 'Active yellowtail fishing on kelp paddies. JD Big Game + SD fishing reports Apr 2026.',
        'bbox': {'west': -117.6, 'south': 32.3, 'east': -117.1, 'north': 32.7},
    },
    'ensenada-offshore': {
        'name': 'Ensenada Offshore Corridor (Ground Truth)',
        'desc': 'Kelp paddy corridor from JD Big Game GPS coordinates: 31.85N/117.53W, 31.67N/117.52W, 31.58N/117.40W.',
        'bbox': {'west': -117.8, 'south': 31.4, 'east': -117.2, 'north': 32.0},
    },
}


def run_hotspot_scan(
    spot_ids=None,
    days_back=14,
    max_cloud=15.0,
    max_scenes_per_spot=3,
    dry_run=False,
    verbose=False,
):
    """Scan specific hotspots for kelp paddies."""

    spots = spot_ids or list(HOTSPOTS.keys())
    total_detections = 0
    total_scenes = 0

    for spot_id in spots:
        if spot_id not in HOTSPOTS:
            log.warning(f'Unknown hotspot: {spot_id}')
            continue

        spot = HOTSPOTS[spot_id]
        log.info(f'\n{"="*60}')
        log.info(f'Scanning: {spot["name"]}')
        log.info(f'  {spot["desc"]}')
        log.info(f'  Bbox: {spot["bbox"]}')
        log.info(f'{"="*60}')

        scenes = search_scenes(
            days_back=days_back,
            max_cloud=max_cloud,
            max_results=max_scenes_per_spot,
            bbox=spot['bbox'],
        )

        if not scenes:
            log.info(f'  No scenes found for {spot["name"]}')
            continue

        # Filter already processed
        new_scenes = [s for s in scenes if not is_scene_processed(s['name'])]
        if not new_scenes:
            log.info(f'  All {len(scenes)} scenes already processed')
            continue

        log.info(f'  Found {len(new_scenes)} new scenes (of {len(scenes)} total)')

        if dry_run:
            for s in new_scenes:
                log.info(f'    {s["name"]} — cloud: {s.get("cloud_cover", "?")}% — {s.get("size_mb", 0):.0f} MB')
            continue

        for i, scene in enumerate(new_scenes):
            log.info(f'  [{i+1}/{len(new_scenes)}] {scene["name"]}')

            try:
                import tempfile
                from pathlib import Path

                with tempfile.TemporaryDirectory() as tmp:
                    work_dir = Path(tmp)
                    result = download_bands(scene['id'], work_dir)
                    bands = result['bands']
                    transform = result['transform']
                    crs = result['crs']
                    scl = result.get('scl')

                    if len(bands) < 3:
                        log.warning(f'    Only {len(bands)} bands, skipping')
                        continue

                    ocean_frac = estimate_ocean_fraction(scl, bands)
                    if ocean_frac < MIN_OCEAN_FRACTION:
                        log.info(f'    {ocean_frac:.0%} ocean, skipping land tile')
                        mark_scene_processed(scene['name'])
                        continue

                    # Lazy import processing modules
                    from indices import compute_all_indices
                    from threshold_detector import detect
                    from ml_detector import refine_detections

                    indices_data = compute_all_indices(bands)
                    detections = detect(indices_data, transform=transform, crs=crs, bands=bands, scl=scl)
                    detections = refine_detections(detections, bands)

                    if detections:
                        for d in detections:
                            d['scene_id'] = scene['name']
                            d['detected_at'] = scene['date']
                            thumb = generate_thumbnail(
                                bands, transform, crs,
                                lat=d['lat'], lng=d['lng'],
                                width_px=2000, height_px=1500,
                            )
                            if thumb:
                                d['thumbnail_b64'] = thumb

                        count = write_detections(detections)
                        total_detections += count
                        log.info(f'    {count} kelp paddies detected at {spot["name"]}!')
                    else:
                        log.info(f'    No paddies found')

                    mark_scene_processed(scene['name'])
                    total_scenes += 1

            except Exception as e:
                log.error(f'    Failed: {e}', exc_info=verbose)
                continue

    log.info(f'\nHotspot scan complete: {total_scenes} scenes, {total_detections} detections')
    return {'scenes': total_scenes, 'detections': total_detections}


def main():
    parser = argparse.ArgumentParser(description='Targeted kelp paddy scan at known hotspots')
    parser.add_argument('--spot', type=str, help='Scan specific hotspot (comma-separated IDs)')
    parser.add_argument('--list', action='store_true', help='List all hotspot IDs')
    parser.add_argument('--days', type=int, default=14, help='Days back to search (default: 14)')
    parser.add_argument('--max-cloud', type=float, default=15.0, help='Max cloud cover %% (default: 15)')
    parser.add_argument('--max-scenes', type=int, default=3, help='Max scenes per hotspot (default: 3)')
    parser.add_argument('--dry-run', action='store_true', help='Search only, no processing')
    parser.add_argument('--verbose', '-v', action='store_true', help='Debug logging')
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='[%(asctime)s] %(levelname)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    if args.list:
        print('\nAvailable hotspots:')
        for spot_id, spot in HOTSPOTS.items():
            print(f'  {spot_id:25s} — {spot["name"]}')
            print(f'  {"":25s}   {spot["desc"]}')
        return

    # Check env
    has_auth = os.environ.get('COPERNICUS_USERNAME') and os.environ.get('COPERNICUS_PASSWORD')
    has_client = os.environ.get('COPERNICUS_CLIENT_ID') and os.environ.get('COPERNICUS_CLIENT_SECRET')
    if not has_auth and not has_client:
        log.error('Missing Copernicus credentials')
        sys.exit(1)

    spot_ids = args.spot.split(',') if args.spot else None

    run_hotspot_scan(
        spot_ids=spot_ids,
        days_back=args.days,
        max_cloud=args.max_cloud,
        max_scenes_per_spot=args.max_scenes,
        dry_run=args.dry_run,
        verbose=args.verbose,
    )


if __name__ == '__main__':
    main()
