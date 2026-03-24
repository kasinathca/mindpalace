# STANDARDS.md

## §1 — Repository Identity & Stack

Mind Palace is a pnpm-workspace modular monolith for bookmark management and content preservation. The repository is organized into three packages: `apps/api` (Express + Prisma + BullMQ backend), `apps/web` (React + Vite frontend), and `packages/shared` (shared TypeScript contracts).

Monorepo layout:

- `apps/api`: REST API, auth, domain modules, workers, Prisma schema/migrations, integration tests.
- `apps/web`: SPA UI, stores, API client wrappers, component and E2E tests.
- `packages/shared`: shared types and API envelopes consumed by both applications.

Pinned runtime/tooling versions (from package manifests):

- Node: `>=20.0.0`
- pnpm: `>=9.0.0`
- TypeScript: `^5.4.0`
- ESLint: `^9.0.0`
- Prettier: `^3.3.0`

API stack versions:

- Express: `^5.0.0`
- Prisma + @prisma/client: `^5.14.0`
- BullMQ: `^5.8.0`
- Zod: `^3.23.0`
- Pino: `^9.2.0`

Web stack versions:

- React + React DOM: `^18.3.0`
- React Router DOM: `^6.25.0`
- Vite: `^5.3.0`
- Zustand: `^4.5.0`
- Axios: `^1.7.0`
- Tailwind CSS: `^3.4.0`

Single command to start the local development environment:

- `pnpm run dev`

## §2 — Canonical Directory Structure with Ownership Map

Canonical repository structure (current state after structural remediation):

```text
.
├── .github/
│   └── workflows/                   [Layer: CI/CD] [Owner: root]
├── ADR/                             [Layer: Architecture Governance] [Owner: root]
├── apps/
│   ├── api/                         [Layer: Backend App] [Owner: api]
│   │   ├── prisma/                  [Layer: Data Schema/Migrations] [Owner: api]
│   │   ├── src/                     [Layer: Runtime Source] [Owner: api]
│   │   │   ├── config/              [Layer: Config] [Owner: api]
│   │   │   ├── lib/                 [Layer: Library/Infra] [Owner: api]
│   │   │   ├── middleware/          [Layer: Middleware] [Owner: api]
│   │   │   ├── modules/             [Layer: Router/Controller/Service] [Owner: api]
│   │   │   │   ├── annotations/     [Layer: Domain Module] [Owner: api]
│   │   │   │   ├── auth/            [Layer: Domain Module] [Owner: api]
│   │   │   │   ├── bookmarks/       [Layer: Domain Module] [Owner: api]
│   │   │   │   ├── collections/     [Layer: Domain Module] [Owner: api]
│   │   │   │   ├── search/          [Layer: Domain Module] [Owner: api]
│   │   │   │   ├── system/          [Layer: Domain Module] [Owner: api]
│   │   │   │   └── tags/            [Layer: Domain Module] [Owner: api]
│   │   │   ├── types/               [Layer: Type Augmentations] [Owner: api]
│   │   │   └── workers/             [Layer: Background Workers] [Owner: api]
│   │   └── tests/                   [Layer: Integration Tests] [Owner: api]
│   └── web/                         [Layer: Frontend App] [Owner: web]
│       ├── e2e/                     [Layer: E2E Tests] [Owner: web]
│       ├── src/                     [Layer: Runtime Source] [Owner: web]
│       │   ├── api/                 [Layer: API Client Modules] [Owner: web]
│       │   ├── components/          [Layer: UI Components] [Owner: web]
│       │   ├── hooks/               [Layer: Hooks] [Owner: web]
│       │   ├── pages/               [Layer: Route Pages] [Owner: web]
│       │   ├── stores/              [Layer: State Stores] [Owner: web]
│       │   └── utils/               [Layer: Utilities] [Owner: web]
│       └── test-setup.ts            [Layer: Frontend Test Bootstrapping] [Owner: web]
├── docs/                            [Layer: Product/Engineering Docs] [Owner: root]
├── k6/                              [Layer: Performance Testing] [Owner: root]
├── packages/
│   └── shared/                      [Layer: Cross-App Contract] [Owner: shared]
│       └── src/                     [Layer: Shared Types] [Owner: shared]
└── STANDARDS.md                     [Layer: Engineering Constitution] [Owner: root]
```

Ownership rules:

- `api` owns all backend runtime and migration artifacts.
- `web` owns all frontend runtime and UI tests.
- `shared` owns cross-application contracts.
- `root` owns CI/CD, docs, governance, and repository-level tooling.

## §3 — Naming Convention Table

