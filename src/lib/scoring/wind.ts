import type { FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

/**
 * Determine if wind is offshore for typical SoCal spots facing west/south.
 * Offshore winds blow FROM land TOWARD the ocean:
 * - For west-facing spots: winds from the east (45–135°)
 * - For south-facing spots: winds from the north (315–360° or 0–45°)
 * Combined: roughly 0–90° (north to east) or 270–360° (west to north)
 * per the spec = winds blowing out to sea off SoCal's mountain/valley terrain
 */
function isOffshoreWind(directionDeg: number): boolean {
  return (directionDeg >= 0 && directionDeg <= 90) ||
    (directionDeg >= 270 && directionDeg <= 360);
}

export function scoreWind(
  speedMph: number,
  gustsMph: number,
  directionDeg: number
): FactorScore {
  let baseScore: number;
  let windDesc: string;

  if (speedMph <= 5) {
    baseScore = 10;
    windDesc = 'Calm';
  } else if (speedMph <= 10) {
    baseScore = 8;
    windDesc = 'Light breeze';
  } else if (speedMph <= 15) {
    baseScore = 6;
    windDesc = 'Moderate wind';
  } else if (speedMph <= 20) {
    baseScore = 3;
    windDesc = 'Fresh wind';
  } else {
    baseScore = 1;
    windDesc = 'Strong wind';
  }

  // Gust penalty
  let gustPenalty = 0;
  if (gustsMph > 25) {
    gustPenalty = 1;
  }

  // Offshore wind bonus
  const offshore = isOffshoreWind(directionDeg);
  const offshoreBonus = offshore ? 1 : 0;

  const score = Math.min(10, Math.max(0, baseScore - gustPenalty + offshoreBonus));

  const dirLabel = offshore ? 'offshore' : 'onshore/cross-shore';
  const gustNote = gustsMph > 0 ? `, gusting ${gustsMph} mph` : '';
  const offshoreNote = offshore ? ' — offshore wind pushing bait out' : '';

  return {
    name: 'wind',
    score,
    label: getLabel(score),
    details: `${windDesc} at ${speedMph} mph${gustNote} (${directionDeg}° — ${dirLabel})${offshoreNote}`,
  };
}
