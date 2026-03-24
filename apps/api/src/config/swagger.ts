// ─────────────────────────────────────────────────────────────────────────────
// config/swagger.ts — OpenAPI 3.0 specification
// Health endpoint is served by modules/system/system.router.ts.
//
// Single-file authoritative spec for the Mind Palace REST API.
// Served at GET /api/docs (Swagger UI) and GET /api/docs.json (raw spec).
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal OpenAPI 3.0 document type — avoids importing openapi-types as a dep. */
interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  servers?: unknown[];
  tags?: unknown[];
  components?: Record<string, unknown>;
  paths: Record<string, unknown>;
}

// ── Shared schema definitions ─────────────────────────────────────────────────

const schemas = {
  // ── Primitives / helpers ──────────────────────────────────────────────────
  ApiError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Bad Request' },
    },
    required: ['success', 'error'],
  },
  ValidationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Validation failed' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    required: ['success', 'error'],
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'cuid' },
      email: { type: 'string', format: 'email' },
      displayName: { type: 'string' },
      avatarUrl: { type: 'string', nullable: true },
      emailVerified: { type: 'boolean' },
      theme: { type: 'string', enum: ['SYSTEM', 'LIGHT', 'DARK'] },
      defaultView: { type: 'string', enum: ['GRID', 'LIST', 'COMPACT'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'email', 'displayName', 'emailVerified', 'theme', 'defaultView'],
  },
  AuthResponse: {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      user: { $ref: '#/components/schemas/User' },
    },
    required: ['accessToken', 'user'],
  },
  RegisterInput: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', example: 'alice@example.com' },
      password: { type: 'string', minLength: 8, example: 'SecureP@ss1' },
      displayName: { type: 'string', minLength: 2, maxLength: 64, example: 'Alice' },
    },
    required: ['email', 'password', 'displayName'],
  },
  LoginInput: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', example: 'alice@example.com' },
      password: { type: 'string', example: 'SecureP@ss1' },
    },
    required: ['email', 'password'],
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  Tag: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'cuid' },
      name: { type: 'string' },
      color: { type: 'string', nullable: true, example: '#6366F1' },
      userId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      bookmarkCount: { type: 'integer' },
    },
    required: ['id', 'name', 'userId', 'createdAt', 'bookmarkCount'],
  },

  // ── Collections ───────────────────────────────────────────────────────────
  Collection: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'cuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      color: { type: 'string', nullable: true },
      icon: { type: 'string', nullable: true },
      isPublic: { type: 'boolean' },
      sortOrder: { type: 'integer' },
      parentId: { type: 'string', nullable: true },
      userId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      _count: {
        type: 'object',
        properties: { bookmarks: { type: 'integer' } },
      },
    },
    required: ['id', 'name', 'isPublic', 'sortOrder', 'userId', 'createdAt', 'updatedAt'],
  },
  CollectionNode: {
    allOf: [
      { $ref: '#/components/schemas/Collection' },
      {
        type: 'object',
        properties: {
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/CollectionNode' },
          },
        },
        required: ['children'],
      },
    ],
  },

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  BookmarkTag: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      color: { type: 'string', nullable: true },
    },
    required: ['id', 'name'],
  },
  Bookmark: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'cuid' },
      url: { type: 'string', format: 'uri' },
      title: { type: 'string' },
      description: { type: 'string', nullable: true },
      faviconUrl: { type: 'string', nullable: true },
      coverImageUrl: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
      isPublic: { type: 'boolean' },
      isPinned: { type: 'boolean' },
      isFavourite: { type: 'boolean' },
      linkStatus: { type: 'string', enum: ['OK', 'BROKEN', 'UNCHECKED', 'REDIRECTED'] },
      lastCheckedAt: { type: 'string', format: 'date-time', nullable: true },
      readAt: { type: 'string', format: 'date-time', nullable: true },
      userId: { type: 'string' },
      collectionId: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      tags: { type: 'array', items: { $ref: '#/components/schemas/BookmarkTag' } },
    },
    required: [
      'id',
      'url',
      'title',
      'isPublic',
      'isPinned',
      'isFavourite',
      'linkStatus',
      'userId',
      'createdAt',
      'updatedAt',
      'tags',
    ],
  },
  BookmarkDetail: {
    allOf: [
      { $ref: '#/components/schemas/Bookmark' },
      {
        type: 'object',
        properties: {
          permanentCopy: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string' },
              mimeType: { type: 'string', nullable: true },
              sizeBytes: { type: 'integer', nullable: true },
              capturedAt: { type: 'string', format: 'date-time', nullable: true },
              failureReason: { type: 'string', nullable: true },
            },
          },
          annotations: {
            type: 'array',
            items: { $ref: '#/components/schemas/Annotation' },
          },
        },
      },
    ],
  },
  PaginationMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      limit: { type: 'integer' },
      nextCursor: { type: 'string', nullable: true },
      hasNextPage: { type: 'boolean' },
    },
    required: ['total', 'limit', 'nextCursor', 'hasNextPage'],
  },

  // ── Annotations ───────────────────────────────────────────────────────────
  Annotation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'cuid' },
      type: {
        type: 'string',
        enum: ['HIGHLIGHT', 'NOTE', 'BOOKMARK_WITHIN_PAGE'],
        default: 'NOTE',
      },
      content: { type: 'string' },
      positionData: {
        type: 'object',
        nullable: true,
        properties: {
          startOffset: { type: 'integer' },
          endOffset: { type: 'integer' },
          selector: { type: 'string' },
          xpath: { type: 'string' },
        },
      },
      color: { type: 'string', nullable: true },
      isPublic: { type: 'boolean' },
      permanentCopyId: { type: 'string' },
      userId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'type',
      'content',
      'isPublic',
      'permanentCopyId',
      'userId',
      'createdAt',
      'updatedAt',
    ],
  },
} as const;

