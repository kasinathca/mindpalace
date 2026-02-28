// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/setup.ts — Global setup for all integration tests
//
// This file is referenced as `setupFiles` in the integration Vitest project.
// It runs once before each test FILE loads and applies two things globally:
//
//   1. A mock for the email module so no real SMTP connections are made.
//      The API behaviour (status codes, DB mutations) is fully verifiable
//      without actually delivering email.
//
//   2. A cleanDb() helper that deletes all rows from every table in
//      FK-safe order so each test file starts with a known empty state.
// ─────────────────────────────────────────────────────────────────────────────
import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// ── Email mock ────────────────────────────────────────────────────────────────
// Must be a top-level vi.mock call so Vitest can statically hoist it.
vi.mock('../../src/lib/email.js', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  buildPasswordResetEmail: vi.fn().mockReturnValue('<p>reset link</p>'),
  buildWelcomeEmail: vi.fn().mockReturnValue('<p>welcome</p>'),
}));

// ── Prisma client for teardown ────────────────────────────────────────────────
// Separate from the singleton in lib/prisma.ts — used only for test cleanup.
const prisma = new PrismaClient();

/**
 * Delete every row from every table in FK-safe order (children before parents).
 * Call this in `beforeAll` at the top of each integration test file.
 */
export async function cleanDb(): Promise<void> {
  // Child tables first
  await prisma.annotation.deleteMany();
  await prisma.permanentCopy.deleteMany();
  await prisma.bookmarkTag.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  // Mid-level
  await prisma.bookmark.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.tag.deleteMany();
  // Root
  await prisma.user.deleteMany();
}

export { prisma };
