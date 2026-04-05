import type { FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

/** Format a decimal hour like 6.5 -> "6:30 AM" */
function formatHour(decHour: number): string {
  const h = Math.floor(decHour);
  const m = Math.round((decHour - h) * 60);
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function scoreTimeOfDay(
  hour: number,
  sunrise: number,
  sunset: number
): FactorScore {
  // Dawn window: sunrise ± 1 hour
  const dawnStart = sunrise - 1;
  const dawnEnd = sunrise + 1;

  // Dusk window: sunset ± 1 hour
  const duskStart = sunset - 1;
  const duskEnd = sunset + 1;

  let score: number;
  let details: string;

  if (hour >= dawnStart && hour <= dawnEnd) {
    score = 10;
    details = `Dawn — prime feeding window near sunrise (${formatHour(sunrise)})`;
  } else if (hour >= duskStart && hour <= duskEnd) {
    score = 10;
    details = `Dusk — prime feeding window near sunset (${formatHour(sunset)})`;
  } else if (hour > dawnEnd && hour <= dawnEnd + 2) {
    // First 2 hours after dawn window closes
    score = 9;
    details = `Early morning — fish still actively feeding`;
  } else if (hour >= duskStart - 2 && hour < duskStart) {
    // 2 hours before dusk window
    score = 9;
    details = `Late afternoon — fish starting to feed before dusk`;
  } else if (hour > dawnEnd + 2 && hour <= dawnEnd + 4) {
    // 2 hours after the post-dawn 9-window (early morning stretch)
    score = 7;
    details = `Morning — decent activity winding down`;
  } else if (hour >= duskStart - 4 && hour < duskStart - 2) {
    // 2 hours before the pre-dusk 9-window (late afternoon stretch)
    score = 7;
    details = `Afternoon — activity picking back up toward dusk`;
  } else if (hour > dawnEnd + 4 && hour < duskStart - 4) {
    // Midday
    score = 4;
    details = `Midday — fish typically inactive in deeper, cooler water`;
  } else {
    // Night (not in dawn or dusk windows)
    score = 5;
    details = `Night — some species active, slower overall`;
  }

  return {
    name: 'timeOfDay',
    score,
    label: getLabel(score),
    details,
  };
}
