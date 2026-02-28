// ─────────────────────────────────────────────────────────────────────────────
// config/constants.ts — Application-wide immutable constants
//
// Import from this file instead of magic numbers scattered in business logic.
// ─────────────────────────────────────────────────────────────────────────────

/** Pagination */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Collection tree */
export const COLLECTION = {
  MAX_NESTING_DEPTH: 10,
  MAX_NAME_LENGTH: 100,
} as const;

/** Bookmark */
export const BOOKMARK = {
  MAX_TITLE_LENGTH: 500,
  MAX_URL_LENGTH: 2048,
  MAX_NOTES_LENGTH: 10_000,
  SCREENSHOT_QUALITY: 80,
  SCREENSHOT_WIDTH: 1280,
} as const;

/** Annotation highlight colours */
export const HIGHLIGHT_COLOURS = [
  '#FDE047', // yellow
  '#86EFAC', // green
  '#93C5FD', // blue
  '#F9A8D4', // pink
  '#FCA5A5', // red
] as const;

/** JWT cookie names */
export const COOKIE = {
  REFRESH_TOKEN: 'refresh_token',
  SAME_SITE: 'strict' as const,
  HTTP_ONLY: true,
} as const;

/** HTTP status shortcuts (semantic names for common codes) */
export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORISED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

/** API meta */
export const API = {
  PREFIX: '/api/v1',
  VERSION: '1',
} as const;

/** Password reset token TTL in milliseconds (1 hour) */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** Verification token TTL in milliseconds (24 hours) */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
