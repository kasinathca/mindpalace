// ─────────────────────────────────────────────────────────────────────────────
// workers/archive.worker.ts — Permanent copy job processor
//
// Picks up jobs from the 'archive' BullMQ queue.
// For each job: fetches the URL, extracts article content via Readability,
// sanitizes it, and upserts a PermanentCopy record in the database.
//
// On failure the error is written to PermanentCopy.failureReason so the UI
// can surface "capture failed" rather than just showing a spinner forever.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { archivePage } from '../lib/archiver.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import type { ArchiveJobData } from './queues.js';

// ── Redis connection ──────────────────────────────────────────────────────────

function redisConnection(): {
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

// ── Worker factory ────────────────────────────────────────────────────────────

export function createArchiveWorker(): Worker {
  return new Worker<ArchiveJobData>(
    'archive',
    async (job: Job<ArchiveJobData>) => {
      const { bookmarkId, url } = job.data;
      logger.info({ bookmarkId, url }, 'archive: processing job');

      // Bookmark may have been deleted since the job was enqueued
      const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
      if (!bookmark) {
        logger.warn({ bookmarkId }, 'archive: bookmark not found, skipping');
        return;
      }

      try {
        const { rawHtml, articleContent, sizeBytes, mimeType } = await archivePage(url);

        await prisma.permanentCopy.upsert({
          where: { bookmarkId },
          create: {
            bookmarkId,
            rawHtml,
            articleContent,
            sizeBytes,
            mimeType,
          },
          update: {
            rawHtml,
            articleContent,
            sizeBytes,
            mimeType,
            failureReason: null,
            capturedAt: new Date(),
          },
        });

        await prisma.permanentCopyVersion.create({
          data: {
            bookmarkId,
            rawHtml,
            articleContent,
            sourceUrl: url,
            sizeBytes,
            mimeType,
            capturedAt: new Date(),
          },
        });

        const staleVersions = await prisma.permanentCopyVersion.findMany({
          where: { bookmarkId },
          orderBy: { capturedAt: 'desc' },
          skip: 3,
          select: { id: true },
        });
        if (staleVersions.length > 0) {
          await prisma.permanentCopyVersion.deleteMany({
            where: { id: { in: staleVersions.map((v) => v.id) } },
          });
        }

        logger.info({ bookmarkId, sizeBytes }, 'archive: permanent copy saved');
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        logger.error({ bookmarkId, url, reason }, 'archive: capture failed');

        // Record failure so the UI can show a meaningful error
        await prisma.permanentCopy.upsert({
          where: { bookmarkId },
          create: { bookmarkId, mimeType: 'text/html', failureReason: reason },
          update: { failureReason: reason },
        });

        throw err; // Let BullMQ retry per queue config (3 attempts, exponential backoff)
      }
    },
    {
      connection: redisConnection(),
      concurrency: 3, // max 3 concurrent page fetches
    },
  );
}
