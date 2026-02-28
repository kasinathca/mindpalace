// ─────────────────────────────────────────────────────────────────────────────
// modules/tags/tags.router.ts — Route definitions for /api/v1/tags
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import type { IRouter } from 'express';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { CreateTagSchema, UpdateTagSchema, MergeTagsSchema } from './tags.schemas.js';
import * as TagsController from './tags.controller.js';

const tagsRouter: IRouter = Router();

// All tag routes require authentication
tagsRouter.use(jwtAuthGuard);

// GET  /api/v1/tags        — list all tags for the authenticated user
tagsRouter.get('/', TagsController.list);

// POST /api/v1/tags        — create a new tag
tagsRouter.post('/', validate({ body: CreateTagSchema }), TagsController.create);

// POST /api/v1/tags/merge  — merge N source tags into one target tag
// Must be before /:id to avoid route collision
tagsRouter.post('/merge', validate({ body: MergeTagsSchema }), TagsController.merge);

// PATCH  /api/v1/tags/:id  — update a tag's name or color
tagsRouter.patch('/:id', validate({ body: UpdateTagSchema }), TagsController.update);

// DELETE /api/v1/tags/:id  — delete a tag
tagsRouter.delete('/:id', TagsController.remove);

export { tagsRouter };
