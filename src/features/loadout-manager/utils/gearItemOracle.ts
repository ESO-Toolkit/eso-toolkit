/**
 * Gear item oracle — a registration seam that lets modules in the EAGER
 * bundle graph (the root redux store via buildEditorSlice, setArmorWeights)
 * consult the ~11 MB itemIdMap WITHOUT statically importing it.
 *
 * Why: the root store must stay item-data-free or the entry chunk regains
 * the full map (see vite.config.mjs manualChunks 'item-data'). Every surface
 * that can dispatch gear-mutating actions or resolve apparel weights renders
 * item names/icons and therefore loads `itemIconResolver` — which registers
 * the real implementations at module-eval, before any such action can fire.
 *
 * Unregistered fallbacks are graceful: set names resolve to undefined (weight
 * treated as freely choosable) and no weapon counts as two-handed. In
 * practice registration always precedes use; the fallbacks exist for unit
 * tests that exercise reducers in isolation.
 */

interface GearItemOracle {
  /** Set name for an item id, or undefined when unknown. */
  getSetNameForItem: (itemId: number) => string | undefined;
  /** True when the item id is a two-handed weapon (occupies both hand slots). */
  isTwoHandedWeapon: (itemId: number) => boolean;
}

let oracle: GearItemOracle | null = null;

export function registerGearItemOracle(impl: GearItemOracle): void {
  oracle = impl;
}

export function getSetNameForItem(itemId: number): string | undefined {
  return oracle?.getSetNameForItem(itemId);
}

export function isTwoHandedWeaponId(itemId: number): boolean {
  return oracle?.isTwoHandedWeapon(itemId) ?? false;
}
