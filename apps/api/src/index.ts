// ─────────────────────────────────────────────────────────────────────────────
// index.ts — Application entry point
//
// This file boots the server. It is intentionally minimal — all application
// setup lives in app.ts so that tests can import the app without side effects.
// ─────────────────────────────────────────────────────────────────────────────

// Must be first: loads apps/api/.env into process.env before any module reads it
import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { closeRedisConnection } from './lib/redis.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Mind Palace API running on http://localhost:${env.PORT}`);
  logger.info(`API docs available at http://localhost:${env.PORT}/api/docs`);
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'api: shutdown started');

  server.close(async (closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, 'api: server close failed');
    }

    try {
      await Promise.all([prisma.$disconnect(), closeRedisConnection()]);
      logger.info('api: graceful shutdown complete');
      process.exit(closeErr ? 1 : 0);
    } catch (err) {
      logger.error({ err }, 'api: shutdown cleanup failed');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('api: forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
