// src/lib/ocean-data/tile-renderer.ts

import sharp from 'sharp';
import type { RGBA } from './colormap';

export async function renderGridToPng(
  values: number[][],
  colormapFn: (value: number) => RGBA,
): Promise<Buffer> {
  const height = values.length;
  const width = values[0]?.length ?? 0;
  if (height === 0 || width === 0) {
    throw new Error('Empty grid');
  }

  const rgba = Buffer.alloc(width * height * 4);

  for (let latIdx = 0; latIdx < height; latIdx++) {
    const pngRow = height - 1 - latIdx;
    for (let lngIdx = 0; lngIdx < width; lngIdx++) {
      const [r, g, b, a] = colormapFn(values[latIdx][lngIdx]);
      const offset = (pngRow * width + lngIdx) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
