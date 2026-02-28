// ─────────────────────────────────────────────────────────────────────────────
// hooks/useDebounce.ts — Debounce a value by a given delay
//
// Usage:
//   const debouncedQuery = useDebounce(query, 350);
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity. Useful for wiring search inputs to API calls.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
