// ─────────────────────────────────────────────────────────────────────────────
// lib/redis.ts — IORedis client singleton
//
// Used by BullMQ (job queues) and optionally for session caching.
// The connection is shared with BullMQ workers via the same URL.
// ─────────────────────────────────────────────────────────────────────────────
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // required by BullMQ
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err: Error) => {
  logger.error({ err }, 'Redis connection error');
});

export async function closeRedisConnection(): Promise<void> {
  if (redis.status === 'end') return;

  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (err) {
    logger.warn({ err }, 'Redis quit failed, forcing disconnect');
    redis.disconnect(false);
  }
}
