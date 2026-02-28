// ─────────────────────────────────────────────────────────────────────────────
// api/auth.api.ts — Auth endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateMeInput,
  AuthResponse,
  User,
  ApiSuccessResponse,
} from '@mindpalace/shared';

export async function apiRegister(input: RegisterInput): Promise<AuthResponse> {
  const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
    '/api/v1/auth/register',
    input,
  );
  return res.data.data;
}

export async function apiLogin(input: LoginInput): Promise<AuthResponse> {
  const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/api/v1/auth/login', input);
  return res.data.data;
}

export async function apiLogout(): Promise<void> {
  await apiClient.post('/api/v1/auth/logout');
}

export async function apiForgotPassword(input: ForgotPasswordInput): Promise<void> {
  await apiClient.post('/api/v1/auth/forgot-password', input);
}

export async function apiResetPassword(input: ResetPasswordInput): Promise<void> {
  await apiClient.post('/api/v1/auth/reset-password', input);
}

export async function apiGetMe(): Promise<User> {
  const res = await apiClient.get<ApiSuccessResponse<{ user: User }>>('/api/v1/auth/me');
  return res.data.data.user;
}

export async function apiUpdateMe(input: UpdateMeInput): Promise<User> {
  const res = await apiClient.patch<ApiSuccessResponse<{ user: User }>>('/api/v1/auth/me', input);
  return res.data.data.user;
}
