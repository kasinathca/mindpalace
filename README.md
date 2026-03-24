# Mind Palace

> A web-based bookmark management and content preservation system.

Mind Palace lets you save, organise, search, and annotate every URL in your digital library — with automatic metadata extraction, nested collections, full-text search, link health monitoring, and permanent copy archival.

## Status

| Branch | CI                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main` | [![CI](https://github.com/kasinathca/mindpalace/actions/workflows/ci.yml/badge.svg)](https://github.com/kasinathca/mindpalace/actions/workflows/ci.yml) |

---

## Prerequisites

Install these tools **before** following any steps below.

| Tool               | Version | How to get it                                                      |
| ------------------ | ------- | ------------------------------------------------------------------ |
| **Node.js**        | v20 LTS | https://nodejs.org/en/download — choose "Windows Installer (.msi)" |
| **pnpm**           | v9.x    | After Node.js: open PowerShell → run `npm install -g pnpm`         |
| **Docker Desktop** | Latest  | https://www.docker.com/products/docker-desktop/                    |
| **Git**            | Latest  | https://git-scm.com/download/win _(already installed)_             |

Verify everything is ready:

```powershell
node --version     # Expected: v20.x.x
pnpm --version     # Expected: 9.x.x
docker --version   # Expected: Docker version 26.x.x or later
git --version      # Expected: git version 2.x.x
```

---

## Quick Start

```powershell
# 1. Clone the repository
git clone https://github.com/OWNER/mindpalace.git
cd mindpalace

# 2. Install all workspace dependencies (frontend + backend + shared — one command)
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Open .env in VS Code and fill in the required values (all are documented inside)

# 4. Start the database and cache (PostgreSQL + Redis via Docker)
docker-compose up -d postgres redis

# 5. Apply database migrations
pnpm --filter api run db:migrate

# 6. Seed development data (test users + sample bookmarks)
pnpm --filter api run db:seed

# 7. Start all development servers concurrently
pnpm run dev
```

| Service              | URL                            |
| -------------------- | ------------------------------ |
| **Frontend**         | http://localhost:5173          |
| **API**              | http://localhost:3000          |
| **Swagger API Docs** | http://localhost:3000/api/docs |

---

## Project Structure

This is a **pnpm monorepo** using workspaces.

```
mindpalace/
├── apps/
│   ├── api/              # Node.js + Express + TypeScript — REST API + background workers
│   └── web/              # React + TypeScript + Vite — browser frontend
├── packages/
│   └── shared/           # Shared TypeScript types (imported by both api and web)
├── ADR/                  # Architecture Decision Records — one file per major technical decision
└── .github/
    ├── workflows/        # GitHub Actions CI/CD pipelines
    └── PULL_REQUEST_TEMPLATE.md
```

For full architecture, database schema, API spec, sprint plan, and security details see:

- [mindpalace-development-plan.md](./docs/planning/mindpalace-development-plan.md)
- [STANDARDS.md](./STANDARDS.md) — binding engineering constitution for coding, reviews, and Copilot sessions

---

## Available Commands

Run these from the **repository root** unless otherwise noted.

| Command                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `pnpm run dev`          | Start API + Worker + Web concurrently in watch mode |
| `pnpm run build`        | Production build of all packages                    |
| `pnpm run lint`         | ESLint across all packages                          |
| `pnpm run type-check`   | TypeScript compiler check (no emit)                 |
| `pnpm run test`         | All tests — unit + integration                      |
| `pnpm run test:e2e`     | Playwright end-to-end tests                         |
| `pnpm run format`       | Prettier format all files                           |
| `pnpm run format:check` | Check formatting without writing                    |

---

## Environment Variables

Copy `.env.example` to `.env`. Every variable is documented with an inline comment inside that file.

The API validates all environment variables at startup via a Zod schema (`apps/api/src/config/env.ts`). If any required variable is missing or the wrong type, the server prints a clear error message and refuses to start.

---

## Architecture Decisions

Significant technical decisions are documented as Architecture Decision Records in [ADR/](./ADR/). Each record captures the context, the decision made, the alternatives considered, and the consequences.

---

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting pull requests. It covers:

- Branch naming conventions
- Commit message format (Conventional Commits)
- Pull request process
- Definition of Done checklist

---

## Team

| Name               | Student ID |
| ------------------ | ---------- |
| Kasinath C A       | 24MID0124  |
| Nicky Sheby        | 24MID0156  |
| Sree Sai Madhurima | 24MIC0078  |
| Balini             | 24MIC0026  |

**University:** Vellore Institute of Technology  
**Module:** CSI1007 — Software Engineering Principles

---

## License

MIT — see [LICENSE](./LICENSE).