| Artifact                 | Convention                                        | Example                                    | Anti-example                  |
| ------------------------ | ------------------------------------------------- | ------------------------------------------ | ----------------------------- |
| Directories              | `kebab-case`                                      | `rate-limiter`                             | `RateLimiter`, `rate_limiter` |
| API module files         | `<domain>.<layer>.ts`                             | `bookmarks.service.ts`                     | `BookmarksService.ts`         |
| API worker files         | `<domain>.worker.ts`                              | `metadata.worker.ts`                       | `metadataWorker.ts`           |
| API middleware files     | `<name>.middleware.ts`                            | `auth.middleware.ts`                       | `AuthMiddleware.ts`           |
| API lib/config files     | `camelCase.ts`                                    | `requestLogger.ts`, `constants.ts`         | `request-logger.ts`           |
| React components         | `PascalCase.tsx`                                  | `BookmarkCard.tsx`                         | `bookmark-card.tsx`           |
| Page components          | `<Name>Page.tsx`                                  | `SettingsPage.tsx`                         | `settings.tsx`                |
| Zustand stores           | `camelCaseStore.ts`                               | `bookmarksStore.ts`                        | `BookmarksStore.ts`           |
| Hooks                    | `use<PascalCase>.ts`                              | `useDebounce.ts`                           | `debounceHook.ts`             |
| API client modules       | `<domain>.api.ts`                                 | `bookmarks.api.ts`                         | `bookmarksApi.ts`             |
| Utility files            | `camelCase.ts`                                    | `truncateText.ts`                          | `truncate-text.ts`            |
| Shared type files        | `<domain>.types.ts` (or single root index export) | `bookmark.types.ts`                        | `BookmarkTypes.ts`            |
| Prisma model names       | `PascalCase` singular                             | `PasswordResetToken`                       | `password_reset_tokens`       |
| Prisma field names       | `camelCase`                                       | `passwordHash`                             | `password_hash`               |
| Enum values              | `UPPER_SNAKE_CASE`                                | `UNCHECKED`, `REDIRECTED`                  | `unchecked`                   |
| Zod schemas              | `<Name>Schema`                                    | `CreateBookmarkSchema`                     | `bookmarkSchema`              |
| Environment variables    | `UPPER_SNAKE_CASE`                                | `JWT_ACCESS_SECRET`                        | `jwtAccessSecret`             |
| Docker service names     | `kebab-case` or lowercase                         | `postgres`, `mindpalace_api`               | `MindPalaceAPI`               |
| GitHub Actions job names | concise Title Case labels                         | `Integration Tests`                        | `run_all_pipeline_jobs_now`   |
| Git branch names         | `type/short-description`                          | `feature/bookmark-export-json`             | `Feature_BookmarkExport`      |
| Commit message format    | Conventional Commits                              | `fix(auth): use cookie-only refresh token` | `updated auth stuff`          |

## §4 — Layer Architecture Contract

| Caller Layer    | May Call                   | Forbidden To Call                          |
| --------------- | -------------------------- | ------------------------------------------ |
| Controller      | Service only               | Prisma directly, Redis directly            |
| Service         | Prisma, Redis, lib/        | Express req/res objects, Zustand stores    |
| Middleware      | lib/ utilities             | Service layer, Prisma directly             |
| Worker          | Service, lib/, Prisma      | Express req/res, Zustand stores            |
| React Component | Hooks, api/ client modules | Zustand store actions directly (use hooks) |
| Zustand Store   | api/ client modules        | React component state                      |

Enforcement notes:

- API modules must maintain Router → Controller → Service boundaries.
- Shared contracts in `packages/shared` are the only cross-app type dependency.

## §5 — TypeScript Contract

Active compiler flags in `tsconfig.base.json`:

- `target: ES2022`: modern syntax/runtime baseline.
- `module: NodeNext`: ESM-compatible Node module semantics.
- `moduleResolution: NodeNext`: resolves ESM imports correctly in monorepo.
- `declaration: true`: emits declaration files for package interoperability.
- `declarationMap: true`: source mapping for declarations.
- `sourceMap: true`: stack-trace and debug mapping.
- `outDir: dist`: separates compiled output from source.
- `rootDir: src`: enforces stable source root.
- `strict: true`: full strict type system checks.
- `noImplicitAny: true`: disallows inferred `any`.
- `strictNullChecks: true`: null/undefined safety.
- `noImplicitReturns: true`: ensures explicit function return control flow.
- `noFallthroughCasesInSwitch: true`: prevents unsafe switch fallthrough.
- `noUncheckedIndexedAccess: true`: safe indexed access handling.
- `exactOptionalPropertyTypes: true`: precise optional property semantics.
- `forceConsistentCasingInFileNames: true`: cross-platform path-casing safety.
- `esModuleInterop: true`: smoother CJS/ESM interop.
- `skipLibCheck: true`: faster builds by skipping external d.ts checks.
- `resolveJsonModule: true`: typed JSON imports.

Rules:

- No `any` in application code.
- No `@ts-ignore` without a justification comment immediately above.
- No non-null assertion (`!`) without explicit guard rationale.
- All exported functions must declare explicit return types.

## §6 — API Design Contract

Success response envelopes:

- Single item: `{ success: true, data: T }`
- List with pagination: `{ success: true, data: T[], meta: PaginationMeta }`

Error envelopes:

- Generic error: `{ success: false, error: string }`
- Validation error: `{ success: false, error: string, issues: Array<{ field: string; message: string }> }`

HTTP status code rules:

