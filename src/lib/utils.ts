// ---------------------------------------------------------------------------
// Shared utility functions used across multiple components and lib modules.
// ---------------------------------------------------------------------------

/**
 * Map a 0–10 score to a colour hex string for consistent visual treatment.
 *   < 4  → red
 *   < 7  → yellow
 *   < 9  → green
 *   >= 9 → cyan
 */
export function getScoreColor(score: number): string {
  if (score < 4) return '#ef4444';
  if (score < 7) return '#eab308';
  if (score < 9) return '#22c55e';
  return '#00d4ff';
}

/**
 * Human-readable label for a 0–10 score (used by scoring modules).
 */
export function getScoreLabel(score: number): string {
  if (score <= 2) return 'Poor';
  if (score <= 4) return 'Fair';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'Good';
  return 'Excellent';
}

/**
 * Format an integer hour (0–23) to a short time string.
 *   0  → "12 AM"
 *   6  → "6 AM"
 *   12 → "12 PM"
 *   18 → "6 PM"
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Same as formatHour but with ":00" suffix (e.g. "6:00 AM").
 * Used in contexts that need the full time string.
 */
export function formatHourFull(hour: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${ampm}`;
}
