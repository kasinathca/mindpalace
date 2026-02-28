// ─────────────────────────────────────────────────────────────────────────────
// modules/search/search.router.ts — Routes for /api/v1/search
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import type { IRouter } from 'express';
import { jwtAuthGuard } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { SearchQuerySchema } from './search.schemas.js';
import * as SearchController from './search.controller.js';

const searchRouter: IRouter = Router();

// All search routes require authentication
searchRouter.use(jwtAuthGuard);

// GET /api/v1/search?q=query&...filters
searchRouter.get('/', validate({ query: SearchQuerySchema }), SearchController.search);

// GET /api/v1/search/duplicates — bookmarks saved more than once with same URL
searchRouter.get('/duplicates', SearchController.duplicates);

// GET /api/v1/search/similar?url= — bookmarks with same base URL (query-string-agnostic)
searchRouter.get('/similar', SearchController.similar);

export { searchRouter };
