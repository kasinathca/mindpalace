# Mind Palace — Initial Code Review

**Project:** Mind Palace (Web-based Bookmark Management System)  
**Stack:** Node.js + Express + TypeScript (API) · React + Vite + TypeScript (Web) · PostgreSQL + Redis · Prisma ORM · BullMQ  
**Review Date:** March 11, 2026  
**Repo Structure:** pnpm monorepo — `apps/api`, `apps/web`, `packages/shared`

---

## 1. Scope of Review

This review covers the files most critical to correctness, security, and architecture. UI-only components, thin controller files, and typed API wrappers were intentionally excluded.

---

## 2. Files Reviewed

### 2.1 Backend — `apps/api`

#### Infrastructure / Startup

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry point — loads `.env`, calls `createApp()`, starts listener |
| `src/app.ts` | Express factory — security headers, CORS, body parsers, rate limiter, route mounts |
| `src/config/env.ts` | Zod-validated environment variables — server refuses to start on missing/invalid config |
| `src/config/constants.ts` | Application-wide constants (pagination limits, cookie names, HTTP codes) |
| `prisma/schema.prisma` | Full database schema — models, relations, indexes, enums |

#### Middleware

| File | Purpose |
|---|---|
| `src/middleware/auth.middleware.ts` | JWT Bearer token verification — attaches `req.user` |
| `src/middleware/errorHandler.middleware.ts` | Global error handler — `AppError` class, Zod error shaping, unexpected error catch |
| `src/middleware/rateLimiter.middleware.ts` | Three limiters: global (100/15min), auth (20/15min), bookmark-create (30/window) |
| `src/middleware/validate.middleware.ts` | Zod schema validation factory for `body`, `params`, `query` |
| `src/middleware/requestLogger.middleware.ts` | pino-http logger — redacts `Authorization`, `password` fields |

#### Auth Module

| File | Purpose |
|---|---|
| `src/modules/auth/auth.router.ts` | Route definitions — rate limiter + validate + controller chain |
| `src/modules/auth/auth.schemas.ts` | Zod schemas for register, login, forgot/reset password, profile update |
| `src/modules/auth/auth.service.ts` | Business logic — bcrypt hashing, JWT signing, password reset with hashed token, profile update |

#### Bookmarks Module (pattern representative)

| File | Purpose |
|---|---|
| `src/modules/bookmarks/bookmarks.router.ts` | Routes — import/export, batch ops, CRUD; nested annotations sub-router |
| `src/modules/bookmarks/bookmarks.schemas.ts` | URL validation, list query, batch schemas |
| `src/modules/bookmarks/bookmarks.service.ts` | Core logic — cursor pagination, tag upsert, queue job enqueuing, serialisation |

#### Search Module

| File | Purpose |
|---|---|
| `src/modules/search/search.router.ts` | Routes — FTS, duplicates, similar URL detection |
| `src/modules/search/search.schemas.ts` | Zod query params schema |
| `src/modules/search/search.service.ts` | PostgreSQL tsvector FTS — raw SQL for ranking, Prisma for typed hydration |

#### Libraries

| File | Purpose |
|---|---|
| `src/lib/archiver.ts` | Fetch → Readability → DOMPurify pipeline; SSRF guard blocks private/loopback/metadata IPs |
| `src/lib/cache.ts` | Redis cache helpers (`cacheGet`, `cacheSet`, `cacheDel`) — best-effort, silent failures |
| `src/lib/prisma.ts` | Prisma singleton with dev hot-reload guard |
| `src/lib/redis.ts` | IORedis singleton configured for BullMQ |
| `src/lib/email.ts` | Nodemailer transporter + password reset email template |
| `src/lib/importer.ts` | Netscape Bookmark HTML parser (Cheerio) — produces flat `ParsedBookmark[]` |

#### Background Workers

| File | Purpose |
|---|---|
| `src/workers/queues.ts` | BullMQ queue definitions — `metadata`, `archive`, `link-health` |
| `src/workers/worker.ts` | Worker process entry point — registers all three workers, graceful shutdown |

#### Type Augmentations

| File | Purpose |
|---|---|
| `src/types/express.d.ts` | Extends `Express.Request` with `user?: { id, email }` |

---

### 2.2 Frontend — `apps/web`

| File | Purpose |
|---|---|
| `src/main.tsx` | React root — wires Zustand auth store into Axios interceptor before first render |
| `src/App.tsx` | BrowserRouter + route tree — public-only, protected, and 404 routes |
| `src/api/client.ts` | Axios instance — attaches Bearer token on request; transparent 401 → refresh → retry |
| `src/stores/authStore.ts` | Zustand auth store — user, tokens, login/register/logout actions, sessionStorage persist |
| `src/stores/bookmarksStore.ts` | Bookmark list, cursor pagination, optimistic updates |

---

### 2.3 Shared — `packages/shared`

| File | Purpose |
|---|---|
| `src/index.ts` | Shared TypeScript types imported by both `api` and `web` |

---

## 3. Architecture Overview

