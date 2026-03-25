// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.controller.ts — HTTP request/response handlers
//
// Controllers are deliberately thin: they extract inputs, call service methods,
// and format responses. All business logic lives in auth.service.ts.
//
// Refresh token strategy:
//   • Access token  → returned in JSON response body (short-lived, 15 min)
//   • Refresh token → set as HttpOnly cookie only (never returned in body)
//
// NOTE: Refresh tokens are currently stateless (signed JWTs, not stored in DB).
//       Server-side revocation (e.g. logout-all-devices) is deferred to Phase 3.
//       Sprint 6 will add a RefreshToken table with token hashing for full rotation.
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as AuthService from './auth.service.js';
import { HTTP, COOKIE } from '../../config/constants.js';
import { env } from '../../config/env.js';

// `req.user!` is safe in authenticated handlers because auth middleware
// populates `req.user` before these routes execute.

interface RefreshCookieOptions {
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
  maxAge: number;
  path: string;
}

// Cookie options for the refresh token
function getRefreshCookieOptions(): RefreshCookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: COOKIE.HTTP_ONLY,
    sameSite: COOKIE.SAME_SITE,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/v1/auth',
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.body is validated by validate() middleware — safe to cast
    const result = await AuthService.register(
      req.body as Parameters<typeof AuthService.register>[0],
    );
    res.cookie(COOKIE.REFRESH_TOKEN, result.refreshToken, getRefreshCookieOptions());
    res.status(HTTP.CREATED).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AuthService.login(req.body as Parameters<typeof AuthService.login>[0]);
    res.cookie(COOKIE.REFRESH_TOKEN, result.refreshToken, getRefreshCookieOptions());
    res.status(HTTP.OK).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Accept token from cookie (browser clients) or body (API/mobile clients)
    const rawToken: string | undefined =
      (req.cookies && (req.cookies as Record<string, string>)[COOKIE.REFRESH_TOKEN]) ??
      (req.body as { refreshToken?: string })?.refreshToken;

    if (!rawToken) {
      res.status(HTTP.UNAUTHORISED).json({
        success: false,
        error: 'Refresh token not provided.',
        code: 'AUTH_REFRESH_TOKEN_MISSING',
      });
      return;
    }

    const result = await AuthService.refreshTokens(rawToken);
    res.cookie(COOKIE.REFRESH_TOKEN, result.refreshToken, getRefreshCookieOptions());
    res.status(HTTP.OK).json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE.REFRESH_TOKEN, { path: '/api/v1/auth' });
  res.status(HTTP.NO_CONTENT).send();
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await AuthService.forgotPassword(req.body as Parameters<typeof AuthService.forgotPassword>[0]);
    // Always return 200 to prevent user enumeration
    res.status(HTTP.OK).json({
      success: true,
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await AuthService.resetPassword(req.body as Parameters<typeof AuthService.resetPassword>[0]);
    res
      .status(HTTP.OK)
      .json({ success: true, data: { message: 'Password updated successfully.' } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await AuthService.getMe(req.user!.id);
    res.status(HTTP.OK).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await AuthService.updateMe(
      req.user!.id,
      req.body as Parameters<typeof AuthService.updateMe>[1],
    );
    res.status(HTTP.OK).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
