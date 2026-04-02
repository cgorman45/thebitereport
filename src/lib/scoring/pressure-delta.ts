import type { FactorScore } from '@/types';

const MB_TO_INHG = 1 / 33.8639;

function getLabel(score: number): string {
  if (score <= 2) return 'Poor';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Good';
  return 'Excellent';
}

export function scorePressureDelta(
  pressures: number[],
  currentIndex: number
): FactorScore {
  // Need at least 3 hours of history
  if (currentIndex < 3 || pressures.length <= currentIndex) {
    return {
      name: 'pressureDelta',
      score: 5,
      label: 'Moderate',
      details: 'Insufficient pressure history to calculate trend',
    };
  }

  // 3-hour rate of change in inHg
  const currentInHg = pressures[currentIndex] * MB_TO_INHG;
  const threeHoursAgoInHg = pressures[currentIndex - 3] * MB_TO_INHG;
  const delta = currentInHg - threeHoursAgoInHg; // positive = rising, negative = dropping
  const absDelta = Math.abs(delta);

  const currentStr = currentInHg.toFixed(3);

  let score: number;
  let details: string;

  if (delta < 0) {
    // Pressure dropping — fish feed as pressure falls
    if (absDelta < 0.02) {
      score = 7;
      details = `Pressure barely dropping (${delta.toFixed(3)} inHg/3hr) — decent activity`;
    } else if (absDelta <= 0.06) {
      score = 8;
      details = `Pressure slowly dropping (${delta.toFixed(3)} inHg/3hr) — fish feeding`;
    } else if (absDelta <= 0.10) {
      score = 10;
      details = `Rapid pressure drop (${delta.toFixed(3)} inHg/3hr) — feeding frenzy likely!`;
    } else {
      // Very rapid drop — event bonus keeps it at 10, could indicate storm
      score = 10;
      details = `Very rapid pressure drop (${delta.toFixed(3)} inHg/3hr) — major event, intense bite!`;
    }
  } else {
    // Pressure rising — fish slow after fronts pass
    if (absDelta < 0.02) {
      // Nearly stable
      score = 7;
      details = `Pressure nearly stable at ${currentStr} inHg — decent conditions`;
    } else if (absDelta <= 0.06) {
      score = 5;
      details = `Pressure slowly rising (${delta.toFixed(3)} inHg/3hr) — fish slowing down`;
    } else if (absDelta <= 0.10) {
      score = 4;
      details = `Pressure rapidly rising (${delta.toFixed(3)} inHg/3hr) — post-front lull`;
    } else {
      // Very rapid rise — event factor, some bonus
      score = 5;
      details = `Very rapid pressure rise (${delta.toFixed(3)} inHg/3hr) — unsettled, watch for breaks`;
    }
  }

  return {
    name: 'pressureDelta',
    score,
    label: getLabel(score),
    details,
  };
}
