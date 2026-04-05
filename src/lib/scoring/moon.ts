import type { FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

export function scoreMoon(
  moonPhase: number,
  moonIllumination: number,
  hour: number,
  moonrise: number | null,
  moonset: number | null
): FactorScore {
  // moonPhase: 0 = new moon, 0.5 = full moon (suncalc convention)
  let baseScore: number;
  let phaseName: string;

  if (moonPhase <= 0.05 || moonPhase >= 0.95) {
    baseScore = 9;
    phaseName = 'New moon';
  } else if (moonPhase >= 0.45 && moonPhase <= 0.55) {
    baseScore = 8;
    phaseName = 'Full moon';
  } else if (
    (moonPhase >= 0.2 && moonPhase <= 0.3) ||
    (moonPhase >= 0.7 && moonPhase <= 0.8)
  ) {
    baseScore = 5;
    phaseName = moonPhase < 0.5 ? 'First quarter' : 'Last quarter';
  } else if (moonPhase < 0.2 || (moonPhase > 0.3 && moonPhase < 0.45)) {
    // Waxing crescent or waxing gibbous
    baseScore = 6;
    phaseName = moonPhase < 0.3 ? 'Waxing crescent' : 'Waxing gibbous';
  } else {
    // Waning gibbous or waning crescent
    baseScore = 6;
    phaseName = moonPhase > 0.55 ? 'Waning gibbous' : 'Waning crescent';
  }

  // Bonus if within ±1 hour of moonrise or moonset
  let riseSetBonus = 0;
  let riseSetNote = '';

  if (moonrise !== null && Math.abs(hour - moonrise) <= 1) {
    riseSetBonus = 1;
    riseSetNote = ` — moonrise at ${moonrise % 12 || 12}:00 ${moonrise < 12 ? 'AM' : 'PM'}`;
  } else if (moonset !== null && Math.abs(hour - moonset) <= 1) {
    riseSetBonus = 1;
    riseSetNote = ` — moonset at ${moonset % 12 || 12}:00 ${moonset < 12 ? 'AM' : 'PM'}`;
  }

  const score = Math.min(10, baseScore + riseSetBonus);
  const illumPct = Math.round(moonIllumination * 100);

  return {
    name: 'moonPhase',
    score,
    label: getLabel(score),
    details: `${phaseName} (${illumPct}% illuminated)${riseSetNote}`,
  };
}
