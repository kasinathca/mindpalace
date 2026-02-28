// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/auth.test.ts — Auth endpoints integration tests
//
// Covers every route in auth.router.ts:
//   POST /auth/register
//   POST /auth/login
//   POST /auth/refresh
//   POST /auth/logout
//   POST /auth/forgot-password
//   POST /auth/reset-password
//   GET  /auth/me
//   PATCH /auth/me
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { api, createTestUser, type ApiSuccessBody, type ApiErrorBody } from './helpers.js';
import { cleanDb } from './setup.js';

const prisma = new PrismaClient();

const BASE = '/api/v1/auth';

const VALID_USER = {
  email: 'alice@test.local',
  password: 'Password1',
  displayName: 'Alice',
} as const;

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── POST /auth/register ───────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('creates a user and returns 201 with tokens + sanitised user', async () => {
    const res = await api().post(`${BASE}/register`).send(VALID_USER);

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{
      accessToken: string;
      user: { id: string; email: string; displayName: string };
    }>;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.user.email).toBe(VALID_USER.email);
    expect(body.data.user.displayName).toBe(VALID_USER.displayName);
    // Must never expose the password hash
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 when email is already registered', async () => {
    const res = await api().post(`${BASE}/register`).send(VALID_USER);

    expect(res.status).toBe(409);
    const body = res.body as ApiErrorBody;
    expect(body.success).toBe(false);
  });

  it('returns 422 when password has no uppercase letter', async () => {
    const res = await api()
      .post(`${BASE}/register`)
      .send({ email: 'bad@test.local', password: 'password1', displayName: 'Bob' });

    expect(res.status).toBe(422);
    const body = res.body as ApiErrorBody;
    expect(body.issues).toBeDefined();
  });

  it('returns 422 when password has no number', async () => {
    const res = await api()
      .post(`${BASE}/register`)
      .send({ email: 'bad2@test.local', password: 'PasswordA', displayName: 'Bob' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when password is too short', async () => {
    const res = await api()
      .post(`${BASE}/register`)
      .send({ email: 'bad3@test.local', password: 'P1', displayName: 'Bob' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when email is invalid', async () => {
    const res = await api()
      .post(`${BASE}/register`)
      .send({ email: 'not-an-email', password: 'Password1', displayName: 'Bob' });

    expect(res.status).toBe(422);
  });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 200 with access + refresh tokens on valid credentials', async () => {
    const res = await api().post(`${BASE}/login`).send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      accessToken: string;
      user: { id: string; email: string };
    }>;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.user.email).toBe(VALID_USER.email);
    // Refresh token is set as an HTTP-only cookie
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await api()
      .post(`${BASE}/login`)
      .send({ email: VALID_USER.email, password: 'WrongPass9' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await api()
      .post(`${BASE}/login`)
      .send({ email: 'nobody@test.local', password: 'Password1' });

    expect(res.status).toBe(401);
  });
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns 200 with new tokens when a valid refresh cookie is set', async () => {
    // Step 1: login to obtain the httponly cookie
    const loginRes = await api().post(`${BASE}/login`).send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });
    const cookies = loginRes.headers['set-cookie'] as string | string[];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Step 2: refresh using the cookie
    const refreshRes = await api().post(`${BASE}/refresh`).set('Cookie', cookieHeader);

    expect(refreshRes.status).toBe(200);
    const body = refreshRes.body as ApiSuccessBody<{ accessToken: string }>;
    expect(body.data.accessToken).toBeTypeOf('string');
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await api().post(`${BASE}/refresh`);
    expect(res.status).toBe(401);
  });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 200 and clears the refresh cookie for authenticated user', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().post(`${BASE}/logout`).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // The cookie should be cleared (Max-Age=0 or Expires in past)
    const cookieHeader = res.headers['set-cookie'] as string | string[] | undefined;
    if (cookieHeader) {
      const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
      expect(raw.toLowerCase()).toMatch(/max-age=0|expires=.*thu.*01 jan 1970/i);
    }
  });

  it('returns 401 without a token', async () => {
    const res = await api().post(`${BASE}/logout`);
    expect(res.status).toBe(401);
  });
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────

