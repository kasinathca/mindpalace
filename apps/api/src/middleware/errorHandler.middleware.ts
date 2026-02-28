// ─────────────────────────────────────────────────────────────────────────────
// middleware/errorHandler.middleware.ts — Global Express error handler
//
// Must be registered LAST in the middleware chain with 4 parameters.
// Catches all errors thrown or passed to next(err).
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HTTP } from '../config/constants.js';
import { logger } from '../lib/logger.js';

/** Application-level error with an HTTP status code attached. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // ── Zod validation error ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(HTTP.UNPROCESSABLE).json({
      success: false,
      error: 'Validation failed',
      issues: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  // ── Known application error ──────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // ── Unknown / unexpected error ───────────────────────────────────────────
  logger.error({ err }, 'Unhandled error');
  res.status(HTTP.INTERNAL_ERROR).json({ success: false, error: 'Internal server error' });
}
