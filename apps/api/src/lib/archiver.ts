// ─────────────────────────────────────────────────────────────────────────────
// lib/archiver.ts — Permanent copy extraction using Readability + DOMPurify
//
// Responsibilities:
//   • Fetch the page HTML with got (15 s timeout)
//   • Parse with jsdom + @mozilla/readability to get clean article content
//   • Sanitize HTML with isomorphic-dompurify before storing
//   • Return raw HTML, sanitized article HTML, and size in bytes
// ─────────────────────────────────────────────────────────────────────────────
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'isomorphic-dompurify';
import got from 'got';
import { logger } from './logger.js';

// ── SSRF guard ────────────────────────────────────────────────────────────────

// Patterns that match private / loopback / link-local addresses.
// We block these to prevent the archiver from being used as an SSRF vector to
// probe internal services (e.g. the metadata server, cloud instance metadata).
const PRIVATE_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./, // 127.0.0.0/8 — loopback
  /^10\./, // 10.0.0.0/8 — private class A
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16–31.x.x — private class B
  /^192\.168\./, // 192.168.0.0/16 — private class C
  /^169\.254\./, // 169.254.0.0/16 — link-local / APIPA
  /^0\.0\.0\.0/, // 0.0.0.0
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc[0-9a-f]{2}:/i, // IPv6 ULA fc00::/7
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA fd00::/8
  /^169\.254\./, // AWS/GCP instance-metadata range
];

const METADATA_HOSTNAMES = [
  '169.254.169.254', // AWS / GCP / Azure metadata
  '[fd00:ec2::254]', // AWS IPv6 metadata
  'metadata.google.internal',
];

/**
 * Throws if `url` resolves to a private / loopback / cloud-metadata address.
 * This is a best-effort defence against SSRF; DNS rebinding attacks are out of
 * scope (required network firewall rules on the host).
 */
function assertNotPrivate(url: string): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`SSRF guard: invalid URL "${url}"`);
  }

  if (
    METADATA_HOSTNAMES.includes(hostname) ||
    PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(hostname))
  ) {
    throw new Error(`SSRF guard: requests to "${hostname}" are not permitted`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArchiveResult {
  rawHtml: string;
  articleContent: string | null; // Readability-extracted, DOMPurify-sanitized HTML
  sizeBytes: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'code',
  'pre',
  'br',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'img',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class'];

const USER_AGENT = 'MindPalace-Archiver/1.0 (+https://mindpalace.app)';

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the URL and returns a permanent copy.
 * Throws on network error or non-2xx response.
 */
export async function archivePage(url: string): Promise<ArchiveResult> {
  // 0. SSRF guard — reject private / loopback / metadata addresses
  assertNotPrivate(url);

  // 1. Fetch raw HTML
  const response = await got(url, {
    timeout: { request: 15_000 },
    headers: { 'User-Agent': USER_AGENT },
    followRedirect: true,
    throwHttpErrors: true,
  });

  const rawHtml = response.body;
  const sizeBytes = Buffer.byteLength(rawHtml, 'utf8');

  // 2. Parse with Readability
  let articleContent: string | null = null;
  try {
    const dom = new JSDOM(rawHtml, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article?.content) {
      // 3. Sanitize extracted HTML
      articleContent = DOMPurify.sanitize(article.content, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
      });
    }
  } catch (err) {
    // Extraction failure is non-fatal — raw HTML is still saved
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), url },
      'archiver: Readability extraction failed',
    );
  }

  return { rawHtml, articleContent, sizeBytes };
}
