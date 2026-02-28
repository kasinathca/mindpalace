# Mind Palace — Web (`apps/web`)

React 18 SPA for the Mind Palace bookmark management system, built with Vite 5 and
Tailwind CSS 3.

## Table of Contents

- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Available Scripts](#available-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Component Library](#component-library)
- [State Management](#state-management)
- [Testing](#testing)
- [Accessibility](#accessibility)

---

## Requirements

| Tool    | Version  |
| ------- | -------- |
| Node.js | ≥ 20 LTS |
| pnpm    | ≥ 9      |

The frontend expects the API server (`apps/api`) to be running. See
[apps/api/README.md](../api/README.md) for setup instructions.

---

## Getting Started

```bash
# Install dependencies (run from monorepo root)
pnpm install

# Start the development server (hot-reload via Vite HMR)
pnpm --filter web run dev
```

The app is served at `http://localhost:5173`. API calls are proxied to `http://localhost:3000`
via the Vite dev server proxy configured in `vite.config.ts`.

---

## Available Scripts

Run from the **monorepo root** with `pnpm --filter web run <script>`, or from `apps/web/`
directly with `pnpm run <script>`.

| Script          | Description                                    |
| --------------- | ---------------------------------------------- |
| `dev`           | Start Vite development server with HMR         |
| `build`         | Type-check and bundle for production (`dist/`) |
| `preview`       | Serve the production build locally             |
| `test`          | Run Vitest unit/component tests                |
| `test:coverage` | Run tests with V8 coverage report              |
| `test:e2e`      | Run Playwright end-to-end tests                |
| `test:e2e:ui`   | Run Playwright tests in interactive UI mode    |
| `type-check`    | Run `tsc --noEmit`                             |
| `lint`          | Run ESLint                                     |
| `format`        | Run Prettier (write)                           |
| `format:check`  | Run Prettier (check, no writes)                |

---

## Environment Variables

Vite exposes variables prefixed with `VITE_` to the browser bundle. Set them in a `.env`
file at the **monorepo root** or as `VITE_*` in your shell.

| Variable            | Default                 | Description               |
| ------------------- | ----------------------- | ------------------------- |
| `VITE_API_BASE_URL` | `/api` (proxied in dev) | Base URL for API requests |

In production, set `VITE_API_BASE_URL` to the absolute API URL if the API and web are served
from different origins (e.g. `https://api.mindpalace.example.com`).

---

## Project Structure

```
apps/web/
├── index.html                    # Vite entry HTML
├── vite.config.ts                # Vite config (proxy, path aliases)
├── tailwind.config.ts            # Tailwind colour palette + plugins
├── tsconfig.json                 # TypeScript config (extends base)
├── playwright.config.ts          # Playwright E2E config
├── e2e/                          # Playwright test suites
│   ├── auth.spec.ts              # Login / registration flows
│   ├── bookmarks.spec.ts         # CRUD, batch, import/export
│   ├── navigation.spec.ts        # Routing and page load
│   └── helpers/
│       └── page-objects.ts       # Shared Playwright page objects
└── src/
    ├── main.tsx                  # React root mount + Axios store init
    ├── App.tsx                   # Router, lazy page loading, guards
    ├── globals.css               # Tailwind directives + CSS variables
    ├── vite-env.d.ts             # Vite env type shims
    ├── test-setup.ts             # Vitest global setup (Testing Library)
    ├── api/
    │   └── client.ts             # Axios instance + 401 interceptor with refresh queue
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives (Button, Input, etc.)
    │   ├── layout/               # AppShell, Sidebar, TopNav
    │   ├── bookmarks/
    │   │   ├── BookmarkCard.tsx
    │   │   ├── AddBookmarkModal.tsx
    │   │   ├── EditBookmarkModal.tsx
    │   │   ├── BatchActionBar.tsx
    │   │   ├── FilterPanel.tsx
    │   │   ├── LinkStatusDot.tsx
    │   │   └── PermanentCopyViewer.tsx
    │   ├── collections/
    │   │   ├── CollectionTree.tsx
    │   │   └── CollectionModal.tsx
    │   └── common/
    │       ├── ErrorBoundary.tsx
    │       ├── EmptyState.tsx
    │       ├── LoadingSpinner.tsx
    │       └── ConfirmDialog.tsx
    ├── hooks/
    │   ├── useBookmarks.ts
    │   ├── useCollections.ts
    │   ├── useTags.ts
    │   └── useDebounce.ts
    ├── pages/
    │   ├── DashboardPage.tsx     # Virtualised bookmark grid/list/compact
    │   ├── BookmarkDetailPage.tsx # Detail, permanent copy, annotations
    │   ├── SearchPage.tsx        # FTS with filter panel
    │   ├── TagManagementPage.tsx # CRUD + merge tags
    │   ├── ImportExportPage.tsx  # Import HTML, export HTML/JSON
    │   ├── SettingsPage.tsx      # Profile, preferences, data management
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   └── ResetPasswordPage.tsx
    │   └── NotFoundPage.tsx
    ├── stores/
    │   ├── authStore.ts          # JWT tokens, user; persisted to sessionStorage
    │   ├── bookmarksStore.ts     # Bookmark list, cursor pagination, selected IDs
    │   ├── collectionsStore.ts   # Hierarchical tree, active collection
    │   ├── searchStore.ts        # Current query, filters, results
    │   ├── tagsStore.ts          # Tag list
    │   └── uiStore.ts            # Theme, viewMode, modals open state
    └── utils/
        └── cn.ts                 # clsx + tailwind-merge helper
```

---

## Component Library

Mind Palace uses **shadcn/ui** components, installed individually into `src/components/ui/`.
They are built on **Radix UI** primitives with **Tailwind CSS** styling.

Custom components follow this convention:

- Props typed with explicit TypeScript interfaces.
- Forwarded refs where the underlying element needs ref access.
- ARIA attributes set correctly on all interactive elements.
- `data-testid` attributes on key interactive elements for test targeting.

### Key composite components

| Component             | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `CollectionTree`      | Recursive sidebar tree with keyboard navigation            |
| `BookmarkCard`        | Grid/List/Compact variants; hover actions; link status dot |
| `PermanentCopyViewer` | Reader-mode view with text selection → annotation creation |
| `FilterPanel`         | Multi-facet filter sheet (tags, date, domain, link status) |
| `BatchActionBar`      | Fixed bottom bar shown when ≥1 bookmark is selected        |
| `AddBookmarkModal`    | URL input → metadata fetch → duplicate check → form submit |

---

## State Management

All global state is managed with **Zustand 4**.

| Store              | Persistence      | Contents                                                   |
| ------------------ | ---------------- | ---------------------------------------------------------- |
| `authStore`        | `sessionStorage` | `user`, `accessToken`, `refreshToken`, `isAuthenticated`   |
| `bookmarksStore`   | None             | `bookmarks`, `cursor`, `hasMore`, `selectedIds`, `filters` |
| `collectionsStore` | None             | `collections` (flat array), `tree` (built client-side)     |
| `searchStore`      | None             | `query`, `filters`, `results`, `isSearching`               |
| `tagsStore`        | None             | `tags` (flat array with counts)                            |
| `uiStore`          | `localStorage`   | `theme`, `viewMode`, modal open/close states               |

### Axios interceptor — token refresh

`api/client.ts` intercepts `401 Unauthorized` responses and:

1. Pauses all concurrent requests into a queue.
2. Calls `POST /api/auth/refresh` with the stored refresh token.
3. On success, replays all queued requests with the new access token.
4. On failure, calls `authStore._forceLogout()` and redirects to `/login`.

---

## Testing

### Unit / Component tests (Vitest + Testing Library)

```bash
pnpm --filter web run test
```

Tests are co-located with source files or in `src/**/__tests__/`.  
They use `@testing-library/react` with `jsdom` environment and `msw` for API mocking.

| Suite            |  Tests | Coverage focus                               |
| ---------------- | -----: | -------------------------------------------- |
| ImportExportPage |     10 | File input, import progress, export download |
| NoteCard         |     10 | Create, edit, delete annotation note         |
| SettingsPage     |     10 | Profile update, theme switching              |
| **Total**        | **30** |                                              |

### End-to-end tests (Playwright)

```bash
# Requires running API + seeded database
pnpm --filter web run test:e2e
```

43 Playwright tests across 3 specification files:

| Suite                | Tests | Scenarios                                          |
| -------------------- | ----: | -------------------------------------------------- |
| `auth.spec.ts`       |    15 | Register, login, logout, forgot/reset password     |
| `bookmarks.spec.ts`  |    18 | Add, edit, delete, batch operations, import/export |
| `navigation.spec.ts` |    10 | Page loads, routing, 404, protected routes         |

---

## Accessibility

Mind Palace is built to **WCAG 2.1 AA** compliance:

- **Skip link** (`Skip to main content`) present on all pages; visible on keyboard focus.
- **Color contrast** — all text/background pairs verified ≥ 4.5:1 (AA) via Tailwind palette.
- **Focus management** — modals trap focus and restore focus to the trigger on close.
- **ARIA** — `aria-invalid` + `aria-describedby` on all form inputs with validation errors.
- **Semantic HTML** — landmark elements (`<main>`, `<nav>`, `<aside>`, `<header>`) used
  throughout; headings follow a logical `h1 → h2 → h3` hierarchy.
- **Keyboard navigation** — entire application usable without a mouse; see
  [Keyboard Shortcuts](../../docs/USER_MANUAL.md#13-keyboard-shortcuts) in the User Manual.
- **Screen reader tested** — verified with NVDA (Windows) and VoiceOver (macOS).
