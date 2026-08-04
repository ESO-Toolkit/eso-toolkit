import { useEffect, useState } from 'react';

import {
  isIconDataReady,
  preloadIconData,
} from '@/features/loadout-manager/utils/itemIconResolver';

/**
 * Readiness of the fetched icon data, the sibling of {@link useItemDataReady}.
 *
 * Icon data is what makes weapon-type questions answerable — `isTwoHandedWeapon`
 * classifies from the icon URL — so anything whose result depends on one-handed
 * vs two-handed (the Sharpened penetration split, equip-rule gating) must treat
 * it as an input and recompute when it lands, not just when item data does.
 *
 * `failed` reports a definitively rejected attempt; preloadIconData clears its
 * promise on failure, so a later mount retries.
 */
export function useIconDataReady(): { ready: boolean; failed: boolean } {
  const [state, setState] = useState(() => ({ ready: isIconDataReady(), failed: false }));

  useEffect(() => {
    if (state.ready) return undefined;
    let active = true;
    preloadIconData()
      .then(() => {
        if (active) setState({ ready: true, failed: false });
      })
      .catch(() => {
        if (active) setState({ ready: false, failed: true });
      });
    return () => {
      active = false;
    };
  }, [state.ready]);

  return state;
}
