// ─────────────────────────────────────────────────────────────────────────────
// workers/linkhealth.worker.ts — Link health check job processor
//
// Picks up jobs from the 'link-health' BullMQ queue.
//
// Two job types are handled:
//   'nightly-scan'  — queries ALL bookmarks and enqueues individual 'check' jobs
//   'check'         — performs a HEAD (falling back to GET) on a single URL,
//                     classifies the result, and updates bookmark.linkStatus
//
// The nightly-scan repeatable job is registered via registerNightlyLinkHealthJob()
// which must be called once at worker startup. BullMQ deduplicates repeatable
// jobs by jobId so it's safe to call on every restart.
// ─────────────────────────────────────────────────────────────────────────────
import { Worker, type Job } from 'bullmq';
import got from 'got';
import { prisma } from '../lib/prisma.js';
import { linkHealthQueue } from './queues.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import type { LinkHealthJobData } from './queues.js';

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

// ── URL status classification ─────────────────────────────────────────────────

type LinkStatus = 'OK' | 'BROKEN' | 'REDIRECTED';

interface CheckResult {
  status: LinkStatus;
  statusCode?: number;
}

const HEALTH_USER_AGENT = 'MindPalace-LinkChecker/1.0 (+https://mindpalace.app)';

async function checkUrl(url: string): Promise<CheckResult> {
  try {
    assertSafeOutboundUrl(url);

    // Try HEAD first (lightweight)
    const headRes = await got.head(url, {
      timeout: { request: 10_000 },
      followRedirect: false,
      headers: { 'User-Agent': HEALTH_USER_AGENT },
      throwHttpErrors: false,
    });
    const code = headRes.statusCode;

    if (code >= 200 && code < 300) return { status: 'OK', statusCode: code };
    if (code >= 300 && code < 400) return { status: 'REDIRECTED', statusCode: code };

    // 405 = HEAD not allowed — fall back to GET
    if (code === 405) {
      const getRes = await got(url, {
        method: 'GET',
        timeout: { request: 10_000 },
        followRedirect: false,
        headers: { 'User-Agent': HEALTH_USER_AGENT },
        throwHttpErrors: false,
      });
      const gCode = getRes.statusCode;
      if (gCode >= 200 && gCode < 300) return { status: 'OK', statusCode: gCode };
      if (gCode >= 300 && gCode < 400) return { status: 'REDIRECTED', statusCode: gCode };
      return { status: 'BROKEN', statusCode: gCode };
    }

    return { status: 'BROKEN', statusCode: code };
  } catch {
    // Network error, timeout, DNS failure → broken
    return { status: 'BROKEN' };
  }
}

// ── Worker factory ────────────────────────────────────────────────────────────

export function createLinkHealthWorker(): Worker {
  const worker = new Worker<LinkHealthJobData>(
    'link-health',
    async (job: Job<LinkHealthJobData>) => {
      // ── Nightly scan: fan out individual check jobs ─────────────────────────
      if (job.name === 'nightly-scan') {
        logger.info('link-health: starting nightly scan');
        const bookmarks = await prisma.bookmark.findMany({
          select: { id: true, url: true },
        });

        const jobs = bookmarks.map((b) => ({
          name: 'check',
          data: { bookmarkId: b.id, url: b.url },
        }));

        await linkHealthQueue.addBulk(jobs);
        logger.info({ count: bookmarks.length }, 'link-health: nightly jobs enqueued');
        return;
      }

      // ── Individual check ────────────────────────────────────────────────────
      const { bookmarkId, url } = job.data;

      // Bookmark may have been deleted
      const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId },
        select: { id: true },
      });
      if (!bookmark) {
        logger.warn({ bookmarkId }, 'link-health: bookmark not found, skipping');
        return;
      }

      const { status, statusCode } = await checkUrl(url);

      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: { linkStatus: status, lastCheckedAt: new Date() },
      });

      logger.info({ bookmarkId, url, status, statusCode }, 'link-health: status updated');
    },
    {
      connection: redisConnection(),
      concurrency: 10, // check up to 10 URLs in parallel
    },
  );

  worker.on('failed', (job, err) => {
    if (job) {
      logger.error({ jobId: job.id, err: err.message }, 'link-health: job failed');
    }
  });

  return worker;
}

// ── Nightly schedule registration ─────────────────────────────────────────────

/**
 * Registers a repeatable BullMQ job that triggers a full nightly link scan
 * at 02:00 every day. Safe to call on every restart — BullMQ deduplicates
 * repeatable jobs by jobId.
 */
export async function registerNightlyLinkHealthJob(): Promise<void> {
  // Cast to satisfy the overloaded type — nightly-scan job uses an empty payload
  await linkHealthQueue.add('nightly-scan', {} as LinkHealthJobData, {
    repeat: { pattern: '0 2 * * *' }, // 02:00 daily (server local time)
    jobId: 'nightly-link-health-scan', // stable ID prevents duplicates
  });
  logger.info('link-health: nightly scan scheduled at 02:00 daily');
}
