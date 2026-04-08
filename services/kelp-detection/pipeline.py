"""Kelp detection pipeline orchestrator.

Processes Sentinel-2 scenes from Copernicus Data Space:
1. Search for new scenes (since last processed)
2. Download bands + SCL
3. Check ocean fraction (skip land-dominated tiles)
4. Compute spectral indices (NDVI, FAI, FDI)
5. Run threshold detection with ocean + cloud masking
6. Optionally refine with ML model
7. Write detections to Supabase
"""
import logging
import tempfile
from pathlib import Path

from copernicus import search_scenes, download_bands, estimate_ocean_fraction, generate_thumbnail, MIN_OCEAN_FRACTION
from db import write_detections, get_last_processed_time, mark_scene_processed, is_scene_processed

# Lazy imports for processing modules (heavy deps, not needed for dry-run)
_indices_mod = None
_detector_mod = None
_ml_mod = None


def _get_modules():
    global _indices_mod, _detector_mod, _ml_mod
    if _indices_mod is None:
        from indices import compute_all_indices
        from threshold_detector import detect
        from ml_detector import refine_detections
        _indices_mod = compute_all_indices
        _detector_mod = detect
        _ml_mod = refine_detections
    return _indices_mod, _detector_mod, _ml_mod

log = logging.getLogger('kelp-detection')

# Full SoCal + Baja California coverage (down to Cabo San Lucas)
BBOX = {
    'lat_min': 22.0, 'lat_max': 35.0,
    'lng_min': -121.0, 'lng_max': -109.0,
}


def run_pipeline(
    days_back: int = 10,
    max_cloud: float = 20.0,
    max_scenes: int = 50,
    dry_run: bool = False,
) -> dict:
    """
    Run the full kelp detection pipeline.

    Args:
        days_back: how far back to search for scenes
        max_cloud: maximum cloud cover percentage
        max_scenes: max scenes to process per run
        dry_run: if True, search and log but don't download or process

    Returns summary dict with counts and details.
    """
    last_processed = get_last_processed_time()
    log.info(f'Last processed: {last_processed or "never"}')

    # Use days_back lookback instead of last_processed timestamp
    # (last_processed can be misleading if seed data was inserted)
    scenes = search_scenes(
        since=None,
        days_back=days_back,
        max_cloud=max_cloud,
        max_results=max_scenes,
    )

    if not scenes:
        log.info('No new Sentinel-2 scenes available')
        return {'scenes_found': 0, 'scenes_processed': 0, 'scenes_skipped': 0, 'detections': 0}

    # Filter out already-processed scenes
    new_scenes = [s for s in scenes if not is_scene_processed(s['name'])]
    skipped_already = len(scenes) - len(new_scenes)
    if skipped_already:
        log.info(f'Skipping {skipped_already} already-processed scenes')

    if dry_run:
        log.info(f'DRY RUN: would process {len(new_scenes)} scenes')
        for s in new_scenes:
            log.info(f'  {s["name"]} — {s["date"]} — cloud: {s.get("cloud_cover", "?")}% — {s.get("size_mb", 0):.0f} MB')
        return {
            'scenes_found': len(scenes),
            'scenes_processed': 0,
            'scenes_skipped': skipped_already,
            'detections': 0,
            'dry_run': True,
        }

    total_detections = 0
    scenes_processed = 0
    scenes_skipped_ocean = 0

    for i, scene in enumerate(new_scenes):
        log.info(f'[{i+1}/{len(new_scenes)}] Processing: {scene["name"]} '
                 f'(date: {scene["date"]}, cloud: {scene.get("cloud_cover", "?")}%)')

        try:
            with tempfile.TemporaryDirectory() as tmp:
                work_dir = Path(tmp)

                # Download bands + SCL + georeferencing
                result = download_bands(scene['id'], work_dir)
                bands = result['bands']
                transform = result['transform']
                crs = result['crs']
                scl = result.get('scl')

                if len(bands) < 3:
                    log.warning(f'Only {len(bands)} bands available — need at least B04, B08, B11. Skipping.')
                    continue

                # Check ocean fraction — skip land-dominated tiles
                ocean_frac = estimate_ocean_fraction(scl, bands)
                if ocean_frac < MIN_OCEAN_FRACTION:
                    log.info(f'Scene is {ocean_frac:.0%} ocean (need >{MIN_OCEAN_FRACTION:.0%}) — skipping land tile')
                    scenes_skipped_ocean += 1
                    mark_scene_processed(scene['name'])  # Don't re-process
                    continue

                log.info(f'Ocean fraction: {ocean_frac:.0%}')

                # Lazy-load processing modules
                compute_all_indices, detect, refine_detections = _get_modules()

                # Compute spectral indices
                indices_data = compute_all_indices(bands)

                # Run threshold detection with ocean + cloud masking
                detections = detect(
                    indices_data,
                    transform=transform,
                    crs=crs,
                    bands=bands,
                    scl=scl,
                )

                # Refine with ML (if model available)
                detections = refine_detections(detections, bands)

                if detections:
                    for d in detections:
                        d['scene_id'] = scene['name']
                        d['detected_at'] = scene['date']

                        # Generate satellite thumbnail for popup
                        thumb = generate_thumbnail(
                            bands, transform, crs,
                            lat=d['lat'], lng=d['lng'],
                            width_px=2000, height_px=1500,
                        )
                        if thumb:
                            d['thumbnail_b64'] = thumb

                    count = write_detections(detections)
                    total_detections += count
                    log.info(f'  → {count} kelp mats detected')
                else:
                    log.info(f'  → No kelp detections')

                mark_scene_processed(scene['name'])
                scenes_processed += 1

        except Exception as e:
            log.error(f'Failed to process {scene["name"]}: {e}', exc_info=True)
            continue

    summary = {
        'scenes_found': len(scenes),
        'scenes_processed': scenes_processed,
        'scenes_skipped': skipped_already + scenes_skipped_ocean,
        'scenes_skipped_land': scenes_skipped_ocean,
        'detections': total_detections,
    }
    log.info(f'Pipeline complete: {summary}')
    return summary
