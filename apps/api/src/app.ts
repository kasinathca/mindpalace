// ─────────────────────────────────────────────────────────────────────────────
// app.ts — Express application factory
//
// Returns a configured Express application. Keeping this in a separate
// function (rather than a module-level constant) makes the app fully testable:
// integration tests can call createApp() to get a fresh instance.
// ─────────────────────────────────────────────────────────────────────────────
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { defaultLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { authRouter } from './modules/auth/auth.router.js';
import { bookmarksRouter } from './modules/bookmarks/bookmarks.router.js';
import { collectionsRouter } from './modules/collections/collections.router.js';
import { tagsRouter } from './modules/tags/tags.router.js';
import { searchRouter } from './modules/search/search.router.js';

export function createApp(): Express {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Logging ───────────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Body parsers ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Global rate limiter ───────────────────────────────────────────────────
  app.use(defaultLimiter);

  // ── Health check (no auth required) ──────────────────────────────────────
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() },
    });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  // NOTE: Annotation routes (/api/v1/bookmarks/:bookmarkId/annotations) are
  // mounted as a nested sub-router inside bookmarksRouter, not directly here.
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/bookmarks', bookmarksRouter);
  app.use('/api/v1/collections', collectionsRouter);
  app.use('/api/v1/tags', tagsRouter);
  app.use('/api/v1/search', searchRouter);

  // ── API Documentation (Swagger UI) ────────────────────────────────────────
  // Swagger UI requires 'unsafe-inline' scripts and styles; we relax the CSP
  // only for the /api/docs path so the rest of the API remains strict.
  app.use('/api/docs', (_req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    next();
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Mind Palace API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  // Raw spec — useful for client codegen tools
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  // ── 404 handler (must come after all routes) ──────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found.' });
  });

  // ── Global error handler (must be last, 4-arg signature) ─────────────────
  app.use(errorHandler);

  return app;
}
