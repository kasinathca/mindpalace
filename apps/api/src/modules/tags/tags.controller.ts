// ─────────────────────────────────────────────────────────────────────────────
// modules/tags/tags.controller.ts — HTTP handlers for tag management
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as TagsService from './tags.service.js';
import { HTTP } from '../../config/constants.js';
import type { CreateTagInput, UpdateTagInput, MergeTagsInput } from './tags.schemas.js';

// `req.user!` is safe in this controller because protected routes always run
// behind JWT auth middleware that attaches the authenticated user.

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tags = await TagsService.listTags(req.user!.id);
    res.status(HTTP.OK).json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await TagsService.createTag(req.user!.id, req.body as CreateTagInput);
    res.status(HTTP.CREATED).json({ success: true, data: tag });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await TagsService.updateTag(
      req.user!.id,
      req.params['id'] as string,
      req.body as UpdateTagInput,
    );
    res.status(HTTP.OK).json({ success: true, data: tag });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await TagsService.deleteTag(req.user!.id, req.params['id'] as string);
    res.status(HTTP.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}

export async function merge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TagsService.mergeTags(req.user!.id, req.body as MergeTagsInput);
    res.status(HTTP.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
