// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.controller.ts — HTTP handlers
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as CollectionsService from './collections.service.js';
import { HTTP } from '../../config/constants.js';
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
  DeleteCollectionQuery,
} from './collections.schemas.js';

// `req.user!` is safe in this controller because protected routes always run
// behind JWT auth middleware that attaches the authenticated user.

export async function getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tree = await CollectionsService.getCollectionTree(req.user!.id);
    res.status(HTTP.OK).json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const collection = await CollectionsService.createCollection(
      req.user!.id,
      req.body as CreateCollectionInput,
    );
    res.status(HTTP.CREATED).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const collection = await CollectionsService.updateCollection(
      req.user!.id,
      req.params['id'] as string,
      req.body as UpdateCollectionInput,
    );
    res.status(HTTP.OK).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await CollectionsService.deleteCollection(
      req.user!.id,
      req.params['id'] as string,
      req.query as unknown as DeleteCollectionQuery,
    );
    res.status(HTTP.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CollectionsService.reorderCollection(
      req.user!.id,
      req.params['id'] as string,
      (req.body as { sortOrder: number }).sortOrder,
    );
    res.status(HTTP.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}
