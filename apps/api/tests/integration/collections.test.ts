// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/collections.test.ts — Collections endpoints integration tests
//
// Covers every route in collections.router.ts:
//   GET    /collections           (full tree)
//   POST   /collections           (create)
//   PATCH  /collections/:id       (update)
//   PATCH  /collections/:id/reorder
//   DELETE /collections/:id       (delete with action=delete|move)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { api, createTestUser, type ApiSuccessBody } from './helpers.js';
import { cleanDb } from './setup.js';

const BASE = '/api/v1/collections';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── GET /collections ──────────────────────────────────────────────────────────

describe('GET /collections', () => {
  it('returns 200 with empty tree for a new user', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<unknown[]>;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns only the requesting user's collections", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    // UserA creates 2 collections; UserB creates 1
    await api().post(BASE).set('Authorization', `Bearer ${userA.accessToken}`).send({ name: 'A1' });
    await api().post(BASE).set('Authorization', `Bearer ${userA.accessToken}`).send({ name: 'A2' });
    await api().post(BASE).set('Authorization', `Bearer ${userB.accessToken}`).send({ name: 'B1' });

    const res = await api().get(BASE).set('Authorization', `Bearer ${userA.accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<unknown[]>;
    expect(body.data).toHaveLength(2);
  });

  it('nests children under their parent', async () => {
    const { accessToken } = await createTestUser();

    const parentRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Parent' });

    const parentId = (parentRes.body as ApiSuccessBody<{ id: string }>).data.id;

    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Child', parentId });

    const treeRes = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    const tree = (
      treeRes.body as ApiSuccessBody<Array<{ name: string; children: Array<{ name: string }> }>>
    ).data;

    const parent = tree.find((n) => n.name === 'Parent');
    expect(parent).toBeDefined();
    expect(parent?.children).toHaveLength(1);
    expect(parent?.children[0]?.name).toBe('Child');
  });
});

// ── POST /collections ─────────────────────────────────────────────────────────

describe('POST /collections', () => {
  it('creates a root collection and returns 201', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Engineering', color: '#6366F1', icon: '📐' });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{
      id: string;
      name: string;
      color: string | null;
    }>;
    expect(body.data.name).toBe('Engineering');
    expect(body.data.color).toBe('#6366F1');
  });

  it('creates a child collection under a parent', async () => {
    const { accessToken } = await createTestUser();

    const parentRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Root' });

    const parentId = (parentRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const childRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Nested', parentId });

    expect(childRes.status).toBe(201);
    const body = childRes.body as ApiSuccessBody<{ parentId: string | null }>;
    expect(body.data.parentId).toBe(parentId);
  });

  it('returns 422 for an empty name', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for an invalid color hex code', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Bad Color', color: 'notacolor' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without authentication', async () => {
    const res = await api().post(BASE).send({ name: 'Anonymous' });
    expect(res.status).toBe(401);
  });
});

// ── PATCH /collections/:id ────────────────────────────────────────────────────

describe('PATCH /collections/:id', () => {
  it('renames a collection and returns 200', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Original' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ name: string }>;
    expect(body.data.name).toBe('Renamed');
  });

  it('returns 404 when another user tries to update', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'Private' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
  });
});

// ── PATCH /collections/:id/reorder ───────────────────────────────────────────

describe('PATCH /collections/:id/reorder', () => {
  it('updates sortOrder and returns 204', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Reorder Me' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sortOrder: 5 });

    expect(res.status).toBe(204);
  });
});

// ── DELETE /collections/:id ───────────────────────────────────────────────────

describe('DELETE /collections/:id', () => {
  it('deletes a collection (action=delete) and returns 204', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Delete Me' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const deleteRes = await api()
      .delete(`${BASE}/${id}?action=delete`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(204);

    // Verify removed from tree
    const treeRes = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    const tree = (treeRes.body as ApiSuccessBody<Array<{ id: string }>>).data;
    expect(tree.find((c) => c.id === id)).toBeUndefined();
  });

  it('moves bookmarks to target collection on action=move', async () => {
    const { accessToken } = await createTestUser();

    // Create source + target collections
    const [srcRes, tgtRes] = await Promise.all([
      api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'Source' }),
      api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'Target' }),
    ]);

    const srcId = (srcRes.body as ApiSuccessBody<{ id: string }>).data.id;
    const tgtId = (tgtRes.body as ApiSuccessBody<{ id: string }>).data.id;

    // Create a bookmark in the source collection
    await api()
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://moveable.example.com', collectionId: srcId });

    // Delete source, moving its bookmarks to target
    const deleteRes = await api()
      .delete(`${BASE}/${srcId}?action=move&targetCollectionId=${tgtId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(204);

    // Verify bookmark is now in the target collection
    const listRes = await api()
      .get(`/api/v1/bookmarks?collectionId=${tgtId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const listBody = listRes.body as ApiSuccessBody<{
      bookmarks: unknown[];
      pagination: { total: number };
    }>;
    expect(listBody.data.pagination.total).toBe(1);
  });
});