```
┌─────────────┐    REST/JSON     ┌──────────────────────────────────────────┐
│  React SPA  │ ◄──────────────► │  Express API (apps/api)                  │
│  (apps/web) │                  │                                          │
│             │                  │  Middleware chain:                       │
│  Zustand    │                  │    helmet → cors → requestLogger →       │
│  stores     │                  │    json parser → defaultLimiter →        │
│             │                  │    routes → errorHandler                 │
└─────────────┘                  │                                          │
                                 │  Modules: auth · bookmarks · collections │
                                 │           tags · search · annotations    │
                                 └────────────┬─────────────────────────────┘
                                              │
                          ┌───────────────────┼────────────────────┐
                          │                   │                     │
                    ┌─────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
                    │ PostgreSQL │    │    Redis     │    │  BullMQ      │
                    │  (Prisma)  │    │  (IORedis)   │    │  Workers     │
                    └────────────┘    └──────────────┘    │  metadata   │
                                                          │  archive    │
                                                          │  linkhealth │
                                                          └─────────────┘
```

---

## 4. Security Observations

### 4.1 Implemented Security Controls

- **Helmet** — strict CSP, HSTS (1 year + subdomains), XSS/clickjack headers
- **CORS** — origin-locked to `CORS_ORIGIN` env var with credential support
- **Rate limiting** — three-tier (global · auth · per-user bookmark creation)
- **JWT** — short-lived access tokens (15m) + HttpOnly cookie refresh tokens (7d); secrets validated ≥32 chars at startup
- **Password hashing** — bcrypt with configurable rounds (default 12, max 31)
- **Input validation** — all routes gated by Zod schemas via `validate()` middleware; no raw `req.body` access in services
- **SSRF guard** — `archiver.ts` blocks 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, AWS/GCP metadata hostnames
- **HTML sanitisation** — DOMPurify applied to all Readability-extracted article content before DB storage
- **Password reset tokens** — stored as SHA-256 hash, never plain text; one-time use enforced
- **Request logging** — `Authorization` header and `password` body fields are redacted via pino-http

### 4.2 Items to Verify / Discuss

- **Refresh token revocation** — current implementation is stateless (signed JWT, not stored server-side). Logout-all-devices / forced revocation is deferred. `auth.controller.ts` notes this as Phase 3 work.
- **`emailVerified` flag** — schema has the field but login flow does not currently enforce it. Confirm if this is intentional for Phase 1.
- **File upload path** — multer uses `memoryStorage` (max 10 MB); confirm temp memory pressure is acceptable under load.
- **Screenshot storage** — `screenshotPath` stored as relative path in DB. Confirm no path traversal risk in the read endpoint.

---

## 5. Data Model Summary

| Model | Key Points |
|---|---|
| `User` | CUID PK, unique email, `passwordHash` (never plain), theme/view preferences inline |
| `PasswordResetToken` | `tokenHash` (SHA-256), `expiresAt`, `usedAt` (one-time use), cascades on User delete |
| `Collection` | Self-referential tree, `parentId → id` with CASCADE, `sortOrder` for ordering |
| `Bookmark` | `searchVector tsvector` maintained by DB trigger (GIN index), cursor pagination on `(userId, createdAt DESC)` |
| `Tag` | Unique per user (case-insensitive, lowercased in schema), M:N to Bookmark via `BookmarkTag` |
| `PermanentCopy` | One-to-one with Bookmark, stores `rawHtml`, `articleContent`, `failureReason` |
| `Annotation` | Belongs to `PermanentCopy`, `positionData` as JSON (offsets + XPath/CSS selector) |

---

## 6. Background Job Architecture

Three BullMQ queues, all workers run in a **separate process** (`worker.ts`) so they never block HTTP:

| Queue | Trigger | Action |
|---|---|---|
| `metadata` | On bookmark create | Fetch URL → extract title, description, OG image, favicon |
| `archive` | On bookmark create | Fetch URL → Readability + DOMPurify → store `PermanentCopy` |
| `link-health` | Schedule (nightly repeatable) + on-demand | HEAD/GET URL → classify as `OK`, `BROKEN`, or `REDIRECTED` |

---

## 7. Frontend Token Strategy

```
Login response → { accessToken, refreshToken, user }
                  ↓                ↓
         Zustand authStore    HttpOnly cookie
         (sessionStorage)     (path=/api/v1/auth)

On every request → Axios interceptor attaches Bearer token
On 401 response  → Single refresh attempt → if OK retry original; if fail → force logout
```

---

## 8. Key Patterns to Note

- **Thin controllers** — no business logic; controllers only extract inputs, call service, format response
- **`validate()` middleware** — wraps Zod parse; on failure passes `ZodError` to global `errorHandler`
- **`AppError`** — typed error with `statusCode`; thrown in services, caught by `errorHandler`
- **Cache pattern** — Redis `cacheGet/cacheSet/cacheDel` used in collections + tags services; failures are silently swallowed (best-effort)
- **`req.user!` assertion** — safe because `jwtAuthGuard` always runs before any protected handler; TypeScript knows via `express.d.ts` augmentation
- **Cursor pagination** — bookmarks use `createdAt + id` cursor, not offset (consistent under concurrent writes)
- **FTS strategy** — `searchVector` column written by PostgreSQL trigger, not by Prisma. Prisma used only for typed hydration after raw SQL ranking query.

---

## 9. Test Coverage (from `coverage/` snapshot)

| Module | Notes |
|---|---|
| `lib/importer.ts` | Unit tested (`importer.test.ts`) |
| Integration tests | Located in `apps/api/tests/integration/` |
| E2E tests | Located in `apps/web/e2e/` (Playwright) — `auth.spec.ts`, `bookmarks.spec.ts`, `navigation.spec.ts` |

---

*End of initial review document.*
