// ─────────────────────────────────────────────────────────────────────────────
// lib/prisma.ts — Prisma client singleton
//
// A single PrismaClient instance is reused across the entire application.
// In development, hot-reloads (tsx watch) can trigger multiple instantiations;
// the global guard prevents "too many connections" warnings.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
