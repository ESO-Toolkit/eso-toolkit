import { useEffect, useState } from 'react';

import { isItemDataReady, preloadItemData } from '@/features/loadout-manager/data/itemIdMap';

/**
 * Readiness of the fetched item data (itemIdMap JSON).
 *
 * `ready` flips true once the map is populated — use it to gate renders (or as
 * a memo dependency) so results computed against the empty pre-init map are
 * recomputed when the data lands. `failed` flips true when the current fetch
 * attempt definitively rejected — gates that would otherwise show a loading
 * state forever should render their degraded fallback instead (matching the
 * pre-conversion behavior when item lookups miss). preloadItemData resets its
 * promise on failure, so a later mount retries automatically.
 */
export function useItemDataReady(): { ready: boolean; failed: boolean } {
  const [state, setState] = useState(() => ({ ready: isItemDataReady(), failed: false }));

  useEffect(() => {
    if (state.ready) return undefined;
    let active = true;
    preloadItemData()
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
