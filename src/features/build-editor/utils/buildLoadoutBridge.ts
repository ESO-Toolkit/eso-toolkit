/**
 * Build Editor → Loadout Manager bridge.
 *
 * The Build Editor and the Loadout Manager describe the same ESO build with
 * different shapes: the editor uses a flat, class-centric `BuildSetup` (champion
 * points as three trees), while the loadout manager uses a leaner `LoadoutSetup`
 * (champion points as a flat 1-12 slot map) geared toward in-game addon export.
 * They already share the gear and skill types, so the only real transform is the
 * champion-point model and dropping editor-only metadata (class/race/mundus/etc.,
 * which Wizard's Wardrobe does not carry anyway).
 *
 * This is the seam that lets a build authored in the editor flow into the loadout
 * surface and out to Wizard's Wardrobe as a paste-in import code, without
 * re-entering anything.
 *
 * Lives in `build-editor` (not `loadout-manager`) to preserve the existing
 * one-way feature dependency build-editor → loadout-manager and avoid a cycle.
 */

import type { LoadoutSetup, ChampionPointsConfig } from '../../loadout-manager/types/loadout.types';
import {
  loadoutSetupToWWTransfer,
  type WWTransferResult,
} from '../../loadout-manager/utils/wizardWardrobeTransfer';
import type { BuildSetup } from '../types/build.types';

/**
 * Flatten the editor's three champion-point trees into the loadout manager's
 * 1-12 slot map. Matches the loadout manager's own import convention
 * (`wizardWardrobeConverter`): craft → slots 1-4, warfare → 5-8, fitness → 9-12.
 * Only slotted (non-null, positive) perks are carried — passive star
 * allocations are not part of the slotted-CP model.
 */
export function buildChampionPointsToFlat(cp: BuildSetup['cp']): ChampionPointsConfig {
  const flat: ChampionPointsConfig = {};
  const trees: Array<{ slots: Array<number | null>; offset: number }> = [
    { slots: cp?.craft?.slots ?? [], offset: 0 },
    { slots: cp?.warfare?.slots ?? [], offset: 4 },
    { slots: cp?.fitness?.slots ?? [], offset: 8 },
  ];
  for (const { slots, offset } of trees) {
    slots.forEach((abilityId, index) => {
      if (index < 4 && typeof abilityId === 'number' && abilityId > 0) {
        flat[offset + index + 1] = abilityId;
      }
    });
  }
  return flat;
}

/**
 * Convert a Build Editor `BuildSetup` into a Loadout Manager `LoadoutSetup`.
 * Gear and skills are shared types (copied as-is); champion points are flattened;
 * food is reduced to its item id. Editor-only fields (attributes, mundus, curse,
 * passives, screenshots) are intentionally dropped — they have no place in the
 * loadout / Wizard's Wardrobe model.
 */
export function buildSetupToLoadoutSetup(setup: BuildSetup): LoadoutSetup {
  return {
    name: setup.name?.trim() || 'Build',
    disabled: false,
    condition: {},
    skills: setup.skills ?? { 0: {}, 1: {} },
    cp: buildChampionPointsToFlat(setup.cp),
    food: typeof setup.consumables?.food?.id === 'number' ? { id: setup.consumables.food.id } : {},
    gear: setup.gear ?? {},
  };
}

/**
 * Encode a Build Editor `BuildSetup` directly as a Wizard's Wardrobe import code,
 * by bridging to a `LoadoutSetup` and reusing the loadout manager's WW Transfer
 * encoder. This is the end-to-end "plan a build, paste it into the game" path.
 */
export function buildSetupToWWTransfer(setup: BuildSetup): WWTransferResult {
  return loadoutSetupToWWTransfer(buildSetupToLoadoutSetup(setup));
}
