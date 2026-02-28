# Mind Palace — API (`apps/api`)

Express 5 REST API for the Mind Palace bookmark management system, running on Node.js 20.

## Table of Contents

- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Database](#database)
- [Background Workers](#background-workers)
- [Testing](#testing)
- [API Documentation](#api-documentation)

---

## Requirements

| Tool       | Version  |
| ---------- | -------- |
| Node.js    | ≥ 20 LTS |
| pnpm       | ≥ 9      |
| PostgreSQL | ≥ 16     |
| Redis      | ≥ 7      |

---

## Environment Variables

Copy `.env.example` (project root) to `.env` and fill in the required values.

| Variable              | Required | Default                 | Description                                |
| --------------------- | -------- | ----------------------- | ------------------------------------------ |
| `DATABASE_URL`        | ✅       | —                       | Prisma PostgreSQL connection string        |
| `REDIS_URL`           | ✅       | —                       | IORedis connection URL                     |
| `JWT_ACCESS_SECRET`   | ✅       | —                       | ≥ 32 random characters                     |
| `JWT_REFRESH_SECRET`  | ✅       | —                       | ≥ 32 random characters (differ from above) |
| `SMTP_HOST`           | ✅       | —                       | SMTP server hostname                       |
| `SMTP_PORT`           | ✅       | —                       | SMTP port                                  |
| `SMTP_USER`           | ✅       | —                       | SMTP username                              |
| `SMTP_PASS`           | ✅       | —                       | SMTP password                              |
| `SMTP_FROM`           | ✅       | —                       | Envelope From address                      |
| `PORT`                | ❌       | `3000`                  | TCP port to listen on                      |
| `NODE_ENV`            | ❌       | `development`           | `production` enables JSON logs             |
| `CORS_ORIGIN`         | ❌       | `http://localhost:5173` | Allowed CORS origin(s)                     |
| `JWT_ACCESS_EXPIRES`  | ❌       | `15m`                   | Access token lifespan                      |
| `JWT_REFRESH_EXPIRES` | ❌       | `7d`                    | Refresh token lifespan                     |
| `BCRYPT_ROUNDS`       | ❌       | `12`                    | bcrypt cost factor                         |
| `LOG_LEVEL`           | ❌       | `info`                  | pino level                                 |

---

## Getting Started

```bash
# 1. Install dependencies (run from monorepo root)
pnpm install

# 2. Start PostgreSQL and Redis (Docker Compose)
docker compose up -d postgres redis

# 3. Apply database migrations
pnpm --filter api run db:migrate

# 4. (Optional) Seed development data
pnpm --filter api run db:seed

# 5. Start the API server in development mode (hot-reload via ts-node)
pnpm --filter api run dev

# 6. Start the background workers (separate terminal)
pnpm --filter api run dev:worker
```

The API is available at `http://localhost:3000`.  
Swagger UI is available at `http://localhost:3000/api/docs`.

---

## Available Scripts

Run these from the **monorepo root** with `pnpm --filter api run <script>`, or from
`apps/api/` directly with `pnpm run <script>`.

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `dev`              | Start API in development mode (ts-node, watch)         |
| `dev:worker`       | Start worker process in development mode               |
| `build`            | Compile TypeScript to `dist/`                          |
| `start`            | Run compiled API (`dist/index.js`)                     |
| `start:worker`     | Run compiled worker (`dist/workers/worker.js`)         |
| `test`             | Run all unit tests (Vitest)                            |
| `test:unit`        | Run unit tests only (`vitest.unit.config.ts`)          |
| `test:integration` | Run integration tests (`vitest.integration.config.ts`) |
| `test:coverage`    | Run tests with coverage report                         |
| `db:migrate`       | Apply pending Prisma migrations                        |
| `db:seed`          | Run development seed script                            |
| `db:studio`        | Open Prisma Studio GUI                                 |
| `db:generate`      | Re-generate Prisma client after schema changes         |
| `type-check`       | Run `tsc --noEmit`                                     |
| `lint`             | Run ESLint                                             |
| `format`           | Run Prettier (write)                                   |
| `format:check`     | Run Prettier (check, no writes)                        |

---

## Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma         # Database schema and relationships
│   ├── seed.ts               # Development seed data
│   └── migrations/           # SQL migration history
├── src/
│   ├── index.ts              # Entry point — starts HTTP server
│   ├── app.ts                # Express app factory (createApp)
│   ├── config/
│   │   ├── constants.ts      # Application-wide constants
│   │   ├── env.ts            # Zod environment validation
│   │   └── swagger.ts        # OpenAPI 3.0 specification
│   ├── lib/
│   │   ├── archiver.ts       # SSRF guard + Readability + DOMPurify
│   │   ├── cache.ts          # Redis cache helpers
│   │   ├── email.ts          # Nodemailer transporter + templates
│   │   ├── importer.ts       # Netscape bookmark HTML parser
│   │   ├── logger.ts         # Pino logger singleton
│   │   ├── prisma.ts         # Prisma client singleton
│   │   └── redis.ts          # IORedis client singleton
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT Bearer guard
│   │   ├── errorHandler.middleware.ts # Global error handler + AppError
│   │   ├── rateLimiter.middleware.ts  # express-rate-limit (3 limiters)
│   │   ├── requestLogger.middleware.ts # pino-http with redaction
│   │   └── validate.middleware.ts     # Zod validation factory
│   ├── modules/
│   │   ├── auth/             # Register, login, refresh, reset password
│   │   ├── annotations/      # Highlight and notes on permanent copies
│   │   ├── bookmarks/        # CRUD, batch, export, link-health recheck
│   │   ├── collections/      # Hierarchical collection tree
│   │   ├── search/           # FTS, duplicate detection
│   │   └── tags/             # CRUD + merge
│   ├── types/                # Express augmented types
│   └── workers/
│       ├── archive.worker.ts   # Captures permanent readable copies
│       ├── linkhealth.worker.ts # Nightly URL health check
│       ├── metadata.worker.ts   # Auto-fetches page title/OG metadata
│       ├── queues.ts            # BullMQ queue definitions
│       └── worker.ts            # Worker process entry point
└── tests/
    └── integration/           # Integration test suites (database required)
```

---

## Database

Mind Palace uses **PostgreSQL 16** via **Prisma ORM**.

### Schema highlights

| Table           | Key Features                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `User`          | bcrypt password hash; theme + viewMode preferences                            |
| `Collection`    | Self-referential `parentId`; cascading delete on tree                         |
| `Bookmark`      | `search_vector tsvector` for FTS; `linkStatus` enum; `isPinned`/`isFavourite` |
| `Tag`           | Unique per `(userId, name)`; case-normalised to lowercase                     |
| `BookmarkTag`   | Composite PK `(bookmarkId, tagId)` join table                                 |
| `PermanentCopy` | One-to-one with Bookmark; stores Readability-extracted HTML                   |
| `Annotation`    | Belongs to `PermanentCopy`; supports HIGHLIGHT, NOTE, BOOKMARK_WITHIN_PAGE    |

### Full-text search

FTS uses a PL/pgSQL trigger to keep the `search_vector` column on `Bookmark` up to date.  
Queries use `websearch_to_tsquery('english', ...)` for natural-language search syntax.  
Results are ranked by `ts_rank_cd` via a raw SQL query followed by Prisma lookup.

---

## Background Workers

Workers run as a **separate process** (`worker.ts`). Do not run them inside the main API server
process.

| Worker             | Trigger                                       | Concurrency |
| ------------------ | --------------------------------------------- | ----------- |
| `MetadataWorker`   | Fired on every new bookmark                   | 5           |
| `ArchiveWorker`    | Fired on every new bookmark                   | 3           |
| `LinkHealthWorker` | Nightly cron `0 2 * * *` + manual recheck API | 10          |

Workers use exponential backoff:

- **Max retries:** 3
- **Backoff factor:** 2 seconds
- **Max backoff:** 32 seconds

---

## Testing

### Unit tests

```bash
pnpm --filter api run test:unit
```

Runs in-memory with mocked Prisma and Redis. No database required.  
Coverage threshold: **80% statements** (configured in `vitest.unit.config.ts`).

### Integration tests

```bash
docker compose up -d postgres redis
pnpm --filter api run db:migrate
pnpm --filter api run test:integration
```

Integration tests connect to a real PostgreSQL and Redis instance. Set `DATABASE_URL` and
`REDIS_URL` to test databases before running.

### Current test coverage

| Module      |  Tests | Notes                             |
| ----------- | -----: | --------------------------------- |
| auth        |      3 | Register, login, token refresh    |
| bookmarks   |     11 | Full CRUD, batch, FTS integration |
| collections |     10 | Tree, nesting, depth limit        |
| tags        |     12 | CRUD, merge                       |
| search      |      4 | FTS query, duplicate detection    |
| annotations |     14 | CRUD, position data               |
| importer    |     18 | Netscape HTML parsing edge cases  |
| **Total**   | **72** |                                   |

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api/docs
```

Raw OpenAPI JSON at:

```
http://localhost:3000/api/docs.json
```

All 30 endpoints are documented with request/response schemas, authentication requirements,
and example payloads.
