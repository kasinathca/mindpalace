// ─────────────────────────────────────────────────────────────────────────────
// workers/metadata.worker.ts — Metadata extraction processor
//
// Responsibilities:
//   • Fetch the URL with a short timeout using `got`
//   • Parse the HTML response with `cheerio`
//   • Extract: title, description, Open Graph image, favicon URL
//   • Update the bookmark record via BookmarkService
//
// This runs inside the separate worker process (worker.ts), never in the API
// process, so slow network requests cannot block HTTP responses.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker, type Job } from 'bullmq';
import * as cheerio from 'cheerio';
import got from 'got';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { updateBookmarkMetadata } from '../modules/bookmarks/bookmarks.service.js';
import { logger } from '../lib/logger.js';
import type { MetadataJobData } from './queues.js';

const METADATA_FETCH_TIMEOUT_MS = 10_000;
const METADATA_MIN_HOST_INTERVAL_MS = 1_500;
const METADATA_BLOCKED_HOST_COOLDOWN_MS = 60_000;
const METADATA_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const hostNextAllowedRequestAt = new Map<string, number>();

class RetryableMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableMetadataError';
  }
}

const PRIVATE_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0/,
  /^::1$/,
  /^fe80:/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
];

const METADATA_HOSTNAMES = ['169.254.169.254', '[fd00:ec2::254]', 'metadata.google.internal'];

const BLOCKED_RESPONSE_PATTERNS: RegExp[] = [
  /our systems have detected unusual traffic/i,
  /to continue, please type the characters below/i,
  /automated queries/i,
  /unusual traffic from your computer network/i,
];

function assertSafeOutboundUrl(url: string): void {
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

function isRetryableHttpStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function isAntiBotChallengePage(url: string, body: string): boolean {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('google.com/sorry')) {
    return true;
  }

  return BLOCKED_RESPONSE_PATTERNS.some((pattern) => pattern.test(body));
}

async function waitForHostSlot(hostname: string): Promise<void> {
  const now = Date.now();
  const waitUntil = hostNextAllowedRequestAt.get(hostname) ?? 0;
  const waitMs = Math.max(0, waitUntil - now);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  hostNextAllowedRequestAt.set(hostname, Date.now() + METADATA_MIN_HOST_INTERVAL_MS);
}

function applyBlockedHostCooldown(hostname: string): void {
  const existing = hostNextAllowedRequestAt.get(hostname) ?? 0;
  const nextAllowed = Math.max(existing, Date.now() + METADATA_BLOCKED_HOST_COOLDOWN_MS);
  hostNextAllowedRequestAt.set(hostname, nextAllowed);
}

function metadataCacheKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';

  const hash = createHash('sha256').update(parsed.toString()).digest('hex');
  return `metadata:url:${hash}`;
}

function hasMeaningfulMetadata(metadata: ExtractedMetadata): boolean {
  return (
    (typeof metadata.title === 'string' && metadata.title.trim().length > 0) ||
    (typeof metadata.description === 'string' && metadata.description.trim().length > 0) ||
    (typeof metadata.faviconUrl === 'string' && metadata.faviconUrl.trim().length > 0) ||
    (typeof metadata.coverImageUrl === 'string' && metadata.coverImageUrl.trim().length > 0)
  );
}

function redisConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: false;
} {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

// ── Cheerio-based metadata extraction ────────────────────────────────────────

interface ExtractedMetadata {
  title?: string | undefined;
  description?: string | undefined;
  faviconUrl?: string | undefined;
  coverImageUrl?: string | undefined;
}

interface YouTubeOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

function isYouTubeHostname(hostname: string): boolean {
  return hostname === 'youtu.be' || hostname.endsWith('.youtube.com') || hostname === 'youtube.com';
}

function extractYouTubeVideoId(url: URL): string | undefined {
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const firstPath = url.pathname.split('/').filter(Boolean)[0];
    return firstPath || undefined;
  }

  const watchId = url.searchParams.get('v');
  if (watchId) {
    return watchId;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live')) {
    return parts[1];
  }

  return undefined;
}

async function extractYouTubeMetadata(targetUrl: string): Promise<ExtractedMetadata> {
  const parsed = new URL(targetUrl);
  const videoId = extractYouTubeVideoId(parsed);
  const fallbackCover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
  const fallbackMetadata: ExtractedMetadata = {
    faviconUrl: 'https://www.youtube.com/favicon.ico',
    ...(fallbackCover ? { coverImageUrl: fallbackCover } : {}),
  };

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
  const response = await got(oembedUrl, {
    timeout: { request: METADATA_FETCH_TIMEOUT_MS },
    followRedirect: true,
    maxRedirects: 3,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MindPalaceBot/1.0; +https://mindpalace.app)',
      Accept: 'application/json',
    },
    throwHttpErrors: false,
  });

  if (isRetryableHttpStatus(response.statusCode)) {
    throw new RetryableMetadataError(
      `Retryable YouTube oEmbed status ${response.statusCode} for ${targetUrl}`,
    );
  }

  if (isAntiBotChallengePage(response.url ?? oembedUrl, response.body)) {
    throw new RetryableMetadataError(`YouTube anti-bot challenge detected for ${targetUrl}`);
  }

  if (response.statusCode >= 400) {
    return fallbackMetadata;
  }

  let payload: YouTubeOEmbedResponse;
  try {
    payload = JSON.parse(response.body) as YouTubeOEmbedResponse;
  } catch {
    return fallbackMetadata;
  }

  return {
    ...(payload.title ? { title: payload.title } : {}),
    ...(payload.author_name ? { description: `By ${payload.author_name}` } : {}),
    faviconUrl: 'https://www.youtube.com/favicon.ico',
    ...(payload.thumbnail_url
      ? { coverImageUrl: payload.thumbnail_url }
      : fallbackCover
        ? { coverImageUrl: fallbackCover }
        : {}),
  };
}

