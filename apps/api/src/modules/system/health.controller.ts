import type { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    },
  });
}
