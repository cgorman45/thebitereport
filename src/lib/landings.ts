// Shared landing display names and colors used across the app

export const LANDING_DISPLAY_NAMES: Record<string, string> = {
  seaforth: 'Seaforth',
  fishermans: "Fisherman's",
  hm_landing: 'H&M Landing',
  point_loma: 'Point Loma SF',
  helgrens: "Helgren's",
  private_charter: 'Private Charter',
  unknown: 'Unknown',
};

export const LANDING_COLORS: Record<string, string> = {
  seaforth: '#00d4ff',
  fishermans: '#f97316',
  hm_landing: '#a855f7',
  point_loma: '#22c55e',
  helgrens: '#eab308',
  private_charter: '#ec4899',
  unknown: '#6b7280',
};

export function getLandingName(landing: string): string {
  return LANDING_DISPLAY_NAMES[landing] || landing;
}

export function getLandingColor(landing: string): string {
  return LANDING_COLORS[landing] || '#6b7280';
}
