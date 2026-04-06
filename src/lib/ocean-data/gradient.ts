// src/lib/ocean-data/gradient.ts

import { contours } from 'd3-contour';
import type { GridData } from './erddap';

export function sobelGradient(values: number[][]): number[][] {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0),
  );

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const v = (dy: number, dx: number) => values[y + dy]?.[x + dx] ?? NaN;
      if (
        [v(-1, -1), v(-1, 0), v(-1, 1), v(0, -1), v(0, 1), v(1, -1), v(1, 0), v(1, 1)]
          .some(isNaN)
      ) continue;

      const gx =
        -v(-1, -1) + v(-1, 1) +
        -2 * v(0, -1) + 2 * v(0, 1) +
        -v(1, -1) + v(1, 1);

      const gy =
        -v(-1, -1) - 2 * v(-1, 0) - v(-1, 1) +
        v(1, -1) + 2 * v(1, 0) + v(1, 1);

      result[y][x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return result;
}

export function extractBreaks(
  grid: GridData,
  threshold: number = 0.5,
): GeoJSON.FeatureCollection {
  const gradient = sobelGradient(grid.values);
  const rows = gradient.length;
  const cols = gradient[0]?.length ?? 0;

  const flat: number[] = new Array(rows * cols).fill(0);
  for (let y = 0; y < rows; y++) {
    const flippedY = rows - 1 - y;
    for (let x = 0; x < cols; x++) {
      flat[flippedY * cols + x] = gradient[y][x];
    }
  }

  const contourGen = contours().size([cols, rows]).thresholds([threshold]);
  const contourResults = contourGen(flat);

  const features: GeoJSON.Feature[] = [];
  const latRange = grid.lat[grid.lat.length - 1] - grid.lat[0];
  const lngRange = grid.lng[grid.lng.length - 1] - grid.lng[0];

  for (const contour of contourResults) {
    for (const polygon of contour.coordinates) {
      for (const ring of polygon) {
        const lngLat = ring.map((pos) => {
          const px = pos[0];
          const py = pos[1];
          return [
            grid.lng[0] + (px / (cols - 1)) * lngRange,
            grid.lat[grid.lat.length - 1] - (py / (rows - 1)) * latRange,
          ];
        });

        if (lngLat.length >= 2) {
          features.push({
            type: 'Feature',
            properties: { gradient: threshold },
            geometry: { type: 'LineString', coordinates: lngLat },
          });
        }
      }
    }
  }

  return { type: 'FeatureCollection', features };
}
