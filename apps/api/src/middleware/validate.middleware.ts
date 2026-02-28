// ─────────────────────────────────────────────────────────────────────────────
// middleware/validate.middleware.ts — Zod schema validation factory
//
// Usage:
//   router.post('/path', validate({ body: MySchema }), controller.create)
//
// The factory parses req.body / req.params / req.query and overwrites them
// with the parsed (coerced, trimmed) result. If parsing fails, the Zod error
// is forwarded to the global error handler via next(err).
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidateSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.query) {
        // Express 5 defines req.query as a getter-only property on the prototype,
        // so direct assignment throws. Use Object.defineProperty to override it
        // on the instance with the Zod-coerced value.
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
