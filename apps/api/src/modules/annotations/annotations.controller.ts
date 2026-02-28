// ─────────────────────────────────────────────────────────────────────────────
// modules/annotations/annotations.controller.ts — HTTP handlers
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from 'express';
import * as AnnotationsService from './annotations.service.js';
import { HTTP } from '../../config/constants.js';
import type { CreateAnnotationInput, UpdateAnnotationInput } from './annotations.schemas.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const annotations = await AnnotationsService.listAnnotations(
      req.user!.id,
      req.params['bookmarkId'] as string,
    );
    res.status(HTTP.OK).json({ success: true, data: annotations });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const annotation = await AnnotationsService.createAnnotation(
      req.user!.id,
      req.params['bookmarkId'] as string,
      req.body as CreateAnnotationInput,
    );
    res.status(HTTP.CREATED).json({ success: true, data: annotation });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const annotation = await AnnotationsService.updateAnnotation(
      req.user!.id,
      req.params['annotationId'] as string,
      req.body as UpdateAnnotationInput,
    );
    res.status(HTTP.OK).json({ success: true, data: annotation });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await AnnotationsService.deleteAnnotation(req.user!.id, req.params['annotationId'] as string);
    res.status(HTTP.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}
