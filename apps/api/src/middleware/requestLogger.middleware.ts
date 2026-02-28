// ─────────────────────────────────────────────────────────────────────────────
// middleware/requestLogger.middleware.ts — HTTP request logger (pino-http)
//
// Logs method, URL, status code, and duration for every request.
// Sensitive routes (/auth) have their bodies redacted.
// ─────────────────────────────────────────────────────────────────────────────
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';

export const requestLogger = pinoHttp({
  logger,
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.passwordConfirm'],
    censor: '[REDACTED]',
  },
  customLogLevel(_req, res) {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    // pino-http passes a raw IncomingMessage; we access known fields safely
    req(req: { method: string; url: string; headers: Record<string, string | undefined> }) {
      return {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
      };
    },
  },
});
