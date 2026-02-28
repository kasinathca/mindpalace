// ─────────────────────────────────────────────────────────────────────────────
// utils/truncateText.ts — Text truncation helpers
//
// Ensures UI strings fit within fixed-width containers without overflow.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate `text` to at most `maxLength` characters.
 * Appends `suffix` (default: "…") when truncation occurs.
 *
 * Truncation always falls on a word boundary when `wordBoundary` is true
 * (default), to avoid cutting words mid-character.
 */
export function truncateText(
  text: string,
  maxLength: number,
  options: { suffix?: string; wordBoundary?: boolean } = {},
): string {
  const { suffix = '…', wordBoundary = true } = options;

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - suffix.length);

  if (wordBoundary) {
    // Find the last space before the cut point
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.slice(0, lastSpace) + suffix;
    }
  }

  return truncated + suffix;
}

/**
 * Truncate a URL-like string for display.
 * Strips the protocol and truncates to `maxLength`.
 *
 * Example: "https://very-long-domain.com/some/long/path"
 *       →  "very-long-domain.com/some/long…"
 */
export function truncateUrl(url: string, maxLength = 60): string {
  const stripped = url.replace(/^https?:\/\//, '');
  return truncateText(stripped, maxLength, { wordBoundary: false });
}
