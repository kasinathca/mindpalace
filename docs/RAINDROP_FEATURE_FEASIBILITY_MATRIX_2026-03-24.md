# Raindrop Feature Feasibility Matrix (2026-03-24)

Source of truth: [./specs/raindrop/raindrop_master_spec.yaml](./specs/raindrop/raindrop_master_spec.yaml)
Constraint model: moderate refactors allowed, major redesign out of scope.

Status legend:
- Implemented: available end-to-end or near end-to-end in current codebase.
- Partial: meaningful foundation exists but key capability gaps remain.
- Missing: no meaningful implementation yet.
- Not-fit: outside current repository scope (for example browser extension-only features).

Effort legend:
- S: small incremental work
- M: moderate work touching 1-2 layers
- L: larger work touching 3-4 layers
- XL: major cross-cutting program

## Category Summary

| Category | Implemented | Partial | Missing | Not-fit | Total |
|---|---:|---:|---:|---:|---:|
| Search and discovery | 2 | 1 | 2 | 0 | 5 |
| Bookmark management | 4 | 2 | 0 | 0 | 6 |
| Organization | 1 | 2 | 1 | 0 | 4 |
| Highlights and annotations | 1 | 2 | 0 | 0 | 3 |
| Reminders | 0 | 0 | 1 | 0 | 1 |
| Files and uploads | 0 | 1 | 2 | 0 | 3 |
| Backup and recovery | 0 | 1 | 3 | 0 | 4 |
| Import and export | 0 | 3 | 0 | 0 | 3 |
| Collaboration and sharing | 0 | 1 | 1 | 0 | 2 |
| Browser extension suite | 0 | 0 | 0 | 6 | 6 |
| AI assistant and MCP | 0 | 0 | 3 | 0 | 3 |
| Account, billing, security | 1 | 1 | 4 | 0 | 6 |
| Integrations | 0 | 1 | 4 | 0 | 5 |
| Total | 9 | 15 | 21 | 6 | 51 |

## Feature-by-Feature Mapping

### Search and discovery

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.search.basic | Implemented | S | api, schema, ui | [apps/api/src/modules/search/search.service.ts](../apps/api/src/modules/search/search.service.ts), [apps/web/src/pages/SearchPage.tsx](../apps/web/src/pages/SearchPage.tsx) |
| feat.search.full_text | Partial | M | workers, indexing state UI | [apps/api/prisma/migrations/20260222100000_fts_trigger/migration.sql](../apps/api/prisma/migrations/20260222100000_fts_trigger/migration.sql), [apps/api/src/modules/search/search.service.ts](../apps/api/src/modules/search/search.service.ts) |
| feat.search.operators | Implemented | M | operator UX surfacing | [apps/api/src/modules/search/search.schemas.ts](../apps/api/src/modules/search/search.schemas.ts), [apps/api/src/modules/search/search.router.ts](../apps/api/src/modules/search/search.router.ts) |
| feat.search.recent | Missing | M | schema, store, sync | no current entity/endpoints |
| feat.search.semantic | Missing | XL | embeddings, ranking infra | no current semantic stack |

