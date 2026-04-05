import type { FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

interface TidePrediction {
  t: string;
  v: string;
  type: 'H' | 'L';
}

/** Parse a NOAA tide time string like "2026-04-02 14:30" into decimal hours */
function toDecimalHour(t: string): number {
  const date = new Date(t);
  return date.getHours() + date.getMinutes() / 60;
}

export function scoreTides(
  hour: number,
  tidePredictions: TidePrediction[]
): FactorScore {
  if (!tidePredictions || tidePredictions.length === 0) {
    return {
      name: 'tides',
      score: 5,
      label: 'Moderate',
      details: 'No tide data available',
    };
  }

  // Convert predictions to decimal hours and sort by time
  const tides = tidePredictions
    .map((p) => ({
      hour: toDecimalHour(p.t),
      level: parseFloat(p.v),
      type: p.type,
      t: p.t,
    }))
    .sort((a, b) => a.hour - b.hour);

  // Find the two tide events surrounding the current hour
  let prevTide = tides[0];
  let nextTide = tides[tides.length - 1];

  for (let i = 0; i < tides.length - 1; i++) {
    if (tides[i].hour <= hour && tides[i + 1].hour > hour) {
      prevTide = tides[i];
      nextTide = tides[i + 1];
      break;
    }
  }

  // Hours since last tide event and hours until next event
  const hoursSincePrev = hour - prevTide.hour;
  const hoursUntilNext = nextTide.hour - hour;
  const totalInterval = nextTide.hour - prevTide.hour;

  // Tide range (swing magnitude) — larger swing = more current = better fishing
  const tideSwing = Math.abs(nextTide.level - prevTide.level);

  // Swing bonus: 0–2 extra points for big swings (> 4 ft is large in SoCal)
  const swingBonus = Math.min(2, tideSwing / 4);

  let baseScore: number;
  let details: string;

  const nearTransition = Math.min(hoursSincePrev, hoursUntilNext);

  if (nearTransition <= 1) {
    // Within 1 hour of a high or low — peak movement / transition
    const transitionType = hoursUntilNext <= 1 ? nextTide.type : prevTide.type;
    const isIncoming =
      transitionType === 'H' ||
      (transitionType === 'L' && prevTide.type === 'H');
    baseScore = isIncoming ? 10 : 8;
    const eventTime = hoursUntilNext <= 1 ? nextTide.t : prevTide.t;
    const timeStr = new Date(eventTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    details = `${transitionType === 'H' ? 'High' : 'Low'} tide transition at ${timeStr}`;
  } else if (nearTransition <= 2) {
    // 1–2 hours from a transition — strong movement
    baseScore = 8;
    const nextTimeStr = new Date(nextTide.t).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    details = `${nextTide.type === 'H' ? 'Incoming' : 'Outgoing'} tide, ${nextTide.type === 'H' ? 'high' : 'low'} at ${nextTimeStr}`;
  } else if (totalInterval > 0) {
    // Determine how far through the run we are (0 = just left prev, 1 = at next)
    const progress = hoursSincePrev / totalInterval;
    if (progress < 0.25 || progress > 0.75) {
      // Early or late in the run — still decent movement
      baseScore = 7;
      details = `Active ${nextTide.type === 'H' ? 'incoming' : 'outgoing'} tide`;
    } else {
      // Slack water — middle of the run, lowest movement
      baseScore = 3;
      details = 'Slack tide — minimal current';
    }
  } else {
    baseScore = 5;
    details = 'Tidal data ambiguous';
  }

  const score = Math.min(10, Math.max(0, Math.round(baseScore + swingBonus)));

  return {
    name: 'tides',
    score,
    label: getLabel(score),
    details,
  };
}
