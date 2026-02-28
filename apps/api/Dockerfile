# ──────────────────────────────────────────────────────────────────────────────
# apps/api/Dockerfile — Two-stage production build
# Build context: repository root (pnpm workspace)
#
# Usage (from repo root):
#   docker build -f apps/api/Dockerfile -t mindpalace-api:latest .
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first to maximise layer cache hits on re-builds.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/

# Install all workspace dependencies (devDeps required for tsc compilation).
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source files.
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Generate Prisma client and compile TypeScript.
RUN pnpm --filter @mindpalace/api exec prisma generate
RUN pnpm --filter @mindpalace/api run build

# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Workspace manifests needed for production-only install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Production dependencies only (no devDeps).
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# Compiled TypeScript output.
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Prisma schema (required for migrate deploy) and generated client binaries.
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/index.js"]
