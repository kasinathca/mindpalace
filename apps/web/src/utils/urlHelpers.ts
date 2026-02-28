// ─────────────────────────────────────────────────────────────────────────────
// utils/urlHelpers.ts — URL parsing and display helpers
//
// Keeps URL-manipulation logic in one place so components stay clean.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the hostname from a URL string.
 * Returns an empty string if the URL is invalid.
 *
 * Example: "https://www.example.com/path?q=1" → "www.example.com"
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Return the root domain without a "www." prefix.
 *
 * Example: "https://www.example.com/path" → "example.com"
 */
export function getRootDomain(url: string): string {
  return getDomain(url).replace(/^www\./, '');
}

/**
 * Build the standard favicon URL for a given bookmark URL.
 * Uses Google's favicon CDN (size 32px).
 */
export function getFaviconUrl(url: string): string {
  const domain = getDomain(url);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

/**
 * Return true if `url` is a syntactically valid http(s) URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalise a URL for duplicate detection:
 *   • Strip trailing slash
 *   • Lowercase the scheme and host
 *   • Sort query parameters alphabetically
 *
 * Note: fragment (#) is stripped because it is client-side only.
 */
export function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.searchParams.sort();
    // Remove trailing slash from pathname (unless it's the root "/")
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
