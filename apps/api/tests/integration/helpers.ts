// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/helpers.ts — Shared test utilities
//
// Provides a lazily-initialised app instance and convenience wrappers around
// supertest so individual test files stay focused on assertions.
// ─────────────────────────────────────────────────────────────────────────────
import request from 'supertest';
import { createApp } from '../../src/app.js';

// ── App singleton ─────────────────────────────────────────────────────────────
// Create the Express app once and reuse across all integration tests.
// Creating it lazily avoids module-load timing issues with env validation.
let _app: ReturnType<typeof createApp> | null = null;

function getApp(): ReturnType<typeof createApp> {
  if (!_app) _app = createApp();
  return _app;
}

/** Return a supertest request builder against the shared test app. */
export function api(): ReturnType<typeof request> {
  return request(getApp());
}

// ── Typed response helpers ────────────────────────────────────────────────────

export interface ApiSuccessBody<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: string;
  issues?: Array<{ field: string; message: string }>;
}

// ── Auth credentials helper ───────────────────────────────────────────────────

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  accessToken: string;
  userId: string;
}

let _seq = 0;

/** Unique email for each call so parallel tests never collide. */
function uniqueEmail(): string {
  _seq += 1;
  return `user-${Date.now()}-${_seq}@test.local`;
}

/**
 * Register a new user and return the access token + userId.
 * Password defaults to 'Password1' (meets all policy requirements).
 */
export async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? 'Password1';
  const displayName = overrides?.displayName ?? 'Test User';

  const res = await api().post('/api/v1/auth/register').send({ email, password, displayName });

  const body = res.body as ApiSuccessBody<{
    accessToken: string;
    user: { id: string };
  }>;

  return {
    email,
    password,
    displayName,
    accessToken: body.data.accessToken,
    userId: body.data.user.id,
  };
}

/** Attach an Authorization header to a supertest request chain. */
export function withAuth(
  req: ReturnType<ReturnType<typeof request>['get']>,
  token: string,
): ReturnType<ReturnType<typeof request>['get']> {
  return req.set('Authorization', `Bearer ${token}`);
}
