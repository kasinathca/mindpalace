// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.router.ts — Route definitions
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import type { IRouter } from 'express';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  ReorderCollectionSchema,
  DeleteCollectionQuerySchema,
} from './collections.schemas.js';
import * as CollectionsController from './collections.controller.js';

const collectionsRouter: IRouter = Router();

// All collection routes require authentication
collectionsRouter.use(jwtAuthGuard);

collectionsRouter.get('/', CollectionsController.getTree);

collectionsRouter.post(
  '/',
  validate({ body: CreateCollectionSchema }),
  CollectionsController.create,
);

collectionsRouter.patch(
  '/:id',
  validate({ body: UpdateCollectionSchema }),
  CollectionsController.update,
);

collectionsRouter.patch(
  '/:id/reorder',
  validate({ body: ReorderCollectionSchema }),
  CollectionsController.reorder,
);

collectionsRouter.delete(
  '/:id',
  validate({ query: DeleteCollectionQuerySchema }),
  CollectionsController.remove,
);

export { collectionsRouter };
