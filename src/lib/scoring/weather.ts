import type { FactorScore } from '@/types';

function getLabel(score: number): string {
  if (score <= 2) return 'Poor';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Good';
  return 'Excellent';
}

export function scoreWeather(
  weatherCode: number,
  cloudCover: number,
  precipitation: number
): FactorScore {
  let baseScore: number;
  let conditionLabel: string;

  if (weatherCode === 0 || weatherCode === 1) {
    baseScore = 9;
    conditionLabel = 'Clear skies';
  } else if (weatherCode === 2) {
    baseScore = 8;
    conditionLabel = 'Partly cloudy';
  } else if (weatherCode === 3) {
    baseScore = 6;
    conditionLabel = 'Overcast';
  } else if (weatherCode >= 45 && weatherCode <= 48) {
    baseScore = 5;
    conditionLabel = 'Foggy';
  } else if (weatherCode >= 51 && weatherCode <= 55) {
    baseScore = 4;
    conditionLabel = 'Drizzle';
  } else if (weatherCode >= 61 && weatherCode <= 65) {
    baseScore = 2;
    conditionLabel = 'Rain';
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    baseScore = 1;
    conditionLabel = 'Snow';
  } else if (weatherCode >= 80 && weatherCode <= 82) {
    baseScore = 3;
    conditionLabel = 'Showers';
  } else if (weatherCode >= 95 && weatherCode <= 99) {
    baseScore = 0;
    conditionLabel = 'Thunderstorm';
  } else {
    // Unknown code — default to moderate
    baseScore = 5;
    conditionLabel = 'Unknown conditions';
  }

  // Adjust down for heavy precipitation (> 5 mm/hr is considered heavy)
  if (precipitation > 10) {
    baseScore = Math.max(0, baseScore - 2);
  } else if (precipitation > 5) {
    baseScore = Math.max(0, baseScore - 1);
  }

  const score = Math.min(10, Math.max(0, baseScore));

  return {
    name: 'weather',
    score,
    label: getLabel(score),
    details: `${conditionLabel} — ${cloudCover}% cloud cover, ${precipitation.toFixed(1)} mm/hr precip`,
  };
}
