"""Supabase client for drift prediction results."""
import os
import json
import logging
from datetime import datetime, timedelta
from supabase import create_client

log = logging.getLogger('drift-prediction')
_client = None

def get_client():
    global _client
    if _client is None:
        url = os.environ['NEXT_PUBLIC_SUPABASE_URL']
        key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
        _client = create_client(url, key)
    return _client

def write_drift_prediction(grid_data: dict, bounds: dict, forecast_hours: int = 48):
    """Write drift probability grid to Supabase."""
    client = get_client()
    valid_until = (datetime.utcnow() + timedelta(hours=forecast_hours)).isoformat()
    row = {
        'lat_min': bounds['lat_min'],
        'lat_max': bounds['lat_max'],
        'lng_min': bounds['lng_min'],
        'lng_max': bounds['lng_max'],
        'grid_data': json.dumps(grid_data),
        'forecast_hours': forecast_hours,
        'valid_until': valid_until,
    }
    result = client.table('drift_predictions').insert(row).execute()
    log.info(f'Wrote drift prediction (valid until {valid_until})')
    return result

def write_current_vectors(geojson: dict):
    """Write current vector GeoJSON to Supabase."""
    client = get_client()
    valid_until = (datetime.utcnow() + timedelta(hours=12)).isoformat()
    row = {
        'vectors': json.dumps(geojson),
        'valid_until': valid_until,
    }
    result = client.table('current_vectors').insert(row).execute()
    log.info(f'Wrote {len(geojson.get("features", []))} current vectors')
    return result
