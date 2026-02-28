// ─────────────────────────────────────────────────────────────────────────────
// utils/formatDate.ts — Human-readable date/time formatting helpers
//
// All formatters accept ISO 8601 strings (as returned by the API) and return
// locale-sensitive strings suitable for display in the UI.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format an ISO 8601 date string as a short date, e.g. "Feb 22, 2026".
 */
export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an ISO 8601 date string as a date + time, e.g. "Feb 22, 2026, 03:00 AM".
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return a relative time string, e.g. "2 days ago", "just now", "in 3 hours".
 * Falls back to formatShortDate for dates older than 30 days.
 */
export function formatRelativeDate(isoString: string): string {
  const now = Date.now();
  const date = new Date(isoString);
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 2) return 'yesterday';
  if (diffDay < 30) return `${diffDay} days ago`;
  return formatShortDate(isoString);
}
