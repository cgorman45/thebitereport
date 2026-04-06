"""
ML-based kelp detection using YOLOv8.

Currently a pass-through stub that returns threshold detections unchanged.
When a trained model is available:
1. Place the model weights at models/kelp-yolov8.pt
2. Set USE_ML=true in environment
3. The pipeline will run ML inference and merge with threshold results

Training a custom model:
- Collect labeled Sentinel-2 tiles with kelp annotations
- Use ultralytics CLI: yolo detect train data=kelp.yaml model=yolov8n.pt epochs=100
- Export: yolo export model=best.pt format=onnx
"""
import os
import logging
from pathlib import Path

log = logging.getLogger('kelp-detection')

MODEL_PATH = Path(__file__).parent / 'models' / 'kelp-yolov8.pt'
USE_ML = os.environ.get('USE_ML', 'false').lower() == 'true'


def refine_detections(
    threshold_detections: list[dict],
    bands: dict | None = None,
) -> list[dict]:
    """
    Refine threshold detections using ML model.

    Currently returns threshold detections unchanged.
    When ML is enabled, will:
    1. Tile the imagery into 640x640 patches
    2. Run YOLOv8 inference on each tile
    3. Merge ML detections with threshold detections
    4. Re-score confidence using ML probabilities
    """
    if not USE_ML or not MODEL_PATH.exists():
        log.info('ML detection disabled or model not found — using threshold results only')
        return threshold_detections

    # Future: ML inference
    log.info('ML detection enabled — running YOLOv8 inference...')
    try:
        from ultralytics import YOLO
        model = YOLO(str(MODEL_PATH))
        # TODO: tile imagery, run inference, merge results
        log.warning('ML inference not yet implemented — returning threshold results')
        return threshold_detections
    except Exception as e:
        log.error(f'ML inference failed: {e} — falling back to threshold results')
        return threshold_detections
