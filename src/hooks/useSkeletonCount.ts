import { useState, useCallback } from 'react';

const PREFIX = 'eso:sk:';

function readStored(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (n > 0) return n;
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
  return fallback;
}

/**
 * Persists a UI item count to localStorage so skeleton loaders can display the
 * right number of rows/cards on the NEXT mount — even after a tab switch or
 * page navigation unmounts and remounts the component.
 *
 * Usage:
 *   const [count, persistCount] = useSkeletonCount(`deaths:${reportId}:${fightId}`, 4);
 *
 *   useEffect(() => {
 *     if (!isLoading && items.length > 0) persistCount(items.length);
 *   }, [isLoading, items.length, persistCount]);
 *
 *   // Use `count` as the skeleton row/card count while loading.
 *
 * @param storageKey   Stable, unique identifier for this count (include context
 *                     like reportId/fightId so counts don't bleed across fights).
 * @param defaultValue Fallback when nothing has been stored yet.
 */
export function useSkeletonCount(
  storageKey: string,
  defaultValue: number,
): [number, (n: number) => void] {
  const [count, setCount] = useState<number>(() => readStored(storageKey, defaultValue));

  const persist = useCallback(
    (n: number) => {
      if (n > 0) {
        setCount(n);
        try {
          localStorage.setItem(PREFIX + storageKey, String(n));
        } catch {
          // ignore write errors
        }
      }
    },
    [storageKey],
  );

  return [count, persist];
}
