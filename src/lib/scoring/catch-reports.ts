import type { CatchReport, FactorScore } from '@/types';
import { getScoreLabel as getLabel } from '@/lib/utils';

export function scoreCatchReports(
  reports: CatchReport[],
  locationSlug: string,
  date: string
): FactorScore {
  const cutoff = new Date(date);
  // Look back 48 hours from the given date
  cutoff.setHours(cutoff.getHours() - 48);

  const recent = reports.filter((r) => {
    if (r.locationSlug !== locationSlug) return false;
    const reportDate = new Date(r.date);
    return reportDate >= cutoff;
  });

  if (recent.length === 0) {
    return {
      name: 'catchReports',
      score: 5,
      label: 'Moderate',
      details: 'No recent reports — fishing may still be good',
    };
  }

  // Base score from report count
  let baseScore: number;
  if (recent.length <= 2) {
    baseScore = 6;
  } else if (recent.length <= 5) {
    baseScore = 7;
  } else if (recent.length <= 10) {
    baseScore = 8;
  } else {
    baseScore = 9;
  }

  // Bonus if any reports mention high catch counts (> 10 fish per report)
  const hotReport = recent.some((r) => r.count > 10);
  const bonus = hotReport ? 1 : 0;

  const score = Math.min(10, baseScore + bonus);

  // Summarize species if available
  const speciesMentioned = [...new Set(recent.map((r) => r.species).filter(Boolean))];
  const speciesNote =
    speciesMentioned.length > 0
      ? ` (${speciesMentioned.slice(0, 3).join(', ')})`
      : '';

  const activityLabel =
    score >= 9
      ? 'Hot bite reported!'
      : score >= 7
        ? 'Active bite reported'
        : 'Some recent activity reported';

  return {
    name: 'catchReports',
    score,
    label: getLabel(score),
    details: `${activityLabel} — ${recent.length} report${recent.length !== 1 ? 's' : ''} in last 48 hrs${speciesNote}`,
  };
}
