// ─────────────────────────────────────────────────────────────────────────────
// workers/queues.ts — BullMQ queue instances
//
// Queues are defined here and imported by both the API (to enqueue jobs) and
// the worker process (to process jobs). Using the same Queue instance name
// ensures jobs from the API land in the queue the worker is listening to.
//
// Queue definitions:
//   • metadata     — extract title / description / favicon / cover image for a
//                    newly-saved bookmark (on-demand, triggered on create)
//   • link-health  — re-check the HTTP status of all bookmarks
//                    (scheduled every 24 h by the worker process)
// ─────────────────────────────────────────────────────────────────────────────
import { Queue } from 'bullmq';
import { env } from '../config/env.js';

// Parse Redis URL into host/port/auth options to avoid ioredis version-
// conflict warnings when using the app-level singleton with BullMQ's bundled
// ioredis (they may resolve to slightly different minor versions via pnpm).
function redisConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: false;
  lazyConnect: true;
} {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false, // required by BullMQ
    lazyConnect: true,
  };
}

const connection = redisConnectionOptions();

// ── Metadata extraction queue ────────────────────────────────────────────────

export interface MetadataJobData {
  bookmarkId: string;
  url: string;
}

export const metadataQueue = new Queue<MetadataJobData>('metadata', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// ── Archive (permanent copy) queue ───────────────────────────────────────────

export interface ArchiveJobData {
  bookmarkId: string;
  url: string;
}

export const archiveQueue = new Queue<ArchiveJobData>('archive', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// ── Link health check queue ──────────────────────────────────────────────────

export interface LinkHealthJobData {
  bookmarkId: string;
  url: string;
}

export const linkHealthQueue = new Queue<LinkHealthJobData>('link-health', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});
