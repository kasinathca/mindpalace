// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/bookmarks.test.ts — Bookmarks endpoints integration tests
//
// Covers every route in bookmarks.router.ts:
//   GET    /bookmarks           (list with filters + cursor pagination)
//   POST   /bookmarks           (create)
//   GET    /bookmarks/:id       (single)
//   PATCH  /bookmarks/:id       (update)
//   DELETE /bookmarks/:id       (delete single)
//   DELETE /bookmarks           (batch delete)
//   PATCH  /bookmarks/batch/move
//   PATCH  /bookmarks/batch/tag
//   GET    /bookmarks/export
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { api, createTestUser, type ApiSuccessBody } from './helpers.js';
import { cleanDb } from './setup.js';

const BASE = '/api/v1/bookmarks';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── POST /bookmarks ───────────────────────────────────────────────────────────

describe('POST /bookmarks', () => {
  it('creates a bookmark and returns 201', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://example.com', title: 'Example' });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{ id: string; url: string; title: string }>;
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTypeOf('string');
    expect(body.data.url).toBe('https://example.com');
    expect(body.data.title).toBe('Example');
  });

  it('creates a bookmark with tags', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://tagged.example.com', tags: ['typescript', 'testing'] });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{ tags: Array<{ name: string }> }>;
    expect(body.data.tags.map((t) => t.name)).toEqual(
      expect.arrayContaining(['typescript', 'testing']),
    );
  });

  it('returns 422 for an invalid URL', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for a non-http URL', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'ftp://example.com/file' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without authentication', async () => {
    const res = await api().post(BASE).send({ url: 'https://example.com' });
    expect(res.status).toBe(401);
  });
});

// ── GET /bookmarks ────────────────────────────────────────────────────────────

describe('GET /bookmarks', () => {
  it('returns 200 with empty list when user has no bookmarks', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      bookmarks: unknown[];
      pagination: { total: number };
    }>;
    expect(body.data.bookmarks).toHaveLength(0);
    expect(body.data.pagination.total).toBe(0);
  });

  it("returns only the requesting user's bookmarks", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    // User A creates 2 bookmarks, user B creates 1
    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ url: 'https://a1.example.com' });
    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ url: 'https://a2.example.com' });
    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ url: 'https://b1.example.com' });

    const res = await api().get(BASE).set('Authorization', `Bearer ${userA.accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ bookmarks: unknown[]; pagination: { total: number } }>;
    expect(body.data.pagination.total).toBe(2);
  });

  it('filters by isPinned=true', async () => {
    const { accessToken } = await createTestUser();

    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://pinned.example.com', isPinned: true });
    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://unpinned.example.com', isPinned: false });

    const res = await api()
      .get(`${BASE}?isPinned=true`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ bookmarks: unknown[]; pagination: { total: number } }>;
    expect(body.data.pagination.total).toBe(1);
  });

  it('supports cursor-based pagination via limit param', async () => {
    const { accessToken } = await createTestUser();

    // Create 5 bookmarks
    for (let i = 0; i < 5; i++) {
      await api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: `https://page${i}-test.example.com` });
    }

    const res = await api().get(`${BASE}?limit=2`).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      bookmarks: unknown[];
      pagination: { hasNextPage: boolean; nextCursor: string | null };
    }>;
    expect(body.data.bookmarks).toHaveLength(2);
    expect(body.data.pagination.hasNextPage).toBe(true);
    expect(body.data.pagination.nextCursor).toBeTypeOf('string');
  });
});

// ── GET /bookmarks/:id ────────────────────────────────────────────────────────

