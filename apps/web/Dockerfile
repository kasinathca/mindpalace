# ──────────────────────────────────────────────────────────────────────────────
# apps/web/Dockerfile — Two-stage build: Vite SPA → nginx static server
# Build context: repository root (pnpm workspace)
#
# Usage (from repo root):
#   docker build -f apps/web/Dockerfile -t mindpalace-web:latest .
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first to maximise layer cache hits on re-builds.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/

# Install all workspace dependencies.
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source files.
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Build the Vite SPA (outputs to apps/web/dist).
RUN pnpm --filter @mindpalace/web run build

# ── Stage 2: nginx static server ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config.
RUN rm /etc/nginx/conf.d/default.conf

# Copy SPA routing config.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets.
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