### Bookmark management

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.bookmark.create | Implemented | S | api + UI capture flow | [apps/api/src/modules/bookmarks/bookmarks.controller.ts](../apps/api/src/modules/bookmarks/bookmarks.controller.ts), [apps/web/src/components/bookmarks/AddBookmarkModal.tsx](../apps/web/src/components/bookmarks/AddBookmarkModal.tsx) |
| feat.bookmark.edit | Implemented | S | api + UI edit form | [apps/api/src/modules/bookmarks/bookmarks.service.ts](../apps/api/src/modules/bookmarks/bookmarks.service.ts), [apps/web/src/components/bookmarks/EditBookmarkModal.tsx](../apps/web/src/components/bookmarks/EditBookmarkModal.tsx) |
| feat.bookmark.bulk | Implemented | S | batch actions UI/API | [apps/api/src/modules/bookmarks/bookmarks.controller.ts](../apps/api/src/modules/bookmarks/bookmarks.controller.ts), [apps/web/src/components/bookmarks/BatchActionBar.tsx](../apps/web/src/components/bookmarks/BatchActionBar.tsx) |
| feat.bookmark.preview | Partial | M | preview refresh and richer modes | [apps/web/src/components/bookmarks/PermanentCopyViewer.tsx](../apps/web/src/components/bookmarks/PermanentCopyViewer.tsx), [apps/api/src/lib/archiver.ts](../apps/api/src/lib/archiver.ts) |
| feat.bookmark.duplicates | Implemented | M | cleanup UX | [apps/api/src/modules/search/search.router.ts](../apps/api/src/modules/search/search.router.ts), [apps/api/src/modules/search/search.service.ts](../apps/api/src/modules/search/search.service.ts) |
| feat.bookmark.broken_links | Implemented | M | cleanup UX | [apps/api/src/workers/linkhealth.worker.ts](../apps/api/src/workers/linkhealth.worker.ts), [apps/web/src/components/bookmarks/BookmarkCard.tsx](../apps/web/src/components/bookmarks/BookmarkCard.tsx) |

### Organization

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.collections.nested | Partial | M | drag/drop UX, reorder UX | [apps/api/src/modules/collections/collections.service.ts](../apps/api/src/modules/collections/collections.service.ts), [apps/web/src/components/collections/CollectionTree.tsx](../apps/web/src/components/collections/CollectionTree.tsx) |
| feat.tags.system | Implemented | S | none major | [apps/api/src/modules/tags/tags.service.ts](../apps/api/src/modules/tags/tags.service.ts), [apps/web/src/pages/TagManagementPage.tsx](../apps/web/src/pages/TagManagementPage.tsx) |
| feat.sorting_and_views | Partial | M | additional view modes | [apps/web/src/pages/DashboardPage.tsx](../apps/web/src/pages/DashboardPage.tsx) |
| feat.ai_suggestions | Missing | XL | AI service + feedback loop | no current AI suggestion module |

### Highlights and annotations

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.highlights.web | Partial | M | selection UX polish | [apps/api/src/modules/annotations/annotations.service.ts](../apps/api/src/modules/annotations/annotations.service.ts), [apps/web/src/components/bookmarks/AnnotationToolbar.tsx](../apps/web/src/components/bookmarks/AnnotationToolbar.tsx) |
| feat.highlights.pdf | Partial | L | pdf-native annotation support | [apps/api/src/lib/archiver.ts](../apps/api/src/lib/archiver.ts) |
| feat.highlights.notes | Implemented | S | none major | [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma), [apps/web/src/pages/BookmarkDetailPage.tsx](../apps/web/src/pages/BookmarkDetailPage.tsx) |

### Reminders

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.reminders.bookmark | Missing | L | new schema, worker, notifications, UI | no reminder entity or flow currently |

### Files and uploads

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.files.upload | Partial | L | file entity, storage quotas | [apps/api/src/lib/archiver.ts](../apps/api/src/lib/archiver.ts) (content persistence exists, not file upload product flow) |
| feat.files.search | Missing | M | indexed file pipeline | no dedicated file-search feature |
| feat.files.pro_limits | Missing | M | billing + quota model | no subscription/quota model |

### Backup and recovery

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.backup.manual | Missing | M | backup snapshot pipeline | no explicit backup endpoint/job |
| feat.backup.auto | Missing | L | cloud connectors + scheduler | no provider integration |
| feat.backup.restore | Partial | M | structured restore path | [apps/api/src/modules/bookmarks/bookmarks.controller.ts](../apps/api/src/modules/bookmarks/bookmarks.controller.ts) (import foundation exists) |
| feat.backup.retention | Missing | S | backup metadata + retention policy | no backup metadata model |

### Import and export

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.import.multi_source | Partial | S | more file formats | [apps/api/src/lib/importer.ts](../apps/api/src/lib/importer.ts) |
| feat.export.collection_or_all | Partial | S | scoped export selector | [apps/api/src/modules/bookmarks/bookmarks.service.ts](../apps/api/src/modules/bookmarks/bookmarks.service.ts), [apps/web/src/pages/ImportExportPage.tsx](../apps/web/src/pages/ImportExportPage.tsx) |
| feat.export.formats | Partial | S | CSV formatter | [apps/api/src/modules/bookmarks/bookmarks.service.ts](../apps/api/src/modules/bookmarks/bookmarks.service.ts) |

