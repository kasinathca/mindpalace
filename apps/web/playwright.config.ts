// ─────────────────────────────────────────────────────────────────────────────
// playwright.config.ts — Playwright E2E configuration
//
// Run:  pnpm --filter @mindpalace/web test:e2e
//       pnpm --filter @mindpalace/web test:e2e:ui    (interactive mode)
//
// Prerequisites: both the API server (port 3000) and the Vite dev server
// (port 5173) must be reachable. In CI these are started via the webServer
// config below. Locally, start them with:
//   pnpm --filter @mindpalace/api dev
//   pnpm --filter @mindpalace/web dev
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig, devices } from '@playwright/test';

const DEV_SERVER_PORT = 5173;
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;

export default defineConfig({
  // Directory containing spec files
  testDir: './e2e',

  // File pattern
  testMatch: '**/*.spec.ts',

  // Global timeout for each test
  timeout: 30_000,

  // Retry failed tests once in CI to reduce flakiness noise
  retries: process.env.CI ? 1 : 0,

  // Parallel workers — run serially in CI to avoid race conditions on the
  // shared test database
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: BASE_URL,

    // Record traces on retry to help debug flaky tests
    trace: 'on-first-retry',

    // Screenshot on test failure
    screenshot: 'only-on-failure',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Credentials are needed for the refresh-token cookie
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start the Vite dev server when running locally.
  // In CI, the server is expected to already be running (started by the workflow).
  webServer: {
    command: 'pnpm dev',
    port: DEV_SERVER_PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