describe('POST /auth/forgot-password', () => {
  it('returns 200 for a registered email (stores token in DB)', async () => {
    const res = await api().post(`${BASE}/forgot-password`).send({ email: VALID_USER.email });

    expect(res.status).toBe(200);
    // Token should have been created in the DB
    const token = await prisma.passwordResetToken.findFirst({
      where: { user: { email: VALID_USER.email } },
    });
    expect(token).not.toBeNull();
  });

  it('returns 200 for an unknown email (user enumeration safe)', async () => {
    const res = await api().post(`${BASE}/forgot-password`).send({ email: 'nobody@test.local' });

    expect(res.status).toBe(200);
  });
});

// ── POST /auth/reset-password ─────────────────────────────────────────────────

describe('POST /auth/reset-password', () => {
  it('returns 200 and updates the password when the token is valid', async () => {
    // Create a user and a valid reset token directly in the DB
    const { userId } = await createTestUser({ email: 'reset-test@test.local' });
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    const res = await api()
      .post(`${BASE}/reset-password`)
      .send({ token: plainToken, password: 'NewPassword2' });

    expect(res.status).toBe(200);

    // Old password should no longer work
    const loginRes = await api()
      .post(`${BASE}/login`)
      .send({ email: 'reset-test@test.local', password: 'Password1' });
    expect(loginRes.status).toBe(401);

    // New password should work
    const loginRes2 = await api()
      .post(`${BASE}/login`)
      .send({ email: 'reset-test@test.local', password: 'NewPassword2' });
    expect(loginRes2.status).toBe(200);
  });

  it('returns 400 for an expired token', async () => {
    const { userId } = await createTestUser({ email: 'expired-reset@test.local' });
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() - 1_000), // already expired
      },
    });

    const res = await api()
      .post(`${BASE}/reset-password`)
      .send({ token: plainToken, password: 'NewPassword2' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a completely invalid token', async () => {
    const res = await api()
      .post(`${BASE}/reset-password`)
      .send({ token: 'invalid-token-that-does-not-exist', password: 'Password2' });

    expect(res.status).toBe(400);
  });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns 200 with the authenticated user profile', async () => {
    const { accessToken, email, displayName } = await createTestUser();

    const res = await api().get(`${BASE}/me`).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ email: string; displayName: string }>;
    expect(body.data.email).toBe(email);
    expect(body.data.displayName).toBe(displayName);
    expect(body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await api().get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await api().get(`${BASE}/me`).set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /auth/me ────────────────────────────────────────────────────────────

describe('PATCH /auth/me', () => {
  it('updates displayName and returns 200', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ displayName: string }>;
    expect(body.data.displayName).toBe('Updated Name');
  });

  it('changes password when currentPassword is correct', async () => {
    const { accessToken, email } = await createTestUser();

    const res = await api().patch(`${BASE}/me`).set('Authorization', `Bearer ${accessToken}`).send({
      currentPassword: 'Password1',
      newPassword: 'NewPassword9',
    });

    expect(res.status).toBe(200);

    // Verify new password works
    const loginRes = await api().post(`${BASE}/login`).send({ email, password: 'NewPassword9' });
    expect(loginRes.status).toBe(200);
  });

  it('returns 401 when currentPassword is wrong', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().patch(`${BASE}/me`).set('Authorization', `Bearer ${accessToken}`).send({
      currentPassword: 'WrongPass1',
      newPassword: 'NewPassword9',
    });

    expect(res.status).toBe(401);
  });

  it('returns 409 when new email is already taken', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const res = await api()
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ email: userB.email });

    expect(res.status).toBe(409);
  });
});
