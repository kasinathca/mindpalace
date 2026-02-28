// ─────────────────────────────────────────────────────────────────────────────
// types/express.d.ts — Express Request augmentation
//
// Adds req.user so TypeScript knows the shape of the authenticated user
// after the jwtAuthGuard middleware runs.
// ─────────────────────────────────────────────────────────────────────────────
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