- `201`: resource created.
- `204`: successful delete/no content.
- `401`: unauthenticated.
- `403`: authenticated but forbidden.
- `404`: resource missing.
- `409`: conflict (e.g., duplicate).
- `422`: validation failed.

Pagination contract (cursor-based only):

- Request: `cursor`, `limit`
- Response meta: `cursor`, `limit`, `nextCursor`, `hasNextPage`, `total`

Route naming convention:

- `/api/v1/<resource>/<id>/<sub-resource>`
- No verb-based path names for CRUD.

## §7 — Error Handling Policy

Error propagation chain:

1. Error originates in service, worker, or middleware.
2. Service/controller layer throws `AppError` (or framework/library errors bubble).
3. Async controller catches and calls `next(error)`.
4. `errorHandler.middleware.ts` maps known error types and shapes final response.

Required handling classes:

- Prisma known request errors (`P2002`, `P2025`) mapped to semantic HTTP errors.
- `ZodError` mapped to `422` with `issues` payload.
- `AppError` mapped to explicit status and message.
- Unknown errors mapped to generic 500 response.

Production safety rule:

- Never expose stack traces in production responses.

Worker failure rule:

- Worker processors must catch failures and return structured failure context.

## §8 — Security Checklist (Per-PR Gate)

- [ ] Ownership check present on every mutating service method
- [ ] No direct `process.env` access outside `config/env.ts`
- [ ] No `passwordHash` in any response shape
- [ ] No token in `localStorage` or `sessionStorage`
- [ ] All new environment variables added to `.env.example` with a comment
- [ ] `pnpm audit --audit-level=high` passes
- [ ] SSRF-relevant URLs (metadata fetch, archive fetch) go through the IP-range allowlist checker

## §9 — Testing Requirements

Coverage targets:

- Service layer business logic: `>= 85%` line coverage.
- API endpoints: `100%` happy paths + top 3 error paths per endpoint.
- Interactive React components: `>= 70%` coverage.
- Critical journeys: six E2E suites per plan.

Naming conventions:

- Unit tests: `*.test.ts` / `*.test.tsx`
- Integration tests: `apps/api/tests/integration/*.test.ts`
- E2E tests: `apps/web/e2e/*.spec.ts`

Isolation rules:

- No test may depend on state from previous tests.
- Integration tests must reset DB state via helper cleanup.
- Frontend component tests must use MSW; no real HTTP calls.

Required CI status checks:

- Lint
- Type-check
- Unit tests
- Integration tests
- Security audit
- Build

## §10 — Prisma & Database Contract

Rules:

- Always use `select`/`include` intentionally (no accidental broad projections).
- Never expose `passwordHash` in service/controller response objects.
- Use transactions for multi-step mutations requiring atomicity.
- Raw SQL must include comment explaining why ORM is insufficient and which index/query shape it relies on.
- Migrations are forward-only.
- Any new index must be documented with associated query pattern.

Special integrity requirements:

- Bookmark→Collection FK: `ON DELETE RESTRICT`.
- Tag uniqueness: DB-level case-insensitive uniqueness enforced.
- FTS trigger + GIN index must remain present and validated after migrations.

## §11 — Git & PR Workflow

Branching:

- Branch format: `type/short-description`.

Conventional Commit types:

- `feat`, `fix`, `test`, `docs`, `refactor`, `style`, `chore`, `perf`.

PR requirements:

- CI fully green.
- Minimum 1 team member review.
- PR template completed.
- Definition of Done checklist completed.

Merge strategy:

- Squash and Merge only.
- No merge commits on `main`.

## §12 — Definition of Done

- [ ] Feature works end-to-end in the local dev environment
- [ ] All new code passes `pnpm run lint` with zero warnings
- [ ] All new code passes `pnpm run type-check` with zero errors
- [ ] All new code passes `pnpm run format:check`
- [ ] Unit tests written for all new service methods; existing tests still pass
- [ ] Integration test written for any new API endpoint
- [ ] All new exported functions have JSDoc with `@param` and `@returns`
- [ ] No `console.log` in production code (use logger)
- [ ] No hardcoded secrets, magic strings, or magic numbers
- [ ] No `any` types introduced
- [ ] `pnpm audit --audit-level=high` still passes
- [ ] Security checklist (§8) mentally run
- [ ] PR description filled with: what changed, why it changed, how to test it

## §13 — Copilot Session Protocol

At the start of every Copilot session:

1. Load this file: `@workspace /STANDARDS.md` and treat it as binding law.
2. Load relevant module files using `#file` before modifying them.
3. State which Standard section (§1–§12) governs the task.
4. Run the Phase 0 read sequence for any file being modified before editing.

Before every code generation:

- Confirm monorepo consistency across `apps/api`, `apps/web`, and `packages/shared`.
- Confirm §8 Security Checklist compliance.
- Confirm §12 Definition of Done alignment.

Forbidden Copilot behaviours:

- Use `any` type.
- Access `process.env` directly.
- Store tokens in `localStorage`.
- Use `OFFSET`-based pagination where cursor pagination is required.
- Call Prisma directly from a controller.
- Leave catch blocks empty.
- Use `console.log` in production code paths.
