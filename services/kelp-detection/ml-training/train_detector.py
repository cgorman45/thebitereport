#!/usr/bin/env python3
"""
Train a floating vegetation (kelp/Sargassum) detector using MARIDA dataset.

Phase 1: Transfer learning from MARIDA Sargassum labels
  - Binary classifier: floating vegetation vs ocean
  - Uses Sentinel-2 spectral bands + computed indices
  - Trains a lightweight random forest (no GPU needed)

Phase 2: Fine-tune with Floating Forests kelp annotations (future)
Phase 3: Validate with sequential time-series data (future)

Usage:
    python train_detector.py --manifest data/training/marida_manifest.json
"""
import os
import sys
import json
import argparse
import logging
from pathlib import Path

import numpy as np

log = logging.getLogger('ml-training')


def load_patches(manifest_path):
    """Load image patches and binary labels from manifest."""
    with open(manifest_path) as f:
        manifest = json.load(f)

    try:
        import rasterio
    except ImportError:
        log.error('rasterio required: pip install rasterio')
        sys.exit(1)

    X = []
    y = []
    target_classes = manifest['class_mapping']['target_classes']

    all_patches = manifest['patches']['positive'] + manifest['patches']['negative']
    log.info(f'Loading {len(all_patches)} patches...')

    for patch in all_patches:
        if 'image_file' not in patch or 'mask_file' not in patch:
            continue

        try:
            with rasterio.open(patch['image_file']) as src:
                img = src.read()

            with rasterio.open(patch['mask_file']) as src:
                mask = src.read(1)

            label = 1 if np.any(np.isin(mask, target_classes)) else 0

            # Compute patch-level features (mean, std, percentiles per band)
            features = []
            for b in range(img.shape[0]):
                band = img[b].astype(np.float32)
                valid = band[band > 0]
                if valid.size == 0:
                    features.extend([0] * 6)
                    continue
                features.extend([
                    np.mean(valid),
                    np.std(valid),
                    np.percentile(valid, 10),
                    np.percentile(valid, 50),
                    np.percentile(valid, 90),
                    np.percentile(valid, 99),
                ])

            X.append(features)
            y.append(label)

        except Exception as e:
            log.warning(f'Failed to load {patch.get("image_file")}: {e}')
            continue

    X = np.array(X)
    y = np.array(y)
    log.info(f'Loaded {len(X)} patches: {np.sum(y)} positive, {np.sum(y==0)} negative')
    return X, y


def train_random_forest(X, y):
    """Train a random forest classifier — fast, interpretable, no GPU needed."""
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report, confusion_matrix

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    log.info(f'Training random forest: {X_train.shape[0]} train, {X_test.shape[0]} test')

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_leaf=5,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )

    cv_scores = cross_val_score(clf, X_train, y_train, cv=5, scoring='f1')
    log.info(f'Cross-validation F1: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})')

    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    log.info(f'\nClassification Report:\n{classification_report(y_test, y_pred, target_names=["ocean", "floating_veg"])}')
    log.info(f'Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}')

    # Feature importance
    importances = clf.feature_importances_
    top_features = np.argsort(importances)[::-1][:10]
    log.info(f'\nTop 10 features by importance:')
    for i, idx in enumerate(top_features):
        log.info(f'  {i+1}. Feature {idx}: {importances[idx]:.4f}')

    return clf


def save_model(clf, output_dir):
    """Save trained model using joblib (safe serialization for sklearn)."""
    from joblib import dump
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    model_path = out_path / 'floating_veg_rf.joblib'
    dump(clf, model_path)
    log.info(f'Model saved to {model_path}')
    return model_path


def main():
    parser = argparse.ArgumentParser(description='Train floating vegetation detector')
    parser.add_argument('--manifest', type=str, default='data/training/marida_manifest.json')
    parser.add_argument('--output-dir', type=str, default='models')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='[%(asctime)s] %(levelname)s: %(message)s')

    X, y = load_patches(args.manifest)

    if len(X) == 0:
        log.error('No patches loaded. Check manifest and data paths.')
        sys.exit(1)

    clf = train_random_forest(X, y)
    save_model(clf, args.output_dir)


if __name__ == '__main__':
    main()
