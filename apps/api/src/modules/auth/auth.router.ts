// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.router.ts — Auth route definitions
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter } from 'express';
import { authLimiter } from '../../middleware/rateLimiter.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import * as AuthController from './auth.controller.js';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateMeSchema,
} from './auth.schemas.js';

export const authRouter: IRouter = Router();

// Public endpoints (rate-limited to mitigate brute-force)
authRouter.post(
  '/register',
  authLimiter,
  validate({ body: RegisterSchema }),
  AuthController.register,
);
authRouter.post('/login', authLimiter, validate({ body: LoginSchema }), AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', jwtAuthGuard, AuthController.logout);
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: ForgotPasswordSchema }),
  AuthController.forgotPassword,
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: ResetPasswordSchema }),
  AuthController.resetPassword,
);

// Authenticated user profile
authRouter.get('/me', jwtAuthGuard, AuthController.getMe);
authRouter.patch('/me', jwtAuthGuard, validate({ body: UpdateMeSchema }), AuthController.updateMe);
