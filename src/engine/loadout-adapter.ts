/**
 * Loadout → engine adapter.
 *
 * The pure stat engine consumes a Build Editor `BuildSetup` + `Build`. A Loadout
 * Manager `LoadoutSetup` carries gear / skills / champion points / food but NO
 * character context (race, class skill lines, mundus, attributes) — so the stats
 * it can produce are GEAR-DERIVED. This adapter builds the minimal { setup, build }
 * the engine needs, defaulting unknown character fields to neutral values. Callers
 * that know the character (e.g. from CharacterInfo) can pass `context` to enrich
 * the result.
 *
 * Lives in `src/engine` (neutral) so the Loadout Manager can import it WITHOUT
 * importing build-editor `components/` — preserving the one-way build-editor →
 * loadout-manager dependency.
 */

import type {
  Build,
  BuildChampionPoints,
  BuildSetup,
  ChampionTree,
  ClassSkillLineId,
  CombatRole,
  ESOClass,
  GameMode,
} from '@features/build-editor/types/build.types';
import type { LoadoutSetup } from '@features/loadout-manager/types/loadout.types';

/** Optional character context a caller can supply to enrich gear-derived stats. */
export interface LoadoutStatContext {
  esoClass?: ESOClass;
  classSkillLines?: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
  races?: string[];
  gameMode?: GameMode;
  mundusStone?: string;
  /** Attribute points invested in Health, if known. */
  healthAttributes?: number;
}

const emptyTree = (): ChampionTree => ({ slots: [], passives: {} });

const emptyChampionPoints = (): BuildChampionPoints => ({
  warfare: emptyTree(),
  fitness: emptyTree(),
  craft: emptyTree(),
});

/**
 * Construct the minimal { setup, build } the stat engine reads from a LoadoutSetup.
 * The engine only reads gear / mundus / attributes / cp off the setup and
 * gameMode / races / classSkillLines / esoClass / classMasteryPassives off the
 * build; everything else is filled with neutral, valid placeholders.
 */
export function loadoutSetupToEngineInputs(
  loadout: LoadoutSetup,
  context: LoadoutStatContext = {},
): { setup: BuildSetup; build: Build } {
  const setup: BuildSetup = {
    id: 'loadout-stat-preview',
    name: loadout.name ?? '',
    attributes: { magicka: 0, health: context.healthAttributes ?? 0, stamina: 0 },
    curse: '',
    mundusStone: context.mundusStone ?? '',
    gear: loadout.gear ?? {},
    skills: loadout.skills ?? { 0: {}, 1: {} },
    // Loadout CP is a flat 1-12 slot map that can't be reverse-mapped to the
    // editor's three trees; CP-derived stats (Piercing/Precision/Fighting Finesse
    // live in passives/slottables) are intentionally left out of the preview.
    cp: emptyChampionPoints(),
    consumables: {
      potions: [],
      food: typeof loadout.food?.id === 'number' ? { id: loadout.food.id } : {},
    },
    passives: [],
    screenshots: [],
  };

  const build: Build = {
    id: 'loadout-stat-preview',
    name: loadout.name ?? '',
    shortDescription: '',
    esoClass: context.esoClass ?? 'any-class',
    classSkillLines: context.classSkillLines ?? [null, null, null],
    classMasteryPassives: [],
    role: 'stamina-dps' as CombatRole,
    gameMode: context.gameMode ?? 'pve',
    races: context.races ?? [],
    setups: [setup],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'private', dlc: '', setupOrder: [] },
    addonImportString: '',
    createdAt: '',
    updatedAt: '',
  };

  return { setup, build };
}
