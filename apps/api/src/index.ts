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

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Mind Palace API running on http://localhost:${env.PORT}`);
  logger.info(`API docs available at http://localhost:${env.PORT}/api/docs`);
});
