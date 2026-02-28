// ─────────────────────────────────────────────────────────────────────────────
// hooks/useIntersectionObserver.ts — Observe when a sentinel element enters
// the viewport, used for infinite scroll.
//
// Usage:
//   const { ref } = useIntersectionObserver(onIntersect, { threshold: 0.1 });
//   <div ref={ref} />
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  enabled?: boolean;
}

/**
 * Attaches an IntersectionObserver to a ref element. Calls `onIntersect` when
 * the element enters the viewport. Pass `enabled: false` to pause observation.
 */
export function useIntersectionObserver(
  onIntersect: () => void,
  options: UseIntersectionObserverOptions = {},
): { ref: React.RefObject<HTMLDivElement> } {
  const { enabled = true, threshold = 0.1, rootMargin } = options;
  const ref = useRef<HTMLDivElement>(null);
  const stableCallback = useCallback(onIntersect, [onIntersect]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          stableCallback();
        }
      },
      rootMargin !== undefined ? { threshold, rootMargin } : { threshold },
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [enabled, threshold, rootMargin, stableCallback]);

  return { ref };
}
