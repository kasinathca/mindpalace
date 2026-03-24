// ─────────────────────────────────────────────────────────────────────────────
// workers/worker.ts — Background worker entry point
//
// This file is the entry point for the separate worker process.
// Run independently via: pnpm --filter api run worker:dev
//
// Workers registered here:
//   • MetadataWorker    — extracts page metadata for newly-saved bookmarks
//   • ArchiveWorker     — captures permanent copies (Readability + DOMPurify)
//   • LinkHealthWorker  — checks HTTP status of bookmark URLs (+ nightly scan)
//
// The worker process shares the same Prisma and Redis connections as the API
// but runs as a separate Node.js process so it never blocks HTTP responses.
// ─────────────────────────────────────────────────────────────────────────────

// Must be first: loads apps/api/.env into process.env before any module reads it
import 'dotenv/config';

import { createMetadataWorker } from './metadata.worker.js';
import { createArchiveWorker } from './archive.worker.js';
import { createLinkHealthWorker, registerNightlyLinkHealthJob } from './linkhealth.worker.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { closeRedisConnection } from '../lib/redis.js';

logger.info('worker: starting background worker process');

const metadataWorker = createMetadataWorker();
const archiveWorker = createArchiveWorker();
const linkHealthWorker = createLinkHealthWorker();

logger.info('worker: metadata, archive, and link-health workers registered');

// Register repeatable nightly link health scan (safe to call on every restart)
registerNightlyLinkHealthJob().catch((err) => {
  logger.error({ err }, 'worker: failed to register nightly link-health job');
});

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('worker: received shutdown signal, draining workers...');

  try {
    await Promise.all([metadataWorker.close(), archiveWorker.close(), linkHealthWorker.close()]);
    await Promise.all([prisma.$disconnect(), closeRedisConnection()]);
    logger.info('worker: shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'worker: shutdown failed');
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
