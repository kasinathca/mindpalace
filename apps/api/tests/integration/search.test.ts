// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/search.test.ts — Search endpoint integration tests
//
// Covers the single route in search.router.ts:
//   GET /search?q=...&...filters
//
// Note: PostgreSQL full-text search using websearch_to_tsquery is triggered
// by the `searchVector` tsvector column, which is populated via a DB trigger
// on bookmark insert/update. Results depend on the trigger running correctly.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { api, createTestUser, type ApiSuccessBody } from './helpers.js';
import { cleanDb } from './setup.js';

const BASE = '/api/v1/search';
const BOOKMARKS = '/api/v1/bookmarks';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── GET /search ───────────────────────────────────────────────────────────────

describe('GET /search', () => {
  it('returns 422 when q parameter is missing', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 422 when q is an empty string', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().get(`${BASE}?q=`).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 200 with empty results when no bookmarks match', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .get(`${BASE}?q=xyznonexistent123`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      bookmarks: unknown[];
      total: number;
    }>;
    expect(body.success).toBe(true);
    expect(body.data.bookmarks).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it('returns 401 without authentication', async () => {
    const res = await api().get(`${BASE}?q=test`);
    expect(res.status).toBe(401);
  });

  it('returns matching bookmarks when title contains the search term', async () => {
    const { accessToken } = await createTestUser();

    // Create a bookmark with a distinctive title
    await api().post(BOOKMARKS).set('Authorization', `Bearer ${accessToken}`).send({
      url: 'https://vitest-search.example.com',
      title: 'VitestSearchIntegration unique token',
      description: 'A test bookmark for search integration tests',
    });

    const res = await api()
      .get(`${BASE}?q=VitestSearchIntegration`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      bookmarks: Array<{ title: string }>;
      total: number;
    }>;
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.bookmarks.some((item) => item.title.includes('VitestSearchIntegration'))).toBe(
      true,
    );
  });

  it("does not return another user's bookmarks", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    // UserA creates a bookmark with a unique term
    await api().post(BOOKMARKS).set('Authorization', `Bearer ${userA.accessToken}`).send({
      url: 'https://private-search.example.com',
      title: 'PRIVATESEARCHTERM42 secret content',
    });

    // UserB searches for that term — should see nothing
    const res = await api()
      .get(`${BASE}?q=PRIVATESEARCHTERM42`)
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ total: number }>;
    expect(body.data.total).toBe(0);
  });

  it('respects the limit query parameter', async () => {
    const { accessToken } = await createTestUser();

    // Create 5 bookmarks that all share a common term
    for (let i = 0; i < 5; i++) {
      await api()
        .post(BOOKMARKS)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: `https://limit-search-${i}.example.com`,
          title: `LIMITSEARCHTERM9 item ${i}`,
        });
    }

    const res = await api()
      .get(`${BASE}?q=LIMITSEARCHTERM9&limit=2`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ bookmarks: unknown[]; total: number }>;
    expect(body.data.bookmarks).toHaveLength(2);
    expect(body.data.total).toBeGreaterThanOrEqual(5);
  });
});
