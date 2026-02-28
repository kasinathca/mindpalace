// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/tags.test.ts — Tags endpoints integration tests
//
// Covers every route in tags.router.ts:
//   GET    /tags          (list)
//   POST   /tags          (create)
//   POST   /tags/merge    (merge N source tags into target)
//   PATCH  /tags/:id      (update name/color)
//   DELETE /tags/:id      (delete)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { api, createTestUser, type ApiSuccessBody, type ApiErrorBody } from './helpers.js';
import { cleanDb } from './setup.js';

const BASE = '/api/v1/tags';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── GET /tags ─────────────────────────────────────────────────────────────────

describe('GET /tags', () => {
  it('returns 200 with empty list for a new user', async () => {
    const { accessToken } = await createTestUser();

    const res = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<unknown[]>;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns only the requesting user's tags", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'react' });
    await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'vue' });

    const res = await api().get(BASE).set('Authorization', `Bearer ${userA.accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<Array<{ name: string }>>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe('react');
  });

  it('returns 401 without authentication', async () => {
    const res = await api().get(BASE);
    expect(res.status).toBe(401);
  });
});

// ── POST /tags ────────────────────────────────────────────────────────────────

describe('POST /tags', () => {
  it('creates a tag and returns 201', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'TypeScript', color: '#3B82F6' });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{ id: string; name: string; color: string | null }>;
    // Tag names are normalised to lowercase
    expect(body.data.name).toBe('typescript');
    expect(body.data.color).toBe('#3B82F6');
    expect(body.data.id).toBeTypeOf('string');
  });

  it('normalises tag name to lowercase', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'UPPER CASE' });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{ name: string }>;
    expect(body.data.name).toBe('upper case');
  });

  it('returns 409 on duplicate tag name for same user', async () => {
    const { accessToken } = await createTestUser();

    await api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'unique' });

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'unique' });

    expect(res.status).toBe(409);
  });

  it('returns 422 for empty tag name', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid color hex', async () => {
    const { accessToken } = await createTestUser();

    const res = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'bad-color', color: '#XYZ' });

    expect(res.status).toBe(422);
  });
});

// ── PATCH /tags/:id ───────────────────────────────────────────────────────────

describe('PATCH /tags/:id', () => {
  it('renames a tag and returns 200', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'old-name' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'new-name' });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ name: string }>;
    expect(body.data.name).toBe('new-name');
  });

  it('sets color to null when color=null is sent', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'colored-tag', color: '#EF4444' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ color: null });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ color: string | null }>;
    expect(body.data.color).toBeNull();
  });

  it('returns 404 when another user tries to update', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'private-tag' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'hijacked' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /tags/:id ──────────────────────────────────────────────────────────

describe('DELETE /tags/:id', () => {
  it('deletes the tag and returns 204', async () => {
    const { accessToken } = await createTestUser();

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'to-delete' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const deleteRes = await api()
      .delete(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(204);

    // Verify it's gone from the list
    const listRes = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);

    const body = listRes.body as ApiSuccessBody<Array<{ id: string }>>;
    expect(body.data.find((t) => t.id === id)).toBeUndefined();
  });

  it('returns 404 when another user tries to delete', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);

    const createRes = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'owned-by-a' });

    const id = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .delete(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /tags/merge ──────────────────────────────────────────────────────────

describe('POST /tags/merge', () => {
  it('merges source tags into target and returns 200', async () => {
    const { accessToken } = await createTestUser();

    // Create 3 tags
    const [r1, r2, r3] = await Promise.all([
      api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'source-one' }),
      api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'source-two' }),
      api().post(BASE).set('Authorization', `Bearer ${accessToken}`).send({ name: 'merge-target' }),
    ]);

    const sid1 = (r1.body as ApiSuccessBody<{ id: string }>).data.id;
    const sid2 = (r2.body as ApiSuccessBody<{ id: string }>).data.id;
    const targetId = (r3.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .post(`${BASE}/merge`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceIds: [sid1, sid2], targetId });

    expect(res.status).toBe(200);

    // Source tags should be deleted
    const listRes = await api().get(BASE).set('Authorization', `Bearer ${accessToken}`);
    const tags = (listRes.body as ApiSuccessBody<Array<{ id: string }>>).data;
    expect(tags.find((t) => t.id === sid1)).toBeUndefined();
    expect(tags.find((t) => t.id === sid2)).toBeUndefined();
    expect(tags.find((t) => t.id === targetId)).toBeDefined();
  });

  it('returns 422 when sourceIds is empty', async () => {
    const { accessToken } = await createTestUser();

    const r = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'only-target' });

    const targetId = (r.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .post(`${BASE}/merge`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sourceIds: [], targetId });

    expect(res.status).toBe(422);
    const body = res.body as ApiErrorBody;
    expect(body.success).toBe(false);
  });
});
