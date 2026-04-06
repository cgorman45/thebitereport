// src/lib/ocean-data/colormap.ts

export type RGBA = [number, number, number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sstColormap(valueF: number): RGBA {
  if (isNaN(valueF)) return [0, 0, 0, 0];

  const min = 55;
  const max = 72;
  const t = Math.max(0, Math.min(1, (valueF - min) / (max - min)));

  const stops: [number, RGBA][] = [
    [0.0, [0, 0, 255, 200]],
    [0.25, [0, 255, 255, 200]],
    [0.5, [255, 255, 0, 200]],
    [0.75, [255, 140, 0, 200]],
    [1.0, [255, 0, 0, 200]],
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const st = (t - t0) / (t1 - t0);
      return [
        Math.round(lerp(c0[0], c1[0], st)),
        Math.round(lerp(c0[1], c1[1], st)),
        Math.round(lerp(c0[2], c1[2], st)),
        Math.round(lerp(c0[3], c1[3], st)),
      ];
    }
  }

  return stops[stops.length - 1][1];
}

export function chlorophyllColormap(value: number): RGBA {
  if (isNaN(value)) return [0, 0, 0, 0];

  const min = 0;
  const max = 10;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return [
    0,
    Math.round(lerp(80, 200, t)),
    Math.round(lerp(40, 80, t)),
    Math.round(lerp(0, 210, t)),
  ];
}

export function cToF(celsius: number): number {
  return celsius * 9 / 5 + 32;
}

export function kelpHeatmapColormap(density: number, maxDensity: number): RGBA {
  if (isNaN(density) || density <= 0) return [0, 0, 0, 0];
  const t = Math.max(0, Math.min(1, density / maxDensity));
  // transparent → yellow → orange → red
  const stops: [number, RGBA][] = [
    [0.0, [255, 255, 0, 40]],
    [0.33, [255, 200, 0, 140]],
    [0.66, [255, 140, 0, 190]],
    [1.0, [255, 0, 0, 220]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const st = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * st),
        Math.round(c0[1] + (c1[1] - c0[1]) * st),
        Math.round(c0[2] + (c1[2] - c0[2]) * st),
        Math.round(c0[3] + (c1[3] - c0[3]) * st),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export function driftColormap(probability: number): RGBA {
  if (isNaN(probability) || probability <= 0) return [0, 0, 0, 0];
  const t = Math.max(0, Math.min(1, probability));
  const stops: [number, RGBA][] = [
    [0.0, [128, 0, 255, 40]],
    [0.33, [168, 85, 247, 140]],
    [0.66, [236, 72, 153, 190]],
    [1.0, [255, 0, 0, 220]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const st = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * st),
        Math.round(c0[1] + (c1[1] - c0[1]) * st),
        Math.round(c0[2] + (c1[2] - c0[2]) * st),
        Math.round(c0[3] + (c1[3] - c0[3]) * st),
      ];
    }
  }
  return stops[stops.length - 1][1];
}
