// ─────────────────────────────────────────────────────────────────────────────
// modules/annotations/annotations.service.ts — Annotation business logic
//
// Annotations live on a PermanentCopy, which belongs to a Bookmark.
// This service:
//   1. Resolves bookmarkId → permanentCopy (creating a stub if needed)
//   2. Enforces ownership: the bookmark and all annotations must belong to userId
//   3. Provides full CRUD for annotations
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.middleware.js';
import { HTTP } from '../../config/constants.js';
import type { CreateAnnotationInput, UpdateAnnotationInput } from './annotations.schemas.js';
import { Prisma } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnnotationOut {
  id: string;
  type: string;
  content: string;
  positionData: Prisma.JsonValue | null;
  color: string | null;
  isPublic: boolean;
  permanentCopyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialise(annotation: {
  id: string;
  type: string;
  content: string;
  positionData: Prisma.JsonValue | null;
  color: string | null;
  isPublic: boolean;
  permanentCopyId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): AnnotationOut {
  return {
    id: annotation.id,
    type: annotation.type,
    content: annotation.content,
    positionData: annotation.positionData,
    color: annotation.color,
    isPublic: annotation.isPublic,
    permanentCopyId: annotation.permanentCopyId,
    userId: annotation.userId,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
  };
}

/**
 * Resolves the PermanentCopy for a given bookmark, verifying ownership.
 * If no PermanentCopy exists yet, a stub is created so annotations can still
 * be persisted (the archival worker may populate content later).
 */
async function resolvePermanentCopy(bookmarkId: string, userId: string): Promise<string> {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    select: { id: true, userId: true, permanentCopy: { select: { id: true } } },
  });

  if (!bookmark || bookmark.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }

  if (bookmark.permanentCopy) {
    return bookmark.permanentCopy.id;
  }

  // Create a stub PermanentCopy so annotations have a parent
  const stub = await prisma.permanentCopy.create({
    data: { bookmarkId },
  });
  return stub.id;
}

// ── Service methods ───────────────────────────────────────────────────────────

/** List all annotations on the permanent copy linked to bookmarkId. */
export async function listAnnotations(
  userId: string,
  bookmarkId: string,
): Promise<AnnotationOut[]> {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    select: { userId: true, permanentCopy: { select: { id: true } } },
  });

  if (!bookmark || bookmark.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }

  if (!bookmark.permanentCopy) {
    return []; // no permanent copy yet => no annotations
  }

  const annotations = await prisma.annotation.findMany({
    where: { permanentCopyId: bookmark.permanentCopy.id, userId },
    orderBy: { createdAt: 'asc' },
  });

  return annotations.map(serialise);
}

/** Create a new annotation on the bookmark's permanent copy. */
export async function createAnnotation(
  userId: string,
  bookmarkId: string,
  input: CreateAnnotationInput,
): Promise<AnnotationOut> {
  const permanentCopyId = await resolvePermanentCopy(bookmarkId, userId);

  const annotation = await prisma.annotation.create({
    data: {
      type: input.type,
      content: input.content,
      positionData: input.positionData ?? Prisma.JsonNull,
      color: input.color ?? null,
      isPublic: input.isPublic,
      permanentCopyId,
      userId,
    },
  });

  return serialise(annotation);
}

/** Update an existing annotation. Only the owner may update. */
export async function updateAnnotation(
  userId: string,
  annotationId: string,
  input: UpdateAnnotationInput,
): Promise<AnnotationOut> {
  const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Annotation not found.');
  }

  const updated = await prisma.annotation.update({
    where: { id: annotationId },
    data: {
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.positionData !== undefined
        ? { positionData: input.positionData ?? Prisma.JsonNull }
        : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    },
  });

  return serialise(updated);
}

/** Delete an annotation. Only the owner may delete. */
export async function deleteAnnotation(userId: string, annotationId: string): Promise<void> {
  const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Annotation not found.');
  }
  await prisma.annotation.delete({ where: { id: annotationId } });
}
