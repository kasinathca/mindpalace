// ─────────────────────────────────────────────────────────────────────────────
// modules/search/search.controller.ts — HTTP handler for search
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as SearchService from './search.service.js';
import { HTTP } from '../../config/constants.js';
import type { SearchQuery } from './search.schemas.js';

// `req.user!` is safe in this controller because protected routes always run
// behind JWT auth middleware that attaches the authenticated user.

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as SearchQuery;
    const result = await SearchService.searchBookmarks(req.user!.id, query);

    res.status(HTTP.OK).json({
      success: true,
      data: {
        bookmarks: result.bookmarks,
        total: result.total,
        query: result.query,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function duplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await SearchService.findDuplicates(req.user!.id);
    res.status(HTTP.OK).json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

export async function similar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const url = typeof req.query['url'] === 'string' ? req.query['url'] : '';
    if (!url) {
      res
        .status(HTTP.BAD_REQUEST)
        .json({ success: false, error: '`url` query parameter is required.' });
      return;
    }
    const bookmarks = await SearchService.findSimilar(req.user!.id, url);
    res.status(HTTP.OK).json({ success: true, data: bookmarks });
  } catch (err) {
    next(err);
  }
}