### Collaboration and sharing

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.collab.shared_collections | Missing | L | collaborator model, invites, permissions | no collaborator/invite module present |
| feat.public_page | Partial | M | public endpoints + UI routing | [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma) (public flags exist), no full public page pipeline |

### Browser extension suite

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.extension.toolbar_save | Not-fit | N/A | separate extension repo | no extension code in this monorepo |
| feat.extension.sidebar | Not-fit | N/A | separate extension repo | no extension code in this monorepo |
| feat.extension.context_actions | Not-fit | N/A | separate extension repo | no extension code in this monorepo |
| feat.extension.save_tabs | Not-fit | N/A | separate extension repo | no extension code in this monorepo |
| feat.extension.omnibox | Not-fit | N/A | separate extension repo | no extension code in this monorepo |
| feat.extension.saved_indicator | Not-fit | N/A | separate extension repo | no extension code in this monorepo |

### AI assistant and MCP

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.ai_assistant.stella | Missing | XL | LLM orchestration, privacy model, UI | no assistant service in api/web |
| feat.ai_privacy_model | Missing | XL | infra and compliance controls | no AI execution infra currently |
| feat.mcp.integration | Missing | L | MCP server module + auth + query tools | no MCP server module present |

### Account, billing, security

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.account.profile | Implemented | S | none major | [apps/api/src/modules/auth/auth.service.ts](../apps/api/src/modules/auth/auth.service.ts), [apps/web/src/pages/SettingsPage.tsx](../apps/web/src/pages/SettingsPage.tsx) |
| feat.account.login_providers | Missing | M | oauth providers + linking | no oauth flow implemented |
| feat.account.2fa | Missing | M | totp schema + verification UX | no 2FA model/endpoints |
| feat.billing.pro | Missing | L | subscription and billing system | no billing module or tier enforcement |
| feat.billing.refund | Missing | M | transaction/refund lifecycle | no transaction model |
| feat.security.infrastructure | Partial | M | deployment hardening and regional policy | [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md), runtime middleware in [apps/api/src/app.ts](../apps/api/src/app.ts) |

### Integrations

| Feature ID | Status | Effort | Key Dependencies | Evidence |
|---|---|---|---|---|
| feat.api.public | Partial | M | api keys/oauth and partner docs | API exists in app, partner-grade auth/governance incomplete |
| feat.automation.ifttt | Missing | M | webhook contracts | no IFTTT integration |
| feat.automation.n8n | Missing | L | node/app integration | no n8n integration |
| feat.automation.make | Missing | M | webhook contracts | no Make integration |
| feat.automation.coda | Missing | L | pack/app integration | no Coda integration |

## Priority Implementation Waves

### Wave 1 (high leverage, lower risk)
1. Search recent history, scoped export improvements, CSV export.
2. Duplicate and broken-link cleanup UX.
3. Cursor-based search pagination and polling hardening.
4. Shutdown hardening (Prisma/Redis/BullMQ graceful stop).

### Wave 2 (product completeness core)
1. Reminders vertical slice (schema, API, worker, UI).
2. Collaboration basics (invite + shared collection permission model).
3. Public collection pages (read-only public route + slugging).
4. Account security uplift (2FA).

### Wave 3 (platform and commercial expansion)
1. Billing/tier enforcement and quota controls.
2. Backup automation and restore model.
3. Integration connectors (IFTTT/Make/n8n/Coda).

### Wave 4 (advanced differentiation)
1. AI assistant and semantic search.
2. MCP integration.
3. Browser extension suite (separate repo/program).

## Launch Readiness Notes

- Immediate launch blockers for full Raindrop parity are collaboration, reminders, billing tiers, and integrations.
- Current architecture can absorb most missing features with moderate refactors by adding focused modules and schema changes.
- Browser extension features are explicitly out of current repository scope and should be tracked as a parallel product track.
