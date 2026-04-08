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
    """Known SoCal + Baja kelp forest locations for seeding drift simulation.

    The California Current flows southward — detachment events in SoCal frequently
    produce paddies that drift into Baja waters. Baja sources also produce paddies
    that drift offshore and along the coast.
    """
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
        # Coronado Islands
        (32.45, -117.25), (32.40, -117.28),
        # --- BAJA CALIFORNIA KEY KELP SOURCES ---
        # Ensenada / Punta Banda (major kelp forest)
        (31.85, -116.68), (31.80, -116.70), (31.75, -116.72),
        (31.72, -116.73), (31.70, -116.75),
        # Punta Banda kelp forest
        (31.68, -116.73), (31.66, -116.72), (31.64, -116.70),
        # San Quintin
        (30.55, -116.10), (30.48, -116.05), (30.40, -116.00),
        # Isla Cedros (major offshore kelp forest)
        (28.20, -115.25), (28.15, -115.22), (28.10, -115.18),
        (28.05, -115.20), (28.00, -115.25), (27.95, -115.30),
        # Isla Natividad (adjacent to Cedros)
        (27.88, -115.20), (27.85, -115.18), (27.82, -115.15),
        # Punta Eugenia
        (27.85, -115.08), (27.80, -115.05),
        # Bahia Tortugas
        (27.70, -114.92), (27.68, -114.88),
        # Bahia Asuncion
        (27.12, -114.35), (27.08, -114.30),
        # Punta Abreojos
        (26.72, -113.65), (26.68, -113.60),
        # Bahia Magdalena (southern Baja)
        (24.60, -112.15), (24.55, -112.10), (24.50, -112.05),
        # Cabo San Lucas area
        (22.95, -110.05), (22.90, -109.95),
    ]

    # Add slight offshore variation to each seed point
    points = []
    for lat, lng in beds:
        for offset in [0, -0.02, -0.04]:  # progressively offshore
            points.append({'lat': lat, 'lng': lng + offset})

    log.info(f'Using {len(points)} default kelp forest seed points')
    return points
