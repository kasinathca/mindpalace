// ─────────────────────────────────────────────────────────────────────────────
// api/client.ts — Axios instance with JWT access token interceptor
//
// Request interceptor:  Attaches Authorization: Bearer header from authStore
// Response interceptor: On 401, attempts a single token refresh then retries
//                       the original request. If refresh also fails, logs out.
// ─────────────────────────────────────────────────────────────────────────────
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// We import the store lazily inside the interceptor to avoid circular deps
let getAccessToken: () => string | null = () => null;
let setTokens: (access: string) => void = () => {};
let logoutUser: () => void = () => {};

/** Called once from main.tsx after the store is initialised. */
export function initApiClientStore(storeRef: {
  getAccessToken: () => string | null;
  setTokens: (access: string) => void;
  logoutUser: () => void;
}): void {
  getAccessToken = storeRef.getAccessToken;
  setTokens = storeRef.setTokens;
  logoutUser = storeRef.logoutUser;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send HttpOnly refresh token cookie
});

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

// ── Response interceptor: transparent token refresh on 401 ───────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh for 401 errors on non-auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token as string}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{
          success: boolean;
          data: { accessToken: string };
        }>(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = response.data.data;
        setTokens(accessToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        logoutUser();
        return Promise.reject(
          refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
        );
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
