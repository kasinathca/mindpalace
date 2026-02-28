// ─────────────────────────────────────────────────────────────────────────────
// modules/annotations/annotations.router.ts — Routes mounted at
//   /api/v1/bookmarks/:bookmarkId/annotations
//
// Note: This router uses mergeParams: true so that req.params.bookmarkId
//       is accessible from the parent bookmarks router context.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter } from 'express';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { CreateAnnotationSchema, UpdateAnnotationSchema } from './annotations.schemas.js';
import * as AnnotationsController from './annotations.controller.js';

const annotationsRouter: IRouter = Router({ mergeParams: true });

// All annotation routes require authentication
annotationsRouter.use(jwtAuthGuard);

// GET  /api/v1/bookmarks/:bookmarkId/annotations         — list annotations
annotationsRouter.get('/', AnnotationsController.list);

// POST /api/v1/bookmarks/:bookmarkId/annotations         — create annotation
annotationsRouter.post(
  '/',
  validate({ body: CreateAnnotationSchema }),
  AnnotationsController.create,
);

// PATCH  /api/v1/bookmarks/:bookmarkId/annotations/:annotationId — update
annotationsRouter.patch(
  '/:annotationId',
  validate({ body: UpdateAnnotationSchema }),
  AnnotationsController.update,
);

// DELETE /api/v1/bookmarks/:bookmarkId/annotations/:annotationId — delete
annotationsRouter.delete('/:annotationId', AnnotationsController.remove);

export { annotationsRouter };
