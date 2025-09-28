import { useEffect, useState, useRef } from 'react';

interface UseStickyReturn {
  isSticky: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export const useSticky = (options?: {
  rootMargin?: string;
  threshold?: number;
}): UseStickyReturn => {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT intersecting (out of view), make footer sticky
        const shouldBeSticky = !entry.isIntersecting;
        setIsSticky(shouldBeSticky);
      },
      {
        rootMargin: options?.rootMargin || '-100px 0px 0px 0px',
        threshold: options?.threshold || 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [options?.rootMargin, options?.threshold]);

  return { isSticky, sentinelRef };
};