describe('GET /bookmarks/:id', () => {
  it('returns 200 with the full bookmark', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://detail.example.com', title: 'Detail Test' });

    const { id } = (createRes.body as ApiSuccessBody<{ id: string }>).data;

    const res = await api().get(`${BASE}/${id}`).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ id: string; url: string }>;
    expect(body.data.id).toBe(id);
    expect(body.data.url).toBe('https://detail.example.com');
  });

  it('returns 404 when another user tries to access the bookmark', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ url: 'https://private.example.com' });

    const { id } = (createRes.body as ApiSuccessBody<{ id: string }>).data;

    const res = await api()
      .get(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 for a non-existent ID', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .get(`${BASE}/clxxxxxxxxxxxxxxxxxxxxxx`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ── PATCH /bookmarks/:id ──────────────────────────────────────────────────────

describe('PATCH /bookmarks/:id', () => {
  it('updates title, notes, and tags, returns 200', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://update-test.example.com' });

    const { id } = (createRes.body as ApiSuccessBody<{ id: string }>).data;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Title', notes: 'My notes', tags: ['updated'] });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{
      title: string;
      notes: string;
      tags: Array<{ name: string }>;
    }>;
    expect(body.data.title).toBe('Updated Title');
    expect(body.data.notes).toBe('My notes');
    expect(body.data.tags.map((t) => t.name)).toContain('updated');
  });

  it('returns 404 when another user tries to update', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ url: 'https://other-update.example.com' });

    const { id } = (createRes.body as ApiSuccessBody<{ id: string }>).data;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /bookmarks/:id ─────────────────────────────────────────────────────

describe('DELETE /bookmarks/:id', () => {
  it('deletes the bookmark and returns 204', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://delete-me.example.com' });

    const { id } = (createRes.body as ApiSuccessBody<{ id: string }>).data;

    const deleteRes = await api()
      .delete(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(204);

    // Confirm it's gone
    const getRes = await api().get(`${BASE}/${id}`).set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(404);
  });
});

// ── DELETE /bookmarks (batch) ─────────────────────────────────────────────────

describe('DELETE /bookmarks (batch)', () => {
  it('deletes multiple bookmarks and returns 200', async () => {
    const { accessToken } = await createTestUser();

    const [r1, r2] = await Promise.all([
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://batch-del-1.example.com' }),
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://batch-del-2.example.com' }),
    ]);

    const id1 = (r1.body as ApiSuccessBody<{ id: string }>).data.id;
    const id2 = (r2.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .delete(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: [id1, id2] });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ deleted: number }>;
    expect(body.data.deleted).toBe(2);
  });

  it('returns 422 when ids array is empty', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .delete(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: [] });

    expect(res.status).toBe(422);
  });
});

// ── PATCH /bookmarks/batch/move ───────────────────────────────────────────────

describe('PATCH /bookmarks/batch/move', () => {
  it('moves bookmarks to a collection and returns 200', async () => {
    const { accessToken } = await createTestUser();

    // Create a collection
    const colRes = await api()
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Target Collection' });

    const collectionId = (colRes.body as ApiSuccessBody<{ id: string }>).data.id;

    // Create two bookmarks
    const [r1, r2] = await Promise.all([
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://move-1.example.com' }),
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://move-2.example.com' }),
    ]);

    const id1 = (r1.body as ApiSuccessBody<{ id: string }>).data.id;
    const id2 = (r2.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/batch/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: [id1, id2], collectionId });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ updated: number }>;
    expect(body.data.updated).toBe(2);
  });
});

// ── PATCH /bookmarks/batch/tag ────────────────────────────────────────────────

describe('PATCH /bookmarks/batch/tag', () => {
  it('adds tags to multiple bookmarks and returns 200', async () => {
    const { accessToken } = await createTestUser();

    // Create a tag
    const tagRes = await api()
      .post('/api/v1/tags')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'batch-tag' });

    const tagId = (tagRes.body as ApiSuccessBody<{ id: string }>).data.id;

    // Create two bookmarks
    const [r1, r2] = await Promise.all([
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://tag-1.example.com' }),
      api()
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://tag-2.example.com' }),
    ]);

    const id1 = (r1.body as ApiSuccessBody<{ id: string }>).data.id;
    const id2 = (r2.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/batch/tag`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: [id1, id2], tagIds: [tagId], mode: 'add' });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ updated: number }>;
    expect(body.data.updated).toBe(2);
  });
});

// ── GET /bookmarks/export ─────────────────────────────────────────────────────

describe('GET /bookmarks/export', () => {
  it('exports bookmarks as JSON when format=json', async () => {
    const { accessToken } = await createTestUser();

    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://export-test.example.com', title: 'Export Me' });

    const res = await api()
      .get(`${BASE}/export?format=json`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const body = res.body as Array<{ url: string; title: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((b) => b.url === 'https://export-test.example.com')).toBe(true);
  });

  it('exports bookmarks as HTML when format=html', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .get(`${BASE}/export?format=html`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/<!DOCTYPE NETSCAPE-Bookmark-file-1>/i);
  });
});