// ── Reusable response stubs ───────────────────────────────────────────────────

const resp401 = {
  description: 'Unauthorised — missing or invalid JWT',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
};
const resp422 = {
  description: 'Validation error',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
};
const resp404 = {
  description: 'Not found',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
};

// ── Full spec ─────────────────────────────────────────────────────────────────

export const swaggerSpec: OpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Mind Palace API',
    version: '0.1.0',
    description: [
      'REST API for the Mind Palace bookmark manager.',
      '',
      '**Authentication**: All protected routes require a `Bearer` access token in the',
      '`Authorization` header. Obtain tokens via `POST /api/v1/auth/register` or',
      '`POST /api/v1/auth/login`. Access tokens expire in 15 minutes; use',
      '`POST /api/v1/auth/refresh` (httpOnly refresh cookie sent automatically) to',
      'rotate them without re-authentication.',
    ].join('\n'),
    contact: { name: 'Mind Palace', url: 'https://github.com/mindpalace' },
    license: { name: 'MIT' },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
  tags: [
    { name: 'Auth', description: 'Authentication & account management' },
    { name: 'Bookmarks', description: 'Bookmark CRUD, import/export, batch operations' },
    { name: 'Annotations', description: 'Highlights & notes on permanent copies' },
    { name: 'Collections', description: 'Hierarchical folder management' },
    { name: 'Tags', description: 'Tag management and merge' },
    { name: 'Search', description: 'Full-text search across bookmarks' },
    { name: 'System', description: 'Health check' },
  ],
  components: {
    schemas,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token obtained from /auth/register or /auth/login',
      },
    },
    responses: {
      Unauthorized: resp401,
      UnprocessableEntity: resp422,
      NotFound: resp404,
    },
  },
  paths: {
    // ───────────────────────────────────────────── SYSTEM
    '/api/v1/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        version: { type: 'string', example: '0.1.0' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ───────────────────────────────────────────── AUTH
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        operationId: 'authRegister',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
          },
        },
        responses: {
          '201': {
            description:
              'Account created — returns access token + user (refresh token set via HttpOnly cookie)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          '409': {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '422': resp422,
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email + password',
        operationId: 'authLogin',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } },
          },
        },
        responses: {
          '200': {
            description: 'Login successful (refresh token set via HttpOnly cookie)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '422': resp422,
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out — clears the refresh token cookie',
        operationId: 'authLogout',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Signed out' },
          '401': resp401,
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate tokens using the httpOnly refresh cookie',
        operationId: 'authRefresh',
        responses: {
          '200': {
            description: 'New access token issued (refresh token rotated via HttpOnly cookie)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AuthResponse' },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        operationId: 'authGetMe',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/User' } },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update profile (displayName, email, password, theme, defaultView)',
        operationId: 'authUpdateMe',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', minLength: 2, maxLength: 64 },
                  email: { type: 'string', format: 'email' },
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                  theme: { type: 'string', enum: ['SYSTEM', 'LIGHT', 'DARK'] },
                  defaultView: { type: 'string', enum: ['GRID', 'LIST', 'COMPACT'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/User' } },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
          '422': resp422,
        },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        operationId: 'authForgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', format: 'email' } },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reset email sent (even if email not found — prevents enumeration)',
          },
          '422': resp422,
        },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password using a reset token',
        operationId: 'authResetPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['token', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password updated' },
          '400': { description: 'Token invalid or expired' },
          '422': resp422,
        },
      },
    },

    // ───────────────────────────────────────────── BOOKMARKS
    '/api/v1/bookmarks': {
      get: {
        tags: ['Bookmarks'],
        summary: 'List bookmarks with cursor pagination and filters',
        operationId: 'listBookmarks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Pagination cursor (CUID of last seen bookmark)',
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 24, maximum: 100 } },
          { name: 'collectionId', in: 'query', schema: { type: 'string' } },
          { name: 'isPinned', in: 'query', schema: { type: 'boolean' } },
          { name: 'isFavourite', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'linkStatus',
            in: 'query',
            schema: { type: 'string', enum: ['OK', 'BROKEN', 'UNCHECKED', 'REDIRECTED'] },
          },
          {
            name: 'tagIds',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            style: 'form',
            explode: true,
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['createdAt', 'title', 'url'], default: 'createdAt' },
          },
          {
            name: 'sortDir',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated bookmark list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        bookmarks: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Bookmark' },
                        },
                        pagination: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
      post: {
        tags: ['Bookmarks'],
        summary: 'Create a bookmark',
        operationId: 'createBookmark',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri', example: 'https://example.com' },
                  collectionId: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  notes: { type: 'string' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tag names (auto-created if new)',
                  },
                  isPublic: { type: 'boolean', default: false },
                  isPinned: { type: 'boolean', default: false },
                  isFavourite: { type: 'boolean', default: false },
                },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created bookmark',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Bookmark' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '422': resp422,
        },
      },
      delete: {
        tags: ['Bookmarks'],
        summary: 'Batch delete bookmarks by IDs',
        operationId: 'batchDeleteBookmarks',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 },
                },
                required: ['ids'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Deleted count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { deleted: { type: 'integer' } },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
    },
    '/api/v1/bookmarks/import': {
      post: {
        tags: ['Bookmarks'],
        summary: 'Import bookmarks from a Netscape bookmark HTML file',
        operationId: 'importBookmarks',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Import summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        imported: { type: 'integer' },
                        skipped: { type: 'integer' },
                        errors: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
          '422': resp422,
        },
      },
    },
    '/api/v1/bookmarks/export': {
      get: {
        tags: ['Bookmarks'],
        summary: 'Export all bookmarks (JSON or Netscape HTML)',
        operationId: 'exportBookmarks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'format',
            in: 'query',
            schema: { type: 'string', enum: ['json', 'html'], default: 'json' },
          },
        ],
        responses: {
          '200': {
            description: 'Exported file (Content-Disposition: attachment)',
            content: {
              'application/json': { schema: { type: 'object' } },
              'text/html': { schema: { type: 'string' } },
            },
          },
          '401': resp401,
        },
      },
    },
    '/api/v1/bookmarks/batch/move': {
      patch: {
        tags: ['Bookmarks'],
        summary: 'Move selected bookmarks to a collection (or root)',
        operationId: 'batchMoveBookmarks',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
                  collectionId: { type: 'string', nullable: true },
                },
                required: ['ids', 'collectionId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', properties: { updated: { type: 'integer' } } },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
    },
    '/api/v1/bookmarks/batch/tag': {
      patch: {
        tags: ['Bookmarks'],
        summary: 'Bulk add or remove tags on selected bookmarks',
        operationId: 'batchTagBookmarks',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
                  tagIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
                  mode: { type: 'string', enum: ['add', 'remove'] },
                },
                required: ['ids', 'tagIds', 'mode'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', properties: { updated: { type: 'integer' } } },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
    },
    '/api/v1/bookmarks/{id}': {
      get: {
        tags: ['Bookmarks'],
        summary: 'Get a single bookmark with annotations',
        operationId: 'getBookmark',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Bookmark detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/BookmarkDetail' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
        },
      },
      patch: {
        tags: ['Bookmarks'],
        summary: 'Update a bookmark',
        operationId: 'updateBookmark',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  notes: { type: 'string' },
                  collectionId: { type: 'string', nullable: true },
                  isPublic: { type: 'boolean' },
                  isPinned: { type: 'boolean' },
                  isFavourite: { type: 'boolean' },
                  tags: { type: 'array', items: { type: 'string' } },
                  readAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated bookmark',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Bookmark' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
          '422': resp422,
        },
      },
      delete: {
        tags: ['Bookmarks'],
        summary: 'Delete a single bookmark',
        operationId: 'deleteBookmark',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': resp401,
          '404': resp404,
        },
      },
    },

    // ───────────────────────────────────────────── ANNOTATIONS
    '/api/v1/bookmarks/{bookmarkId}/annotations': {
      get: {
        tags: ['Annotations'],
        summary: 'List annotations on a bookmark',
        operationId: 'listAnnotations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookmarkId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Annotation list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Annotation' } },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
        },
      },
      post: {
        tags: ['Annotations'],
        summary: 'Create an annotation (highlight or note)',
        operationId: 'createAnnotation',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookmarkId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['HIGHLIGHT', 'NOTE', 'BOOKMARK_WITHIN_PAGE'],
                    default: 'NOTE',
                  },
                  content: { type: 'string', minLength: 1 },
                  positionData: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      startOffset: { type: 'integer' },
                      endOffset: { type: 'integer' },
                      selector: { type: 'string' },
                      xpath: { type: 'string' },
                    },
                  },
                  color: { type: 'string', example: '#FCD34D' },
                  isPublic: { type: 'boolean', default: false },
                },
                required: ['content'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created annotation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Annotation' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '422': resp422,
        },
      },
    },
    '/api/v1/bookmarks/{bookmarkId}/annotations/{annotationId}': {
      patch: {
        tags: ['Annotations'],
        summary: 'Update an annotation',
        operationId: 'updateAnnotation',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookmarkId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'annotationId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  color: { type: 'string', nullable: true },
                  isPublic: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated annotation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Annotation' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
          '422': resp422,
        },
      },
      delete: {
        tags: ['Annotations'],
        summary: 'Delete an annotation',
        operationId: 'deleteAnnotation',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookmarkId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'annotationId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '401': resp401,
          '404': resp404,
        },
      },
    },

    // ───────────────────────────────────────────── COLLECTIONS
    '/api/v1/collections': {
      get: {
        tags: ['Collections'],
        summary: 'Get the full collection tree for the authenticated user',
        operationId: 'getCollectionTree',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Nested collection tree',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/CollectionNode' } },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
      post: {
        tags: ['Collections'],
        summary: 'Create a collection (max depth 5)',
        operationId: 'createCollection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  parentId: { type: 'string' },
                  description: { type: 'string' },
                  color: { type: 'string', example: '#6366F1' },
                  icon: { type: 'string', example: 'folder' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created collection (flat, without children)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Collection' },
                  },
                },
              },
            },
          },
          '400': { description: 'Max nesting depth (5) exceeded' },
          '401': resp401,
          '422': resp422,
        },
      },
    },
    '/api/v1/collections/{id}': {
      patch: {
        tags: ['Collections'],
        summary: 'Rename or re-nest a collection',
        operationId: 'updateCollection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  parentId: { type: 'string', nullable: true },
                  description: { type: 'string', nullable: true },
                  color: { type: 'string', nullable: true },
                  icon: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated collection',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Collection' },
                  },
                },
              },
            },
          },
          '400': { description: 'Cycle detected — cannot make parent a descendant of itself' },
          '401': resp401,
          '404': resp404,
          '422': resp422,
        },
      },
      delete: {
        tags: ['Collections'],
        summary: 'Delete a collection',
        operationId: 'deleteCollection',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['delete', 'move'], default: 'delete' },
            description:
              '`delete` removes all bookmarks; `move` moves them to `targetCollectionId`',
          },
          {
            name: 'targetCollectionId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Required when action=move',
          },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '401': resp401,
          '404': resp404,
        },
      },
    },
    '/api/v1/collections/{id}/reorder': {
      patch: {
        tags: ['Collections'],
        summary: 'Update the sortOrder of a collection',
        operationId: 'reorderCollection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { sortOrder: { type: 'integer', minimum: 0 } },
                required: ['sortOrder'],
              },
            },
          },
        },
        responses: {
          '204': { description: 'Sort order updated' },
          '401': resp401,
          '404': resp404,
        },
      },
    },

    // ───────────────────────────────────────────── TAGS
    '/api/v1/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List all tags with bookmark counts',
        operationId: 'listTags',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tag list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
                  },
                },
              },
            },
          },
          '401': resp401,
        },
      },
      post: {
        tags: ['Tags'],
        summary: 'Create a tag',
        operationId: 'createTag',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 50 },
                  color: { type: 'string', example: '#6366F1' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created tag',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
          '409': { description: 'Tag with this name already exists' },
          '401': resp401,
          '422': resp422,
        },
      },
    },
    '/api/v1/tags/merge': {
      post: {
        tags: ['Tags'],
        summary: 'Merge source tags into a target tag',
        operationId: 'mergeTags',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sourceIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
                  targetId: { type: 'string' },
                },
                required: ['sourceIds', 'targetId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Surviving (target) tag',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
        },
      },
    },
    '/api/v1/tags/{id}': {
      patch: {
        tags: ['Tags'],
        summary: 'Rename or re-colour a tag',
        operationId: 'updateTag',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated tag',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Tag' },
                  },
                },
              },
            },
          },
          '401': resp401,
          '404': resp404,
          '422': resp422,
        },
      },
      delete: {
        tags: ['Tags'],
        summary: 'Delete a tag (removed from all bookmarks)',
        operationId: 'deleteTag',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': resp401,
          '404': resp404,
        },
      },
    },

    // ───────────────────────────────────────────── SEARCH
    '/api/v1/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text search across bookmarks (PostgreSQL FTS)',
        operationId: 'searchBookmarks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1 },
            description: 'Search query (PostgreSQL websearch_to_tsquery syntax)',
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 48, maximum: 100 } },
          { name: 'collectionId', in: 'query', schema: { type: 'string' } },
          {
            name: 'tagIds',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            style: 'form',
            explode: true,
          },
          { name: 'isPinned', in: 'query', schema: { type: 'boolean' } },
          { name: 'isFavourite', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'linkStatus',
            in: 'query',
            schema: { type: 'string', enum: ['OK', 'BROKEN', 'UNCHECKED', 'REDIRECTED'] },
          },
        ],
        responses: {
          '200': {
            description: 'Search results ranked by relevance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        bookmarks: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Bookmark' },
                        },
                        total: { type: 'integer' },
                        query: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': resp401,
          '422': resp422,
        },
      },
    },
  },
};
