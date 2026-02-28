// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.service.ts — Authentication business logic
//
// Responsibilities:
//   • User registration with password hashing
//   • Login with credential verification + JWT issuance
//   • Token refresh (stateless JWT re-signing — tokens are NOT stored server-side)
//   • Logout (client-side token discard; server-side revocation deferred to Phase 3)
//   • Forgot / reset password flow
//   • Profile read + update
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.middleware.js';
import { HTTP, PASSWORD_RESET_TTL_MS } from '../../config/constants.js';
import { sendMail, buildPasswordResetEmail } from '../../lib/email.js';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateMeInput,
} from './auth.schemas.js';

// ── Token helpers ─────────────────────────────────────────────────────────────

export function signAccessToken(userId: string, email: string): string {
  // jwt.sign accepts a string expiry (e.g. '15m'); the branded ms.StringValue type
  // is compatible — cast via string to satisfy the overload.
  return jwt.sign({ sub: userId, email }, env.JWT_ACCESS_SECRET, {
    // jsonwebtoken also accepts duration strings like '15m' at runtime;
    // the @types package types expiresIn as `StringValue | number` but our
    // env value is a plain string — cast through unknown to satisfy TypeScript.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Serialise user for API response (never expose passwordHash) ───────────────

interface SanitisedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  theme: string;
  defaultView: string;
  createdAt: string;
  updatedAt: string;
}

function sanitiseUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  theme: string;
  defaultView: string;
  createdAt: Date;
  updatedAt: Date;
}): SanitisedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    theme: user.theme,
    defaultView: user.defaultView,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function register(
  input: RegisterInput,
): Promise<{ user: SanitisedUser; accessToken: string; refreshToken: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(HTTP.CONFLICT, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    },
  });

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);

  return { user: sanitiseUser(user), accessToken, refreshToken };
}

export async function login(
  input: LoginInput,
): Promise<{ user: SanitisedUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    // Use a constant-time comparison to prevent timing attacks (user enumeration)
    await bcrypt.compare(input.password, '$2a$12$invalidhash.padding.padding.padding.p');
    throw new AppError(HTTP.UNAUTHORISED, 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(HTTP.UNAUTHORISED, 'Invalid email or password.');
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);

  return { user: sanitiseUser(user), accessToken, refreshToken };
}

export async function refreshTokens(
  rawRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { sub: string };
  try {
    payload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new AppError(HTTP.UNAUTHORISED, 'Invalid or expired refresh token.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError(HTTP.UNAUTHORISED, 'User not found.');
  }

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always return success to prevent user enumeration
  if (!user) return;

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Generate a 32-byte secure random token
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${plainToken}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Mind Palace password',
    html: buildPasswordResetEmail(resetUrl),
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(HTTP.BAD_REQUEST, 'This password reset link is invalid or has expired.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function getMe(userId: string): Promise<SanitisedUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(HTTP.NOT_FOUND, 'User not found.');
  return sanitiseUser(user);
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<SanitisedUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(HTTP.NOT_FOUND, 'User not found.');

  // If changing email, ensure new email isn't taken
  if (input.email && input.email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email: input.email } });
    if (taken) throw new AppError(HTTP.CONFLICT, 'This email address is already in use.');
  }

  // If changing password, verify current password first
  let passwordHash: string | undefined;
  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new AppError(HTTP.BAD_REQUEST, 'Current password is required to set a new password.');
    }
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new AppError(HTTP.UNAUTHORISED, 'Current password is incorrect.');
    passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName ? { displayName: input.displayName } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  return sanitiseUser(updated);
}
