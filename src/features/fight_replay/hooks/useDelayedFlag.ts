/**
 * useDelayedFlag
 *
 * Hysteresis for loading flags that drive full-screen overlays: show only after
 * the flag has been truthy for `showDelayMs` (instant loads never flash the
 * overlay), and once shown keep it visible at least `minVisibleMs` (slow-ish
 * loads read as a deliberate transition, not a glitch).
 *
 * Used by the continuous-replay "Entering <area>" veil — a cached fight revisit
 * resolves in a few frames, and without the show-delay the frosted overlay
 * strobed on every chapter hop.
 *
 * @module features/fight_replay/hooks/useDelayedFlag
 */

import { useEffect, useRef, useState } from 'react';

export interface DelayedFlagOptions {
  /** How long the input must stay true before the output turns on (ms). */
  showDelayMs?: number;
  /** Minimum time the output stays on once shown (ms). */
  minVisibleMs?: number;
}

export function useDelayedFlag(
  flag: boolean,
  { showDelayMs = 150, minVisibleMs = 450 }: DelayedFlagOptions = {},
): boolean {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const clear = (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    clear();

    if (flag) {
      if (!visible) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          shownAtRef.current = Date.now();
          setVisible(true);
        }, showDelayMs);
      }
    } else if (visible) {
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      if (remaining === 0) {
        setVisible(false);
      } else {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          setVisible(false);
        }, remaining);
      }
    }

    return clear;
  }, [flag, visible, showDelayMs, minVisibleMs]);

  return visible;
}
