// ─────────────────────────────────────────────────────────────────────────────
// modules/bookmarks/bookmarks.router.ts — Route definitions
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import multer from 'multer';
import type { IRouter } from 'express';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  CreateBookmarkSchema,
  UpdateBookmarkSchema,
  ListBookmarksQuerySchema,
  BatchDeleteSchema,
  BatchMoveSchema,
  BatchTagSchema,
} from './bookmarks.schemas.js';
import * as BookmarksController from './bookmarks.controller.js';
import { annotationsRouter } from '../annotations/annotations.router.js';
import { bookmarkCreateLimiter } from '../../middleware/rateLimiter.middleware.js';

// Multer: memory storage for import file uploads (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/html', 'application/octet-stream', 'text/plain'];
    cb(
      null,
      allowed.includes(file.mimetype) ||
        file.originalname.endsWith('.html') ||
        file.originalname.endsWith('.htm'),
    );
  },
});

const bookmarksRouter: IRouter = Router();

// All bookmark routes require authentication
bookmarksRouter.use(jwtAuthGuard);

// ── Import / Export (must be before /:id wildcard) ────────────────────────────

// POST /api/v1/bookmarks/import — import from browser bookmark HTML file
bookmarksRouter.post('/import', upload.single('file'), BookmarksController.importBookmarks);

// GET  /api/v1/bookmarks/export?format=json|html — download bookmarks
bookmarksRouter.get('/export', BookmarksController.exportBookmarks);

// ── Batch operations (must be before /:id) ───────────────────────────────────

// PATCH /api/v1/bookmarks/batch/move — move multiple bookmarks to a collection
bookmarksRouter.patch(
  '/batch/move',
  validate({ body: BatchMoveSchema }),
  BookmarksController.batchMove,
);

// PATCH /api/v1/bookmarks/batch/tag  — add/remove/replace tags on multiple bookmarks
bookmarksRouter.patch(
  '/batch/tag',
  validate({ body: BatchTagSchema }),
  BookmarksController.batchTag,
);

// ── Collection-scoped list ────────────────────────────────────────────────────

// GET  /api/v1/bookmarks         — paginated list with filters
bookmarksRouter.get('/', validate({ query: ListBookmarksQuerySchema }), BookmarksController.list);

// ── Single-bookmark CRUD ──────────────────────────────────────────────────────

// GET  /api/v1/bookmarks/:id     — single bookmark
bookmarksRouter.get('/:id', BookmarksController.get);

// GET  /api/v1/bookmarks/:id/permanent-copy — permanent copy for a bookmark
bookmarksRouter.get('/:id/permanent-copy', BookmarksController.getPermanentCopy);

// GET  /api/v1/bookmarks/:id/permanent-copy/versions — recent archive versions (max 3)
bookmarksRouter.get('/:id/permanent-copy/versions', BookmarksController.listPermanentCopyVersions);

// GET  /api/v1/bookmarks/:id/permanent-copy/versions/:versionId — specific archived snapshot
bookmarksRouter.get(
  '/:id/permanent-copy/versions/:versionId',
  BookmarksController.getPermanentCopyVersion,
);

// POST /api/v1/bookmarks/:id/permanent-copy/refresh — capture a new archive snapshot
bookmarksRouter.post('/:id/permanent-copy/refresh', BookmarksController.refreshPermanentCopy);

// POST /api/v1/bookmarks/:id/check — manually trigger a link health check
bookmarksRouter.post('/:id/check', BookmarksController.checkLink);

// POST /api/v1/bookmarks/:id/refresh-metadata — manually re-run metadata extraction
bookmarksRouter.post('/:id/refresh-metadata', BookmarksController.refreshMetadata);

// POST /api/v1/bookmarks         — create bookmark (enqueues metadata job)
// bookmarkCreateLimiter is applied AFTER jwtAuthGuard so req.user.id is available
bookmarksRouter.post(
  '/',
  bookmarkCreateLimiter,
  validate({ body: CreateBookmarkSchema }),
  BookmarksController.create,
);

// PATCH /api/v1/bookmarks/:id    — update bookmark
bookmarksRouter.patch('/:id', validate({ body: UpdateBookmarkSchema }), BookmarksController.update);

// DELETE /api/v1/bookmarks/:id   — delete single bookmark
bookmarksRouter.delete('/:id', BookmarksController.remove);

// DELETE /api/v1/bookmarks       — batch delete (body: { ids: string[] })
bookmarksRouter.delete('/', validate({ body: BatchDeleteSchema }), BookmarksController.batchDelete);

// ── Nested sub-router: annotations ───────────────────────────────────────────
// GET/POST/PATCH/DELETE /api/v1/bookmarks/:bookmarkId/annotations/...
bookmarksRouter.use('/:bookmarkId/annotations', annotationsRouter);

export { bookmarksRouter };
