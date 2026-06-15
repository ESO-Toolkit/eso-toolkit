/**
 * Catalog type vocabulary — the schema for the all-class ultimate-source data.
 *
 * The engine (core/) is class-agnostic; it only knows generic `UltimateSource`s.
 * The CATALOG is the data layer that knows ESO specifics: which sources belong
 * to which class, which sets/mythics/CP/potions exist, what an ultimate costs,
 * and what reduces that cost. The presentation layer lets the user pick a
 * class/role/context and toggle catalog entries on/off; enabled entries are
 * compiled into the engine's `UltimateSource[]` + cost inputs.
 *
 * This file defines only the SHAPE. The actual numbers live in catalog data
 * files and are research-sourced (each entry carries its `source` citation and
 * `confidence`), so "no guessing" is enforced structurally — an entry without a
 * citation is visibly incomplete.
 */

import type { CostReduction } from '../../core/cost';

import type { UltimateSource } from './index';

/** Canonical ESO class keys (matches src/utils/classNameUtils.ts). */
export type EsoClass =
  | 'dragonknight'
  | 'templar'
  | 'warden'
  | 'nightblade'
  | 'sorcerer'
  | 'necromancer'
  | 'arcanist';

export const ESO_CLASSES: readonly EsoClass[] = [
  'arcanist',
  'dragonknight',
  'necromancer',
  'nightblade',
  'sorcerer',
  'templar',
  'warden',
];

export const ESO_CLASS_LABELS: Record<EsoClass, string> = {
  arcanist: 'Arcanist',
  dragonknight: 'Dragonknight',
  necromancer: 'Necromancer',
  nightblade: 'Nightblade',
  sorcerer: 'Sorcerer',
  templar: 'Templar',
  warden: 'Warden',
};

/** Combat role — drives which support sources are realistically available. */
export type CombatRole = 'dps' | 'healer' | 'tank';

/** Where the build is being played — gates group-only buffs and PvP-only items. */
export type CombatContext = 'soloPve' | 'groupPve' | 'pvp';

export const COMBAT_CONTEXT_LABELS: Record<CombatContext, string> = {
  soloPve: 'Solo / parse (PvE)',
  groupPve: 'Group / trial (PvE)',
  pvp: 'PvP',
};

/** What kind of thing a catalog entry is (for grouping in the UI). */
export type SourceCategory =
  | 'base' // light/heavy-attack income, damage-dealt/taken income
  | 'heroism' // Minor/Major Heroism from any provider
  | 'classPassive' // class skill-line passives that generate ult
  | 'set' // gear sets
  | 'mythic' // one-piece mythics
  | 'championPoint' // CP stars
  | 'potion' // alchemy potions
  | 'synergy' // group synergies
  | 'external'; // ult batteried/granted by an ally (group context)

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  base: 'Base income',
  heroism: 'Heroism',
  classPassive: 'Class passive',
  set: 'Gear set',
  mythic: 'Mythic',
  championPoint: 'Champion Point',
  potion: 'Potion',
  synergy: 'Synergy',
  external: 'Group support',
};

export type Confidence = 'high' | 'medium' | 'low';

/**
 * A single catalog entry: a generation source the user can toggle on/off.
 *
 * It extends the engine's `UltimateSource` (so an enabled entry compiles
 * directly into the engine) with catalog metadata: category, the contexts/roles
 * /classes it's available in, a default-on flag, and provenance.
 */
export interface CatalogSource extends UltimateSource {
  readonly category: SourceCategory;
  /** Contexts this source can appear in (e.g. external support is group-only). */
  readonly availableIn: readonly CombatContext[];
  /** If set, only these classes can use it (class passives). Omit = all classes. */
  readonly classes?: readonly EsoClass[];
  /** If set, only these roles realistically run it. Omit = any role. */
  readonly roles?: readonly CombatRole[];
  /** Whether it's enabled by default for its context (typical raid build). */
  readonly defaultEnabled: boolean;
  /**
   * Key for a named buff that does NOT stack across providers (e.g. Minor
   * Heroism from the generic potion/set source AND from Cryptcanon are the same
   * buff). When more than one enabled source shares this key, only the strongest
   * single contribution counts — they are not summed. Omit for sources that do
   * stack independently (base income, class passives, external batteries).
   */
  readonly nonStackingGroup?: string;
  /** Source URL the value came from (research provenance — required, no guessing). */
  readonly provenance: string;
  /** Confidence in the encoded numbers. */
  readonly confidence: Confidence;
  /** Human-readable note shown in the UI. */
  readonly description?: string;
}

/** A catalog entry for an ultimate-cost reduction (compiles into CostReduction). */
export interface CatalogCostReduction extends CostReduction {
  readonly category: SourceCategory;
  readonly availableIn: readonly CombatContext[];
  readonly classes?: readonly EsoClass[];
  readonly defaultEnabled: boolean;
  readonly provenance: string;
  readonly confidence: Confidence;
  readonly description?: string;
}

/** A known ultimate (ability) with its base cost — for the time-to-ult picker. */
export interface UltimateAbility {
  readonly id: string;
  readonly label: string;
  /** Base ultimate cost before any reduction. */
  readonly baseCost: number;
  /** Class that owns it, or 'weapon'/'global' for shared/weapon-line ults. */
  readonly owner: EsoClass | 'weapon' | 'global';
  readonly provenance: string;
  readonly confidence: Confidence;
}
