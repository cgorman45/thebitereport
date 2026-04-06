"""Kelp detection pipeline orchestrator."""
import logging
import tempfile
from pathlib import Path
from datetime import datetime

from copernicus import search_scenes, download_bands
from indices import compute_all_indices
from threshold_detector import detect
from ml_detector import refine_detections
from db import write_detections, get_last_processed_time

log = logging.getLogger('kelp-detection')


def run_pipeline() -> dict:
    """
    Run the full kelp detection pipeline:
    1. Check for new Sentinel-2 scenes
    2. Download bands
    3. Compute spectral indices
    4. Run threshold detection
    5. Refine with ML (if available)
    6. Write to Supabase

    Returns summary dict with scene and detection counts.
    """
    # Check what we've already processed
    last_processed = get_last_processed_time()
    log.info(f'Last processed: {last_processed or "never"}')

    # Search for new scenes
    scenes = search_scenes(since=last_processed)

    if not scenes:
        log.info('No new Sentinel-2 scenes available')
        return {'scenes_processed': 0, 'detections': 0}

    total_detections = 0
    scenes_processed = 0

    for scene in scenes:
        log.info(f'Processing scene: {scene["name"]} (date: {scene["date"]}, cloud: {scene.get("cloud_cover", "?")}%)')

        try:
            with tempfile.TemporaryDirectory() as tmp:
                work_dir = Path(tmp)

                # Download bands
                bands = download_bands(scene['id'], work_dir)

                if len(bands) < 4:
                    log.warning(f'Scene {scene["name"]}: only {len(bands)} bands available, skipping')
                    continue

                # Compute spectral indices
                indices_data = compute_all_indices(bands)

                # Run threshold detection
                # Note: transform would come from rasterio dataset — for now use None
                # and rely on Copernicus scene metadata for georeferencing
                detections = detect(indices_data)

                # Refine with ML
                detections = refine_detections(detections, bands)

                if detections:
                    # Add scene metadata to each detection
                    for d in detections:
                        d['scene_id'] = scene['name']
                        d['detected_at'] = scene['date']

                    # Write to Supabase
                    count = write_detections(detections)
                    total_detections += count
                else:
                    log.info(f'No kelp detections in scene {scene["name"]}')

                scenes_processed += 1

        except Exception as e:
            log.error(f'Failed to process scene {scene["name"]}: {e}', exc_info=True)
            continue

    return {
        'scenes_processed': scenes_processed,
        'detections': total_detections,
    }
