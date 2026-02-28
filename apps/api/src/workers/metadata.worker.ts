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
import { env } from '../config/env.js';
import { updateBookmarkMetadata } from '../modules/bookmarks/bookmarks.service.js';
import { logger } from '../lib/logger.js';
import type { MetadataJobData } from './queues.js';

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

      logger.info({ bookmarkId, url }, 'metadata.worker: starting extraction');

      let html: string;
      try {
        const response = await got(url, {
          timeout: { request: 10_000 },
          followRedirect: true,
          maxRedirects: 5,
          headers: {
            // Mimic a real browser to avoid bot-blocking
            'User-Agent': 'Mozilla/5.0 (compatible; MindPalaceBot/1.0; +https://mindpalace.app)',
          },
          throwHttpErrors: false,
        });
        html = response.body;
      } catch (fetchError) {
        logger.warn({ bookmarkId, url, err: fetchError }, 'metadata.worker: fetch failed');
        return; // Don't fail the job; missing metadata is acceptable
      }

      const metadata = extractMetadata(html, url);
      await updateBookmarkMetadata(bookmarkId, metadata);

      logger.info({ bookmarkId }, 'metadata.worker: extraction complete');
    },
    {
      connection: redisConnectionOptions(),
      concurrency: 5, // Process 5 URLs simultaneously
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'metadata.worker: job failed permanently');
  });

  return worker;
}
