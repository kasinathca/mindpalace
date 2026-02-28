// ─────────────────────────────────────────────────────────────────────────────
// lib/cache.ts — Thin Redis cache helpers
//
// Used by collections and tags services to reduce PostgreSQL load.
// All keys are namespaced with "cache:" so they are visually distinct from
// BullMQ's internal keys in the same Redis instance.
// ─────────────────────────────────────────────────────────────────────────────
import { redis } from './redis.js';

const CACHE_PREFIX = 'cache:';

/**
 * Return the cached value for `key`, or null if absent / parse failure.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(CACHE_PREFIX + key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/**
 * Serialise `value` and store it under `key` with an expiry of `ttlSeconds`.
 * Failures are silently ignored — the cache is best-effort.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failure must never break application flow
  }
}

/**
 * Delete the cache entry for `key`.
 * Failures are silently ignored.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(CACHE_PREFIX + key);
  } catch {
    // Cache eviction failure must never break application flow
  }
}
