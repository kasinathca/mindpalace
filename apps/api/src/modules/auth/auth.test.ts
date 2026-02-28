// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.test.ts — Unit tests for AuthService
//
// These tests mock Prisma and bcrypt so they run without a real database.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mock prisma ───────────────────────────────────────────────────────────────
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../lib/email.js', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  buildPasswordResetEmail: vi.fn().mockReturnValue('<html/>'),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-32-characters-long!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-32-characters-long!',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    BCRYPT_ROUNDS: 1,
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

import { prisma } from '../../lib/prisma.js';
import { register, login } from './auth.service.js';

const mockUser = {
  id: 'user_01',
  email: 'test@example.com',
  displayName: 'Test User',
  passwordHash: '$2a$01$testHashValue.padding.padding.paaaaaaa',
  avatarUrl: null,
  emailVerified: false,
  theme: 'SYSTEM',
  defaultView: 'GRID',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.register', () => {
  it('creates a user and returns tokens', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);

    const result = await register({
      email: 'test@example.com',
      password: 'Password1',
      displayName: 'Test User',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws CONFLICT if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

    let thrown: unknown;
    try {
      await register({ email: 'test@example.com', password: 'Password1', displayName: 'Test' });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(AppError);
  });
});

describe('AuthService.login', () => {
  it('throws UNAUTHORISED for unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    let thrown: unknown;
    try {
      await login({ email: 'nobody@example.com', password: 'Password1' });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(AppError);
  });
});
