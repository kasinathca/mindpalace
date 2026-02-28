# Mind Palace — Deployment & Operations Guide

**Version:** 1.0  
**Date:** February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start with Docker Compose](#3-quick-start-with-docker-compose)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Database Setup and Migrations](#5-database-setup-and-migrations)
6. [Running in Production](#6-running-in-production)
7. [Security Hardening Checklist](#7-security-hardening-checklist)
8. [Monitoring and Logging](#8-monitoring-and-logging)
9. [Backup and Restore](#9-backup-and-restore)
10. [Scaling Considerations](#10-scaling-considerations)
11. [Upgrading](#11-upgrading)

---

## 1. Architecture Overview

```
                     ┌─────────────────┐
                     │   Browser / CDN  │
                     └────────┬─────────┘
                              │ HTTPS
                     ┌────────▼─────────┐
                     │  Reverse Proxy   │
                     │  (nginx / Caddy) │
                     └────────┬─────────┘
                 ┌────────────┴────────────┐
                 │                         │
        ┌────────▼────────┐      ┌─────────▼────────┐
        │  API Server     │      │  Web (SPA / CDN) │
        │  apps/api       │      │  apps/web (static)│
        │  Port 3000      │      └──────────────────┘
        └────────┬────────┘
         ┌───────┴───────┐
         │               │
┌────────▼──────┐ ┌──────▼───────┐
│ PostgreSQL 16 │ │  Redis 7     │
│ Port 5432     │ │  Port 6379   │
└───────────────┘ └──────────────┘
         │
┌────────▼──────────┐
│  Worker Process   │
│  (BullMQ workers) │
│  apps/api worker  │
└───────────────────┘
```

**Components:**

| Component      | Technology         | Purpose                                                 |
| -------------- | ------------------ | ------------------------------------------------------- |
| API Server     | Express 5, Node 20 | REST API, authentication, business logic                |
| Web Frontend   | React 18, Vite     | Single-page application (served as static files)        |
| Database       | PostgreSQL 16      | Primary data store; full-text search via tsvector       |
| Cache / Queue  | Redis 7            | HTTP response cache, BullMQ job broker                  |
| Worker Process | BullMQ 5           | Background metadata fetch, archival, link-health checks |

---

## 2. Prerequisites

### Runtime

| Dependency     | Minimum Version | Notes                               |
| -------------- | --------------- | ----------------------------------- |
| Node.js        | 20 LTS          | `node --version`                    |
| pnpm           | 9.x             | `npm install -g pnpm@9`             |
| PostgreSQL     | 16              | Required for `websearch_to_tsquery` |
| Redis          | 7               | Required for BullMQ and caching     |
| Docker         | 24 (optional)   | Only required for Docker Compose    |
| Docker Compose | 2.x (optional)  | For containerised deployment        |

### Build

```
node >= 20
pnpm >= 9
```

---

## 3. Quick Start with Docker Compose

### 3.1 Clone and configure

```bash
git clone https://github.com/your-org/mind-palace.git
cd mind-palace
cp .env.example .env
```

Edit `.env` — at minimum, set the secrets marked **REQUIRED** in
[Section 4](#4-environment-variables-reference).

### 3.2 Start all services

```bash
docker compose up -d
```

This starts:

- `postgres` — PostgreSQL 16 on `localhost:5432`
- `redis` — Redis 7 on `localhost:6379`
- `api` — API server on `localhost:3000`
- `worker` — BullMQ worker (same image, different CMD)
- `web` — Vite preview / static file server on `localhost:5173`

### 3.3 Apply database migrations

```bash
docker compose exec api pnpm --filter api run db:migrate
```

### 3.4 (Optional) Seed development data

```bash
docker compose exec api pnpm --filter api run db:seed
```

### 3.5 Access the application

| URL                              | Description  |
| -------------------------------- | ------------ |
| `http://localhost:5173`          | Web frontend |
| `http://localhost:3000/api`      | API base     |
| `http://localhost:3000/api/docs` | Swagger UI   |

---

## 4. Environment Variables Reference

Create a `.env` file in the project root. The API reads it via `dotenv`.

### Mandatory (application will refuse to start without these)

| Variable             | Example                                          | Description                          |
| -------------------- | ------------------------------------------------ | ------------------------------------ |
| `DATABASE_URL`       | `postgresql://mp:pass@localhost:5432/mindpalace` | Prisma connection string             |
| `REDIS_URL`          | `redis://localhost:6379`                         | IORedis connection URL               |
| `JWT_ACCESS_SECRET`  | _(32+ char random string)_                       | HS256 signing key for access tokens  |
| `JWT_REFRESH_SECRET` | _(32+ char random string)_                       | HS256 signing key for refresh tokens |
| `SMTP_HOST`          | `smtp.sendgrid.net`                              | SMTP server hostname                 |
| `SMTP_PORT`          | `587`                                            | SMTP port                            |
| `SMTP_USER`          | `apikey`                                         | SMTP authentication username         |
| `SMTP_PASS`          | _(your SMTP password)_                           | SMTP authentication password         |
| `SMTP_FROM`          | `"Mind Palace <noreply@example.com>"`            | From address for emails              |

### Optional (defaults shown)

| Variable               | Default                 | Description                                           |
| ---------------------- | ----------------------- | ----------------------------------------------------- |
| `NODE_ENV`             | `development`           | `production` disables pretty-print logs               |
| `PORT`                 | `3000`                  | TCP port the API listens on                           |
| `CORS_ORIGIN`          | `http://localhost:5173` | Allowed CORS origin(s); comma-separated for multiple  |
| `JWT_ACCESS_EXPIRES`   | `15m`                   | Access token lifetime (ms-compatible string)          |
| `JWT_REFRESH_EXPIRES`  | `7d`                    | Refresh token lifetime                                |
| `BCRYPT_ROUNDS`        | `12`                    | bcrypt work factor; increase cautiously               |
| `RATE_LIMIT_WINDOW_MS` | `900000`                | Rate limit window in milliseconds (default 15 min)    |
| `RATE_LIMIT_MAX`       | `100`                   | Max requests per window per IP                        |
| `API_BASE_URL`         | `http://localhost:3000` | Used for email links (password reset URL)             |
| `LOG_LEVEL`            | `info`                  | pino log level: `trace`/`debug`/`info`/`warn`/`error` |

### Generating secrets

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run this twice to generate distinct values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

## 5. Database Setup and Migrations

### 5.1 First-time setup

```bash
# Apply all migrations
pnpm --filter api run db:migrate

# Verify migration status
pnpm --filter api exec prisma migrate status
```

### 5.2 Migration on new deployments

Mind Palace uses **Prisma Migrate** — each deployment should run:

```bash
pnpm --filter api exec prisma migrate deploy
```

`migrate deploy` applies only pending migrations (safe for production; does not reset data).

### 5.3 Migration summary

| Migration                    | Description                               |
| ---------------------------- | ----------------------------------------- |
| `20260222092414_init`        | Full schema (all tables, enums, FKs)      |
| `20260222100000_fts_trigger` | PL/pgSQL trigger for tsvector auto-update |
| `20260228063818_`            | Additional indexes                        |

### 5.4 Full-text search trigger

The tsvector trigger (installed by migration `20260222100000_fts_trigger`) runs on every
`INSERT` and `UPDATE` to the `Bookmark` table. It re-computes the `search_vector` column from
the `title`, `description`, and `notes` fields using `to_tsvector('english', ...)`.

If you ever find FTS results stale, reindex manually:

```sql
UPDATE "Bookmark"
SET search_vector = to_tsvector('english',
  coalesce(title,'') || ' ' ||
  coalesce(description,'') || ' ' ||
  coalesce(notes,''));
```

---

## 6. Running in Production

### 6.1 Build

```bash
pnpm install --frozen-lockfile
pnpm run build          # builds apps/api (tsc) and apps/web (vite build)
```

### 6.2 Start the API server

```bash
NODE_ENV=production node apps/api/dist/index.js
```

### 6.3 Start the worker process

The worker must run as a **separate process** to handle BullMQ job concurrency correctly:

```bash
NODE_ENV=production node apps/api/dist/workers/worker.js
```

Use a process manager (PM2, systemd, or Docker) to keep both processes alive.

### 6.4 Serve the web frontend

After `pnpm run build`, the web SPA is output to `apps/web/dist/`. Serve this directory as
static files via nginx, Caddy, or a CDN.

**Example nginx configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name mindpalace.example.com;

    root /var/www/mindpalace/apps/web/dist;
    index index.html;

    # SPA fallback — all paths served by index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    ssl_certificate     /etc/ssl/certs/mindpalace.crt;
    ssl_certificate_key /etc/ssl/private/mindpalace.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
}
```

### 6.5 PM2 process management (optional)

```bash
npm install -g pm2

pm2 start ecosystem.config.js
pm2 save
pm2 startup        # enable auto-start on reboot
```

**`ecosystem.config.js`:**

```js
module.exports = {
  apps: [
    {
      name: 'mindpalace-api',
      script: 'apps/api/dist/index.js',
      env: { NODE_ENV: 'production' },
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'mindpalace-worker',
      script: 'apps/api/dist/workers/worker.js',
      env: { NODE_ENV: 'production' },
      instances: 1,
    },
  ],
};
```

---

## 7. Security Hardening Checklist

Perform all checks before exposing the application publicly.

### Secrets

- [ ] `JWT_ACCESS_SECRET` is at least 32 random characters, unique to this deployment.
- [ ] `JWT_REFRESH_SECRET` is at least 32 random characters, different from `JWT_ACCESS_SECRET`.
- [ ] SMTP credentials are scoped to the minimum required permissions.
- [ ] `.env` is **not** committed to version control (confirmed in `.gitignore`).

### Network

- [ ] PostgreSQL is **not** accessible from the public internet; bind to `localhost` or private
      network only.
- [ ] Redis is **not** accessible from the public internet; use `bind 127.0.0.1` in
      `redis.conf`.
- [ ] API server runs behind a reverse proxy; direct port `3000` is firewalled.
- [ ] HTTPS is enforced (`ssl_redirect on` or equivalent).
- [ ] HSTS header is present (`max-age=31536000`).

### Application

- [ ] `NODE_ENV=production` is set (disables Swagger UI stack traces and pretty logs).
- [ ] `CORS_ORIGIN` is set to the exact production domain (not `*`).
- [ ] `BCRYPT_ROUNDS` is at least `12`.
- [ ] Rate limiting is verified working: `curl -s -o /dev/null -w "%{http_code}\n"` on `/api/auth/login` 21 times in quick succession should yield `429` on the 21st request.
- [ ] Helmet CSP headers are present on all API responses.

### Database

- [ ] PostgreSQL user has only `CONNECT`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the
      application database — not `SUPERUSER` or `CREATEDB`.
- [ ] `pg_hba.conf` restricts access to the application server IP only.

---

## 8. Monitoring and Logging

### Structured JSON logs

In `NODE_ENV=production`, all logs are emitted as newline-delimited JSON (via **pino**). Pipe
to a log aggregator (Loki, Elasticsearch, Splunk):

```bash
node apps/api/dist/index.js | pino-pretty   # human-readable in dev
node apps/api/dist/index.js >> /var/log/mindpalace/api.log  # raw JSON in prod
```

**Log levels by environment:**

| Environment | Level   | Content                                   |
| ----------- | ------- | ----------------------------------------- |
| development | `debug` | All requests, worker jobs, DB queries     |
| production  | `info`  | HTTP requests, errors, worker completions |

**Sensitive fields redacted** in request logs:

- `req.headers.authorization`
- `req.body.password`
- `req.body.currentPassword`
- `req.body.newPassword`

### Health endpoint

```
GET /api/health
```

Returns `200 OK` when the API can accept requests.

### BullMQ job monitoring

Use **Bull Board** (or any BullMQ-compatible dashboard) to inspect queues:

| Queue name    | Job types                     |
| ------------- | ----------------------------- |
| `metadata`    | Auto-fetch page title/OG tags |
| `archive`     | Capture permanent copy        |
| `link-health` | HEAD/GET URL health check     |

---

## 9. Backup and Restore

### 9.1 Database backup

```bash
# Plain SQL backup
pg_dump -U mindpalace_user -d mindpalace -F plain -f backup_$(date +%F).sql

# Custom format (compressed, faster restore)
pg_dump -U mindpalace_user -d mindpalace -F custom -f backup_$(date +%F).dump
```

Schedule with cron (daily at 3 AM, keep 30 days):

```cron
0 3 * * *  pg_dump -U mindpalace_user -d mindpalace -F custom \
-f /backups/mindpalace_$(date +\%F).dump && \
find /backups -name "mindpalace_*.dump" -mtime +30 -delete
```

### 9.2 Database restore

```bash
# Plain SQL
psql -U mindpalace_user -d mindpalace < backup_2026-02-22.sql

# Custom format
pg_restore -U mindpalace_user -d mindpalace -F custom backup_2026-02-22.dump
```

### 9.3 What is not stored in the database

**Permanent copies** (archived HTML) are stored in the database as TEXT in the
`PermanentCopy.content` column. No separate file storage is required.

---

## 10. Scaling Considerations

| Bottleneck                   | Mitigation                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High concurrent API traffic  | Add API server instances (PM2 cluster or multiple Docker containers) behind a load balancer. All state is in PostgreSQL + Redis so all instances are stateless. |
| Worker throughput            | Run multiple worker processes; BullMQ distributes jobs automatically across consumers.                                                                          |
| Database connections         | Enable PgBouncer in front of PostgreSQL to pool connections. Set `DATABASE_URL` to point to the pooler.                                                         |
| Redis memory                 | Set `maxmemory-policy allkeys-lru` in `redis.conf` to evict old cache entries automatically.                                                                    |
| Full-text search performance | The GIN index on `search_vector` covers PostgreSQL FTS. For very large datasets (>1M rows), consider PG partitioning or dedicated search (e.g., Meilisearch).   |

---

## 11. Upgrading

### Routine version upgrade

```bash
git pull origin main
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter api exec prisma migrate deploy   # runs any new migrations
pm2 reload all     # zero-downtime reload
```

### Rollback

```bash
git checkout v<previous-version>
pnpm install --frozen-lockfile
pnpm run build
# Do NOT run migrate deploy if the new version had migrations not in the previous version
# Restore database from backup if needed
pm2 reload all
```

> **Important:** Prisma migrations are **forward-only** in production. If a migration needs to
> be reverted, restore from the pre-migration database backup rather than attempting a manual
> rollback migration.

---

_Mind Palace Deployment Guide — Version 1.0 — February 2026_
