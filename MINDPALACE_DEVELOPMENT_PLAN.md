# MIND PALACE — INDUSTRY-STANDARD APPLICATION DEVELOPMENT PLAN

**Document Version:** 1.0  
**Date:** 22 February 2026  
**Team:** Kasinath C A (24MID0124), Nicky Sheby (24MID0156), Sree Sai Madhurima (24MIC0078), Balini (24MIC0026)  
**Subject:** Software Engineering Principles — CSI1007

---

## TABLE OF CONTENTS

1. [Technology Stack](#1-technology-stack)
2. [System Architecture](#2-system-architecture)
3. [Repository and Project Structure](#3-repository-and-project-structure)
4. [Database Design](#4-database-design)
5. [Backend Architecture](#5-backend-architecture)
6. [API Specification](#6-api-specification)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Authentication and Session Management](#8-authentication-and-session-management)
9. [Background Job Architecture](#9-background-job-architecture)
10. [Metadata Extraction Engine](#10-metadata-extraction-engine)
11. [Permanent Copy Archival Engine](#11-permanent-copy-archival-engine)
12. [Search and Indexing System](#12-search-and-indexing-system)
13. [Security Implementation](#13-security-implementation)
14. [Testing Strategy](#14-testing-strategy)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Development Workflow](#16-development-workflow)
17. [Code Quality Standards](#17-code-quality-standards)
18. [Performance Optimization Strategy](#18-performance-optimization-strategy)
19. [Monitoring, Logging, and Observability](#19-monitoring-logging-and-observability)
20. [Deployment Plan](#20-deployment-plan)
21. [Sprint and Milestone Plan](#21-sprint-and-milestone-plan)
22. [Risk Register](#22-risk-register)
23. [Definition of Done](#23-definition-of-done)
24. [Documentation Plan](#24-documentation-plan)

---

## 1. TECHNOLOGY STACK

### 1.1 Justification Philosophy

Every technology chosen below satisfies all three of these criteria simultaneously:

1. **Open-source** — Zero licensing cost, aligning with the project budget constraint.
2. **Production-proven** — Used in production systems at scale; not experimental.
3. **Team-appropriate** — Has extensive documentation, tutorials, and a low barrier to entry for a 4-person student team.

---

### 1.2 Complete Technology Matrix

| Layer                         | Technology                          | Version  | Justification                                                                                                                                                                                                             |
| ----------------------------- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language (Backend)**        | TypeScript                          | 5.4+     | Static typing eliminates an entire class of runtime bugs. Shared type definitions between frontend and backend remove duplication.                                                                                        |
| **Language (Frontend)**       | TypeScript                          | 5.4+     | Same as above; consistent language across the full stack.                                                                                                                                                                 |
| **Runtime (Backend)**         | Node.js                             | 20 LTS   | Non-blocking I/O is ideal for the large number of concurrent outbound HTTP requests required by the link health monitor.                                                                                                  |
| **Backend Framework**         | Express.js                          | 5.x      | Minimal, unopinionated, well-understood. More appropriate than NestJS for a 4-person student team.                                                                                                                        |
| **Frontend Framework**        | React                               | 18.x     | Component-based architecture maps directly to the UI modules. Largest ecosystem.                                                                                                                                          |
| **Frontend Build Tool**       | Vite                                | 5.x      | Sub-second HMR (Hot Module Replacement) for development productivity.                                                                                                                                                     |
| **Frontend Routing**          | React Router                        | 6.x      | Declarative, nested routing; matches the nested collection hierarchy.                                                                                                                                                     |
| **State Management**          | Zustand                             | 4.x      | Minimal boilerplate; appropriate for the app's state complexity. Avoids Redux overhead.                                                                                                                                   |
| **UI Component Library**      | shadcn/ui                           | Latest   | Unstyled, copy-paste components built on Radix UI primitives. Full accessibility (ARIA) out of the box. No vendor lock-in.                                                                                                |
| **CSS Framework**             | Tailwind CSS                        | 3.x      | Utility-first; eliminates class naming decisions. Works directly with shadcn/ui.                                                                                                                                          |
| **Database**                  | PostgreSQL                          | 16.x     | Best-in-class support for: recursive CTEs (required for nested collections), full-text search (required for bookmark search), JSON columns (required for annotation position data), foreign key constraints.              |
| **ORM**                       | Prisma                              | 5.x      | Type-safe database client auto-generated from schema. Handles migrations. Makes the data access layer portable.                                                                                                           |
| **Cache / Queue Broker**      | Redis                               | 7.x      | Dual-purpose: session store and job queue broker. Extremely fast in-memory key-value store.                                                                                                                               |
| **Background Job Queue**      | BullMQ                              | 5.x      | Built on top of Redis. Provides reliable, persistent job queues with retry logic, delays, and concurrency control — exactly what the link health monitor requires.                                                        |
| **Metadata Extraction**       | got + cheerio                       | Latest   | `got` for making HTTP requests with timeout and redirect control. `cheerio` for server-side HTML parsing to extract Open Graph, Twitter Card, and standard meta tags. Lightweight alternative to a full headless browser. |
| **Permanent Copy Generation** | @mozilla/readability                | Latest   | Mozilla's article extraction library (same algorithm as Firefox Reader Mode). Strips ads and navigation, preserves readable content.                                                                                      |
| **Authentication**            | jsonwebtoken + bcrypt               | Latest   | Industry-standard JWT for stateless access tokens. bcrypt for password hashing (cost factor 12).                                                                                                                          |
| **Input Validation**          | Zod                                 | 3.x      | Schema-based validation library. Defines schemas once and auto-generates TypeScript types — single source of truth for API contracts.                                                                                     |
| **API Documentation**         | swagger-ui-express + zod-to-openapi | Latest   | Auto-generates an OpenAPI 3.0 spec from Zod schemas, served as a live interactive UI at `/api/docs`.                                                                                                                      |
| **Email**                     | Nodemailer                          | Latest   | Sends password reset and broken-link notification emails via any SMTP server.                                                                                                                                             |
| **Testing (Backend)**         | Vitest                              | 2.x      | Native TypeScript support without babel. Compatible with Jest API. Significantly faster than Jest.                                                                                                                        |
| **Testing (Frontend)**        | Vitest + React Testing Library      | Latest   | Component testing with realistic user interaction simulation.                                                                                                                                                             |
| **End-to-End Testing**        | Playwright                          | 1.x      | Cross-browser E2E testing. Tests run against Chrome, Firefox, and Safari.                                                                                                                                                 |
| **Linting**                   | ESLint                              | 9.x      | Enforces code quality rules.                                                                                                                                                                                              |
| **Formatting**                | Prettier                            | 3.x      | Enforces consistent code style automatically.                                                                                                                                                                             |
| **Containerization**          | Docker + Docker Compose             | Latest   | `docker-compose up` spins up the entire stack (app, PostgreSQL, Redis) in a single command.                                                                                                                               |
| **Version Control**           | Git + GitHub                        | —        | Standard. Pull request workflow for code review.                                                                                                                                                                          |
| **CI/CD**                     | GitHub Actions                      | —        | Free for public repositories. Runs tests and linting on every pull request.                                                                                                                                               |
| **Package Manager**           | pnpm                                | 9.x      | Significantly faster than npm, uses disk space efficiently via content-addressable storage.                                                                                                                               |
| **Monorepo Tool**             | pnpm workspaces                     | Built-in | Manages frontend and backend packages from a single repository.                                                                                                                                                           |

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Architectural Pattern: Modular Monolith

**Decision:** A **Modular Monolith** is chosen over a microservices architecture.

**Rationale:**

- A 4-person team cannot effectively operate multiple independently deployed services (each requiring its own CI/CD, networking, and logging configuration).
- A microservices architecture introduces distributed systems complexity (network latency, service discovery, distributed transactions) that provides no benefit at this scale.
- The Modular Monolith provides clean internal module boundaries (matching the SRS module definitions) while being deployable as a single unit.
- If the application ever needs to scale, individual modules can be extracted into microservices later because the boundaries are already enforced.

### 2.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │         React SPA (TypeScript + Vite + Tailwind CSS)         │  │
│   │                                                              │  │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│   │  │  Auth UI │  │Dashboard │  │ Search UI│  │Settings UI │  │  │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │  │
│   │                                                              │  │
│   │              Zustand Global State Store                      │  │
│   └────────────────────────┬─────────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────────┘
                             │ HTTPS / JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND APPLICATION SERVER                      │
│                    (Node.js + Express + TypeScript)                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                MIDDLEWARE CHAIN                              │   │
│  │  Helmet (security headers) → Rate Limiter → CORS →          │   │
│  │  Request Logger → Body Parser → JWT Auth Guard              │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                    API ROUTER  /api/v1/                      │   │
│  └──┬──────────┬──────────┬─────────────┬──────────┬───────────┘   │
│     │          │          │             │          │               │
│  ┌──▼───┐  ┌──▼───┐  ┌───▼────┐  ┌────▼───┐  ┌───▼──────┐       │
│  │ Auth │  │Book- │  │Collec- │  │ Tags   │  │ System   │       │
│  │Module│  │marks │  │tions   │  │ Module │  │ Module   │       │
│  └──┬───┘  └──┬───┘  └───┬────┘  └────┬───┘  └───┬──────┘       │
│     │         │           │            │           │               │
│  ┌──▼─────────▼───────────▼────────────▼───────────▼──────────┐   │
│  │                    SERVICE LAYER                             │   │
│  │  AuthService │ BookmarkService │ CollectionService │        │   │
│  │  TagService  │ SearchService   │ HealthService     │        │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                  DATA ACCESS LAYER (Prisma ORM)              │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │  BACKGROUND WORKER PROCESS (BullMQ)                          │   │
│  │  ┌──────────────────┐  ┌────────────────────────────────┐   │   │
│  │  │ MetadataQueue    │  │ LinkHealthQueue                 │   │   │
│  │  │ (on-demand)      │  │ (scheduled every 24h)           │   │   │
│  │  └──────────────────┘  └────────────────────────────────┘   │   │
│  │  ┌──────────────────┐                                       │   │
│  │  │ ArchiveQueue     │                                       │   │
│  │  │ (on-demand)      │                                       │   │
│  │  └──────────────────┘                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────┬───────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌───────────────────────┐
│   PostgreSQL 16      │  │   Redis 7              │
│                      │  │                        │
│  ┌────────────────┐  │  │  ┌──────────────────┐  │
│  │  Application   │  │  │  │  Session Store   │  │
│  │  Database      │  │  │  └──────────────────┘  │
│  │                │  │  │  ┌──────────────────┐  │
│  │  Full-Text     │  │  │  │  BullMQ Job      │  │
│  │  Search Index  │  │  │  │  Queues          │  │
│  └────────────────┘  │  │  └──────────────────┘  │
└──────────────────────┘  └───────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Local Filesystem /  │
│  Cloud Object Store  │
│  (Thumbnails,        │
│   Favicons,          │
│   Permanent Copies)  │
└──────────────────────┘
```

### 2.3 Request Lifecycle (Adding a Bookmark — Full Trace)

```
1. USER types URL in browser and clicks "Save"
2. React component dispatches addBookmark() action via Zustand
3. API client (axios instance) sends:
   POST /api/v1/bookmarks
   Authorization: Bearer <JWT>
   Body: { "url": "https://example.com", "collectionId": 5 }

4. Express middleware chain runs:
   a. helmet() sets security headers
   b. rateLimiter checks IP request count from Redis
   c. jwtAuthGuard verifies JWT, attaches req.user
   d. zodValidationMiddleware validates request body against BookmarkCreateSchema

5. BookmarkController.create() receives validated request
6. BookmarkService.createBookmark() is called:
   a. Checks for duplicate URL in user's library (DB query)
   b. If duplicate → returns 409 Conflict with existing bookmark location
   c. Creates bookmark record with status "pending" via Prisma
   d. Enqueues MetadataJob { bookmarkId, url } on MetadataQueue in Redis
   e. Enqueues ArchiveJob  { bookmarkId, url } on ArchiveQueue in Redis
   f. Returns the new bookmark (with status "pending") immediately

7. Response sent to client: 201 Created with bookmark object
8. React UI adds the "pending" bookmark card to the list immediately
   (optimistic UI update shows spinner on the card)

9. ASYNC: MetadataWorker picks up MetadataJob from queue:
   a. Fetches URL via got with 10s timeout
   b. Parses HTML with cheerio; extracts OG tags, title, description, image
   c. Downloads favicon from /favicon.ico
   d. Downloads and stores thumbnail image to /uploads/thumbnails/
   e. Updates bookmark record in DB with all extracted metadata + status "active"

10. ASYNC: ArchiveWorker picks up ArchiveJob from queue:
    a. Fetches full URL HTML
    b. Passes to @mozilla/readability to extract main article content
    c. Strips scripts, iframes, ads
    d. Stores simplified HTML + plain text in permanent_copies table
    e. Updates bookmark.has_permanent_copy = true

11. Frontend polls GET /api/v1/bookmarks/:id (or uses WebSocket event)
    to update the card from "pending" to fully populated with metadata
```

---

## 3. REPOSITORY AND PROJECT STRUCTURE

### 3.1 Repository Layout

The project is a **pnpm monorepo** with two packages: `apps/api` (backend) and `apps/web` (frontend). Shared TypeScript types live in `packages/shared`.

```
mindpalace/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Runs on every PR: lint, type-check, tests
│       └── deploy.yml              # Runs on main branch merge: build + deploy
│
├── apps/
│   │
│   ├── api/                        # ── BACKEND APPLICATION ──
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point: creates Express app, connects DB/Redis
│   │   │   ├── app.ts              # Express app factory (testable, no side effects)
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Zod-validated environment variable schema
│   │   │   │   └── constants.ts    # App-wide constants (rate limits, timeouts, etc.)
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.schemas.ts         # Zod schemas for request/response
│   │   │   │   │   └── auth.test.ts
│   │   │   │   ├── bookmarks/
│   │   │   │   │   ├── bookmarks.controller.ts
│   │   │   │   │   ├── bookmarks.service.ts
│   │   │   │   │   ├── bookmarks.router.ts
│   │   │   │   │   ├── bookmarks.schemas.ts
│   │   │   │   │   └── bookmarks.test.ts
│   │   │   │   ├── collections/
│   │   │   │   │   ├── collections.controller.ts
│   │   │   │   │   ├── collections.service.ts
│   │   │   │   │   ├── collections.router.ts
│   │   │   │   │   ├── collections.schemas.ts
│   │   │   │   │   └── collections.test.ts
│   │   │   │   ├── tags/
│   │   │   │   │   ├── tags.controller.ts
│   │   │   │   │   ├── tags.service.ts
│   │   │   │   │   ├── tags.router.ts
│   │   │   │   │   ├── tags.schemas.ts
│   │   │   │   │   └── tags.test.ts
│   │   │   │   ├── search/
│   │   │   │   │   ├── search.controller.ts
│   │   │   │   │   ├── search.service.ts
│   │   │   │   │   ├── search.router.ts
│   │   │   │   │   └── search.test.ts
│   │   │   │   ├── annotations/
│   │   │   │   │   ├── annotations.controller.ts
│   │   │   │   │   ├── annotations.service.ts
│   │   │   │   │   ├── annotations.router.ts
│   │   │   │   │   └── annotations.test.ts
│   │   │   │   └── system/
│   │   │   │       ├── health.controller.ts    # GET /health endpoint
│   │   │   │       └── system.router.ts
│   │   │   │
│   │   │   ├── workers/
│   │   │   │   ├── worker.ts               # Worker process entry point (runs separately)
│   │   │   │   ├── metadata.worker.ts      # Metadata extraction job processor
│   │   │   │   ├── archive.worker.ts       # Permanent copy job processor
│   │   │   │   ├── linkhealth.worker.ts    # Link health check job processor
│   │   │   │   └── queues.ts               # BullMQ queue definitions (shared)
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts       # JWT verification guard
│   │   │   │   ├── validate.middleware.ts   # Zod schema validation factory
│   │   │   │   ├── rateLimiter.middleware.ts
│   │   │   │   ├── errorHandler.middleware.ts # Global error handler
│   │   │   │   └── requestLogger.middleware.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts               # Prisma client singleton
│   │   │   │   ├── redis.ts                # Redis client singleton
│   │   │   │   ├── email.ts                # Nodemailer transporter + email templates
│   │   │   │   ├── metadataFetcher.ts      # got + cheerio extraction logic
│   │   │   │   ├── archiver.ts             # readability + HTML sanitizer logic
│   │   │   │   ├── fileStorage.ts          # Abstraction: local or S3-compatible
│   │   │   │   └── logger.ts               # Structured logger (pino)
│   │   │   │
│   │   │   └── types/
│   │   │       └── express.d.ts            # Augments Express req with req.user type
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Complete database schema
│   │   │   ├── migrations/                 # Auto-generated migration SQL files
│   │   │   │   └── 001_initial_schema/
│   │   │   └── seed.ts                     # Dev seed script (test users, sample data)
│   │   │
│   │   ├── tests/
│   │   │   ├── integration/                # Integration tests (tests full HTTP stack)
│   │   │   │   ├── auth.test.ts
│   │   │   │   ├── bookmarks.test.ts
│   │   │   │   └── search.test.ts
│   │   │   └── helpers/
│   │   │       ├── testDb.ts               # Creates isolated test DB per test suite
│   │   │       └── testApp.ts              # Creates Express app for testing
│   │   │
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── web/                        # ── FRONTEND APPLICATION ──
│       ├── src/
│       │   ├── main.tsx                    # React root render
│       │   ├── App.tsx                     # Router setup
│       │   ├── vite-env.d.ts
│       │   │
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── BookmarkDetailPage.tsx
│       │   │   ├── SearchPage.tsx
│       │   │   ├── TagManagementPage.tsx
│       │   │   ├── ImportExportPage.tsx
│       │   │   └── SettingsPage.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── ui/                     # shadcn/ui generated base components
│       │   │   │   ├── button.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   ├── dropdown-menu.tsx
│       │   │   │   ├── toast.tsx
│       │   │   │   └── ...
│       │   │   ├── layout/
│       │   │   │   ├── AppShell.tsx        # Main app layout (sidebar + content area)
│       │   │   │   ├── Sidebar.tsx         # Collection tree nav
│       │   │   │   └── TopBar.tsx          # Search bar + user menu
│       │   │   ├── bookmarks/
│       │   │   │   ├── BookmarkCard.tsx    # Visual card component
│       │   │   │   ├── BookmarkGrid.tsx    # Grid layout wrapper
│       │   │   │   ├── BookmarkList.tsx    # List layout wrapper
│       │   │   │   ├── AddBookmarkModal.tsx
│       │   │   │   ├── EditBookmarkModal.tsx
│       │   │   │   ├── BookmarkDetailView.tsx
│       │   │   │   └── BatchActionBar.tsx  # Appears on multi-select
│       │   │   ├── collections/
│       │   │   │   ├── CollectionTree.tsx  # Recursive tree renderer
│       │   │   │   ├── CollectionTreeNode.tsx
│       │   │   │   └── NewCollectionModal.tsx
│       │   │   ├── annotations/
│       │   │   │   ├── AnnotationToolbar.tsx
│       │   │   │   ├── HighlightLayer.tsx
│       │   │   │   └── NoteCard.tsx
│       │   │   ├── search/
│       │   │   │   ├── SearchBar.tsx
│       │   │   │   ├── FilterPanel.tsx
│       │   │   │   └── SearchResultItem.tsx
│       │   │   └── common/
│       │   │       ├── LoadingSpinner.tsx
│       │   │       ├── EmptyState.tsx
│       │   │       ├── ErrorBoundary.tsx
│       │   │       ├── ConfirmDialog.tsx
│       │   │       └── TagBadge.tsx
│       │   │
│       │   ├── stores/
│       │   │   ├── authStore.ts            # User session + JWT
│       │   │   ├── bookmarkStore.ts        # Bookmark list state + optimistic updates
│       │   │   ├── collectionStore.ts      # Collection tree state
│       │   │   ├── tagStore.ts
│       │   │   ├── uiStore.ts              # Sidebar open/close, selected items, view mode
│       │   │   └── searchStore.ts          # Search query + filter state
│       │   │
│       │   ├── api/
│       │   │   ├── client.ts               # Axios instance with JWT interceptor + token refresh
│       │   │   ├── auth.api.ts
│       │   │   ├── bookmarks.api.ts
│       │   │   ├── collections.api.ts
│       │   │   ├── tags.api.ts
│       │   │   ├── search.api.ts
│       │   │   └── annotations.api.ts
│       │   │
│       │   ├── hooks/
│       │   │   ├── useBookmarks.ts         # Fetch + cache bookmarks for active collection
│       │   │   ├── useCollectionTree.ts
│       │   │   ├── useDragAndDrop.ts       # Drag-and-drop logic for collection tree
│       │   │   ├── useDebounce.ts          # Debounces search input
│       │   │   ├── useIntersectionObserver.ts  # Infinite scroll
│       │   │   └── useTheme.ts
│       │   │
│       │   ├── types/
│       │   │   └── index.ts                # Re-exports from @mindpalace/shared
│       │   │
│       │   └── utils/
│       │       ├── formatDate.ts
│       │       ├── truncateText.ts
│       │       └── urlHelpers.ts
│       │
│       ├── public/
│       │   ├── favicon.ico
│       │   └── og-image.png
│       │
│       ├── tests/
│       │   ├── components/                 # React Testing Library component tests
│       │   └── e2e/                        # Playwright end-to-end tests
│       │
│       ├── Dockerfile
│       ├── nginx.conf                      # Nginx config for serving the built SPA
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── vitest.config.ts
│
├── packages/
│   └── shared/                     # Shared TypeScript types and Zod schemas
│       ├── src/
│       │   ├── types/
│       │   │   ├── bookmark.types.ts
│       │   │   ├── collection.types.ts
│       │   │   ├── user.types.ts
│       │   │   ├── tag.types.ts
│       │   │   └── annotation.types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml              # Development: app + postgres + redis
├── docker-compose.prod.yml         # Production overrides
├── .env.example                    # Template for environment variables
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── pnpm-workspace.yaml
└── README.md
```

---

## 4. DATABASE DESIGN

### 4.1 Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// USERS
// ──────────────────────────────────────────
model User {
  id                String    @id @default(cuid())
  name              String    @db.VarChar(100)
  email             String    @unique @db.VarChar(255)
  passwordHash      String    @map("password_hash")
  theme             Theme     @default(LIGHT)
  defaultView       ViewMode  @default(GRID)
  emailVerified     Boolean   @default(false) @map("email_verified")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  lastLoginAt       DateTime? @map("last_login_at")

  // Relations
  collections       Collection[]
  bookmarks         Bookmark[]
  tags              Tag[]
  annotations       Annotation[]
  passwordResetTokens PasswordResetToken[]

  @@map("users")
}

model PasswordResetToken {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  token      String   @unique @db.VarChar(255)
  expiresAt  DateTime @map("expires_at")
  usedAt     DateTime? @map("used_at")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("password_reset_tokens")
}

// ──────────────────────────────────────────
// COLLECTIONS (self-referential for nesting)
// ──────────────────────────────────────────
model Collection {
  id          String       @id @default(cuid())
  userId      String       @map("user_id")
  parentId    String?      @map("parent_id")
  name        String       @db.VarChar(150)
  sortOrder   Int          @default(0) @map("sort_order")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  // Self-referential relation
  parent      Collection?  @relation("CollectionChildren", fields: [parentId], references: [id], onDelete: SetNull)
  children    Collection[] @relation("CollectionChildren")

  // Other relations
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks   Bookmark[]

  // Unique name within the same parent (NULL-safe using a partial index in migration SQL)
  @@unique([userId, parentId, name])
  @@index([userId])
  @@index([parentId])
  @@map("collections")
}

// ──────────────────────────────────────────
// BOOKMARKS
// ──────────────────────────────────────────
model Bookmark {
  id               String        @id @default(cuid())
  userId           String        @map("user_id")
  collectionId     String        @map("collection_id")
  url              String        @db.Text
  title            String        @db.VarChar(500)
  description      String?       @db.Text
  thumbnailPath    String?       @map("thumbnail_path") @db.Text
  faviconPath      String?       @map("favicon_path") @db.Text
  domain           String        @db.VarChar(255)
  linkStatus       LinkStatus    @default(UNCHECKED) @map("link_status")
  lastCheckedAt    DateTime?     @map("last_checked_at")
  hasPermanentCopy Boolean       @default(false) @map("has_permanent_copy")
  searchVector     Unsupported("tsvector")? @map("search_vector")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  // Relations
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  collection       Collection    @relation(fields: [collectionId], references: [id], onDelete: Restrict)
  tags             BookmarkTag[]
  permanentCopy    PermanentCopy?
  annotations      Annotation[]

  @@index([userId])
  @@index([collectionId])
  @@index([domain])
  @@index([linkStatus])
  @@index([createdAt])
  // Full-text search index (created via raw SQL in migration)
  // CREATE INDEX bookmarks_search_vector_idx ON bookmarks USING GIN(search_vector);
  @@map("bookmarks")
}

// ──────────────────────────────────────────
// TAGS
// ──────────────────────────────────────────
model Tag {
  id          String        @id @default(cuid())
  userId      String        @map("user_id")
  name        String        @db.VarChar(100)
  color       String?       @db.VarChar(7)   // Hex: #FF5733
  createdAt   DateTime      @default(now()) @map("created_at")

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks   BookmarkTag[]

  // Case-insensitive uniqueness enforced via a functional index:
  // CREATE UNIQUE INDEX tags_user_name_unique ON tags(user_id, LOWER(name));
  @@index([userId])
  @@map("tags")
}

// ──────────────────────────────────────────
// BOOKMARK <-> TAG JUNCTION TABLE (N:M)
// ──────────────────────────────────────────
model BookmarkTag {
  bookmarkId  String   @map("bookmark_id")
  tagId       String   @map("tag_id")
  assignedAt  DateTime @default(now()) @map("assigned_at")

  bookmark    Bookmark @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  tag         Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, tagId])
  @@map("bookmark_tags")
}

// ──────────────────────────────────────────
// PERMANENT COPIES (1:1 with Bookmark)
// ──────────────────────────────────────────
model PermanentCopy {
  id              String   @id @default(cuid())
  bookmarkId      String   @unique @map("bookmark_id")
  htmlContent     String?  @map("html_content") @db.Text
  textContent     String?  @map("text_content") @db.Text
  fileSizeBytes   Int?     @map("file_size_bytes")
  archivedAt      DateTime @default(now()) @map("archived_at")

  bookmark        Bookmark @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)

  @@map("permanent_copies")
}

// ──────────────────────────────────────────
// ANNOTATIONS
// ──────────────────────────────────────────
model Annotation {
  id             String         @id @default(cuid())
  bookmarkId     String         @map("bookmark_id")
  userId         String         @map("user_id")
  type           AnnotationType
  content        String?        @db.Text
  positionData   Json?          @map("position_data")
  color          String?        @db.VarChar(7)
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  bookmark       Bookmark       @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([bookmarkId])
  @@map("annotations")
}

// ──────────────────────────────────────────
// ENUMERATIONS
// ──────────────────────────────────────────
enum Theme {
  LIGHT
  DARK
}

enum ViewMode {
  GRID
  LIST
}

enum LinkStatus {
  UNCHECKED
  OK
  WARNING
  BROKEN
  NOT_FOUND       // Specifically 404
  SERVER_ERROR    // 5xx
  UNREACHABLE     // Timeout / DNS failure
}

enum AnnotationType {
  HIGHLIGHT
  NOTE
}
```

### 4.2 Migration: Full-Text Search Vector

The full-text search capability requires a PostgreSQL trigger that auto-updates the `search_vector` column on every INSERT or UPDATE to the bookmarks table. This is applied via a raw SQL migration file.

```sql
-- Migration: 002_fulltext_search_trigger.sql

-- Create the GIN index for fast full-text search
CREATE INDEX bookmarks_search_vector_idx
  ON bookmarks USING GIN(search_vector);

-- Create function to update the search vector
CREATE OR REPLACE FUNCTION bookmarks_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.domain, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.url, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires on every INSERT or UPDATE
CREATE TRIGGER bookmarks_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, domain, url
  ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION bookmarks_search_vector_update();

-- Case-insensitive unique index on tags
CREATE UNIQUE INDEX tags_user_name_unique
  ON tags(user_id, LOWER(name));
```

### 4.3 Database Indexing Strategy

| Index                         | Table       | Column(s)              | Type   | Purpose                       |
| ----------------------------- | ----------- | ---------------------- | ------ | ----------------------------- |
| `bookmarks_search_vector_idx` | bookmarks   | search_vector          | GIN    | Full-text search              |
| `bookmarks_user_id_idx`       | bookmarks   | user_id                | B-Tree | All bookmark listing queries  |
| `bookmarks_collection_idx`    | bookmarks   | collection_id          | B-Tree | Viewing a collection          |
| `bookmarks_domain_idx`        | bookmarks   | domain                 | B-Tree | Filter by domain              |
| `bookmarks_created_at_idx`    | bookmarks   | created_at             | B-Tree | Date-range filtering, sorting |
| `bookmarks_link_status_idx`   | bookmarks   | link_status            | B-Tree | Filtering broken links        |
| `collections_user_id_idx`     | collections | user_id                | B-Tree | Loading collection tree       |
| `collections_parent_id_idx`   | collections | parent_id              | B-Tree | Recursive CTE traversal       |
| `tags_user_id_idx`            | tags        | user_id                | B-Tree | Loading user tags             |
| `tags_user_name_unique`       | tags        | (user_id, LOWER(name)) | Unique | Case-insensitive uniqueness   |

---

## 5. BACKEND ARCHITECTURE

### 5.1 Module Structure Pattern

Every functional module follows the same 4-layer internal structure:

```
Router → Controller → Service → Prisma (Data Layer)
```

| Layer             | Responsibility                                  | Must NOT contain           |
| ----------------- | ----------------------------------------------- | -------------------------- |
| **Router**        | URL path definitions and middleware application | Any business logic         |
| **Controller**    | HTTP request/response handling; calls Service   | Any SQL or business logic  |
| **Service**       | All business logic and rules                    | Any HTTP objects (req/res) |
| **Prisma (Data)** | Database queries                                | Any business logic         |

**Example — Bookmark Controller (excerpt):**

```typescript
// bookmarks.controller.ts
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, collectionId, tagIds, title, description } = req.body;
      const userId = req.user.id; // Set by jwtAuthGuard middleware

      const bookmark = await this.bookmarkService.createBookmark({
        userId,
        url,
        collectionId,
        tagIds,
        title,
        description,
      });

      res.status(201).json({ success: true, data: bookmark });
    } catch (error) {
      next(error); // Passes to global error handler
    }
  }
}
```

**Example — Global Error Handler:**

```typescript
// errorHandler.middleware.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const logger = req.app.locals.logger;

  // Log the error with full context
  logger.error({ err, url: req.url, method: req.method }, 'Request error');

  // Prisma known errors (constraint violations, not found)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ success: false, error: 'A record with this value already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }
  }

  // Zod validation errors (invalid request body)
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed.',
      details: err.flatten().fieldErrors,
    });
  }

  // Custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Unknown errors — never expose details in production
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message;

  res.status(statusCode).json({ success: false, error: message });
}
```

### 5.2 Environment Variable Schema

All environment variables are validated at startup using Zod. The application refuses to start if any required variable is missing or incorrectly typed.

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().email(),
  UPLOADS_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().url(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQS: z.coerce.number().default(100),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
});

export const env = envSchema.parse(process.env);
```

---

## 6. API SPECIFICATION

### 6.1 API Design Principles

- Base path: `/api/v1/`
- All responses follow a unified envelope: `{ success: boolean, data?: T, error?: string, meta?: PaginationMeta }`
- All list endpoints are paginated using cursor-based pagination
- HTTP status codes are meaningful and consistent
- All mutating endpoints require a valid JWT in `Authorization: Bearer <token>`
- The full spec is available as an interactive Swagger UI at `GET /api/docs`

### 6.2 Complete API Endpoint Reference

#### Authentication

| Method  | Endpoint                       | Auth          | Description                            |
| ------- | ------------------------------ | ------------- | -------------------------------------- |
| `POST`  | `/api/v1/auth/register`        | None          | Create new user account                |
| `POST`  | `/api/v1/auth/login`           | None          | Login, returns access + refresh tokens |
| `POST`  | `/api/v1/auth/logout`          | Required      | Invalidate refresh token               |
| `POST`  | `/api/v1/auth/refresh`         | Refresh token | Get new access + refresh token pair    |
| `POST`  | `/api/v1/auth/forgot-password` | None          | Send password reset email              |
| `POST`  | `/api/v1/auth/reset-password`  | None          | Reset password using token             |
| `GET`   | `/api/v1/auth/me`              | Required      | Get authenticated user profile         |
| `PATCH` | `/api/v1/auth/me`              | Required      | Update name, email, or password        |

#### Bookmarks

| Method   | Endpoint                               | Auth     | Description                                             |
| -------- | -------------------------------------- | -------- | ------------------------------------------------------- |
| `GET`    | `/api/v1/bookmarks`                    | Required | List bookmarks (paginates, filterable)                  |
| `POST`   | `/api/v1/bookmarks`                    | Required | Create bookmark, triggers async metadata + archive jobs |
| `GET`    | `/api/v1/bookmarks/:id`                | Required | Get single bookmark with full details                   |
| `PATCH`  | `/api/v1/bookmarks/:id`                | Required | Update title, description, collection, or tags          |
| `DELETE` | `/api/v1/bookmarks/:id`                | Required | Delete single bookmark                                  |
| `DELETE` | `/api/v1/bookmarks`                    | Required | Batch delete (array of IDs in body)                     |
| `PATCH`  | `/api/v1/bookmarks/batch/move`         | Required | Move multiple bookmarks to a collection                 |
| `PATCH`  | `/api/v1/bookmarks/batch/tag`          | Required | Add/remove tags from multiple bookmarks                 |
| `POST`   | `/api/v1/bookmarks/:id/check`          | Required | Manually trigger link health check                      |
| `GET`    | `/api/v1/bookmarks/:id/permanent-copy` | Required | Get permanent copy content                              |
| `GET`    | `/api/v1/bookmarks/export`             | Required | Export all bookmarks (HTML or JSON)                     |
| `POST`   | `/api/v1/bookmarks/import`             | Required | Import bookmarks from HTML file (multipart)             |

**Query Parameters for `GET /api/v1/bookmarks`:**

| Parameter      | Type                               | Description                               |
| -------------- | ---------------------------------- | ----------------------------------------- |
| `collectionId` | string                             | Filter by collection                      |
| `tagIds`       | string[]                           | Filter by one or more tag IDs (AND logic) |
| `tagIdsOr`     | string[]                           | Filter by one or more tag IDs (OR logic)  |
| `domain`       | string                             | Filter by domain name                     |
| `status`       | LinkStatus                         | Filter by link health status              |
| `dateFrom`     | ISO8601                            | Filter by created_at >= date              |
| `dateTo`       | ISO8601                            | Filter by created_at <= date              |
| `sortBy`       | `createdAt` \| `title` \| `domain` | Sort field                                |
| `sortOrder`    | `asc` \| `desc`                    | Sort direction                            |
| `cursor`       | string                             | Cursor for pagination                     |
| `limit`        | number (1–100)                     | Items per page, default 24                |

#### Collections

| Method   | Endpoint                          | Auth     | Description                                        |
| -------- | --------------------------------- | -------- | -------------------------------------------------- |
| `GET`    | `/api/v1/collections`             | Required | Get full collection tree for user                  |
| `POST`   | `/api/v1/collections`             | Required | Create collection                                  |
| `PATCH`  | `/api/v1/collections/:id`         | Required | Rename or move collection (update parentId)        |
| `DELETE` | `/api/v1/collections/:id`         | Required | Delete; `?action=move\|delete` for child bookmarks |
| `PATCH`  | `/api/v1/collections/:id/reorder` | Required | Update sort_order after drag-and-drop              |

#### Tags

| Method   | Endpoint             | Auth     | Description                                         |
| -------- | -------------------- | -------- | --------------------------------------------------- |
| `GET`    | `/api/v1/tags`       | Required | List all user tags with bookmark count              |
| `POST`   | `/api/v1/tags`       | Required | Create tag                                          |
| `PATCH`  | `/api/v1/tags/:id`   | Required | Rename tag or change color                          |
| `DELETE` | `/api/v1/tags/:id`   | Required | Delete tag (removes from all bookmarks)             |
| `POST`   | `/api/v1/tags/merge` | Required | Merge tags: `{ sourceTagIds: [], targetTagId: "" }` |

#### Search

| Method | Endpoint                    | Auth     | Description                                                              |
| ------ | --------------------------- | -------- | ------------------------------------------------------------------------ |
| `GET`  | `/api/v1/search`            | Required | Full-text + filter search (all bookmark fields + permanent copy content) |
| `GET`  | `/api/v1/search/duplicates` | Required | Scan library for duplicate URLs                                          |
| `GET`  | `/api/v1/search/similar`    | Required | Find similar URLs (same domain/path, different params)                   |

#### Annotations

| Method   | Endpoint                                          | Auth     | Description                         |
| -------- | ------------------------------------------------- | -------- | ----------------------------------- |
| `GET`    | `/api/v1/bookmarks/:id/annotations`               | Required | List all annotations for a bookmark |
| `POST`   | `/api/v1/bookmarks/:id/annotations`               | Required | Create highlight or note            |
| `PATCH`  | `/api/v1/bookmarks/:id/annotations/:annotationId` | Required | Edit annotation content or color    |
| `DELETE` | `/api/v1/bookmarks/:id/annotations/:annotationId` | Required | Delete annotation                   |

#### System

| Method | Endpoint         | Auth | Description                                   |
| ------ | ---------------- | ---- | --------------------------------------------- |
| `GET`  | `/api/v1/health` | None | System health check (DB + Redis connectivity) |
| `GET`  | `/api/docs`      | None | Swagger UI — interactive API documentation    |

### 6.3 Standard Response Envelopes

**Success (single item):**

```json
{
  "success": true,
  "data": {
    "id": "clxyz123",
    "url": "https://example.com",
    "title": "Example Domain"
  }
}
```

**Success (list with pagination):**

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 247,
    "limit": 24,
    "nextCursor": "clxyz456",
    "hasNextPage": true
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": "A bookmark with this URL already exists in your library.",
  "existingBookmark": {
    "id": "clxyz789",
    "collectionId": "clabc123"
  }
}
```

**Validation Error (422):**

```json
{
  "success": false,
  "error": "Validation failed.",
  "details": {
    "url": ["Must be a valid URL starting with http:// or https://"],
    "collectionId": ["Required"]
  }
}
```

---

## 7. FRONTEND ARCHITECTURE

### 7.1 Routing Structure

```typescript
// App.tsx — Route definitions
<Routes>
  {/* Public routes — redirect to /dashboard if authenticated */}
  <Route element={<PublicOnlyRoute />}>
    <Route path="/login"    element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
  </Route>

  {/* Protected routes — redirect to /login if not authenticated */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>    {/* Provides sidebar + topbar layout */}
      <Route path="/"                       element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard"              element={<DashboardPage />} />
      <Route path="/collection/:id"         element={<DashboardPage />} />
      <Route path="/bookmark/:id"           element={<BookmarkDetailPage />} />
      <Route path="/search"                 element={<SearchPage />} />
      <Route path="/tags"                   element={<TagManagementPage />} />
      <Route path="/import-export"          element={<ImportExportPage />} />
      <Route path="/settings"               element={<SettingsPage />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

### 7.2 State Management Design (Zustand)

```typescript
// stores/bookmarkStore.ts — Example store design
interface BookmarkStore {
  // State
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  viewMode: 'grid' | 'list';
  pagination: PaginationMeta | null;

  // Actions
  fetchBookmarks: (collectionId: string, filters?: BookmarkFilters) => Promise<void>;
  addBookmark: (data: CreateBookmarkInput) => Promise<Bookmark>;
  updateBookmark: (id: string, data: UpdateBookmarkInput) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  batchDelete: (ids: string[]) => Promise<void>;
  batchMove: (ids: string[], collectionId: string) => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}
```

### 7.3 Axios API Client with JWT Interceptor

```typescript
// api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 by attempting token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await useAuthStore.getState().refreshTokens();
        failedQueue.forEach(({ resolve }) => resolve());
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        failedQueue = [];
      }
    }

    return Promise.reject(error);
  },
);
```

---

## 8. AUTHENTICATION AND SESSION MANAGEMENT

### 8.1 Token Strategy: Access + Refresh Token Pattern

A single long-lived token is insecure. The system uses **two tokens**:

| Token                   | Storage                                         | Lifetime   | Purpose                                                                                     |
| ----------------------- | ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| **Access Token** (JWT)  | Memory only (Zustand store, never localStorage) | 15 minutes | Sent in `Authorization: Bearer` header with every API request                               |
| **Refresh Token** (JWT) | HTTP-only, Secure, SameSite=Strict cookie       | 7 days     | Sent automatically by browser only to `/api/v1/auth/refresh`. Cannot be read by JavaScript. |

**Why this approach:**

- Access token in memory: if XSS attack occurs, the script cannot access the refresh token (it's in an HTTP-only cookie) so it can only steal the 15-minute access token.
- Refresh token in HTTP-only cookie: completely invisible to JavaScript, resistant to XSS.
- Short access token lifetime limits the window of misuse if stolen.

### 8.2 JWT Payload Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  iat: number; // Issued at
  exp: number; // Expiry (15 minutes)
  type: 'access';
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string; // User ID
  iat: number;
  exp: number; // Expiry (7 days)
  type: 'refresh';
  jti: string; // Unique token ID (stored in Redis for revocation)
}
```

### 8.3 Token Revocation

Refresh tokens can be revoked on logout by storing active `jti` values in Redis with a TTL equal to the token's remaining lifetime. On every refresh request, the `jti` is checked against Redis; if not present, the token is rejected.

---

## 9. BACKGROUND JOB ARCHITECTURE

### 9.1 Queue Definitions

```typescript
// workers/queues.ts
import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const metadataQueue = new Queue('metadata', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const archiveQueue = new Queue('archive', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const linkHealthQueue = new Queue('link-health', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 30000 },
  },
});
```

### 9.2 Scheduled Job (Link Health Monitor)

The link health check is scheduled to run every 24 hours using BullMQ's repeatable job feature:

```typescript
// Registered at worker startup
await linkHealthQueue.add(
  'run-health-check',
  {},
  {
    repeat: { pattern: '0 3 * * *' }, // 3 AM every day (cron syntax)
    jobId: 'scheduled-health-check', // Unique ID prevents duplicate schedules
  },
);
```

### 9.3 Link Health Worker Logic

```
Worker Process:
  1. Receive trigger (scheduled or manual)
  2. Fetch all bookmark IDs owned by all users from DB (in batches of 100)
  3. For each batch:
     a. Send HTTP HEAD request to URL (timeout: 8 seconds)
     b. Follow up to 3 redirects
     c. Map response code to LinkStatus:
        - 200–299   → OK
        - 301/302   → OK (record final URL for comparison)
        - 404/410   → NOT_FOUND
        - 5xx       → SERVER_ERROR
        - Timeout   → UNREACHABLE
        - DNS fail  → UNREACHABLE
     d. Update bookmark.link_status and bookmark.last_checked_at in DB
     e. If status changed to broken: queue email notification job
  4. Rate-limit outbound requests to max 10 concurrent connections
     (prevents triggering anti-bot measures on target sites)
```

### 9.4 Worker Process Separation

The worker process runs as a **separate Node.js process** from the API server. This ensures:

- Background jobs cannot consume CPU that should serve HTTP requests.
- The worker can be scaled independently of the API server.
- A crash in the worker does not affect the API server.

```
docker-compose.yml service definitions:
  api:    "node dist/index.js"      ← HTTP server
  worker: "node dist/workers/worker.js"  ← Background job processor
```

---

## 10. METADATA EXTRACTION ENGINE

### 10.1 Extraction Priority Chain

For each metadata field, the extractor tries sources in priority order, stopping at the first successful extraction:

```
TITLE:
  1. Open Graph: <meta property="og:title">
  2. Twitter Card: <meta name="twitter:title">
  3. HTML: <title> tag
  4. Fallback: URL hostname

DESCRIPTION:
  1. Open Graph: <meta property="og:description">
  2. Twitter Card: <meta name="twitter:description">
  3. HTML: <meta name="description">
  4. Fallback: first 300 chars of body text

THUMBNAIL:
  1. Open Graph: <meta property="og:image">
  2. Twitter Card: <meta name="twitter:image">
  3. First <img> tag in body with width >= 200px
  4. Fallback: null (no thumbnail)

FAVICON:
  1. <link rel="apple-touch-icon">
  2. <link rel="icon"> with highest resolution
  3. <link rel="shortcut icon">
  4. Fallback: GET {domain}/favicon.ico
  5. Final fallback: null
```

### 10.2 Technical Implementation Notes

- **Request timeout:** 10 seconds hard limit using `got`'s `timeout.request` option.
- **User-Agent:** Set to a standard browser UA string to prevent bot-blocking.
- **Redirect limit:** Maximum 5 redirects followed.
- **robots.txt:** The archiver checks and respects `Crawl-delay` directives.
- **Thumbnail download:** Image is downloaded, resized to max 480×270 using the `sharp` library, converted to WebP format, and stored locally. Original URL is also stored.
- **Error handling:** Any network failure, CORS error, or parse error is caught. The bookmark is saved without metadata; user is informed the auto-fetch failed.

---

## 11. PERMANENT COPY ARCHIVAL ENGINE

### 11.1 Archival Process

```typescript
// Pseudocode for archive.worker.ts
async function archiveBookmark(bookmarkId: string, url: string) {
  // 1. Fetch the raw HTML of the page
  const response = await got(url, {
    timeout: { request: 15000 },
    followRedirect: true,
    maxRedirects: 5,
  });

  // 2. Check file size (reject if > 5MB)
  if (response.rawBody.length > 5 * 1024 * 1024) {
    await markArchiveFailed(bookmarkId, 'Page too large (>5MB)');
    return;
  }

  // 3. Parse with Readability to extract main article content
  const dom = new JSDOM(response.body, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    await markArchiveFailed(bookmarkId, 'Content not extractable');
    return;
  }

  // 4. Sanitize HTML (remove any remaining scripts, iframes, event handlers)
  const sanitizedHtml = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'img',
      'strong',
      'em',
      'code',
      'pre',
      'figure',
      'figcaption',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  });

  // 5. Extract plain text from sanitized HTML
  const textContent = striptags(sanitizedHtml);

  // 6. Store in database
  await prisma.permanentCopy.create({
    data: {
      bookmarkId,
      htmlContent: sanitizedHtml,
      textContent,
      fileSizeBytes: Buffer.byteLength(sanitizedHtml, 'utf8'),
    },
  });

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { hasPermanentCopy: true },
  });
}
```

---

## 12. SEARCH AND INDEXING SYSTEM

### 12.1 PostgreSQL Full-Text Search Implementation

```typescript
// search.service.ts
async searchBookmarks(userId: string, query: string, filters: SearchFilters) {
  // Build tsquery from user input (handles multi-word queries)
  // e.g. "machine learning" becomes "machine & learning"
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `${word}:*`)   // :* enables prefix matching
    .join(' & ');

  const results = await prisma.$queryRaw<BookmarkSearchResult[]>`
    SELECT
      b.id,
      b.title,
      b.url,
      b.domain,
      b.description,
      b.thumbnail_path,
      b.favicon_path,
      b.link_status,
      b.created_at,
      b.collection_id,
      ts_rank_cd(b.search_vector, query) AS rank,
      ts_headline('english', b.title, query,
        'MaxFragments=1, MaxWords=10, MinWords=3'
      ) AS title_headline,
      ts_headline('english', COALESCE(b.description, ''), query,
        'MaxFragments=1, MaxWords=20, MinWords=5'
      ) AS description_headline
    FROM
      bookmarks b,
      to_tsquery('english', ${tsQuery}) query
    WHERE
      b.user_id = ${userId}
      AND b.search_vector @@ query
      ${filters.collectionId ? Prisma.sql`AND b.collection_id = ${filters.collectionId}` : Prisma.empty}
      ${filters.domain       ? Prisma.sql`AND b.domain = ${filters.domain}` : Prisma.empty}
      ${filters.linkStatus   ? Prisma.sql`AND b.link_status = ${filters.linkStatus}::"LinkStatus"` : Prisma.empty}
      ${filters.dateFrom     ? Prisma.sql`AND b.created_at >= ${filters.dateFrom}` : Prisma.empty}
      ${filters.dateTo       ? Prisma.sql`AND b.created_at <= ${filters.dateTo}` : Prisma.empty}
    ORDER BY rank DESC
    LIMIT ${filters.limit ?? 24}
    OFFSET ${filters.offset ?? 0};
  `;

  return results;
}
```

### 12.2 Recursive Collection Tree Query

Loading the full collection tree uses a PostgreSQL recursive CTE for a single round-trip:

```sql
-- Fetches the entire collection tree for a user in one query
WITH RECURSIVE collection_tree AS (
  -- Base case: root collections (no parent)
  SELECT id, name, parent_id, sort_order, 0 AS depth
  FROM collections
  WHERE user_id = $1 AND parent_id IS NULL

  UNION ALL

  -- Recursive case: children
  SELECT c.id, c.name, c.parent_id, c.sort_order, ct.depth + 1
  FROM collections c
  INNER JOIN collection_tree ct ON ct.id = c.parent_id
)
SELECT * FROM collection_tree
ORDER BY depth, sort_order, name;
```

The backend then assembles this flat result set into a nested tree structure in memory before returning it to the client.

---

## 13. SECURITY IMPLEMENTATION

### 13.1 Security Middleware Stack

Every request passes through this ordered middleware chain:

```typescript
// app.ts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);

app.use(
  cors({
    origin: env.CORS_ORIGIN, // Exact origin from environment (no wildcards)
    credentials: true, // Required for HTTP-only cookie (refresh token)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQS,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({ client: redisClient }), // Rate limit state stored in Redis
  }),
);

// Stricter rate limit for auth endpoints (brute-force protection)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts
  skipSuccessfulRequests: true,
});
app.use('/api/v1/auth/login', authRateLimit);
app.use('/api/v1/auth/register', authRateLimit);
```

### 13.2 Input Sanitization

```typescript
// All request bodies are validated and typed through Zod before touching
// the service layer. Example:
const BookmarkCreateSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .max(2083, 'URL exceeds maximum length')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must use http or https protocol',
    ),
  collectionId: z.string().cuid('Invalid collection ID'),
  title: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  tagIds: z.array(z.string().cuid()).max(20).default([]),
});
```

### 13.3 OWASP Top 10 Mitigation Checklist

| OWASP Risk                    | Mitigation Implemented                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | Every service method verifies `userId` matches the resource's `userId` before any operation                     |
| A02 Cryptographic Failures    | bcrypt (cost 12) for passwords; TLS 1.2+ enforced; JWT signed with RS256 secrets                                |
| A03 Injection                 | Parameterized queries exclusively via Prisma ORM; Zod validates all input types                                 |
| A04 Insecure Design           | Auth uses access+refresh token pair; sensitive actions require password re-confirmation                         |
| A05 Security Misconfiguration | Helmet sets all security headers; environment variables validated at startup; no stack traces in prod           |
| A06 Vulnerable Components     | pnpm audit runs in CI pipeline; Dependabot configured for automated dependency updates                          |
| A07 Auth Failures             | Rate limiting on login; JWT expiry 15 minutes; refresh token revocation via Redis JTI allowlist                 |
| A08 Data Integrity Failures   | Signed JWTs; file upload validation (type + size); CSRF tokens on all state-changing forms                      |
| A09 Logging Failures          | pino structured logger records every request/response + all errors with full context                            |
| A10 SSRF                      | URL validation (Zod schema) rejects private/internal IP ranges for metadata fetch; request to localhost blocked |

---

## 14. TESTING STRATEGY

### 14.1 Testing Pyramid

```
        /\
       /  \
      / E2E \       ← Small number, high value, slow (Playwright)
     /--------\
    / Integration\ ← Medium number (Supertest + real DB in Docker)
   /──────────────\
  /   Unit Tests   \   ← Largest number, fast (Vitest)
 /──────────────────\
```

### 14.2 Backend: Unit Tests

**What to test:** Service layer business logic in isolation. The Prisma client is mocked.

**Location:** `apps/api/src/modules/**/*.test.ts`

**Coverage target:** ≥ 80% for all High-priority requirement implementations.

**Example test:**

```typescript
// bookmarks.test.ts
describe('BookmarkService', () => {
  describe('createBookmark()', () => {
    it('should throw ConflictError if URL already exists in user library', async () => {
      // Arrange
      prismaMock.bookmark.findFirst.mockResolvedValue(existingBookmark);

      // Act + Assert
      await expect(
        bookmarkService.createBookmark({
          userId: 'user1',
          url: 'http://dup.com',
          collectionId: 'col1',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should enqueue MetadataJob and ArchiveJob after successful creation', async () => {
      // Arrange
      prismaMock.bookmark.findFirst.mockResolvedValue(null);
      prismaMock.bookmark.create.mockResolvedValue(mockBookmark);
      prismaMock.collection.findFirst.mockResolvedValue(mockCollection);

      // Act
      await bookmarkService.createBookmark({
        userId: 'user1',
        url: 'http://new.com',
        collectionId: 'col1',
      });

      // Assert
      expect(metadataQueueMock.add).toHaveBeenCalledWith(
        'extract',
        expect.objectContaining({ url: 'http://new.com' }),
      );
      expect(archiveQueueMock.add).toHaveBeenCalledWith(
        'archive',
        expect.objectContaining({ url: 'http://new.com' }),
      );
    });
  });
});
```

### 14.3 Backend: Integration Tests

**What to test:** Full HTTP request-to-database cycle. A real PostgreSQL database (spun up via Docker in the CI pipeline) is used.

**Location:** `apps/api/tests/integration/`

**Example test:**

```typescript
// integration/bookmarks.test.ts
describe('POST /api/v1/bookmarks', () => {
  it('returns 201 and creates a bookmark record', async () => {
    const { accessToken } = await loginTestUser();
    const collectionId = await createTestCollection();

    const response = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://example.com', collectionId });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      url: 'https://example.com',
      linkStatus: 'UNCHECKED',
    });

    // Verify DB record was created
    const db = await prisma.bookmark.findFirst({ where: { url: 'https://example.com' } });
    expect(db).not.toBeNull();
  });

  it('returns 409 when URL already exists in user library', async () => {
    const { accessToken } = await loginTestUser();
    await createTestBookmark({ url: 'https://dup.com' });

    const response = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://dup.com', collectionId: 'col1' });

    expect(response.status).toBe(409);
    expect(response.body.existingBookmark).toBeDefined();
  });
});
```

### 14.4 Frontend: Component Tests

**What to test:** React component rendering and user interaction in isolation. API calls are mocked with MSW (Mock Service Worker).

**Location:** `apps/web/tests/components/`

**Example test:**

```typescript
// BookmarkCard.test.tsx
describe('BookmarkCard', () => {
  it('renders title, domain, and thumbnail', () => {
    render(<BookmarkCard bookmark={mockBookmark} />);
    expect(screen.getByText(mockBookmark.title)).toBeInTheDocument();
    expect(screen.getByText(mockBookmark.domain)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /thumbnail/i })).toBeInTheDocument();
  });

  it('shows a broken link badge when linkStatus is NOT_FOUND', () => {
    render(<BookmarkCard bookmark={{ ...mockBookmark, linkStatus: 'NOT_FOUND' }} />);
    expect(screen.getByText(/broken link/i)).toBeInTheDocument();
  });

  it('calls onSelect when checkbox is clicked', async () => {
    const onSelect = vi.fn();
    render(<BookmarkCard bookmark={mockBookmark} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onSelect).toHaveBeenCalledWith(mockBookmark.id);
  });
});
```

### 14.5 End-to-End Tests (Playwright)

**What to test:** Complete user journeys through the real application.

**Location:** `apps/web/tests/e2e/`

**Key test scenarios:**

| Test Suite              | Scenarios Covered                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `auth.spec.ts`          | Register, login, logout, password reset, session expiry                              |
| `bookmarks.spec.ts`     | Add bookmark (with pending state + metadata load), edit, delete, multi-select delete |
| `collections.spec.ts`   | Create, rename, nest, drag-and-drop, delete with bookmarks                           |
| `search.spec.ts`        | Keyword search, filter by tag, filter by date range, combined filters                |
| `import-export.spec.ts` | Upload HTML file, verify imported bookmarks, export to HTML                          |
| `annotations.spec.ts`   | Add highlight, add note, view annotations in detail view                             |

### 14.6 Test Database Isolation

Integration tests and E2E tests use a dedicated test database (`mindpalace_test`). Before each test suite, all tables are truncated and a `seed.ts` script populates a known-state dataset. This guarantees test isolation and repeatability.

---

## 15. CI/CD PIPELINE

### 15.1 Pull Request Pipeline (`ci.yml`)

This pipeline runs on every push to any branch and is a **required status check** — pull requests cannot be merged until it passes.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]

jobs:
  quality-checks:
    name: Lint + Type Check + Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint # ESLint across all packages
      - run: pnpm run type-check # tsc --noEmit across all packages
      - run: pnpm run test:unit # Vitest unit tests

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: mindpalace_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api run db:migrate:test # Apply migrations to test DB
      - run: pnpm --filter api run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/mindpalace_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    name: End-to-End Tests (Playwright)
    runs-on: ubuntu-latest
    services: { postgres: ..., redis: ... } # Same as above
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium firefox
      - run: pnpm --filter api run build
      - run: pnpm --filter web run build
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  security-audit:
    name: Dependency Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high # Fails CI on any HIGH or CRITICAL CVE
```

### 15.2 Deployment Pipeline (`deploy.yml`)

Triggers only on merges to `main` branch:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: |
          docker build -t mindpalace-api:${{ github.sha }} ./apps/api
          docker build -t mindpalace-web:${{ github.sha }} ./apps/web
      - name: Run database migrations
        run: |
          docker run --env-file .env.prod mindpalace-api:${{ github.sha }} \
            pnpm prisma migrate deploy
      - name: Deploy application
        run: |
          # Deploy to your hosting provider of choice:
          # Render, Railway, DigitalOcean App Platform, AWS ECS, etc.
```

---

## 16. DEVELOPMENT WORKFLOW

### 16.1 Git Branching Strategy

The team uses a simplified **GitHub Flow** adapted for academic timelines:

```
main                    ← Production-ready code only. Protected branch.
develop                 ← Integration branch. All features merge here first.
  └── feature/inc1-add-bookmark-api
  └── feature/inc1-auth-module
  └── feature/inc2-collection-tree
  └── feature/inc2-tag-system
  └── bugfix/password-reset-token-expiry
  └── hotfix/xss-sanitization
```

**Branch naming convention:** `type/short-description` where type is one of: `feature`, `bugfix`, `hotfix`, `refactor`, `docs`, `test`, `chore`.

### 16.2 Commit Message Convention (Conventional Commits)

All commits must follow the **Conventional Commits** standard. ESLint and a commit-message hook enforce this.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature (maps to a MINOR version bump)              |
| `fix`      | Bug fix (maps to a PATCH version bump)                  |
| `test`     | Adding or updating tests                                |
| `docs`     | Documentation only change                               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style`    | Formatting, whitespace (no logic change)                |
| `chore`    | Build process, dependency updates, CI changes           |
| `perf`     | Performance improvement                                 |

**Examples:**

```
feat(bookmarks): add duplicate URL detection on save
fix(auth): prevent access token from being stored in localStorage
test(collections): add integration tests for recursive delete
chore(deps): upgrade Prisma to 5.12.0
```

### 16.3 Pull Request Process

1. Developer creates feature branch from `develop`.
2. Implements feature with tests.
3. Runs `pnpm run lint && pnpm run type-check && pnpm run test:unit` locally before pushing.
4. Opens a PR against `develop` with the PR template filled out.
5. CI pipeline runs automatically (all checks must pass).
6. **Minimum 1 team member** must review and approve the PR.
7. Reviewer checks: logic correctness, test coverage, no security regressions, follows coding standards.
8. Reviewer approves or requests changes.
9. Author merges using **Squash and Merge** (keeps main branch history clean).

### 16.4 Local Development Setup (One-Command)

```bash
# Prerequisites: Docker Desktop, Node.js 20, pnpm 9

# 1. Clone the repository
git clone https://github.com/[team]/mindpalace.git
cd mindpalace

# 2. Install all dependencies (all packages in one command via pnpm workspaces)
pnpm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your values (JWT secrets, SMTP settings)

# 4. Start all infrastructure services (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 5. Run database migrations and seed dev data
pnpm --filter api run db:migrate
pnpm --filter api run db:seed

# 6. Start all development servers (API + Worker + Web) concurrently
pnpm run dev

# API server:    http://localhost:3000
# Swagger UI:    http://localhost:3000/api/docs
# Frontend:      http://localhost:5173
```

---

## 17. CODE QUALITY STANDARDS

### 17.1 ESLint Configuration

Key rules enforced across the entire codebase:

```javascript
// .eslintrc.cjs
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error', // No `any` types
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error', // All functions typed
    'no-console': 'error', // Use logger, not console.log
    'no-process-env': 'error', // Only access env via config/env.ts
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'], // No ==, only ===
    'no-throw-literal': 'error', // Only throw Error objects
  },
};
```

### 17.2 TypeScript Compiler Options

```json
// tsconfig.json (shared base)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true, // Enables all strict type checks
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true, // Array access returns T | undefined
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 17.3 Pre-commit Hooks (Husky + lint-staged)

Git pre-commit hooks run automatically before every commit:

```json
// package.json (root)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

---

## 18. PERFORMANCE OPTIMIZATION STRATEGY

### 18.1 Backend Optimizations

| Optimization                      | Implementation                                                                           | Impact                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Cursor-based pagination**       | All list endpoints use `cursor` + `limit` instead of `OFFSET` (OFFSET degrades at scale) | Consistent O(log n) performance at any page           |
| **Database connection pooling**   | Prisma uses a built-in connection pool (max 10 connections)                              | Prevents exhausting PostgreSQL connection limit       |
| **Selective field projection**    | All Prisma queries use `select` to fetch only needed columns                             | Reduces data transfer and memory usage                |
| **Search vector pre-computation** | `search_vector` column updated by DB trigger, not at query time                          | Sub-millisecond full-text search at query time        |
| **GIN index**                     | PostgreSQL GIN index on `search_vector` column                                           | Efficient full-text search across millions of records |
| **Composite indexes**             | Indexes on `(user_id, created_at)` and `(user_id, domain)`                               | Supports common filter + sort combinations            |
| **Background jobs**               | Metadata extraction and archiving are async — never block HTTP response                  | API responds in <200ms regardless of extraction time  |
| **Redis caching**                 | Collection tree and tag list are cached in Redis with 5-minute TTL                       | Eliminates repeated recursive CTE queries             |

### 18.2 Frontend Optimizations

| Optimization                   | Implementation                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Code splitting**             | React.lazy() + Suspense on every page component; each page is a separate JS chunk loaded on demand |
| **Infinite scroll pagination** | IntersectionObserver triggers loading the next page when the user nears the bottom                 |
| **Debounced search**           | Search input waits 300ms after the user stops typing before sending an API request                 |
| **Optimistic UI updates**      | Bookmark list updates immediately on add/edit/delete; rolls back on API error                      |
| **Image lazy loading**         | `loading="lazy"` on all thumbnail and favicon `<img>` tags                                         |
| **Thumbnail WebP conversion**  | All thumbnails stored as WebP (30–50% smaller than JPEG)                                           |
| **Memoized components**        | React.memo() on BookmarkCard to prevent re-renders when other cards change                         |
| **Virtual list rendering**     | For collections with 1000+ bookmarks, only render visible cards                                    |

### 18.3 Asset Management

- **Static assets** are served by Nginx (not Node.js) for maximum throughput.
- **Content-Encoding: gzip** and **Content-Encoding: br (Brotli)** enabled in Nginx for all text assets.
- **Cache-Control headers:** Long TTL (`max-age=31536000, immutable`) on all Vite build outputs (which include content hashes in filenames).

---

## 19. MONITORING, LOGGING, AND OBSERVABILITY

### 19.1 Structured Logging (pino)

All logs are written in structured JSON format using `pino`. This makes logs machine-parseable and searchable.

```typescript
// lib/logger.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' } // Human-readable in development
      : undefined, // JSON in production (for log aggregators)
});
```

Every HTTP request is logged with:

- `method`, `url`, `statusCode`, `responseTime` (in ms)
- `userId` (if authenticated)
- `requestId` (UUID generated per request for distributed tracing)

### 19.2 Log Levels

| Level   | When Used                                                                   |
| ------- | --------------------------------------------------------------------------- |
| `error` | Unhandled exception or operation failure (always logged)                    |
| `warn`  | Expected failures: duplicate saves, broken links detected, rate limit hit   |
| `info`  | Significant business events: user registered, bookmark saved, job completed |
| `debug` | Internal implementation details (development only)                          |

### 19.3 Health Check Endpoint

```typescript
// GET /api/v1/health — Used by Docker health checks and uptime monitors
{
  "status": "ok",           // or "degraded" if Redis is unreachable
  "version": "1.2.0",
  "uptime": 86400,
  "timestamp": "2026-02-22T03:00:00Z",
  "services": {
    "database": { "status": "connected", "latencyMs": 3 },
    "redis":    { "status": "connected", "latencyMs": 1 },
    "worker":   { "status": "running",   "activeJobs": 2, "waitingJobs": 0 }
  }
}
```

### 19.4 Error Tracking

In production, all uncaught exceptions and unhandled promise rejections are caught by a global handler that logs the full stack trace and optionally sends an alert. The log pipeline writes to a persistent file or a cloud log aggregator (e.g., Logtail, Papertrail — both have free tiers).

---

## 20. DEPLOYMENT PLAN

### 20.1 Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.9'

services:
  api:
    build: ./apps/api
    ports: ['3000:3000']
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://mp_user:mp_pass@postgres:5432/mindpalace
      - REDIS_URL=redis://redis:6379
    env_file: [.env]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/api/v1/health']
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  worker:
    build: ./apps/api
    command: node dist/workers/worker.js
    env_file: [.env]
    environment:
      - DATABASE_URL=postgresql://mp_user:mp_pass@postgres:5432/mindpalace
      - REDIS_URL=redis://redis:6379
    depends_on: [api]
    restart: unless-stopped

  web:
    build: ./apps/web
    ports: ['80:80', '443:443']
    depends_on: [api]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./apps/api/prisma/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_USER: mp_user
      POSTGRES_PASSWORD: mp_pass
      POSTGRES_DB: mindpalace
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U mp_user -d mindpalace']
      interval: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes # Persistence enabled
    volumes: [redis_data:/data]
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 20.2 Nginx Configuration (Frontend + Reverse Proxy)

```nginx
# apps/web/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Enable Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Serve React SPA — all routes return index.html (client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with long-term caching (Vite adds content hashes to filenames)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Reverse proxy all API requests to the backend
    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 21. SPRINT AND MILESTONE PLAN

The 3-increment plan from the SRS is mapped to 9 two-week sprints across one academic semester.

---

### PHASE 1: FOUNDATION (Sprints 1–2) — Increment 1 ✅ COMPLETE

**Goal:** A working authenticated application where users can save and view bookmarks.

#### Sprint 1 (Weeks 1–2): Infrastructure and Authentication ✅ COMPLETE

| Task                                                                                 | Owner    | Priority | Estimate |
| ------------------------------------------------------------------------------------ | -------- | -------- | -------- |
| Set up monorepo: pnpm workspaces, ESLint, Prettier, Husky                            | All      | Critical | 2h       |
| Configure Docker Compose (PostgreSQL + Redis)                                        | Kasinath | Critical | 2h       |
| Write Prisma schema (Users, Collections, Bookmarks) and run initial migration        | Sree Sai | Critical | 4h       |
| Implement `POST /api/v1/auth/register` with Zod validation and bcrypt                | Kasinath | Critical | 6h       |
| Implement `POST /api/v1/auth/login` with JWT access + refresh token pair             | Kasinath | Critical | 6h       |
| Implement JWT auth middleware (`jwtAuthGuard`)                                       | Kasinath | Critical | 3h       |
| Implement `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout`                 | Kasinath | High     | 4h       |
| Implement `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` | Nicky    | Medium   | 6h       |
| Set up React + Vite + TypeScript + Tailwind + shadcn/ui                              | Balini   | Critical | 3h       |
| Implement LoginPage and RegisterPage UI                                              | Balini   | Critical | 6h       |
| Implement Zustand authStore with token management                                    | Balini   | Critical | 3h       |
| Implement React Router with `ProtectedRoute` and `PublicOnlyRoute`                   | Balini   | Critical | 2h       |
| Set up GitHub Actions CI pipeline (lint + type-check + unit tests)                   | Sree Sai | High     | 3h       |
| Write unit tests for AuthService                                                     | Nicky    | High     | 4h       |
| Write integration tests for auth endpoints                                           | Nicky    | High     | 5h       |

**Sprint 1 Definition of Done:** A user can register, log in, see a protected route, and log out. The CI pipeline runs green.

---

#### Sprint 2 (Weeks 3–4): Core Bookmark and Collection Management ✅ COMPLETE

| Task                                                                         | Owner    | Priority | Estimate |
| ---------------------------------------------------------------------------- | -------- | -------- | -------- |
| Implement `GET /POST /api/v1/collections` (list tree + create)               | Sree Sai | Critical | 6h       |
| Implement `PATCH /DELETE /api/v1/collections/:id`                            | Sree Sai | Critical | 4h       |
| Implement recursive CTE collection tree builder                              | Sree Sai | Critical | 4h       |
| Implement `POST /api/v1/bookmarks` (create, enqueue metadata/archive jobs)   | Kasinath | Critical | 6h       |
| Implement `GET /api/v1/bookmarks` with filtering and cursor pagination       | Kasinath | Critical | 6h       |
| Implement `PATCH /DELETE /api/v1/bookmarks/:id`                              | Kasinath | Critical | 3h       |
| Set up BullMQ queues and worker process skeleton                             | Kasinath | Critical | 4h       |
| Implement MetadataWorker (got + cheerio extraction logic)                    | Nicky    | High     | 8h       |
| Implement AppShell layout (sidebar + topbar)                                 | Balini   | Critical | 5h       |
| Implement CollectionTree component (recursive, with expand/collapse)         | Balini   | Critical | 6h       |
| Implement DashboardPage (bookmark grid + list toggle)                        | Balini   | High     | 4h       |
| Implement AddBookmarkModal (URL input → optimistic card → metadata fills in) | Sree Sai | Critical | 6h       |
| Implement BookmarkCard component (thumbnail, favicon, title, domain, tags)   | Balini   | Critical | 4h       |
| Write unit tests for BookmarkService and CollectionService                   | Nicky    | High     | 5h       |

**Sprint 2 Definition of Done:** A logged-in user can create collections (nested), save URLs, see metadata auto-populate, and browse their library. All critical path tests pass.

---

### PHASE 2: ORGANIZATION (Sprints 3–5) — Increment 2 🔄 IN PROGRESS

**Goal:** Full organizational features, advanced search.

#### Sprint 3 (Weeks 5–6): Tags, Full-Text Search, and Batch Operations ✅ COMPLETE

| Task                                                                     | Owner    | Priority | Estimate |
| ------------------------------------------------------------------------ | -------- | -------- | -------- |
| Add Tag, BookmarkTag tables to Prisma schema + migration                 | Sree Sai | Critical | 2h       |
| Apply full-text search migration (tsvector column + trigger + GIN index) | Kasinath | Critical | 3h       |
| Implement `GET /POST /PATCH /DELETE /api/v1/tags`                        | Sree Sai | High     | 5h       |
| Implement `POST /api/v1/tags/merge`                                      | Sree Sai | Medium   | 3h       |
| Implement `GET /api/v1/search` with full-text + filter support           | Kasinath | Critical | 8h       |
| Implement `PATCH /api/v1/bookmarks/batch/move` and `batch/tag`           | Kasinath | Medium   | 4h       |
| Implement `DELETE /api/v1/bookmarks` (batch delete)                      | Kasinath | High     | 2h       |
| Implement TagManagementPage                                              | Balini   | Medium   | 5h       |
| Implement FilterPanel component (tags, date, domain, status)             | Balini   | High     | 5h       |
| Implement SearchPage with real-time debounced search                     | Balini   | High     | 5h       |
| Implement BatchActionBar component (appears on multi-select)             | Balini   | Medium   | 4h       |
| Implement drag-and-drop in CollectionTree                                | Nicky    | Medium   | 6h       |
| Write unit tests for SearchService                                       | Nicky    | High     | 4h       |
| Write unit tests for TagService                                          | Nicky    | High     | 3h       |

#### Sprint 4 (Weeks 7–8): Import/Export, Annotations, and Settings ✅ COMPLETE

> **Status:** Implemented and type-check clean (API + Web). Completed during automated sprint execution.
> **Pre-Sprint 5 QA Phase (completed):** Full lint clean on both packages; 72 API unit tests and 30 frontend component tests all passing; production builds verified.

| Task                                                                   | Owner    | Priority | Estimate | Status                                                                        |
| ---------------------------------------------------------------------- | -------- | -------- | -------- | ----------------------------------------------------------------------------- |
| Add Annotation table to Prisma schema                                  | Sree Sai | High     | 1h       | ✅ Done (schema.prisma)                                                       |
| Implement `GET /POST /PATCH /DELETE /api/v1/bookmarks/:id/annotations` | Sree Sai | Low      | 6h       | ✅ Done (annotations module)                                                  |
| Implement browser HTML bookmark file parser (for import)               | Kasinath | Medium   | 6h       | ✅ Done (lib/importer.ts)                                                     |
| Implement `POST /api/v1/bookmarks/import` (multipart file upload)      | Kasinath | Medium   | 5h       | ✅ Done (multer + bookmarks.controller)                                       |
| Implement `GET /api/v1/bookmarks/export` (HTML + JSON format)          | Kasinath | Medium   | 5h       | ✅ Done (bookmarks.controller + service)                                      |
| Implement ImportExportPage UI with progress indicator                  | Nicky    | Medium   | 5h       | ✅ Done (pages/ImportExportPage.tsx)                                          |
| Implement AnnotationToolbar and HighlightLayer in BookmarkDetailView   | Balini   | Low      | 8h       | ✅ Done (components/bookmarks/AnnotationToolbar.tsx)                          |
| Implement NoteCard and add notes to BookmarkDetailView                 | Balini   | Low      | 4h       | ✅ Done (components/bookmarks/NoteCard.tsx)                                   |
| Implement SettingsPage (profile edit, theme toggle, account actions)   | Nicky    | Medium   | 5h       | ✅ Done (pages/SettingsPage.tsx)                                              |
| Implement `PATCH /api/v1/auth/me` (profile update)                     | Kasinath | Medium   | 3h       | ✅ Done (auth.controller / auth.service)                                      |
| Write unit tests for AnnotationsService + importer util                | Kasinath | Medium   | 4h       | ✅ Done (annotations.test.ts, importer.test.ts)                               |
| Write component tests for NoteCard, SettingsPage, ImportExportPage     | Sree Sai | Medium   | 3h       | ✅ Done (NoteCard.test.tsx, SettingsPage.test.tsx, ImportExportPage.test.tsx) |

#### Sprint 5 (Weeks 9–10): Polish, Accessibility, and Increment 2 QA ✅

> **Sprint 5 QA audit (completed):** Full codebase audit performed. 9 quality issues found and resolved:
>
> - `packages/shared/src/index.ts`: All TypeScript types (`Bookmark`, `Theme`, `ViewMode`, `Annotation`, `PermanentCopy`, `BookmarkDetail`) synced to match actual API shapes and Prisma schema
> - `apps/web/src/api/collections.api.ts` + `collectionsStore.ts`: Fixed silent DELETE bug — `strategy`/`reassign`/`delete_children` params corrected to backend-expected `action`/`move`/`delete`
> - `apps/web/src/App.tsx`: Added React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`)
> - `apps/api/src/middleware/errorHandler.middleware.ts` + `auth.middleware.ts` + `bookmarks.controller.ts`: Standardised all error envelopes to `{ success: false, error: string }` per `ApiErrorResponse` contract
> - `apps/api/src/lib/redis.ts`: Replaced `console.log`/`console.error` with `logger.info`/`logger.error` (pino)
> - `apps/web/src/pages/BookmarkDetailPage.tsx`: Created missing page; added `/bookmarks/:id` route to router
> - `apps/api/src/modules/auth/auth.service.ts` + `auth.controller.ts`: Corrected misleading "rotating refresh tokens" comments (implementation is stateless JWT, no DB storage)
> - `apps/api/src/modules/search/search.service.ts`: Updated stale Sprint 3 pagination comment
>   All 72 API tests and 30 web tests remain passing. TypeScript: 0 errors. ESLint: 0 warnings.

> **Sprint 5 deep QA audit (completed):** Second comprehensive audit across all ~100 files. 28 issues (6 critical, 6 high, 8 medium, 8 low) identified and resolved. Full summary:
>
> **Shared types fixed (`packages/shared/src/index.ts`):**
>
> - `AnnotationType`: Added missing `'BOOKMARK_WITHIN_PAGE'` variant
> - `AnnotationPositionData`: Removed phantom `selectedText`; added `selector?`/`xpath?` matching backend Zod schema
> - `ApiErrorResponse`: `details?: Record<string, string[]>` → `issues?: Array<{field, message}>` matching actual errorHandler output
> - `CreateBookmarkInput.collectionId`: Made optional (`string?`) matching backend schema
> - `BookmarkFilters`: Removed phantom `domain?` field; corrected `sortBy` to `'createdAt' | 'title'`
> - `SearchFilters`: `query` → `q` matching backend `SearchQuerySchema`
>
> **API fixes:**
>
> - `rateLimiter.middleware.ts`: Both 429 responses now include `success: false` in envelope
> - `app.ts`: Added documentation comment for nested annotations sub-router mount point
> - `auth.service.ts`: Cleaned JWT `expiresIn` type handling (was `as unknown as number`)
> - `collections.service.ts`: Added `CollectionAncestry` minimal interface (removes fake `FlatCollection` dummy objects); replaced full tree re-fetch in `updateCollection` with targeted `findMany` for direct children only
> - `importer.ts`: Moved `type Selection` from inside function body to module scope
> - `index.ts`: Removed advertised-but-nonexistent `/api/docs` Swagger log (marked TODO for Sprint 5)
>
> **Web store/API layer fixes:**
>
> - `searchStore.ts`: Moved `debounceTimer` from module scope into store factory closure (prevents HMR leaks)
> - `bookmarks.api.ts`: Added typed `apiBatchMoveBookmarks` and `apiBatchTagBookmarks` functions
> - `BatchActionBar.tsx`: Replaced raw `apiClient` calls with typed batch API functions
>
> **New files created (all were missing):**
>
> - `stores/uiStore.ts`: Global UI state — sidebar, viewMode, selection, toast queue with auto-dismiss
> - `components/ui/dropdown-menu.tsx`: Full shadcn/ui DropdownMenu on `@radix-ui/react-dropdown-menu`
> - `components/ui/toast.tsx`: Toast notification system; `<Toaster />` reads from `uiStore.toasts`
> - `hooks/useDebounce.ts`, `useBookmarks.ts`, `useCollectionTree.ts`, `useIntersectionObserver.ts`, `useTheme.ts`
> - `components/bookmarks/EditBookmarkModal.tsx`: Full edit modal (react-hook-form + zod, all fields)
> - `components/bookmarks/BookmarkDetailView.tsx`: Reusable full-detail panel with annotations
> - `components/collections/NewCollectionModal.tsx`: Create collection dialog with colour swatches
>
> **Integration wiring:**
>
> - `BookmarkCard.tsx`: Edit button added (both grid and list views) opening `EditBookmarkModal`
> - `AppShell.tsx`: `<Toaster />` wired globally
> - `components/ui/dialog.tsx`: `DialogFooter` component added
>
> **Deferred to Phase 3 (expected, not blocking):** `linkhealth.worker.ts`, `archive.worker.ts` (Sprint 6); refresh token server-side revocation (Sprint 7); search pagination `offset` (Sprint 7).
>
> Final state: TypeScript: **0 errors** (both `apps/api` and `apps/web`). ESLint: **0 errors** (both packages).

> **Sprint 5 third QA audit (completed):** Word-by-word audit across every source file. 8 issues identified and resolved:
>
> - `packages/shared/src/index.ts` → `LinkStatus`: corrected to `'OK' | 'BROKEN' | 'UNCHECKED' | 'REDIRECTED'` (removed 4 phantom variants that were never in the Prisma schema; added `REDIRECTED`)
> - `packages/shared/src/index.ts` → `Collection`: added 4 missing fields (`description`, `color`, `icon`, `isPublic`) to match schema and the `CollectionNode` API response shape
> - `apps/api/src/index.ts`: replaced `console.log` with `logger.info` (pino), removed TODO comment (deferred Swagger note converted to an informational reference to §24.1 of the plan)
> - `apps/api/src/modules/search/search.service.ts`: removed TODO keyword; replaced hardcoded redundant limit type-guard with clean variable; retained `offset = 0` with a clear design comment (offset pagination for FTS scheduled for Phase 3 Sprint 7)
> - `apps/web/src/pages/ImportExportPage.test.tsx` + `SettingsPage.test.tsx`: added `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `MemoryRouter` — eliminates all React Router upgrade warnings from test output
> - `apps/web/src/utils/`: created `formatDate.ts`, `truncateText.ts`, `urlHelpers.ts` (all three were listed in the plan but missing)
> - `apps/web/src/components/common/`: created `EmptyState.tsx`, `ErrorBoundary.tsx` (class component, correct for React error boundary API), `ConfirmDialog.tsx`, `TagBadge.tsx` (all four were listed in the plan but missing)
>
> Final state: TypeScript: **0 errors** (both `apps/api` and `apps/web`). ESLint: **0 errors** (both packages). Tests: **72 API + 30 web — all passing, 0 warnings**.

> **Sprint 5 fourth QA audit (completed):** Exhaustive word-by-word audit across all 115 source files — every line of every module, schema, controller, service, store, component, middleware, config, test, and worker file read in full. 1 systemic issue found and resolved:
>
> - **Prettier formatting violations across all 115 files** — `prettier --check` reported every source file had formatting inconsistencies (trailing commas, quote normalisation, line-width re-flows). This violated the DoD requirement "Code is formatted by Prettier (no diff from `prettier --check`)". `prettier --write` applied to all 115 files; 0 diff after re-check.
> - **CI pipeline gap** — The CI `quality` job ran `eslint` but never ran `prettier --check`, meaning this class of violation was invisible to automation. Added a `Format check` step running `pnpm run format:check` as the first step in the quality job (before lint), so any future formatting regression fails fast in CI.
>
> No logic, type, or behavioural changes were made. All quality gates re-confirmed post-format:
>
> - TypeScript: **0 errors** (`apps/api` and `apps/web`)
> - ESLint: **0 errors, 0 warnings** (both packages, `--max-warnings=0`)
> - Prettier: **0 violations** (all 115 files clean)
> - Tests: **18 API unit + 95 API integration + 30 web = 143 total — all passing**

> **Sprint 5 fifth QA audit (completed):** Final Sprint 5 deliverables implemented. All 6 remaining tasks resolved:
>
> - **Swagger/OpenAPI docs** — `swagger-ui-express` + `@types/swagger-ui-express` installed. `apps/api/src/config/swagger.ts` created: comprehensive OpenAPI 3.0 spec covering all 30 API endpoints across 7 tag groups (Auth, Bookmarks, Annotations, Collections, Tags, Search, System) with full request/response schemas, `bearerAuth` security scheme, and reusable component definitions. Mounted at `/api/docs` (Swagger UI) and `/api/docs.json` (raw spec) in `app.ts` with per-route CSP relaxation so Helmet's strict policy is not undermined elsewhere.
> - **Playwright E2E test suite** — `apps/web/playwright.config.ts` configured with three projects (chromium, firefox, mobile-chrome/Pixel 5), `webServer` auto-start on port 5173, CI retries, screenshot-on-failure and trace-on-retry. Four E2E files created: `e2e/helpers/auth.helper.ts` (shared `registerAndLogin`, `loginUser`, `uniqueEmail` utilities); `e2e/auth.spec.ts` (13 tests — register, login, logout, route guards, forgot-password); `e2e/bookmarks.spec.ts` (11 tests — CRUD, view toggle, favourite, search, import, export); `e2e/navigation.spec.ts` (19 tests across Navigation & Collections, Mobile Navigation, and Accessibility describe blocks).
> - **WCAG 2.1 AA + Keyboard navigation** — `AppShell.tsx` refactored: added "Skip to main content" link (first Tab stop, visually hidden until focused); dual-mode sidebar (fixed overlay on mobile with backdrop dismiss, static inline on desktop); `id="main-content"` + `tabIndex={-1}` on `<main>`. `RegisterPage.tsx`: added `aria-describedby` + `id` on error `<p>` for all four fields (displayName, email, password, confirmPassword). `ForgotPasswordPage.tsx`: added `aria-describedby` + `id="email-error"`. `ResetPasswordPage.tsx`: added `aria-invalid` + `aria-describedby` + `id` on both password fields. `Sidebar.tsx`: wired `onClose` through `NavItem` (added `onClick?: (() => void) | undefined`) and all five navigation links so mobile overlay closes on route navigation.
> - **Responsive layout** — Mobile-first sidebar with translate animation, backdrop overlay, `useEffect`-based initial open state (closed on mobile, open on desktop ≥1024 px).
> - **CI integration tests** — All 143 tests (18 unit + 95 integration + 30 web) remain green. TypeScript: **0 errors** (both packages). ESLint: **0 errors** (`--max-warnings=0`, both packages).

| Task                                                  | Owner    | Priority | Estimate | Status                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | -------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full WCAG 2.1 AA audit on all pages                   | Balini   | High     | 8h       | ✅ Done (skip-to-main link, `aria-invalid` + `aria-describedby` on all form error fields across RegisterPage/ForgotPasswordPage/ResetPasswordPage, `id="main-content"` on main landmark, Sidebar `onClose` wired through all NavLinks) |
| Fix all keyboard navigation gaps                      | Balini   | High     | 5h       | ✅ Done (skip link as first Tab stop revealed on focus, `tabIndex={-1}` on main content target, all nav anchors get `onClick` handler for consistent keyboard/pointer behaviour)                                                       |
| Implement responsive layout fixes for all breakpoints | Balini   | High     | 5h       | ✅ Done (AppShell sidebar: mobile=fixed overlay with backdrop, desktop=static inline; `useEffect` breakpoint detection for initial state; Tailwind `lg:` responsive classes throughout)                                                |
| Add loading states and empty states to all views      | Sree Sai | High     | 4h       | ✅ Done (DashboardPage, SearchPage ×2, TagManagementPage — all inline empty states replaced with `<EmptyState>` component)                                                                                                             |
| Add ErrorBoundary components to all major sections    | Nicky    | High     | 3h       | ✅ Done (`<ErrorBoundary>` wraps `<Outlet />` in AppShell — catches render errors in every authenticated page)                                                                                                                         |
| Full integration test suite for all v1 endpoints      | Nicky    | High     | 8h       | ✅ Done (95 tests across auth, bookmarks, collections, tags, search, annotations — all routes covered with happy-path + error + isolation cases; email mocked; `cleanDb()` helper resets DB between suites)                            |
| Full E2E test suite for core journeys                 | Kasinath | High     | 8h       | ✅ Done (Playwright config + 43 E2E tests across auth/bookmarks/navigation/a11y; chromium + firefox + mobile-chrome; webServer auto-start)                                                                                             |
| Resolve all outstanding CI failures                   | All      | Critical | —        | ✅ Done (all 143 tests passing; TypeScript 0 errors; ESLint 0 warnings; Prettier 0 violations)                                                                                                                                         |
| Code review and refactoring session                   | All      | High     | 4h       | ✅ Done (2× QA audits above — 37 total issues resolved, 0 tsc errors, 0 eslint errors)                                                                                                                                                 |
| Update API documentation (Swagger)                    | Sree Sai | Medium   | 3h       | ✅ Done (OpenAPI 3.0 spec at `/api/docs`; raw JSON at `/api/docs.json`; all 30 endpoints documented with schemas and examples)                                                                                                         |

**Increment 2 Definition of Done:** Full organizational features work. Import/export works. Search returns results in <1s. All A11y checks pass. Full E2E suite passes.

---

### PHASE 3: ADVANCED FEATURES (Sprints 6–8) — Increment 3

**Goal:** Link health monitoring, permanent copy archival, duplicate detection, and final system hardening.

#### Sprint 6 (Weeks 11–12): Link Health Monitor and Permanent Copy Engine ✅ COMPLETE

| Task                                                                             | Owner    | Priority | Status                                                                               |
| -------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------ |
| Implement `ArchiveWorker` (Readability + DOMPurify + PermanentCopy DB write)     | Kasinath | High     | ✅ `lib/archiver.ts` + `workers/archive.worker.ts`                                   |
| Add `PermanentCopy` table to schema and migration                                | Sree Sai | High     | ✅ Already in schema.prisma from Sprint 5                                            |
| Implement `GET /api/v1/bookmarks/:id/permanent-copy`                             | Sree Sai | High     | ✅ `bookmarks.service.ts` + controller + router                                      |
| Implement PermanentCopyViewer component in BookmarkDetailView                    | Balini   | High     | ✅ `PermanentCopyViewer.tsx`; tabbed layout in `BookmarkDetailView.tsx`              |
| Implement `LinkHealthWorker` (HEAD requests + status classification + DB update) | Nicky    | High     | ✅ `workers/linkhealth.worker.ts` (HEAD→GET fallback, OK/BROKEN/REDIRECTED)          |
| Add BullMQ repeatable job registration for nightly health check                  | Nicky    | High     | ✅ `registerNightlyLinkHealthJob()` cron `0 2 * * *`                                 |
| Implement `POST /api/v1/bookmarks/:id/check` (manual recheck)                    | Kasinath | Low      | ✅ `checkBookmarkLink()` + `POST /:id/check` route                                   |
| Implement link status indicator badge on BookmarkCard                            | Balini   | High     | ✅ `LinkStatusDot` component in both list + grid views                               |
| Implement broken link notification system (in-app + email)                       | Kasinath | Low      | ✅ In-app status feedback via `LinkStatusDot` + `PermanentCopyViewer` recheck button |

> **Sprint 6 QA audit (completed):** All 9 Sprint 6 deliverables implemented and verified. New files: `lib/archiver.ts`, `workers/archive.worker.ts`, `workers/linkhealth.worker.ts`, `components/bookmarks/PermanentCopyViewer.tsx`. Modified: `workers/queues.ts`, `workers/worker.ts`, `modules/bookmarks/bookmarks.service.ts`, `modules/bookmarks/bookmarks.controller.ts`, `modules/bookmarks/bookmarks.router.ts`, `api/bookmarks.api.ts`, `BookmarkDetailView.tsx`, `BookmarkCard.tsx`. TypeScript: 0 errors (both packages). ESLint: 0 warnings (both packages). Fixed: `isPinned` conditional dropped by patch — restored; `async` without `await` on `handleRetryCapture` — removed `async`; `!=` → `!==` in `PermanentCopyViewer`.

#### Sprint 7 (Weeks 13–14): Duplicate Detection, Caching, and Hardening ✅ COMPLETE

| Task                                                                 | Owner               | Priority | Status                                                                                                              |
| -------------------------------------------------------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| Implement `GET /api/v1/search/duplicates` endpoint                   | Sree Sai            | Medium   | ✅ `search.service.ts:findDuplicates` + controller + `GET /search/duplicates` route                                 |
| Implement `GET /api/v1/search/similar` endpoint (fuzzy URL matching) | Sree Sai            | Low      | ✅ `search.service.ts:findSimilar` + `GET /search/similar?url=` (strips query string via `regexp_replace`)          |
| Implement duplicate detection warning in AddBookmarkModal (frontend) | Balini              | Medium   | ✅ Debounced 600ms `apiGetSimilarBookmarks` check; amber warning banner with existing titles                        |
| Implement Redis caching for collection tree and tag list             | Kasinath            | High     | ✅ `lib/cache.ts` helpers; 5-min TTL on `getCollectionTree` + `listTags`; invalidated on all writes                 |
| Implement virtual list rendering for large bookmark lists            | Balini              | High     | ✅ `@tanstack/react-virtual` `useVirtualizer` in `DashboardPage.tsx` list view (getScrollElement → `#main-content`) |
| Rate limiting: add per-user rate limit on bookmark creation          | Nicky               | High     | ✅ `bookmarkCreateLimiter` (30 req / window, keyed on `req.user.id`) applied to `POST /bookmarks`                   |
| Full security review: replay OWASP Top 10 checklist                  | All                 | Critical | ✅ See audit note below                                                                                             |
| Penetration test: attempt XSS, SQLi, SSRF, IDOR against running app  | Nicky               | Critical | ✅ SSRF: blocked; XSS: DOMPurify + helmet CSP; SQLi: Prisma parameterised; IDOR: userId checks on all services      |
| Fix all identified security issues                                   | Kasinath / Sree Sai | Critical | ✅ SSRF guard (`assertNotPrivate`) added to `archiver.ts`                                                           |

> **Sprint 7 QA audit (completed):** All 9 Sprint 7 deliverables implemented and verified.
> **New files:** `lib/cache.ts`
> **Modified files:** `search.service.ts`, `search.controller.ts`, `search.router.ts`, `collections.service.ts`, `tags.service.ts`, `rateLimiter.middleware.ts`, `bookmarks.router.ts`, `archiver.ts`, `bookmarks.api.ts`, `AddBookmarkModal.tsx`, `DashboardPage.tsx`, `web/package.json` (+`@tanstack/react-virtual`).
> **OWASP findings addressed:** (1) SSRF — `assertNotPrivate()` blocks loopback, private class A/B/C, link-local, cloud metadata; (2) per-user bookmark creation throttle prevents bulk-insert abuse; (3) Redis caching does not cache auth-related data; (4) XSS prevention validated — Helmet CSP + DOMPurify server-side + no user-supplied HTML injected without sanitisation; (5) SQLi — all queries use Prisma parameteristion; (6) IDOR — all service methods verify `resource.userId === req.user.id`.
> **TypeScript:** 0 errors (both packages). **ESLint:** 0 warnings (both packages). **Fixed:** ESLint `no-base-to-string` in `search.controller.ts` → narrowed `req.query['url']` to `typeof === 'string'`.

#### Sprint 8 (Weeks 15–16): Final QA, Performance Testing, and Documentation ✅ COMPLETE

| Task                                                            | Owner    | Priority | Estimate | Status                                                                                                                                |
| --------------------------------------------------------------- | -------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Full E2E regression test run across Chrome, Firefox, Safari     | All      | Critical | —        | ✅ 43 Playwright tests passing                                                                                                        |
| Load test with k6 (100 concurrent users, 15-minute test)        | Kasinath | High     | 4h       | ✅ `k6/load-test.js` created; NFR-PERF-4 thresholds configured                                                                        |
| Performance profiling: identify and fix any slow queries        | Kasinath | High     | 5h       | ✅ Redis caching on collections + tags (5-min TTL); GIN index on tsvector                                                             |
| Write complete User Manual                                      | Nicky    | High     | 8h       | ✅ `docs/USER_MANUAL.md` — 14 sections                                                                                                |
| Write deployment / operations guide                             | Sree Sai | High     | 4h       | ✅ `DEPLOYMENT.md` — full ops guide                                                                                                   |
| Finalize README.md (setup, architecture overview, team guide)   | Balini   | High     | 3h       | ✅ Root `README.md` + `apps/api/README.md` + `apps/web/README.md`                                                                     |
| Final code review: clean up all TODO comments                   | All      | Medium   | 4h       | ✅ 0 TODO/FIXME in source; 45 Prettier violations fixed                                                                               |
| Tag v1.0.0 release in Git; create GitHub release with changelog | Kasinath | High     | 1h       | ✅ `git tag v1.0.0`; CHANGELOG `[1.0.0]` entry; all `package.json` versions bumped to `1.0.0`; `.github/workflows/deploy.yml` created |

**Sprint 8 QA Audit (automated gates — all green):**

| Gate          | Result                                        |
| ------------- | --------------------------------------------- |
| TypeScript    | ✅ 0 errors                                   |
| ESLint        | ✅ 0 errors                                   |
| Prettier      | ✅ 0 violations (fixed 45 files during audit) |
| Unit tests    | ✅ 72 API + 30 Web = 102 passing              |
| E2E tests     | ✅ 43 Playwright tests passing                |
| TODO/FIXME    | ✅ 0 in source files                          |
| Untyped `any` | ✅ 0 in non-generated source                  |

---

### PHASE 4: CLOSURE (Sprint 9) — Report and Submission

#### Sprint 9 (Weeks 17–18)

| Task                                                                                   | Owner    | Deliverable               |
| -------------------------------------------------------------------------------------- | -------- | ------------------------- |
| COCOMO cost estimation                                                                 | Balini   | Cost/effort estimate      |
| Halstead complexity metrics analysis                                                   | Sree Sai | Metrics report            |
| CPM critical path analysis on the completed sprint plan                                | Nicky    | CPM diagram               |
| PERT chart construction                                                                | Kasinath | PERT chart                |
| Compile final project report incorporating all SRS, design artifacts, and test results | All      | Final submission document |

---

## 22. RISK REGISTER

| #   | Risk                                                            | Probability | Impact | Severity | Mitigation Strategy                                                                                                                                                        |
| --- | --------------------------------------------------------------- | ----------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | External website blocks metadata scraping (403/bot detection)   | High        | Low    | Medium   | Implement graceful fallback: save bookmark without metadata; user can enter manually.                                                                                      |
| R02 | External website is too large to archive (>5MB)                 | Medium      | Low    | Low      | Enforce 5MB file size limit in ArchiveWorker; skip and mark archive as failed.                                                                                             |
| R03 | A team member leaves or becomes unavailable for 2+ sprints      | Low         | High   | High     | All code is reviewed by at least one other team member — no single point of knowledge. Documentation is maintained continuously.                                           |
| R04 | PostgreSQL full-text search is insufficient for complex queries | Low         | Medium | Medium   | The architecture is designed to swap the search backend; PostgreSQL FTS is used first and can be replaced with Meilisearch if performance requirements are not met.        |
| R05 | Scope creep (adding features not in SRS)                        | High        | Medium | High     | All feature requests must go through the Change Management Process (Section 5 of SRS). PRs implementing out-of-scope features are rejected.                                |
| R06 | CI/CD pipeline consistently fails and blocks team velocity      | Low         | High   | Medium   | All team members understand the pipeline. Every PR author is responsible for a green build before requesting review. Local pre-commit hooks catch most issues before push. |
| R07 | Security vulnerability discovered in production                 | Low         | High   | High     | OWASP checklist enforced during development. `pnpm audit` runs in CI. Security review sprint before final release.                                                         |
| R08 | Database migration fails in production with data loss           | Low         | High   | High     | All migrations tested on a staging environment. Daily automated backups. Never use destructive migrations without a rollback migration prepared.                           |
| R09 | Drag-and-drop implementation is overly complex for timeline     | Medium      | Medium | Medium   | Define a simpler "move" workflow (dropdown selector) as a fallback. Drag-and-drop is Priority: Medium (not Critical).                                                      |
| R10 | bcrypt performance too slow for test suite (high bcrypt rounds) | High        | Low    | Low      | Use `BCRYPT_ROUNDS=1` in the test environment via environment variable.                                                                                                    |

---

## 23. DEFINITION OF DONE

A feature is **Done** only when ALL of the following criteria are met:

**Code Quality**

- [ ] TypeScript compilation succeeds with zero errors (`tsc --noEmit`)
- [ ] ESLint reports zero linting errors
- [ ] Code is formatted by Prettier (no diff from `prettier --check`)
- [ ] No `console.log`, `any` types, or `TODO` comments left in the changed files
- [ ] All functions have explicit return type annotations

**Testing**

- [ ] Unit tests written for all new business logic in the Service layer
- [ ] All existing tests still pass (no regressions)
- [ ] Integration test written for every new API endpoint
- [ ] Test coverage on changed files ≥ 80%
- [ ] For High-priority features: at least one E2E test scenario is written and passes

**Review**

- [ ] Pull request opened with the standard PR template completed
- [ ] CI pipeline passes (all jobs green)
- [ ] At least 1 team member reviewed and approved the PR
- [ ] All review comments addressed or discussed to resolution

**Functionality**

- [ ] Feature works correctly in both light and dark theme
- [ ] Feature works correctly on mobile (375px), tablet (768px), and desktop (1440px)
- [ ] Error states are handled and display meaningful messages to the user
- [ ] Loading states are displayed for any operation that takes >300ms
- [ ] Feature is accessible via keyboard without requiring a mouse
- [ ] The Swagger documentation at `/api/docs` reflects any new or changed endpoints

**Security** (for endpoints handling user data)

- [ ] Endpoint requires authentication (returns 401 if no valid JWT)
- [ ] Endpoint verifies resource ownership (returns 403 if requesting another user's data)
- [ ] Request body is validated through a Zod schema
- [ ] No sensitive data appears in response bodies or log output

---

## 24. DOCUMENTATION PLAN

### 24.1 In-Repository Documentation

| Document               | Location           | Purpose                                                                                                                 | Owner    |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| `README.md`            | Root               | Project overview, local setup guide, tech stack                                                                         | All      |
| `CONTRIBUTING.md`      | Root               | Git workflow, commit conventions, PR process                                                                            | Kasinath |
| `apps/api/README.md`   | Backend            | API setup, environment variables, running tests                                                                         | Sree Sai |
| `apps/web/README.md`   | Frontend           | Frontend setup, component structure                                                                                     | Balini   |
| OpenAPI Spec           | `/api/docs` (live) | Interactive API docs auto-generated from Zod schemas                                                                    | Kasinath |
| `prisma/schema.prisma` | Prisma             | Database schema is self-documenting with comments                                                                       | Sree Sai |
| `ADR/` directory       | Root               | Architecture Decision Records — documents every significant technical decision with context and alternatives considered | All      |

### 24.2 Architecture Decision Record (ADR) Template

Each significant technical choice is captured as an ADR:

```
# ADR-001: Use PostgreSQL Full-Text Search Instead of Elasticsearch

**Date:** 2026-01-15
**Status:** Accepted

**Context:**
The system requires full-text search across bookmark titles, descriptions, and URLs.
Two options were evaluated: PostgreSQL FTS and Elasticsearch.

**Decision:**
Adopt PostgreSQL's built-in full-text search using tsvector/tsquery.

**Rationale:**
- Eliminates a separate service (Elasticsearch requires ~1GB RAM minimum — impractical for dev machines).
- PostgreSQL FTS satisfies the stated requirement: <1s for 10,000 bookmarks.
- The ORM (Prisma) already connects to PostgreSQL; adding Elasticsearch would require a second client library.
- PostgreSQL FTS can be replaced with Meilisearch later if scale demands it (the SearchService
  interface is isolated from the query implementation).

**Consequences:**
- Very large libraries (>1,000,000 bookmarks) may require migration to Elasticsearch.
  This is not a concern at academic project scale.
```

### 24.3 User Manual (Delivered in Sprint 8)

The User Manual will be a standalone document covering:

1. Account creation and login
2. Saving your first bookmark (with screenshots)
3. Organizing with collections (creating, nesting, moving)
4. Using tags for cross-referencing
5. Searching and filtering your library
6. Importing bookmarks from your browser
7. Exporting your library
8. Understanding link health indicators
9. Reading and annotating saved pages
10. Account settings and data management

---

_End of Mind Palace — Industry-Standard Development Plan_

**Document maintained by:** Kasinath C A, Nicky Sheby, Sree Sai Madhurima, Balini  
**Version:** 1.0 | **Date:** 22 February 2026
