// ─────────────────────────────────────────────────────────────────────────────
// middleware/rateLimiter.middleware.ts — Express rate-limit middleware
//
// Two limiters are exported:
//   defaultLimiter    — applied globally (100 req / 15 min)
//   authLimiter       — stricter limiter for /auth routes (20 req / 15 min)
//                       mitigates brute-force and credential-stuffing attacks.
// ─────────────────────────────────────────────────────────────────────────────
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { HTTP } from '../config/constants.js';

export const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  statusCode: HTTP.TOO_MANY_REQUESTS,
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
  statusCode: HTTP.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: true,
});

/**
 * Per-user bookmark creation limiter: 30 bookmarks per RATE_LIMIT_WINDOW_MS.
 * Keys on req.user.id once the jwtAuthGuard middleware has run; falls back to
 * req.ip so unauthenticated requests are also rate-limited.
 */
export const bookmarkCreateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  message: { success: false, error: 'Too many bookmarks created. Please wait before adding more.' },
  statusCode: HTTP.TOO_MANY_REQUESTS,
});
