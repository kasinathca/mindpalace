// ─────────────────────────────────────────────────────────────────────────────
// vitest.integration.config.ts — Integration test configuration
//
// Requires DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, and
// JWT_REFRESH_SECRET to be set in the environment (or a .env.test file).
// Run with: vitest run --config vitest.integration.config.ts
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30s per test for DB operations
    fileParallelism: false, // Run test files sequentially to avoid concurrent DB wipes
    // Applied before every test file — mocks email and exports cleanDb().
    setupFiles: ['./tests/integration/setup.ts'],
    env: {
      NODE_ENV: 'test',
      BCRYPT_ROUNDS: '4',
      // Provide minimal SMTP config so env.ts validates at startup.
      // Real email delivery is prevented by the vi.mock in setup.ts.
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_USER: 'test@test.local',
      SMTP_PASS: 'test-password',
      EMAIL_FROM: 'noreply@test.local',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
