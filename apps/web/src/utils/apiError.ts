import axios from 'axios';

export class ApiClientError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly serverMessage: string | undefined;

  constructor(
    message: string,
    opts?: {
      status: number | undefined;
      code: string | undefined;
      serverMessage: string | undefined;
    },
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = opts?.status;
    this.code = opts?.code;
    this.serverMessage = opts?.serverMessage;
  }
}

const STATUS_MESSAGE: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'We could not find what you were looking for.',
  409: 'This action conflicts with existing data. Please refresh and retry.',
  422: 'Some details are not valid. Please review and try again.',
  429: 'Too many requests right now. Please wait a moment and retry.',
  500: 'Something went wrong on our side. Please try again in a moment.',
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The server took too long to respond. Please retry.',
};

const ERROR_CODE_MESSAGE: Record<string, string> = {
  AUTH_USER_NOT_FOUND: 'No account exists for that email address.',
  AUTH_INVALID_PASSWORD: 'The password is incorrect. Please try again.',
  AUTH_EMAIL_ALREADY_REGISTERED: 'That email is already registered. Try signing in instead.',
  AUTH_REFRESH_TOKEN_MISSING: 'Your session token is missing. Please sign in again.',
  AUTH_REFRESH_TOKEN_INVALID: 'Your session expired. Please sign in again.',
  AUTH_REFRESH_USER_NOT_FOUND: 'This account could not be found. Please sign in again.',
  AUTH_RESET_TOKEN_INVALID_OR_EXPIRED: 'This reset link is invalid or expired. Request a new one.',
  AUTH_CURRENT_PASSWORD_REQUIRED: 'Enter your current password to set a new one.',
  AUTH_CURRENT_PASSWORD_INCORRECT: 'Your current password is incorrect.',
};

function getServerMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const candidate = data as { error?: unknown; message?: unknown };

  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    return candidate.error.trim();
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message.trim();
  }
  return undefined;
}

function getServerCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const candidate = data as { code?: unknown };
  if (typeof candidate.code === 'string' && candidate.code.trim()) {
    return candidate.code.trim();
  }
  return undefined;
}

export function getUserFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError && error.message.trim()) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network error: we could not reach the server. Please check your connection.';
    }

    const status = error.response.status;
    const code = getServerCode(error.response.data);
    if (code && ERROR_CODE_MESSAGE[code]) {
      return ERROR_CODE_MESSAGE[code];
    }

    const statusMessage = STATUS_MESSAGE[status] ?? 'Unexpected server error. Please try again.';
    const serverMessage = getServerMessage(error.response.data);

    if (serverMessage && serverMessage !== statusMessage) {
      return `Error ${status}: ${statusMessage} ${serverMessage}`;
    }

    return `Error ${status}: ${statusMessage}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function toUserFacingError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiClientError(
        'Network error: we could not reach the server. Please check your connection.',
      );
    }

    const status = error.response.status;
    const code = getServerCode(error.response.data);
    const serverMessage = getServerMessage(error.response.data);
    const message = getUserFriendlyErrorMessage(error, fallback);

    return new ApiClientError(message, {
      status,
      code,
      serverMessage,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message || fallback);
  }

  return new ApiClientError(fallback);
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiClientError) return error.status;
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}
