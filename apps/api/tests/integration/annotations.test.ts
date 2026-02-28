// ─────────────────────────────────────────────────────────────────────────────
// tests/integration/annotations.test.ts — Annotations endpoints integration tests
//
// Routes are nested under bookmarks:
//   GET    /bookmarks/:bookmarkId/annotations
//   POST   /bookmarks/:bookmarkId/annotations
//   PATCH  /bookmarks/:bookmarkId/annotations/:annotationId
//   DELETE /bookmarks/:bookmarkId/annotations/:annotationId
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { api, createTestUser, type ApiSuccessBody } from './helpers.js';
import { cleanDb } from './setup.js';

const BOOKMARKS = '/api/v1/bookmarks';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a bookmark and return its ID. */
async function createBookmark(accessToken: string, url?: string): Promise<string> {
  const res = await api()
    .post(BOOKMARKS)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ url: url ?? 'https://annotate-this.example.com' });

  return (res.body as ApiSuccessBody<{ id: string }>).data.id;
}

/** Return the annotations base URL for a bookmark. */
function annotationsUrl(bookmarkId: string): string {
  return `${BOOKMARKS}/${bookmarkId}/annotations`;
}

// ── GET /bookmarks/:bookmarkId/annotations ────────────────────────────────────

describe('GET /bookmarks/:bookmarkId/annotations', () => {
  it('returns 200 with empty list for a new bookmark', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken);

    const res = await api()
      .get(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<unknown[]>;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('returns 401 without authentication', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken);

    const res = await api().get(annotationsUrl(bookmarkId));
    expect(res.status).toBe(401);
  });

  it("returns 404 when trying to list annotations on another user's bookmark", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    const bookmarkId = await createBookmark(userA.accessToken);

    const res = await api()
      .get(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /bookmarks/:bookmarkId/annotations ───────────────────────────────────

describe('POST /bookmarks/:bookmarkId/annotations', () => {
  it('creates a NOTE annotation and returns 201', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken);

    const res = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'NOTE',
        content: 'This is my note about the page.',
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{
      id: string;
      type: string;
      content: string;
      permanentCopyId: string;
    }>;
    expect(body.data.id).toBeTypeOf('string');
    expect(body.data.type).toBe('NOTE');
    expect(body.data.content).toBe('This is my note about the page.');
    expect(body.data.permanentCopyId).toBeTypeOf('string');
  });

  it('creates a HIGHLIGHT annotation with position data and returns 201', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken, 'https://highlight-test.example.com');

    const res = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'HIGHLIGHT',
        content: 'Selected text to highlight',
        color: '#FDE047',
        positionData: { startOffset: 10, endOffset: 30 },
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiSuccessBody<{
      type: string;
      color: string | null;
      positionData: unknown;
    }>;
    expect(body.data.type).toBe('HIGHLIGHT');
    expect(body.data.color).toBe('#FDE047');
  });

  it('returns 422 when content is empty', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken, 'https://empty-content.example.com');

    const res = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'NOTE', content: '' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for an invalid color hex', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken, 'https://bad-color.example.com');

    const res = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'HIGHLIGHT', content: 'text', color: 'red' });

    expect(res.status).toBe(422);
  });

  it('returns 404 when the bookmarkId belongs to another user', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    const bookmarkId = await createBookmark(userA.accessToken, 'https://other-owner.example.com');

    const res = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ type: 'NOTE', content: "Trying to annotate someone else's bookmark." });

    expect(res.status).toBe(404);
  });
});

// ── PATCH /bookmarks/:bookmarkId/annotations/:annotationId ───────────────────

describe('PATCH /bookmarks/:bookmarkId/annotations/:annotationId', () => {
  it('updates annotation content and returns 200', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken, 'https://patch-ann.example.com');

    const createRes = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'NOTE', content: 'Original note' });

    const annotationId = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${annotationsUrl(bookmarkId)}/${annotationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Updated note content' });

    expect(res.status).toBe(200);
    const body = res.body as ApiSuccessBody<{ content: string }>;
    expect(body.data.content).toBe('Updated note content');
  });

  it("returns 404 when trying to update another user's annotation", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    const bookmarkId = await createBookmark(userA.accessToken, 'https://ann-owner.example.com');

    const createRes = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ type: 'NOTE', content: 'UserA annotation' });

    const annotationId = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .patch(`${annotationsUrl(bookmarkId)}/${annotationId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ content: 'Hijacked' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /bookmarks/:bookmarkId/annotations/:annotationId ──────────────────

describe('DELETE /bookmarks/:bookmarkId/annotations/:annotationId', () => {
  it('deletes the annotation and returns 204', async () => {
    const { accessToken } = await createTestUser();
    const bookmarkId = await createBookmark(accessToken, 'https://del-ann.example.com');

    const createRes = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'NOTE', content: 'To be deleted' });

    const annotationId = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const deleteRes = await api()
      .delete(`${annotationsUrl(bookmarkId)}/${annotationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(204);

    // Verify it's no longer in the list
    const listRes = await api()
      .get(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${accessToken}`);

    const listBody = listRes.body as ApiSuccessBody<Array<{ id: string }>>;
    expect(listBody.data.find((a) => a.id === annotationId)).toBeUndefined();
  });

  it('returns 404 when another user tries to delete', async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    const bookmarkId = await createBookmark(userA.accessToken, 'https://del-own.example.com');

    const createRes = await api()
      .post(annotationsUrl(bookmarkId))
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ type: 'NOTE', content: 'Protected annotation' });

    const annotationId = (createRes.body as ApiSuccessBody<{ id: string }>).data.id;

    const res = await api()
      .delete(`${annotationsUrl(bookmarkId)}/${annotationId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect(res.status).toBe(404);
  });
});
