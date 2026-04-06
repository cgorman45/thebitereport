"""Supabase client for writing kelp detections."""
import os
import json
import logging
from supabase import create_client

log = logging.getLogger('kelp-detection')

_client = None

def get_client():
    global _client
    if _client is None:
        url = os.environ['NEXT_PUBLIC_SUPABASE_URL']
        key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
        _client = create_client(url, key)
    return _client

def write_detections(detections: list[dict]) -> int:
    """Write kelp detections to Supabase. Returns count written."""
    if not detections:
        return 0

    client = get_client()

    # Batch insert
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
        })

    result = client.table('kelp_detections').insert(rows).execute()
    count = len(result.data) if result.data else 0
    log.info(f'Wrote {count} detections to Supabase')
    return count

def get_last_processed_time() -> str | None:
    """Get the most recent detection timestamp to avoid reprocessing."""
    client = get_client()
    result = (client.table('kelp_detections')
              .select('detected_at')
              .order('detected_at', desc=True)
              .limit(1)
              .execute())
    if result.data:
        return result.data[0]['detected_at']
    return None
