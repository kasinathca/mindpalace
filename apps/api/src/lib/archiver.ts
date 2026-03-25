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
  mimeType: string;
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

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const FETCH_PROFILES: Array<{ name: string; headers: Record<string, string> }> = [
  {
    name: 'desktop-default',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  },
  {
    name: 'desktop-alt',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.8',
      Referer: 'https://www.google.com/',
    },
  },
  {
    name: 'mobile',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
];

const CHALLENGE_PATTERNS: RegExp[] = [
  /captcha/i,
  /cf-chl-/i,
  /just a moment/i,
  /attention required/i,
  /verify you are human/i,
  /access denied/i,
  /automated queries/i,
  /our systems have detected unusual traffic/i,
];

function isLikelyChallengePage(html: string): boolean {
  return CHALLENGE_PATTERNS.some((pattern) => pattern.test(html));
}

function getUrlCandidates(inputUrl: string): string[] {
  const candidates = new Set<string>([inputUrl]);
  try {
    const parsed = new URL(inputUrl);
    if (parsed.hostname.startsWith('www.')) {
      const noWww = new URL(parsed.toString());
      noWww.hostname = parsed.hostname.replace(/^www\./i, '');
      candidates.add(noWww.toString());
    } else if (parsed.hostname.split('.').length >= 2) {
      const withWww = new URL(parsed.toString());
      withWww.hostname = `www.${parsed.hostname}`;
      candidates.add(withWww.toString());
    }
  } catch {
    // ignore URL parse fallback generation failures
  }
  return Array.from(candidates);
}

function buildNonHtmlFallbackDocument(url: string, mimeType: string): string {
  const escapedUrl = url.replace(/"/g, '&quot;');
  if (mimeType.startsWith('image/')) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Archived image</title></head><body style="margin:0;padding:0;background:#111;color:#eee;"><img src="${escapedUrl}" alt="Archived image" style="max-width:100%;height:auto;display:block;margin:0 auto;"></body></html>`;
  }

  if (mimeType === 'application/pdf') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Archived PDF</title></head><body style="margin:0;"><iframe src="${escapedUrl}" style="width:100vw;height:100vh;border:0;"></iframe></body></html>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>Archived resource</title></head><body><p>This resource was archived as <strong>${mimeType}</strong>.</p><p><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">Open original resource</a></p></body></html>`;
}

async function fetchWithFallbackStrategies(url: string): Promise<{
  bodyBuffer: Buffer;
  mimeType: string;
  finalUrl: string;
  statusCode: number;
}> {
  const candidates = getUrlCandidates(url);
  let bestResponse: {
    bodyBuffer: Buffer;
    mimeType: string;
    finalUrl: string;
    statusCode: number;
  } | null = null;

  for (const candidate of candidates) {
    for (const profile of FETCH_PROFILES) {
      try {
        const response = await got(candidate, {
          timeout: { request: 20_000 },
          followRedirect: true,
          throwHttpErrors: false,
          headers: profile.headers,
          responseType: 'buffer',
          decompress: true,
        });

        const contentType = response.headers['content-type'] ?? 'text/html';
        const mimeType = contentType.split(';')[0]?.trim().toLowerCase() || 'text/html';
        const bodyBuffer = response.rawBody;

        if (!bestResponse || bodyBuffer.length > bestResponse.bodyBuffer.length) {
          bestResponse = {
            bodyBuffer,
            mimeType,
            finalUrl: response.url,
            statusCode: response.statusCode,
          };
        }

        if (bodyBuffer.length === 0) {
          continue;
        }

        if (mimeType.includes('html')) {
          const html = bodyBuffer.toString('utf8');
          if (isLikelyChallengePage(html)) {
            logger.warn(
              { url: candidate, profile: profile.name, statusCode: response.statusCode },
              'archiver: challenge page detected, trying next strategy',
            );
            continue;
          }
        }

        return { bodyBuffer, mimeType, finalUrl: response.url, statusCode: response.statusCode };
      } catch (err) {
        logger.warn(
          {
            url: candidate,
            profile: profile.name,
            err: err instanceof Error ? err.message : String(err),
          },
          'archiver: fetch strategy failed',
        );
      }
    }
  }

  if (bestResponse && bestResponse.bodyBuffer.length > 0) {
    return bestResponse;
  }

  throw new Error('Archive fetch failed for all strategies.');
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the URL and returns a permanent copy.
 * Throws on network error or non-2xx response.
 */
export async function archivePage(url: string): Promise<ArchiveResult> {
  // 0. SSRF guard — reject private / loopback / metadata addresses
  assertNotPrivate(url);

  const { bodyBuffer, mimeType, finalUrl, statusCode } = await fetchWithFallbackStrategies(url);
  const sizeBytes = bodyBuffer.length;

  if (!mimeType.includes('html')) {
    return {
      rawHtml: buildNonHtmlFallbackDocument(finalUrl || url, mimeType),
      articleContent: null,
      sizeBytes,
      mimeType,
    };
  }

  const rawHtml = bodyBuffer.toString('utf8');
  if (!rawHtml || rawHtml.trim().length === 0) {
    throw new Error(`Archive fetch returned empty HTML body (status ${statusCode})`);
  }

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

  return { rawHtml, articleContent, sizeBytes, mimeType };
}
