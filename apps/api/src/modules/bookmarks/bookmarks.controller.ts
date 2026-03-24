// ─────────────────────────────────────────────────────────────────────────────
// modules/bookmarks/bookmarks.controller.ts — HTTP handlers
//
// Thin controllers: extract inputs → call service → format response.
// All business logic is in bookmarks.service.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as BookmarksService from './bookmarks.service.js';
import { parseNetscapeBookmarks } from '../../lib/importer.js';
import { HTTP, PAGINATION } from '../../config/constants.js';
import type {
  CreateBookmarkInput,
  UpdateBookmarkInput,
  ListBookmarksQuery,
  BatchDeleteInput,
  BatchMoveInput,
  BatchTagInput,
} from './bookmarks.schemas.js';

// `req.user!` is safe in this controller because protected routes always run
// behind JWT auth middleware that attaches the authenticated user.

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as ListBookmarksQuery;
    const limit =
      typeof query.limit === 'string'
        ? Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit, 10)))
        : PAGINATION.DEFAULT_LIMIT;

    const result = await BookmarksService.listBookmarks(req.user!.id, query);

    res.status(HTTP.OK).json({
      success: true,
      data: {
        bookmarks: result.bookmarks,
        pagination: {
          total: result.total,
          limit,
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor !== null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookmark = await BookmarksService.getBookmark(req.user!.id, req.params['id'] as string);
    res.status(HTTP.OK).json({ success: true, data: bookmark });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookmark = await BookmarksService.createBookmark(
      req.user!.id,
      req.body as CreateBookmarkInput,
    );
    res.status(HTTP.CREATED).json({ success: true, data: bookmark });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookmark = await BookmarksService.updateBookmark(
      req.user!.id,
      req.params['id'] as string,
      req.body as UpdateBookmarkInput,
    );
    res.status(HTTP.OK).json({ success: true, data: bookmark });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await BookmarksService.deleteBookmark(req.user!.id, req.params['id'] as string);
    res.status(HTTP.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}

export async function batchDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ids } = req.body as BatchDeleteInput;
    const count = await BookmarksService.batchDeleteBookmarks(req.user!.id, ids);
    res.status(HTTP.OK).json({ success: true, data: { deleted: count } });
  } catch (err) {
    next(err);
  }
}

export async function batchMove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await BookmarksService.batchMoveBookmarks(
      req.user!.id,
      req.body as BatchMoveInput,
    );
    res.status(HTTP.OK).json({ success: true, data: { updated: count } });
  } catch (err) {
    next(err);
  }
}

export async function batchTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await BookmarksService.batchTagBookmarks(req.user!.id, req.body as BatchTagInput);
    res.status(HTTP.OK).json({ success: true, data: { updated: count } });
  } catch (err) {
    next(err);
  }
}

// ── Import / Export ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/bookmarks/import
 * Accepts a multipart/form-data file upload with field name "file".
 * Supports: Netscape HTML bookmark files (.html, .htm)
 */
export async function importBookmarks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(HTTP.BAD_REQUEST).json({ success: false, error: 'No file uploaded.' });
      return;
    }

    const content = file.buffer.toString('utf-8');
    const parsed = parseNetscapeBookmarks(content);

    if (parsed.length === 0) {
      res.status(HTTP.BAD_REQUEST).json({
        success: false,
        error: 'No valid bookmarks found in the uploaded file.',
      });
      return;
    }

    const result = await BookmarksService.importBookmarks(req.user!.id, parsed);
    res.status(HTTP.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/bookmarks/export?format=json|html
 * Streams the export file as a download.
 */
export async function exportBookmarks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const format = (req.query['format'] as string | undefined) === 'html' ? 'html' : 'json';
    const { content, filename, mimeType } = await BookmarksService.exportBookmarks(
      req.user!.id,
      format,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HTTP.OK).send(content);
  } catch (err) {
    next(err);
  }
}

// ── Permanent copy ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/bookmarks/:id/permanent-copy
 * Returns the stored permanent copy for a bookmark.
 */
export async function getPermanentCopy(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const copy = await BookmarksService.getPermanentCopy(req.user!.id, req.params['id'] as string);
    res.status(HTTP.OK).json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/bookmarks/:id/check
 * Enqueues a manual link health check for the bookmark.
 */
export async function checkLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await BookmarksService.checkBookmarkLink(
      req.user!.id,
      req.params['id'] as string,
    );
    res.status(HTTP.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