function extractMetadata(html: string, baseUrl: string): ExtractedMetadata {
  const $ = cheerio.load(html);
  const origin = new URL(baseUrl).origin;

  // Title priority: og:title → twitter:title → <title>
  const title =
    $('meta[property="og:title"]').attr('content') ??
    $('meta[name="twitter:title"]').attr('content') ??
    $('title').first().text().trim() ??
    undefined;

  // Description priority: og:description → twitter:description → meta description
  const description =
    $('meta[property="og:description"]').attr('content') ??
    $('meta[name="twitter:description"]').attr('content') ??
    $('meta[name="description"]').attr('content') ??
    undefined;

  // Cover image priority: og:image → twitter:image
  const rawCover =
    $('meta[property="og:image"]').attr('content') ??
    $('meta[name="twitter:image"]').attr('content') ??
    undefined;
  const coverImageUrl = rawCover
    ? rawCover.startsWith('http')
      ? rawCover
      : `${origin}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`
    : undefined;

  // Favicon: link[rel~="icon"] → /favicon.ico fallback
  const rawFavicon =
    $('link[rel~="icon"]').first().attr('href') ??
    $('link[rel~="shortcut icon"]').first().attr('href') ??
    '/favicon.ico';
  const faviconUrl = rawFavicon.startsWith('http')
    ? rawFavicon
    : `${origin}${rawFavicon.startsWith('/') ? '' : '/'}${rawFavicon}`;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    faviconUrl,
    ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
  };
}

// ── Worker processor ─────────────────────────────────────────────────────────

export function createMetadataWorker(): Worker<MetadataJobData> {
  const worker = new Worker<MetadataJobData>(
    'metadata',
    async (job: Job<MetadataJobData>) => {
      const { bookmarkId, url } = job.data;
      const hostname = new URL(url).hostname.toLowerCase();
      const cacheKey = metadataCacheKey(url);

      try {
        assertSafeOutboundUrl(url);
      } catch (ssrfError) {
        logger.warn(
          { bookmarkId, url, err: ssrfError },
          'metadata.worker: blocked by outbound URL safety guard',
        );
        return;
      }

      logger.info({ bookmarkId, url }, 'metadata.worker: starting extraction');

      const cached = await cacheGet<ExtractedMetadata>(cacheKey);
      if (cached && hasMeaningfulMetadata(cached)) {
        await updateBookmarkMetadata(bookmarkId, cached);
        logger.info({ bookmarkId }, 'metadata.worker: extraction complete (cache hit)');
        return;
      }

      await waitForHostSlot(hostname);

      if (isYouTubeHostname(hostname)) {
        try {
          const metadata = await extractYouTubeMetadata(url);
          await updateBookmarkMetadata(bookmarkId, metadata);
          if (hasMeaningfulMetadata(metadata)) {
            await cacheSet(cacheKey, metadata, METADATA_CACHE_TTL_SECONDS);
          }
          logger.info({ bookmarkId }, 'metadata.worker: extraction complete (youtube oembed)');
          return;
        } catch (fetchError) {
          if (fetchError instanceof RetryableMetadataError) {
            applyBlockedHostCooldown(hostname);
            logger.warn(
              { bookmarkId, url, attemptsMade: job.attemptsMade, err: fetchError },
              'metadata.worker: retryable youtube metadata failure, deferring to queue backoff',
            );
            throw fetchError;
          }

          logger.warn(
            { bookmarkId, url, err: fetchError },
            'metadata.worker: youtube metadata fetch failed, falling back to generic extraction',
          );
        }
      }

      let html: string;
      try {
        const response = await got(url, {
          timeout: { request: METADATA_FETCH_TIMEOUT_MS },
          followRedirect: true,
          maxRedirects: 5,
          headers: {
            // Mimic a real browser to avoid bot-blocking
            'User-Agent': 'Mozilla/5.0 (compatible; MindPalaceBot/1.0; +https://mindpalace.app)',
          },
          throwHttpErrors: false,
        });

        if (isRetryableHttpStatus(response.statusCode)) {
          applyBlockedHostCooldown(hostname);
          throw new RetryableMetadataError(
            `Retryable metadata fetch status ${response.statusCode} for ${url}`,
          );
        }

        if (isAntiBotChallengePage(response.url ?? url, response.body)) {
          applyBlockedHostCooldown(hostname);
          throw new RetryableMetadataError(`Anti-bot challenge detected for ${url}`);
        }

        html = response.body;
      } catch (fetchError) {
        if (fetchError instanceof RetryableMetadataError) {
          logger.warn(
            { bookmarkId, url, attemptsMade: job.attemptsMade, err: fetchError },
            'metadata.worker: retryable fetch failure, deferring to queue backoff',
          );
          throw fetchError;
        }

        logger.warn({ bookmarkId, url, err: fetchError }, 'metadata.worker: fetch failed');
        return; // Don't fail the job; missing metadata is acceptable
      }

      const metadata = extractMetadata(html, url);
      await updateBookmarkMetadata(bookmarkId, metadata);
      if (hasMeaningfulMetadata(metadata)) {
        await cacheSet(cacheKey, metadata, METADATA_CACHE_TTL_SECONDS);
      }

      logger.info({ bookmarkId }, 'metadata.worker: extraction complete');
    },
    {
      connection: redisConnectionOptions(),
      concurrency: 2, // Reduce burst traffic to avoid remote anti-bot throttling
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'metadata.worker: job failed permanently');
  });

  return worker;
}
