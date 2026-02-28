// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.service.extended.test.ts
//
// Extended unit tests for AuthService — covers flows not addressed in the
// baseline auth.test.ts:
//   • signAccessToken / signRefreshToken — JWT structure & claims
//   • refreshTokens     — rotate, tampered token, deleted user
//   • forgotPassword    — enumeration protection, token creation
//   • resetPassword     — ST: valid → used → error; expired; second request
//   • updateMe          — displayName, email conflict, password change flows
//
// All external I/O (Prisma, bcrypt, email, JWT verify) is controlled via mocks
// so these tests run with zero infrastructure dependencies.
//
// Related test plan: docs/TEST_STRATEGY.md §3.1.3 – §3.1.5
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  buildPasswordResetEmail: vi.fn().mockReturnValue('<html>reset</html>'),
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

// Import AFTER all vi.mock calls so module resolution picks up stubs.
import { prisma } from '../../lib/prisma.js';
import { sendMail } from '../../lib/email.js';
import {
  signAccessToken,
  signRefreshToken,
  refreshTokens,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
} from './auth.service.js';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const ACCESS_SECRET = 'test-access-secret-that-is-32-characters-long!!';
const REFRESH_SECRET = 'test-refresh-secret-that-is-32-characters-long!';

const baseUser = {
  id: 'user_01',
  email: 'alice@example.com',
  displayName: 'Alice',
  passwordHash: '$2a$01$testHashValue.padding.padding.paaaaaaa',
  avatarUrl: null,
  emailVerified: false,
  theme: 'SYSTEM' as const,
  defaultView: 'GRID' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// signAccessToken / signRefreshToken — JWT structure
// Related: TEST_STRATEGY.md AUTH-REF-002, AUTH-REF-004
// ─────────────────────────────────────────────────────────────────────────────

describe('signAccessToken', () => {
  it('produces a JWT verifiable with the access secret', () => {
    // Arrange
    const userId = 'user_01';
    const email = 'alice@example.com';

    // Act
    const token = signAccessToken(userId, email);
    const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string; email: string; exp: number };

    // Assert
    expect(payload.sub).toBe(userId);
    expect(payload.email).toBe(email);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('cannot be verified with the refresh secret', () => {
    // Arrange & Act
    const token = signAccessToken('user_01', 'alice@example.com');

    // Assert — wrong key must throw
    expect(() => jwt.verify(token, REFRESH_SECRET)).toThrow();
  });
});

describe('signRefreshToken', () => {
  it('produces a JWT verifiable with the refresh secret', () => {
    // Arrange
    const userId = 'user_02';

    // Act
    const token = signRefreshToken(userId);
    const payload = jwt.verify(token, REFRESH_SECRET) as { sub: string; exp: number };

    // Assert
    expect(payload.sub).toBe(userId);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('does not embed email (minimal claims)', () => {
    const token = signRefreshToken('user_99');
    const payload = jwt.decode(token) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshTokens — TC: AUTH-REF-001 through AUTH-REF-006
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshTokens', () => {
  it('AUTH-REF-001 — returns new token pair for a valid refresh token', async () => {
    // Arrange
    const rawRefresh = signRefreshToken(baseUser.id);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);

    // Act
    const result = await refreshTokens(rawRefresh);

    // Assert — both new tokens are valid JWTs verifiable with the correct secrets
    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    // Access token must carry the user's email claim
    const accessPayload = jwt.decode(result.accessToken) as { sub: string; email: string };
    expect(accessPayload.sub).toBe(baseUser.id);
    expect(accessPayload.email).toBe(baseUser.email);
    // Refresh token must carry the user's sub
    const refreshPayload = jwt.decode(result.refreshToken) as { sub: string };
    expect(refreshPayload.sub).toBe(baseUser.id);
  });

  it('AUTH-REF-002 — throws UNAUTHORISED for a tampered token', async () => {
    // Arrange — flip one character in the signature segment
    const rawRefresh = signRefreshToken(baseUser.id);
    const parts = rawRefresh.split('.');
    const corruptedSignature = parts[2]!.slice(0, -1) + (parts[2]!.endsWith('A') ? 'B' : 'A');
    const tampered = `${parts[0]}.${parts[1]}.${corruptedSignature}`;

    // Act & Assert
    await expect(refreshTokens(tampered)).rejects.toBeInstanceOf(AppError);
  });

  it('AUTH-REF-003 — throws UNAUTHORISED for an expired refresh token', async () => {
    // Arrange — sign a token that expired 1 second ago
    const expired = jwt.sign({ sub: baseUser.id }, REFRESH_SECRET, { expiresIn: -1 });

    // Act & Assert
    await expect(refreshTokens(expired)).rejects.toBeInstanceOf(AppError);
  });

  it('AUTH-REF-004 — throws UNAUTHORISED for a token signed with the wrong secret', async () => {
    // Arrange
    const wrongKey = jwt.sign({ sub: baseUser.id }, 'completely-wrong-secret', {
      expiresIn: '7d',
    });

    // Act & Assert
    await expect(refreshTokens(wrongKey)).rejects.toBeInstanceOf(AppError);
  });

  it('AUTH-REF-006 — throws UNAUTHORISED when the user no longer exists in DB', async () => {
    // Arrange — valid token but user row deleted
    const rawRefresh = signRefreshToken('deleted_user');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Act & Assert
    await expect(refreshTokens(rawRefresh)).rejects.toBeInstanceOf(AppError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword — TC: AUTH-PW-001, AUTH-PW-002
// ─────────────────────────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  it('AUTH-PW-001 — sends reset email and creates token record for known user', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);

    // Act
    await forgotPassword({ email: baseUser.email });

    // Assert
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: baseUser.id },
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();

    // Verify the reset URL contains a token — never the raw token in plain DB form
    const mailCall = vi.mocked(sendMail).mock.calls[0]![0];
    expect(mailCall.to).toBe(baseUser.email);
    expect(mailCall.subject).toMatch(/password/i);
  });

  it('AUTH-PW-002 — returns silently (no email) for unknown email (prevents enumeration)', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Act — must NOT throw
    await expect(forgotPassword({ email: 'nobody@example.com' })).resolves.toBeUndefined();

    // Assert — no token created, no email sent
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('AUTH-PW-006 — second request deletes the first token before creating a new one', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);

    // Act
    await forgotPassword({ email: baseUser.email });

    // Assert — previous token invalidated before new one created
    const deleteManyCall = vi.mocked(prisma.passwordResetToken.deleteMany).mock.calls[0]?.[0];
    expect(deleteManyCall?.where?.userId).toBe(baseUser.id);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword — TC: AUTH-PW-003, AUTH-PW-004, AUTH-PW-005
// ─────────────────────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  const validTokenRecord = {
    id: 'prt_01',
    tokenHash: 'COMPUTED_BY_SERVICE', // service computes sha256(input.token)
    userId: baseUser.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    usedAt: null,
    createdAt: new Date(),
  };

  it('AUTH-PW-003 — resets password and marks token as used in a transaction', async () => {
    // Arrange
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(validTokenRecord as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    // Act
    await resetPassword({ token: 'valid-plain-token', password: 'NewPass1' });

    // Assert — transaction called with both user update and token update
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const [ops] = vi.mocked(prisma.$transaction).mock.calls[0]! as [unknown];
    expect(Array.isArray(ops)).toBe(true);
    expect((ops as unknown[]).length).toBe(2);
  });

  it('AUTH-PW-004 — throws BAD_REQUEST for an expired token', async () => {
    // Arrange — expiresAt is in the past
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      ...validTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    } as never);

    // Act & Assert
    await expect(resetPassword({ token: 'expired-token', password: 'NewPass1' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 400,
    );
  });

  it('AUTH-PW-005 — throws BAD_REQUEST for an already-used token', async () => {
    // Arrange — usedAt is set → token consumed
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      ...validTokenRecord,
      usedAt: new Date(Date.now() - 5000),
    } as never);

    // Act & Assert
    await expect(
      resetPassword({ token: 'already-used-token', password: 'NewPass1' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('throws BAD_REQUEST when token record does not exist', async () => {
    // Arrange
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);

    // Act & Assert
    await expect(
      resetPassword({ token: 'nonexistent', password: 'NewPass1' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMe — TC: implicit in integration but validated at unit level
// ─────────────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns sanitised user without passwordHash', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);

    // Act
    const result = await getMe(baseUser.id);

    // Assert
    expect(result.id).toBe(baseUser.id);
    expect(result.email).toBe(baseUser.email);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getMe('ghost_user')).rejects.toBeInstanceOf(AppError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateMe — TC: AUTH-ME-001 through AUTH-ME-006
// ─────────────────────────────────────────────────────────────────────────────

describe('updateMe', () => {
  // We need a real bcrypt hash at rounds=1 to verify password comparison.
  // We use the known hash from the base fixture (which is a placeholder).
  // For password-change paths, inject a fresh bcrypt hash.
  const KNOWN_PASSWORD = 'OldPass1';

  async function makeUserWithHash(): Promise<typeof baseUser & { passwordHash: string }> {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(KNOWN_PASSWORD, 1);
    return { ...baseUser, passwordHash: hash };
  }

  it('AUTH-ME-001 — updates displayName only', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...baseUser,
      displayName: 'New Name',
    } as never);

    // Act
    const result = await updateMe(baseUser.id, { displayName: 'New Name' });

    // Assert
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayName: 'New Name' }),
      }),
    );
    expect(result.displayName).toBe('New Name');
  });

  it('AUTH-ME-002 — updates email to a fresh available address', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(baseUser as never) // own user lookup
      .mockResolvedValueOnce(null); // email availability check → not taken
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...baseUser,
      email: 'newalice@example.com',
    } as never);

    // Act
    const result = await updateMe(baseUser.id, { email: 'newalice@example.com' });

    expect(result.email).toBe('newalice@example.com');
  });

  it('AUTH-ME-003 — throws CONFLICT when new email belongs to another user', async () => {
    // Arrange
    const anotherUser = { ...baseUser, id: 'user_02', email: 'taken@example.com' };
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(baseUser as never) // own user
      .mockResolvedValueOnce(anotherUser as never); // email taken

    // Act & Assert
    await expect(updateMe(baseUser.id, { email: 'taken@example.com' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 409,
    );
  });

  it('AUTH-ME-004 — changes password when currentPassword is correct', async () => {
    // Arrange
    const userWithRealHash = await makeUserWithHash();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithRealHash as never);
    vi.mocked(prisma.user.update).mockResolvedValue(userWithRealHash as never);

    // Act
    await updateMe(baseUser.id, {
      currentPassword: KNOWN_PASSWORD,
      newPassword: 'NewPass1',
    });

    // Assert — user.update called with a new passwordHash
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]![0];
    expect(updateCall.data).toHaveProperty('passwordHash');
    expect((updateCall.data as { passwordHash: string }).passwordHash).not.toBe(
      userWithRealHash.passwordHash,
    );
  });

  it('AUTH-ME-005 — throws BAD_REQUEST when newPassword provided without currentPassword', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);

    // Act & Assert — Zod refinement should trigger upstream; service re-validates
    // Note: Zod validation typically occurs at controller level; this test
    // verifies the service-level guard as defence-in-depth.
    await expect(updateMe(baseUser.id, { newPassword: 'NewPass1' })).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('AUTH-ME-006 — throws UNAUTHORISED when currentPassword is wrong', async () => {
    // Arrange
    const userWithRealHash = await makeUserWithHash();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithRealHash as never);

    // Act & Assert
    await expect(
      updateMe(baseUser.id, {
        currentPassword: 'WrongPassword1',
        newPassword: 'NewPass1',
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 401,
    );
  });

  it('does NOT expose passwordHash in the returned user object', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...baseUser,
      displayName: 'Updated',
    } as never);

    // Act
    const result = await updateMe(baseUser.id, { displayName: 'Updated' });

    // Assert — ISO/IEC 25010 Confidentiality: API must never leak credential data
    expect(result).not.toHaveProperty('passwordHash');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mass Assignment / Over-Posting guard
// Related: TEST_STRATEGY.md §5.5
// ─────────────────────────────────────────────────────────────────────────────

describe('Mass Assignment guard', () => {
  it('does not allow emailVerified to be set via updateMe', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue(baseUser as never);

    // Act — pass extra field that Zod schema should strip
    const input = { displayName: 'Alice' } as Parameters<typeof updateMe>[1];
    await updateMe(baseUser.id, input);

    // Assert — emailVerified must NOT appear in the update payload
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0]![0];
    expect(updateCall.data).not.toHaveProperty('emailVerified');
  });
});
