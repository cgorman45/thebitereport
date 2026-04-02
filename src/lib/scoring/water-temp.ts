import type { FactorScore } from '@/types';

function getLabel(score: number): string {
  if (score <= 2) return 'Poor';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Good';
  return 'Excellent';
}

export function scoreWaterTemp(tempF: number | null): FactorScore {
  if (tempF === null) {
    return {
      name: 'waterTemp',
      score: 5,
      label: 'Moderate',
      details: 'No water temperature data available',
    };
  }

  let score: number;
  let details: string;

  if (tempF < 50) {
    score = 2;
    details = `Cold water at ${tempF.toFixed(1)}°F — very few species active`;
  } else if (tempF < 55) {
    score = 4;
    details = `Cool water at ${tempF.toFixed(1)}°F — limited species activity`;
  } else if (tempF < 60) {
    score = 7;
    details = `Cool-cool water at ${tempF.toFixed(1)}°F — good for halibut and white seabass`;
  } else if (tempF <= 72) {
    // Prime SoCal range — interpolate 9–10
    score = tempF >= 64 && tempF <= 70 ? 10 : 9;
    details = `Prime water temp at ${tempF.toFixed(1)}°F — ideal SoCal conditions`;
  } else if (tempF <= 78) {
    score = 7;
    details = `Warm water at ${tempF.toFixed(1)}°F — good for tuna and dorado`;
  } else {
    score = 5;
    details = `Hot water at ${tempF.toFixed(1)}°F — most nearshore species stressed`;
  }

  return {
    name: 'waterTemp',
    score,
    label: getLabel(score),
    details,
  };
}
