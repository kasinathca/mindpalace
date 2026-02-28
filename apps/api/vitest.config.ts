import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default include — used when running `vitest` without an explicit config.
    // For targeted runs use: vitest --config vitest.unit.config.ts
    //                    or: vitest --config vitest.integration.config.ts
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    env: {
      BCRYPT_ROUNDS: '4',
      NODE_ENV: 'test',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        // -- Entry / bootstrap -------------------------------------
        'src/index.ts', // Process entry
        'src/app.ts', // Express app setup � integration only
        // -- Configuration -----------------------------------------
        'src/config/env.ts', // Environment variable loading � not unit-testable
        // -- HTTP layer (need integration tests, not unit tests) --
        'src/**/*.controller.ts',
        'src/**/*.router.ts',
        'src/**/*.schemas.ts', // Zod schemas � validated implicitly via service tests
        // -- Middleware --------------------------------------------
        'src/middleware/**',
        // -- Infrastructure singletons -----------------------------
        'src/lib/prisma.ts',
        'src/lib/redis.ts',
        'src/lib/email.ts', // SMTP wrapper � integration only
        'src/lib/logger.ts', // Winston instance � not unit-testable
        // -- Workers / queues --------------------------------------
        'src/workers/**',
        // -- Type declarations -------------------------------------
        'src/types/**',
      ],
      thresholds: {
        // Thresholds cover service + utility files only (HTTP layer excluded above).
        // Auth and bookmark services are large; remaining functions are
        // covered by integration tests in a later sprint.
        lines: 65,
        branches: 72,
        functions: 65,
        statements: 65,
      },
    },
  },
});
