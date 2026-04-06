"""Load kelp forest data and extract drift seed points."""
import logging
import json
from pathlib import Path
import numpy as np

log = logging.getLogger('drift-prediction')

DATA_DIR = Path(__file__).parent / 'data'


def load_kelp_forests() -> list[dict]:
    """
    Load kelp forest polygons from static GeoJSON.
    Returns list of { lat, lng } seed points along kelp forest edges.

    If no data file exists yet, returns default SoCal kelp forest locations
    based on known kelp bed positions.
    """
    geojson_path = DATA_DIR / 'kelp_forests.geojson'

    if geojson_path.exists():
        with open(geojson_path) as f:
            data = json.load(f)
        return _extract_edge_points(data)

    # Default seed points: known SoCal kelp forest locations
    # These represent major kelp beds along the coast
    log.info('Using default kelp forest seed points (no GeoJSON file found)')
    return _default_seed_points()


def _extract_edge_points(geojson: dict) -> list[dict]:
    """Extract offshore edge points from kelp forest polygons."""
    points = []
    for feature in geojson.get('features', []):
        geom = feature.get('geometry', {})
        if geom.get('type') == 'Polygon':
            # Use the outermost ring, sample every 10th point
            coords = geom['coordinates'][0]
            for i in range(0, len(coords), 10):
                points.append({'lat': coords[i][1], 'lng': coords[i][0]})
        elif geom.get('type') == 'MultiPolygon':
            for polygon in geom['coordinates']:
                coords = polygon[0]
                for i in range(0, len(coords), 10):
                    points.append({'lat': coords[i][1], 'lng': coords[i][0]})

    log.info(f'Extracted {len(points)} seed points from kelp forest data')
    return points


def _default_seed_points() -> list[dict]:
    """Known SoCal kelp forest locations for seeding drift simulation."""
    # Major kelp beds from Point Conception to the Mexican border
    beds = [
        # Santa Barbara / Ventura
        (34.40, -119.85), (34.38, -119.70), (34.35, -119.55),
        (34.30, -119.30), (34.28, -119.20),
        # Channel Islands
        (34.05, -119.80), (34.00, -119.55), (33.95, -119.40),
        (33.90, -119.05), (33.95, -118.55),
        # Palos Verdes / LA
        (33.75, -118.42), (33.72, -118.40), (33.70, -118.35),
        # Orange County
        (33.60, -117.95), (33.55, -117.85), (33.48, -117.75),
        (33.42, -117.68), (33.38, -117.62),
        # San Diego
        (33.20, -117.42), (33.10, -117.32), (32.95, -117.28),
        (32.85, -117.27), (32.75, -117.25), (32.65, -117.24),
        # Coronado Islands (Mexico side, drift toward SoCal)
        (32.45, -117.25), (32.40, -117.28),
    ]

    # Add slight offshore variation to each seed point
    points = []
    for lat, lng in beds:
        for offset in [0, -0.02, -0.04]:  # progressively offshore
            points.append({'lat': lat, 'lng': lng + offset})

    log.info(f'Using {len(points)} default kelp forest seed points')
    return points
