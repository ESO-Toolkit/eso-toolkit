import { useEffect, useState } from 'react';

import {
  isIconDataReady,
  preloadIconData,
} from '@/features/loadout-manager/utils/itemIconResolver';

/** Back-off schedule for retrying a failed icon-data load, in ms. */
const RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

/**
 * Readiness of the fetched icon data, the sibling of {@link useItemDataReady}.
 *
 * Icon data is what makes weapon-type questions answerable — `isTwoHandedWeapon`
 * classifies from the icon URL — so anything whose result depends on one-handed
 * vs two-handed (the Sharpened penetration split, equip-rule gating) must treat
 * it as an input and recompute when it lands, not just when item data does.
 *
 * Unlike `useItemDataReady`, a rejected load is retried on a short back-off
 * while still mounted. A consumer that silently degrades on failure — the stats
 * panel keeps showing the one-handed penetration — would otherwise stay wrong
 * for the life of the mount after one transient chunk/CDN failure, with nothing
 * on screen to say so. `failed` reports that every attempt was exhausted.
 */
export function useIconDataReady(): { ready: boolean; failed: boolean } {
  const [state, setState] = useState(() => ({
    ready: isIconDataReady(),
    failed: false,
    attempt: 0,
  }));

  useEffect(() => {
    if (state.ready) return undefined;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    preloadIconData()
      .then(() => {
        if (active) setState((prev) => ({ ...prev, ready: true, failed: false }));
      })
      .catch(() => {
        if (!active) return;
        // Another path may have resolved it in the meantime.
        if (isIconDataReady()) {
          setState((prev) => ({ ...prev, ready: true, failed: false }));
          return;
        }
        const delay = RETRY_DELAYS_MS[state.attempt];
        if (delay === undefined) {
          setState((prev) => ({ ...prev, ready: false, failed: true }));
          return;
        }
        retryTimer = setTimeout(() => {
          if (active) setState((prev) => ({ ...prev, attempt: prev.attempt + 1 }));
        }, delay);
      });

    return () => {
      active = false;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    };
  }, [state.ready, state.attempt]);

  return { ready: state.ready, failed: state.failed };
}
