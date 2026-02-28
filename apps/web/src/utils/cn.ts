// ─────────────────────────────────────────────────────────────────────────────
// utils/cn.ts — Class name merger (shadcn/ui convention)
// ─────────────────────────────────────────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
