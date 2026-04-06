"""Generate current vector GeoJSON for map display."""
import logging
import numpy as np

log = logging.getLogger('drift-prediction')

# Subsample to roughly this many arrows
TARGET_ARROWS = 500
# Arrow length scale (degrees per m/s)
ARROW_SCALE = 0.03


def generate_vectors(current_field: dict) -> dict:
    """
    Subsample the current field and convert to GeoJSON arrows.

    Returns GeoJSON FeatureCollection of LineStrings.
    Each feature has properties: speed_knots, direction_deg
    """
    lat = current_field['lat']
    lon = current_field['lon']
    u = current_field['u']
    v = current_field['v']

    # Calculate subsample step
    total_points = len(lat) * len(lon)
    step = max(1, int(np.sqrt(total_points / TARGET_ARROWS)))

    features = []

    for i in range(0, len(lat), step):
        for j in range(0, len(lon), step):
            u_val = float(u[i, j])
            v_val = float(v[i, j])

            speed = np.sqrt(u_val**2 + v_val**2)
            if speed < 0.01:  # skip near-zero currents
                continue

            speed_knots = round(speed * 1.94384, 2)  # m/s to knots
            direction = round(float(np.degrees(np.arctan2(u_val, v_val)) % 360), 1)

            # Arrow: line from point to offset in flow direction
            start_lng = float(lon[j])
            start_lat = float(lat[i])
            end_lng = start_lng + u_val * ARROW_SCALE
            end_lat = start_lat + v_val * ARROW_SCALE

            features.append({
                'type': 'Feature',
                'properties': {
                    'speed_knots': speed_knots,
                    'direction_deg': direction,
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [
                        [start_lng, start_lat],
                        [end_lng, end_lat],
                    ],
                },
            })

    log.info(f'Generated {len(features)} current vectors (step={step})')

    return {
        'type': 'FeatureCollection',
        'features': features,
    }
