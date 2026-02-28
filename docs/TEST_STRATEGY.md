# Mind Palace — Comprehensive Test Strategy & Test Plan

> **Document ID:** MP-QA-001  
> **Revision:** 1.0  
> **Date:** 2026-02-28  
> **Author:** QA Engineering  
> **Standards Compliance:** IEEE 829-2008 · ISO/IEC 25010:2011

---

## Table of Contents

1. [System Under Test Overview](#1-system-under-test-overview)
2. [Test Plan Summary (IEEE 829 §6)](#2-test-plan-summary)
3. [Test Scenarios & Cases](#3-test-scenarios--cases)
4. [Automated Test Script Inventory](#4-automated-test-script-inventory)
5. [Security & Non-Functional Heuristics (ISO/IEC 25010)](#5-security--non-functional-heuristics)
6. [Coverage Matrix](#6-coverage-matrix)
7. [Entry / Exit Criteria](#7-entry--exit-criteria)

---

## 1. System Under Test Overview

| Attribute              | Detail                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Application**        | Mind Palace — knowledge / bookmark management platform                               |
| **Type**               | Web SPA (React + Vite) + REST API (Node.js/Express 5)                                |
| **Database**           | PostgreSQL 16 via Prisma ORM; full-text search tsvector                              |
| **Caching**            | Redis (ioredis) — collection tree cache, TTL 300 s                                   |
| **Background Workers** | BullMQ (metadata extraction, archiving, link-health checks)                          |
| **Auth Mechanism**     | JWT — short-lived access token (Bearer) + long-lived refresh token (httpOnly cookie) |
| **Test Frameworks**    | Vitest (unit + integration), Playwright (E2E)                                        |
| **Target Audience**    | Individual knowledge workers, students, researchers                                  |

### 1.1 Modules in Scope

| Module        | Description                                        | Risk Level   |
| ------------- | -------------------------------------------------- | ------------ |
| `auth`        | Registration, login, JWT lifecycle, password reset | **Critical** |
| `bookmarks`   | CRUD, batch ops, metadata queue, pagination        | **High**     |
| `collections` | Hierarchical tree (max depth 10), cache, IDOR      | **High**     |
| `tags`        | User-scoped labels, M:N junction, normalisation    | **Medium**   |
| `search`      | PostgreSQL FTS, tsquery sanitisation               | **High**     |
| `annotations` | Highlights / notes on permanent copies             | **Medium**   |

---

## 2. Test Plan Summary

### 2.1 Testing Types Required

| Testing Type         | Tooling                           | Scope                                                                  |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| **Unit**             | Vitest + vi.mock                  | All service functions with Prisma + Redis mocked out                   |
| **Integration**      | Vitest + Supertest + real test DB | Every HTTP route; request → DB → response                              |
| **End-to-End**       | Playwright                        | Critical user journeys: register → save bookmark → search → collection |
| **Security**         | Vitest (integration) + manual     | IDOR, JWT tampering, SQL injection, XSS, rate-limit, enumeration       |
| **Performance**      | k6 (`k6/load-test.js`)            | Sustained load at 50/100/200 VUs; p95 < 500 ms                         |
| **Boundary Value**   | Vitest unit                       | All `zod` schema limits and service-layer constants                    |
| **State Transition** | Vitest unit + integration         | Password reset token lifecycle; `linkStatus` transitions               |

### 2.2 Out of Scope

- Email delivery (mocked with `nodemailer`-stub)
- Third-party OAuth (not implemented in Phase 1)
- Infrastructure / Kubernetes deployment validation

### 2.3 Test Environments

| Environment | Description                                              |
| ----------- | -------------------------------------------------------- |
| `local`     | Developer machine; Docker Compose (`docker-compose.yml`) |
| `ci`        | GitHub Actions; isolated Postgres + Redis containers     |
| `staging`   | Mirrors production; used for E2E and load tests          |

---

## 3. Test Scenarios & Cases

> Notation: **EP** = Equivalence Partition, **BVA** = Boundary Value Analysis, **ST** = State Transition

---

### 3.1 Module: Authentication

#### 3.1.1 Registration (`POST /api/v1/auth/register`)

| TC ID        | Scenario                               | Pre-conditions                                             | Test Steps                                                | Expected Result                                                                  | Type      |
| ------------ | -------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | --------- |
| AUTH-REG-001 | Successful registration                | No existing user with email                                | POST `{email, password:"Password1", displayName:"Alice"}` | 201; `accessToken` + `refreshToken` present; `passwordHash` absent from response | Positive  |
| AUTH-REG-002 | Duplicate email                        | User already registered with same email (see AUTH-REG-001) | POST same payload                                         | 409; `success:false`; specific error message                                     | Negative  |
| AUTH-REG-003 | Password without uppercase (EP)        | None                                                       | POST `password:"password1"`                               | 422; `issues` array references password field                                    | Negative  |
| AUTH-REG-004 | Password without digit (EP)            | None                                                       | POST `password:"PasswordA"`                               | 422                                                                              | Negative  |
| AUTH-REG-005 | Password exactly 8 chars (BVA lower)   | None                                                       | POST `password:"Pass1234"`                                | 201                                                                              | BVA       |
| AUTH-REG-006 | Password exactly 7 chars (BVA under)   | None                                                       | POST `password:"Pass123"`                                 | 422                                                                              | BVA       |
| AUTH-REG-007 | Password exactly 128 chars (BVA upper) | None                                                       | POST 128-char password with upper+digit                   | 201                                                                              | BVA       |
| AUTH-REG-008 | Password 129 chars (BVA over)          | None                                                       | POST 129-char password                                    | 422                                                                              | BVA       |
| AUTH-REG-009 | Display name exactly 2 chars (BVA)     | None                                                       | POST `displayName:"AB"`                                   | 201                                                                              | BVA       |
| AUTH-REG-010 | Display name 1 char (BVA under)        | None                                                       | POST `displayName:"A"`                                    | 422                                                                              | BVA       |
| AUTH-REG-011 | Display name exactly 64 chars (BVA)    | None                                                       | POST `displayName:"A".repeat(64)`                         | 201                                                                              | BVA       |
| AUTH-REG-012 | Display name 65 chars (BVA over)       | None                                                       | POST `displayName:"A".repeat(65)`                         | 422                                                                              | BVA       |
| AUTH-REG-013 | Email is normalised to lowercase       | None                                                       | POST `email:"TEST@Example.COM"`                           | 201; stored email is `test@example.com`                                          | Edge Case |
| AUTH-REG-014 | Missing required fields                | None                                                       | POST `{}`                                                 | 422                                                                              | Negative  |
| AUTH-REG-015 | SQL injection attempt in displayName   | None                                                       | POST `displayName:"'; DROP TABLE users;--"`               | 201 (parameterised query — no injection)                                         | Security  |
| AUTH-REG-016 | XSS payload in displayName             | None                                                       | POST `displayName:"<script>alert(1)</script>"`            | 201; stored as literal text; never reflected as unescaped HTML                   | Security  |

#### 3.1.2 Login (`POST /api/v1/auth/login`)

| TC ID        | Scenario                 | Pre-conditions         | Test Steps                                                                | Expected Result                                                     | Type      |
| ------------ | ------------------------ | ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| AUTH-LGN-001 | Valid credentials        | Registered user exists | POST `{email, password}`                                                  | 200; `accessToken`; `user` payload without `passwordHash`           | Positive  |
| AUTH-LGN-002 | Wrong password           | Registered user exists | POST correct email, wrong password                                        | 401; **same error message** as unknown email (prevents enumeration) | Negative  |
| AUTH-LGN-003 | Unknown email            | None                   | POST unknown email                                                        | 401; `"Invalid email or password."`                                 | Negative  |
| AUTH-LGN-004 | Timing attack resistance | None                   | Measure response time for AUTH-LGN-002 vs AUTH-LGN-003; Δ must be < 50 ms | Constant-time path via dummy bcrypt compare fires                   | Security  |
| AUTH-LGN-005 | Empty password field     | None                   | POST `{email, password:""}`                                               | 422                                                                 | Negative  |
| AUTH-LGN-006 | Password as numeric type | None                   | POST body `{email, password:123}`                                         | 422; Zod coercion rejection                                         | Edge Case |

#### 3.1.3 Token Refresh (`POST /api/v1/auth/refresh`)

| TC ID        | Scenario                               | Pre-conditions                          | Test Steps                              | Expected Result                                  | Type             |
| ------------ | -------------------------------------- | --------------------------------------- | --------------------------------------- | ------------------------------------------------ | ---------------- |
| AUTH-REF-001 | Valid refresh token rotates tokens     | Logged-in user; refresh token in cookie | POST `/refresh` with valid cookie       | 200; new `accessToken` and `refreshToken` issued | Positive         |
| AUTH-REF-002 | Tampered refresh token                 | None                                    | POST `/refresh` with modified JWT       | 401                                              | Security         |
| AUTH-REF-003 | Expired refresh token (ST)             | Token TTL has passed                    | POST with expired token                 | 401                                              | State Transition |
| AUTH-REF-004 | Refresh token signed with wrong secret | None                                    | POST with token signed by different key | 401                                              | Security         |
| AUTH-REF-005 | No refresh token provided              | None                                    | POST with no cookie/body token          | 401                                              | Negative         |
| AUTH-REF-006 | Deleted user presents valid token      | User deleted after token issued         | POST valid token; user removed from DB  | 401                                              | Edge Case        |

#### 3.1.4 Password Reset Flow (State Transition)

```
[IDLE] --forgotPassword--> [TOKEN_CREATED] --resetPassword(valid)--> [TOKEN_USED]
                                           --resetPassword(expired)--> [ERROR]
                                           --resetPassword(used again)--> [ERROR]
                                           --forgotPassword again--> [OLD_TOKEN_DELETED, NEW_TOKEN_CREATED]
```

| TC ID       | Scenario                                       | Pre-conditions                | Test Steps                                    | Expected Result                                     | Type        |
| ----------- | ---------------------------------------------- | ----------------------------- | --------------------------------------------- | --------------------------------------------------- | ----------- |
| AUTH-PW-001 | Request reset for existing user                | User exists                   | POST `/forgot-password` `{email}`             | 200; email sent (spy); token record created in DB   | Positive    |
| AUTH-PW-002 | Request reset for non-existent email           | None                          | POST `/forgot-password` `{unknownEmail}`      | **200** (prevent enumeration); no email sent        | Security    |
| AUTH-PW-003 | Consume valid reset token (ST)                 | Valid token created < 1 h ago | POST `/reset-password` `{token, newPassword}` | 200; `usedAt` set; login with new password succeeds | ST-Positive |
| AUTH-PW-004 | Expired token rejected (ST)                    | Token `expiresAt` in past     | POST `/reset-password`                        | 400; `"invalid or has expired"`                     | ST-Negative |
| AUTH-PW-005 | Already-used token rejected (ST)               | AUTH-PW-003 already executed  | POST same token again                         | 400                                                 | ST-Negative |
| AUTH-PW-006 | Second forgot-password invalidates first token | Two forgot-password requests  | POST first token after second request         | 400 (`deleteMany` cleared first token)              | Edge Case   |
| AUTH-PW-007 | New password fails complexity rules            | Valid token                   | POST `{token, password:"weak"}`               | 422                                                 | Negative    |

#### 3.1.5 Profile Update (`PATCH /api/v1/auth/me`)

| TC ID       | Scenario                                   | Pre-conditions              | Test Steps                                     | Expected Result                                         | Type     |
| ----------- | ------------------------------------------ | --------------------------- | ---------------------------------------------- | ------------------------------------------------------- | -------- |
| AUTH-ME-001 | Update display name                        | Authenticated               | PATCH `{displayName:"New Name"}`               | 200; updated name returned                              | Positive |
| AUTH-ME-002 | Change email to available address          | Authenticated               | PATCH `{email:"new@example.com"}`              | 200; email updated                                      | Positive |
| AUTH-ME-003 | Change email to taken address              | Email taken by another user | PATCH `{email:"taken@example.com"}`            | 409                                                     | Negative |
| AUTH-ME-004 | Change password with correct current       | Authenticated               | PATCH `{currentPassword, newPassword}`         | 200; old token still valid; new password works on login | Positive |
| AUTH-ME-005 | Change password without currentPassword    | Authenticated               | PATCH `{newPassword}` (no `currentPassword`)   | 422; Zod refinement triggers                            | Negative |
| AUTH-ME-006 | Change password with wrong currentPassword | Authenticated               | PATCH `{currentPassword:"wrong", newPassword}` | 401                                                     | Negative |

---

### 3.2 Module: Bookmarks

#### 3.2.1 Create Bookmark (`POST /api/v1/bookmarks`)

| TC ID      | Scenario                           | Pre-conditions                                | Test Steps                                             | Expected Result                                             | Type            |
| ---------- | ---------------------------------- | --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | --------------- |
| BM-CRT-001 | Create with minimal valid input    | Authenticated                                 | POST `{url:"https://example.com"}`                     | 201; `title` defaults to hostname; `linkStatus:"UNCHECKED"` | Positive        |
| BM-CRT-002 | Create with full payload           | Authenticated; collection exists              | POST with all fields including tags, collectionId      | 201; all fields reflected; tags normalised to lowercase     | Positive        |
| BM-CRT-003 | URL without scheme (EP)            | Authenticated                                 | POST `{url:"example.com"}`                             | 422                                                         | Negative        |
| BM-CRT-004 | ftp:// URL (EP)                    | Authenticated                                 | POST `{url:"ftp://example.com/f"}`                     | 422                                                         | Negative        |
| BM-CRT-005 | URL exactly 2048 chars (BVA)       | Authenticated                                 | POST valid 2048-char URL                               | 201                                                         | BVA             |
| BM-CRT-006 | URL 2049 chars (BVA over)          | Authenticated                                 | POST 2049-char URL                                     | 422                                                         | BVA             |
| BM-CRT-007 | 20 tags (BVA upper limit)          | Authenticated                                 | POST with `tags` array of 20                           | 201                                                         | BVA             |
| BM-CRT-008 | 21 tags (BVA over)                 | Authenticated                                 | POST with `tags` array of 21                           | 422                                                         | BVA             |
| BM-CRT-009 | Tag normalisation                  | Authenticated                                 | POST `tags:["TypeScript","TYPESCRIPT"," typescript "]` | 201; deduplicated to single `typescript` tag in DB          | Edge Case       |
| BM-CRT-010 | Collection owned by another user   | UserA's collection ID, authenticated as UserB | POST with UserA's collectionId                         | 404                                                         | Security (IDOR) |
| BM-CRT-011 | No authentication                  | None                                          | POST without `Authorization` header                    | 401                                                         | Security        |
| BM-CRT-012 | Malformed JWT                      | None                                          | POST with `Authorization: Bearer invalid`              | 401                                                         | Security        |
| BM-CRT-013 | Notes at MAX (10 000 chars) (BVA)  | Authenticated                                 | POST `notes:"A".repeat(10000)`                         | 201                                                         | BVA             |
| BM-CRT-014 | Notes at MAX+1 (BVA)               | Authenticated                                 | POST `notes:"A".repeat(10001)`                         | 422                                                         | BVA             |
| BM-CRT-015 | Metadata + archive queues enqueued | Authenticated; BullMQ mocked                  | POST valid bookmark                                    | `metadataQueue.add` and `archiveQueue.add` each called once | Integration     |

#### 3.2.2 List Bookmarks (`GET /api/v1/bookmarks`)

| TC ID      | Scenario                                   | Pre-conditions                      | Test Steps                               | Expected Result                                 | Type     |
| ---------- | ------------------------------------------ | ----------------------------------- | ---------------------------------------- | ----------------------------------------------- | -------- |
| BM-LST-001 | Default pagination                         | 30 bookmarks created                | GET `/bookmarks`                         | 200; 24 items (default limit); `nextCursor` set | Positive |
| BM-LST-002 | Cursor-based second page                   | 30 bookmarks; first page fetched    | GET with `cursor` from first response    | 200; remaining 6 items; `nextCursor: null`      | Positive |
| BM-LST-003 | Filter by `isPinned=true`                  | Mix of pinned/unpinned              | GET `?isPinned=true`                     | Only pinned bookmarks returned                  | Positive |
| BM-LST-004 | Filter by `isFavourite=true`               | Mix                                 | GET `?isFavourite=true`                  | Only favourites                                 | Positive |
| BM-LST-005 | Filter by `isUnread=true`                  | Mix of read/unread                  | GET `?isUnread=true`                     | Only items where `readAt` is null               | Positive |
| BM-LST-006 | Filter by `linkStatus=BROKEN`              | Mix                                 | GET `?linkStatus=BROKEN`                 | Only broken links                               | Positive |
| BM-LST-007 | IDOR — cannot see another user's bookmarks | UserA and UserB both have bookmarks | Authenticated as UserA; GET `/bookmarks` | Zero results for UserB's bookmarks              | Security |
| BM-LST-008 | `limit` clamp at 100 (BVA)                 | Authenticated; 200 bookmarks        | GET `?limit=200`                         | Max 100 items returned                          | BVA      |
| BM-LST-009 | `limit=0` clamps to 1                      | Authenticated                       | GET `?limit=0`                           | 1 item returned                                 | BVA      |
| BM-LST-010 | Sort by `title asc`                        | 5 bookmarks with varied titles      | GET `?sortBy=title&sortOrder=asc`        | Alphabetical order confirmed                    | Positive |

#### 3.2.3 Update / Delete Bookmark

| TC ID      | Scenario                               | Pre-conditions                 | Test Steps                        | Expected Result                   | Type        |
| ---------- | -------------------------------------- | ------------------------------ | --------------------------------- | --------------------------------- | ----------- |
| BM-UPD-001 | Update title                           | Own bookmark                   | PATCH `{title:"New Title"}`       | 200; updated title                | Positive    |
| BM-UPD-002 | Mark as read (ST)                      | `readAt: null`                 | PATCH `{readAt: isoString}`       | 200; `readAt` set                 | ST-Positive |
| BM-UPD-003 | Mark as unread (ST)                    | `readAt` set                   | PATCH `{readAt: null}`            | 200; `readAt: null`               | ST-Positive |
| BM-UPD-004 | IDOR — update another user's bookmark  | UserB's bookmark ID            | PATCH as UserA                    | 404                               | Security    |
| BM-UPD-005 | Replace tags with empty array          | Bookmark has 3 tags            | PATCH `{tags:[]}`                 | 200; `tags:[]` in response        | Edge Case   |
| BM-DEL-001 | Delete own bookmark                    | Authenticated; bookmark exists | DELETE `/bookmarks/:id`           | 204                               | Positive    |
| BM-DEL-002 | IDOR — delete another user's bookmark  | UserB's bookmark               | DELETE as UserA                   | 404                               | Security    |
| BM-DEL-003 | Batch delete — all own IDs             | 3 own bookmarks                | DELETE `/bookmarks` `{ids:[...]}` | 204; count=3                      | Positive    |
| BM-DEL-004 | Batch delete — mixed own + foreign IDs | 2 own + 1 foreign              | DELETE `/bookmarks` with mix      | 204; only own 2 deleted (count=2) | Security    |
| BM-DEL-005 | Batch with 101 IDs (BVA over)          | Authenticated                  | DELETE with 101 IDs               | 422                               | BVA         |

---

### 3.3 Module: Collections

#### 3.3.1 Nesting Depth (Boundary Value Analysis on `MAX_NESTING_DEPTH = 10`)

| TC ID       | Scenario                                           | Pre-conditions                 | Test Steps                              | Expected Result                                         | Type      |
| ----------- | -------------------------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------------------- | --------- |
| COL-DEP-001 | Create at depth 0 (root)                           | Authenticated                  | POST no `parentId`                      | 201                                                     | Positive  |
| COL-DEP-002 | Create at depth 9 (BVA upper: last valid)          | 9-level ancestor chain exists  | POST with deepest allowed parent        | 201                                                     | BVA       |
| COL-DEP-003 | Create at depth 10 (BVA over: MAX_NESTING_DEPTH)   | 10-level ancestor chain exists | POST with depth-10 parent               | 400; `"cannot be nested more than 10 levels"`           | BVA       |
| COL-DEP-004 | Move collection creates circular reference to self | Collection exists              | PATCH `{parentId: ownId}`               | 400; `"cannot be its own parent"`                       | Edge Case |
| COL-DEP-005 | Move collection to its own descendant              | Parent/child collection pair   | PATCH parent to use child as new parent | 400; `"cannot move... into one of its own descendants"` | Edge Case |
| COL-DEP-006 | Move root collection under valid parent            | Two root collections           | PATCH `{parentId: otherRootId}`         | 200; `parentId` updated                                 | Positive  |

#### 3.3.2 Delete Collection

| TC ID       | Scenario                                              | Pre-conditions                     | Test Steps                                   | Expected Result                                             | Type     |
| ----------- | ----------------------------------------------------- | ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------- | -------- |
| COL-DEL-001 | Delete with `action=delete`                           | Collection with 3 bookmarks        | DELETE `?action=delete`                      | 204; bookmarks `collectionId` set to null (SetNull cascade) | Positive |
| COL-DEL-002 | Delete with `action=move` and valid target            | 2 collections; bookmarks in source | DELETE `?action=move&targetCollectionId=...` | 204; bookmarks moved to target                              | Positive |
| COL-DEL-003 | Delete with `action=move` but no `targetCollectionId` | Authenticated                      | DELETE `?action=move`                        | 400                                                         | Negative |
| COL-DEL-004 | Delete with `action=move` to foreign collection       | UserB's collection ID              | DELETE as UserA with UserB's targetId        | 404                                                         | Security |
| COL-DEL-005 | IDOR — delete another user's collection               | UserB's collection                 | DELETE as UserA                              | 404                                                         | Security |

#### 3.3.3 Cache Behaviour

| TC ID         | Scenario                     | Pre-conditions                               | Test Steps                  | Expected Result                                                   | Type |
| ------------- | ---------------------------- | -------------------------------------------- | --------------------------- | ----------------------------------------------------------------- | ---- |
| COL-CACHE-001 | Cache miss triggers DB query | Cache empty (mocked `cacheGet` returns null) | `getCollectionTree(userId)` | `prisma.collection.findMany` called; result stored via `cacheSet` | Unit |
| COL-CACHE-002 | Cache hit skips DB query     | `cacheGet` returns valid tree (mocked)       | `getCollectionTree(userId)` | `prisma.collection.findMany` **not** called                       | Unit |
| COL-CACHE-003 | Create invalidates cache     | Valid cache; create new collection           | `createCollection(...)`     | `cacheDel` called with user's cache key                           | Unit |
| COL-CACHE-004 | Update invalidates cache     | Valid cache                                  | `updateCollection(...)`     | `cacheDel` called                                                 | Unit |
| COL-CACHE-005 | Delete invalidates cache     | Valid cache                                  | `deleteCollection(...)`     | `cacheDel` called                                                 | Unit |

---

### 3.4 Module: Search

| TC ID    | Scenario                                 | Pre-conditions                               | Test Steps                                 | Expected Result                                      | Type      |
| -------- | ---------------------------------------- | -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- | --------- |
| SRCH-001 | Basic FTS match                          | Bookmark with "TypeScript tutorial" in title | GET `/search?q=typescript`                 | Bookmark appears in results                          | Positive  |
| SRCH-002 | Multi-word query                         | Bookmarks with varied titles                 | GET `/search?q=typescript tutorial`        | Only highly relevant bookmarks returned              | Positive  |
| SRCH-003 | Query with SQL meta-characters           | None                                         | GET `/search?q='; DROP TABLE bookmarks;--` | 200; empty results; no DB error                      | Security  |
| SRCH-004 | tsquery injection attempt                | None                                         | GET `/search?q=') OR '1'='1`               | 200; safe; parameterised `websearch_to_tsquery` used | Security  |
| SRCH-005 | Empty query string                       | None                                         | GET `/search?q=`                           | 422 or 200 empty results (per schema)                | Edge Case |
| SRCH-006 | Very long query (2048 chars)             | None                                         | GET `/search?q=LONG`                       | Does not crash; returns results or empty             | Edge Case |
| SRCH-007 | IDOR — search only returns own bookmarks | UserA and UserB bookmarks                    | Search as UserA for UserB's private title  | Zero results                                         | Security  |
| SRCH-008 | Pagination via `limit` and `offset`      | 50 bookmarks                                 | GET `?q=test&limit=10&offset=10`           | Page 2 of 10 results                                 | Positive  |

---

### 3.5 Module: Annotations

| TC ID   | Scenario                                     | Pre-conditions                       | Test Steps                                                          | Expected Result                              | Type     |
| ------- | -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------- | -------- |
| ANN-001 | Create HIGHLIGHT annotation                  | Permanent copy exists; authenticated | POST `{type:"HIGHLIGHT", content:"selected text", color:"#FDE047"}` | 201; annotation created                      | Positive |
| ANN-002 | Create NOTE annotation                       | Permanent copy exists                | POST `{type:"NOTE", content:"My note"}`                             | 201                                          | Positive |
| ANN-003 | Invalid hex colour                           | Authenticated                        | POST `{color:"red"}`                                                | 422                                          | Negative |
| ANN-004 | IDOR — access permanent copy of another user | UserB's permanentCopyId              | POST as UserA                                                       | 404                                          | Security |
| ANN-005 | Content exceeds reasonable limit             | Authenticated                        | POST with 50 000-char content                                       | 422 (if schema enforces) or stored truncated | BVA      |

---

## 4. Automated Test Script Inventory

The following test files are part of the project's automated suite:

| File                                                                    | Framework          | Type        | Key Coverage                                      |
| ----------------------------------------------------------------------- | ------------------ | ----------- | ------------------------------------------------- |
| `apps/api/src/modules/auth/auth.test.ts`                                | Vitest             | Unit        | Register, login (existing)                        |
| `apps/api/src/modules/auth/auth.service.extended.test.ts`               | Vitest             | Unit        | Token refresh, password reset lifecycle, updateMe |
| `apps/api/src/modules/bookmarks/bookmarks.test.ts`                      | Vitest             | Unit        | CRUD, ownership, batch ops                        |
| `apps/api/src/modules/collections/collections.test.ts`                  | Vitest             | Unit        | Tree building, basic CRUD                         |
| `apps/api/src/modules/collections/collections.service.extended.test.ts` | Vitest             | Unit        | Depth BVA, circular ref, cache lifecycle          |
| `apps/api/tests/integration/auth.test.ts`                               | Vitest + Supertest | Integration | All auth routes                                   |
| `apps/api/tests/integration/bookmarks.test.ts`                          | Vitest + Supertest | Integration | All bookmark routes                               |
| `apps/api/tests/integration/collections.test.ts`                        | Vitest + Supertest | Integration | All collection routes                             |
| `apps/api/tests/integration/security.test.ts`                           | Vitest + Supertest | Security    | IDOR, auth bypass, injection                      |
| `apps/web/e2e/auth.spec.ts`                                             | Playwright         | E2E         | Register, login, logout                           |
| `apps/web/e2e/bookmarks.spec.ts`                                        | Playwright         | E2E         | Save, view, delete bookmarks                      |
| `apps/web/e2e/navigation.spec.ts`                                       | Playwright         | E2E         | Route guards, collection navigation               |
| `k6/load-test.js`                                                       | k6                 | Performance | API endpoints under load                          |

> New files added by this QA initiative are marked in **bold** in the relevant sections above.

---

## 5. Security & Non-Functional Heuristics

Standards basis: **ISO/IEC 25010 Security** sub-characteristics: Confidentiality, Integrity, Non-repudiation, Accountability, Authenticity.

### 5.1 Broken Object Level Authorisation (BOLA / IDOR)

**Risk:** Highest impact vulnerability for multi-tenant REST APIs. An attacker who obtains a valid JWT for Account A uses resource IDs from Account B in URL parameters.

**Verification:**

- Unit tests: all service methods verify `resource.userId !== userId` before data access.
- Integration tests (`security.test.ts`): UserA's JWT + UserB's resource ID → assert 404 (never 200 or 403, which would leak existence).
- Schema: all IDs are CUID, making sequential enumeration impractical.

**Controls in codebase:**  
`getBookmark`, `updateBookmark`, `deleteBookmark`, `getCollectionTree`, `updateCollection`, `deleteCollection` all perform explicit ownership checks against `userId` before any write or read.

### 5.2 Authentication & JWT Security

**Risk:** Forged or replayed tokens granting unauthorised access.

**Verification:**

- Unit: `signAccessToken` / `signRefreshToken` produce verifiable tokens with correct `sub`, `email`, `exp`.
- Integration: tampered tokens (bit-flip, wrong signature key) → 401.
- Refresh token rotation: each call to `/auth/refresh` issues a new pair; the old refresh token remains valid until expiry (stateless). Phase 3 adds revocation list.
- Expiry checks tested via ST scenarios (REF-003).

**Controls:** `jwt.verify` with explicit `algorithms` pin; `httpOnly` cookie prevents JS access to refresh token; `sameSite: strict` mitigates CSRF on cookie path.

### 5.3 SQL / Query Injection

**Risk:** Malicious input in search query or freeform text fields manipulates DB queries.

**Verification:**

- Search uses `websearch_to_tsquery` which is PostgreSQL-native and parameterised — raw string never interpolated.
- All Prisma queries use parameterised bindings; no `$queryRaw` with string interpolation.
- Integration tests: SRCH-003, SRCH-004 verify no 500 error on injection strings.

### 5.4 Cross-Site Scripting (XSS)

**Risk:** Stored XSS via `notes`, `displayName`, `title` fields rendered in the SPA.

**Verification:**

- API stores raw user input; React escapes all text by default (no `dangerouslySetInnerHTML` in critical paths).
- `isomorphic-dompurify` is listed as a dependency — confirm it sanitises `articleContent` (permanent copy HTML) before rendering.
- Test: POST `displayName:"<script>alert(1)</script>"` → GET `/auth/me` → value returned literally; React renders as text node.
- Playwright E2E test: inject XSS payload in bookmark notes; assert no `alert` fires in browser.

### 5.5 Mass Assignment / Over-Posting

**Risk:** Client sends fields not intended to be updatable (e.g., `userId`, `passwordHash`, `emailVerified`).

**Verification:**

- Zod schemas act as explicit allow-lists; any extra field is stripped.
- Unit: PATCH `/auth/me` with `{emailVerified: true}` in body → `emailVerified` remains false.
- Unit: POST `/bookmarks` with `{userId: "attacker-id"}` → bookmark created with authenticated user's ID.

### 5.6 Rate Limiting

**Risk:** Brute-force credential stuffing against `/auth/login`.

**Verification:**

- `express-rate-limit` applied globally in `app.ts`.
- Integration test: send 101 POST requests to `/auth/login` in rapid succession → 429 on the 101st.
- Confirm `Retry-After` header present on 429 response.

### 5.7 Password Security

**Verification:**

- bcrypt with configurable `BCRYPT_ROUNDS` (minimum 10 in production env validation).
- `passwordHash` never serialised in any API response (verified in AUTH-REG-001, AUTH-LGN-001).
- Password reset token stored as SHA-256 hash (`tokenHash`); plain token only in the emailed URL.
- Reset token enforces 1-hour TTL; `usedAt` prevents replay.

### 5.8 Error Information Leakage

**Risk:** Stack traces or internal DB errors exposed in production responses.

**Verification:**

- `errorHandler.middleware.ts` should return generic message in production mode.
- Integration test: trigger a 500 (mock DB crash) → body contains `{"success":false,"message":"..."}` without stack trace.

### 5.9 Performance Benchmarks (ISO/IEC 25010 — Performance Efficiency)

Measured via `k6/load-test.js`:

| Scenario                              | VUs | Target p95 | Acceptable Error Rate |
| ------------------------------------- | --- | ---------- | --------------------- |
| GET `/bookmarks` (list)               | 100 | < 300 ms   | < 0.1 %               |
| POST `/bookmarks` (create)            | 50  | < 500 ms   | < 0.5 %               |
| GET `/search?q=test` (FTS)            | 50  | < 400 ms   | < 0.5 %               |
| GET `/collections` (tree, warm cache) | 200 | < 100 ms   | < 0.1 %               |
| GET `/collections` (tree, cold cache) | 50  | < 500 ms   | < 0.5 %               |

### 5.10 Reliability & Fault Tolerance

- BullMQ jobs (`metadataQueue`, `archiveQueue`) are fire-and-forget; a worker failure must not fail the HTTP response.
- Test: mock `metadataQueue.add` to throw → `createBookmark` should **not** propagate the error (should log and continue, unless re-throw is intentional).
- Redis unavailability: `cacheGet` failure must be caught; service should fall back to DB query.

---

## 6. Coverage Matrix

| Module                  | Unit | Integration | E2E | Security | Perf |
| ----------------------- | ---- | ----------- | --- | -------- | ---- |
| auth — register/login   | ✅   | ✅          | ✅  | ✅       | —    |
| auth — token refresh    | ✅   | ✅          | —   | ✅       | —    |
| auth — password reset   | ✅   | ✅          | ✅  | ✅       | —    |
| auth — profile update   | ✅   | ✅          | —   | ✅       | —    |
| bookmarks — CRUD        | ✅   | ✅          | ✅  | ✅       | ✅   |
| bookmarks — batch ops   | ✅   | ✅          | —   | ✅       | —    |
| bookmarks — pagination  | ✅   | ✅          | —   | —        | ✅   |
| collections — tree      | ✅   | ✅          | ✅  | ✅       | ✅   |
| collections — depth BVA | ✅   | ✅          | —   | —        | —    |
| collections — cache     | ✅   | —           | —   | —        | ✅   |
| search — FTS            | ✅   | ✅          | ✅  | ✅       | ✅   |
| annotations — CRUD      | —    | ✅          | —   | ✅       | —    |
| tags — CRUD             | ✅   | ✅          | —   | ✅       | —    |

---

## 7. Entry / Exit Criteria

### Entry Criteria

- All code changes reviewed and merged to `main` (or PR branch for CI checks).
- Docker Compose stack (`api`, `postgres`, `redis`) healthy.
- Test database migrated: `pnpm --filter api db:migrate:test`.
- Environment variables set per `.env.test`.

### Exit Criteria

- **Unit tests:** 100 % pass; coverage ≥ 80 % branches on `modules/**/*service.ts`.
- **Integration tests:** 100 % pass; all documented routes covered at minimum P/N/Edge.
- **E2E tests:** 100 % pass on Chromium; ≥ 90 % on Firefox + WebKit.
- **Security tests:** Zero IDOR/auth-bypass failures; injection attempts return expected safe responses.
- **Performance:** p95 within targets at 100 VUs; error rate < 0.5 %.
- **No open Critical or High severity defects** unless formally deferred with documented risk acceptance.

---

_End of Test Strategy — MP-QA-001 Rev 1.0_
