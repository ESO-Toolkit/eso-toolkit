/**
 * Set-piece counting for build views (/bv, roster build detail).
 *
 * ESO grants a two-handed weapon (greatsword, battle axe, maul, bow, any staff)
 * TWO set pieces from a single equipped item. Builds store a 2H weapon in one
 * weapon slot, so a naive "one piece per populated slot" count under-reports it
 * by one — which left arena weapon sets (e.g. Perfected Crushing Wall, whose
 * 2-piece and "(2 perfected items)" tiers come from a single ice staff) showing
 * their tiers as inactive on valid builds.
 *
 * `buildSetPieceCounts` mirrors the in-game math: a 2H weapon counts as 2.
 * `useSetPieceCounts` wraps it with async two-handed resolution so the count
 * settles correctly once icon data (the only per-item weapon-type signal) is
 * available, while the synchronous first render stays correct when it already is.
 */

import { useEffect, useState } from 'react';

import { getItemInfo } from '@/features/loadout-manager/data/itemIdMap';
import {
  isTwoHandedWeapon,
  fetchIsTwoHandedWeapon,
} from '@/features/loadout-manager/utils/itemIconResolver';

/**
 * Count set pieces by set name. `isTwoH(id)` decides whether an item supplies a
 * two-handed weapon's double contribution; non-two-handed items count as one.
 * Items with no known set (`getItemInfo` miss / no `setName`) are skipped.
 *
 * Pure and order-independent — duplicate ids (same item on both bars) each count,
 * matching the per-slot model. Over-counting can only make MORE bonuses appear
 * active, never fewer, so the activation display degrades gracefully.
 */
export function buildSetPieceCounts(
  itemIds: number[],
  isTwoH: (id: number) => boolean,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of itemIds) {
    const setName = getItemInfo(id)?.setName;
    if (!setName) continue;
    counts.set(setName, (counts.get(setName) ?? 0) + (isTwoH(id) ? 2 : 1));
  }
  return counts;
}

/**
 * React hook: set-piece counts for a build's equipped item ids, treating 2H
 * weapons as 2 pieces. Recomputes via the async two-handed resolver so newly
 * loaded icon data corrects the count; the initial value uses the synchronous
 * resolver (accurate once icon data is already warm).
 */
export function useSetPieceCounts(itemIds: number[]): Map<string, number> {
  // Stable primitive dependency — the hook only needs to re-resolve when the set
  // of equipped ids (and their order/multiplicity) changes.
  const key = itemIds.join(',');

  const [counts, setCounts] = useState<Map<string, number>>(() =>
    buildSetPieceCounts(itemIds, (id) => isTwoHandedWeapon(id)),
  );

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',').map(Number) : [];
    void (async () => {
      const flags = new Map<number, boolean>();
      await Promise.all(
        [...new Set(ids)].map(async (id) => {
          flags.set(id, await fetchIsTwoHandedWeapon(id));
        }),
      );
      if (cancelled) return;
      setCounts(buildSetPieceCounts(ids, (id) => flags.get(id) ?? false));
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return counts;
}
