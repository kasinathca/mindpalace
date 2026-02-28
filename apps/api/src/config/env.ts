// ─────────────────────────────────────────────────────────────────────────────
// config/env.ts — Environment variable validation
//
// All environment variables are validated here at startup using Zod.
// The server refuses to start if any required variable is missing or wrong type.
// Always import from here — never use process.env directly anywhere else.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection URL'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Email (SMTP)
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),

  // File storage
  UPLOADS_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  // CORS
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQS: z.coerce.number().default(100),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().min(1).max(31).default(12),
});

// Parse and validate — exits with helpful error messages on failure
const result = envSchema.safeParse(process.env);

if (!result.success) {
  // eslint-disable-next-line no-console
  console.error('❌  Invalid environment variables:\n');
  result.error.issues.forEach((issue) => {
    // eslint-disable-next-line no-console
    console.error(`   ${issue.path.join('.')} — ${issue.message}`);
  });
  // eslint-disable-next-line no-console
  console.error('\nFix these in your .env file (copy from .env.example).\n');
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
