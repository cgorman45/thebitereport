"""Supabase client for writing kelp detections and tracking processed scenes."""
import os
import json
import logging

log = logging.getLogger('kelp-detection')

_client = None


def get_client():
    global _client
    if _client is None:
        from supabase import create_client
        url = os.environ['NEXT_PUBLIC_SUPABASE_URL']
        key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
        _client = create_client(url, key)
    return _client


def write_detections(detections: list[dict]) -> int:
    """Write kelp detections to Supabase. Returns count written."""
    if not detections:
        return 0

    client = get_client()

    rows = []
    for d in detections:
        rows.append({
            'scene_id': d['scene_id'],
            'detected_at': d['detected_at'],
            'lat': d['lat'],
            'lng': d['lng'],
            'area_m2': d['area_m2'],
            'confidence': d['confidence'],
            'method': d.get('method', 'threshold'),
            'polygon': json.dumps(d['polygon']),
            'indices': json.dumps(d.get('indices')) if d.get('indices') else None,
            'thumbnail_b64': d.get('thumbnail_b64'),
        })

    # Batch insert in chunks to avoid Supabase payload/timeout limits
    BATCH_SIZE = 20
    total_written = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        result = client.table('kelp_detections').insert(batch).execute()
        total_written += len(result.data) if result.data else 0

    log.info(f'Wrote {total_written} detections to Supabase')
    return total_written


def get_last_processed_time():
    """Get the most recent detection timestamp to avoid reprocessing."""
    try:
        client = get_client()
    except Exception:
        return None
    result = (client.table('kelp_detections')
              .select('detected_at')
              .order('detected_at', desc=True)
              .limit(1)
              .execute())
    if result.data:
        return result.data[0]['detected_at']
    return None


# --- Scene tracking for resume capability ---
# Uses a simple local file to track which scenes have been processed.
# This avoids reprocessing scenes after a pipeline crash/restart.

_PROCESSED_FILE = '/tmp/kelp-detection-processed.json'


def _load_processed() -> set[str]:
    """Load set of processed scene names from local tracking file."""
    try:
        with open(_PROCESSED_FILE) as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def _save_processed(processed: set[str]):
    """Save processed scene set to local tracking file."""
    with open(_PROCESSED_FILE, 'w') as f:
        json.dump(list(processed), f)


def is_scene_processed(scene_name: str) -> bool:
    """Check if a scene has already been processed."""
    return scene_name in _load_processed()


def mark_scene_processed(scene_name: str):
    """Mark a scene as processed (won't be reprocessed on next run)."""
    processed = _load_processed()
    processed.add(scene_name)
    _save_processed(processed)
    log.debug(f'Marked scene as processed: {scene_name}')
