// ─────────────────────────────────────────────────────────────────────────────
// middleware/auth.middleware.ts — JWT authentication guard
//
// Extracts the Bearer token from the Authorization header, verifies it,
// and attaches the decoded payload to req.user.
//
// Routes that do NOT need authentication should not use this middleware.
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HTTP } from '../config/constants.js';

interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  iat: number;
  exp: number;
}

export function jwtAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res
      .status(HTTP.UNAUTHORISED)
      .json({ success: false, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res
      .status(HTTP.UNAUTHORISED)
      .json({ success: false, error: 'Invalid or expired access token' });
  }
}
