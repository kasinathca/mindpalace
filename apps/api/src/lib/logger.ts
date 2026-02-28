// ─────────────────────────────────────────────────────────────────────────────
// lib/logger.ts — Structured logger (pino)
//
// Use this instead of console.log everywhere in production code.
// In development, pino pretty-prints for readability.
// In production, pino outputs JSON (consumed by log aggregators).
// ─────────────────────────────────────────────────────────────────────────────
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
  base: { pid: false },
  timestamp: pino.stdTimeFunctions.isoTime,
});
