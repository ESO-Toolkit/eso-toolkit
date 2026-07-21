import { useEffect, useRef } from 'react';

interface VisibilityGatedIntervalOptions {
  /** Master switch — false tears the interval down entirely. Default true. */
  enabled?: boolean;
  /** Fire once immediately on (re)start instead of waiting a full interval. Default false. */
  leading?: boolean;
}

/**
 * setInterval that pauses entirely while the tab is hidden and catches up on
 * return: if at least one full interval elapsed while hidden, the callback
 * fires immediately on visibility, then the cadence restarts fresh.
 *
 * Use for pollers/refreshers — a hidden tab should not burn network and CPU
 * re-fetching data nobody is looking at (and re-rendering the tree per tick).
 * Mirrors the visibility pattern established in useCacheInvalidation.
 *
 * The callback is kept in a ref, so an unstable callback identity neither
 * resets the cadence nor goes stale.
 */
export function useVisibilityGatedInterval(
  callback: () => void,
  intervalMs: number,
  options: VisibilityGatedIntervalOptions = {},
): void {
  const { enabled = true, leading = false } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let intervalId: number | null = null;
    // Seeded so the first start only fires immediately when `leading` asks for
    // it; afterwards it tracks real fire times for the catch-up check.
    let lastFiredAt = leading ? Number.NEGATIVE_INFINITY : Date.now();

    const fire = (): void => {
      lastFiredAt = Date.now();
      callbackRef.current();
    };
    const start = (): void => {
      if (intervalId !== null) return;
      if (Date.now() - lastFiredAt >= intervalMs) fire();
      intervalId = window.setInterval(fire, intervalMs);
    };
    const stop = (): void => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibilityChange = (): void => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs, leading]);
}
