import type { FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

const MB_TO_INHG = 1 / 33.8639;

export function scorePressure(pressureMb: number): FactorScore {
  const pressureInHg = pressureMb * MB_TO_INHG;
  const rounded = pressureInHg.toFixed(2);

  let score: number;
  let details: string;

  if (pressureInHg < 29.5) {
    score = 3;
    details = `Very low pressure at ${rounded} inHg — unsettled conditions`;
  } else if (pressureInHg < 29.8) {
    score = 5;
    details = `Low pressure at ${rounded} inHg — fish may be sluggish`;
  } else if (pressureInHg <= 30.2) {
    // Stable ideal range — interpolate between 8 and 9
    // Sweet spot is 29.9–30.1, taper slightly at edges
    const mid = 30.0;
    const dist = Math.abs(pressureInHg - mid);
    score = dist < 0.15 ? 9 : 8;
    details = `Stable pressure at ${rounded} inHg — ideal fishing conditions`;
  } else if (pressureInHg <= 30.5) {
    score = 6;
    details = `Rising pressure at ${rounded} inHg — fishing slowing`;
  } else {
    score = 3;
    details = `Very high pressure at ${rounded} inHg — tough conditions`;
  }

  return {
    name: 'barometricPressure',
    score,
    label: getLabel(score),
    details,
  };
}
