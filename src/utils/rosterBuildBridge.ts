/**
 * Roster ↔ Build Editor bridge utilities.
 *
 * snapshotBuildToSlot: extracts skills/cp/passives/food from a BuildSetup so the
 *   roster slot can store them inline (self-contained for URL sharing).
 *
 * createBuildFromSlot: creates a new Build pre-filled from a roster slot's inline
 *   data, ready to dispatch via loadBuild() from buildEditorSlice.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  Build,
  BuildChampionPoints,
  CombatRole,
  ESOClass,
} from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import type { DPSSlot, HealerSetup, TankSetup } from '../types/roster';

// ─── Shared inline shape ──────────────────────────────────────────────────────

export interface SlotInlineData {
  skills?: SkillsConfig;
  cpPoints?: BuildChampionPoints;
  passives?: number[];
  food?: { id?: number; name?: string };
}

// ─── Build → Slot ─────────────────────────────────────────────────────────────

/**
 * Extract inline data from a saved Build's setup to populate a roster slot.
 * Call this on Attach or Sync. Returns empty object if setupIndex is out of range.
 */
export function snapshotBuildToSlot(build: Build, setupIndex: number): SlotInlineData {
  const setup = build.setups[setupIndex];
  if (!setup) return {};

  const food = setup.consumables.food;
  return {
    skills: setup.skills,
    cpPoints: setup.cp,
    passives: setup.passives.length > 0 ? setup.passives : undefined,
    food: food.id != null || food.name ? food : undefined,
  };
}

// ─── Slot → Build ─────────────────────────────────────────────────────────────

type RosterSlot = DPSSlot | TankSetup | HealerSetup;

const makeEmptyCP = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

const makeEmptySkills = (): SkillsConfig => ({ 0: {}, 1: {} });

/**
 * Create a new Build pre-filled from a roster slot's inline data.
 * Gear is not transferred (slots only carry set IDs, not individual pieces).
 * The resulting Build is ready to dispatch via `loadBuild()`.
 */
export function createBuildFromSlot(
  slot: RosterSlot,
  esoClass: ESOClass = 'any-class',
  role: CombatRole = 'magicka-dps',
): Build {
  const playerName = 'playerName' in slot ? slot.playerName : undefined;
  const buildName = playerName ? `${playerName} (from roster)` : 'Build from roster';

  return {
    id: uuidv4(),
    name: buildName,
    shortDescription: '',
    esoClass,
    classSkillLines: [null, null, null],
    role,
    gameMode: 'pve',
    races: [],
    setups: [
      {
        id: uuidv4(),
        name: 'Default',
        attributes: { magicka: 0, health: 0, stamina: 0 },
        curse: 'none',
        mundusStone: '',
        gear: {},
        skills: slot.skills ?? makeEmptySkills(),
        cp: slot.cpPoints ?? makeEmptyCP(),
        consumables: { potions: [], food: slot.food ?? {} },
        passives: slot.passives ?? [],
        screenshots: [],
      },
    ],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'public', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
