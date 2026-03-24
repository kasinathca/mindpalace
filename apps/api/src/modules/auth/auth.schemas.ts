// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.schemas.ts — Zod schemas for all auth endpoints
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Must be a valid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(64, 'Display name must not exceed 64 characters')
    .trim(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const UpdateMeSchema = z
  .object({
    displayName: z.string().min(2).max(64).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/).optional(),
    theme: z.enum(['SYSTEM', 'LIGHT', 'DARK']).optional(),
    defaultView: z.enum(['GRID', 'LIST', 'COMPACT']).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: 'currentPassword is required when changing password', path: ['currentPassword'] },
  );
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
