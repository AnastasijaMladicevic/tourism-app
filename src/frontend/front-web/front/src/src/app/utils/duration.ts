/**
 * Formats a duration in minutes as a compact string.
 * Examples: 45 → "45m", 60 → "1h", 90 → "1h 30m", 120 → "2h"
 */
export function formatDurationCompact(minutes: number): string {
  if (!minutes || minutes <= 0) {
    return '';
  }

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
