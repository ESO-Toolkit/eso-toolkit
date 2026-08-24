/**
 * Shared damage-type categorization for the report insights and report summary
 * surfaces.
 *
 * Both the per-fight insights panel and the report-wide summary bucket outgoing
 * player damage into the same categories (Magic / Martial / Direct / Poison /
 * Damage over Time / Area of Effect / Status Effects / Fire). This module is the
 * single source of truth for that logic so the two surfaces can never drift
 * apart again.
 *
 * Notes:
 *  - `ability.type` from ESO Logs is a **bitmask** of {@link DamageTypeFlags}, not
 *    an exact string. We decode it bitwise so composite-flag abilities (e.g.
 *    `GENERIC | MAGIC`) are categorized correctly instead of silently dropped.
 *  - The categories are intentionally **non-exclusive** (a fire DOT counts toward
 *    Fire, Magic and DOT). Percentages computed against the returned `totalDamage`
 *    therefore can exceed 100%; surfaces should communicate that to the user.
 *  - Only player-outgoing damage is counted (`sourceIsFriendly === true` and the
 *    target is hostile), matching what players read as "damage done".
 */

import { DamageTypeFlags, KnownAbilities } from '../../../types/abilities';
import { DamageEvent, HitType } from '../../../types/combatlogEvents';

// AOE damage — ability IDs sourced from a database query against the ability table.
export const AOE_ABILITY_IDS: ReadonlySet<number> = Object.freeze(
  new Set<number>([
    126633, 75752, 133494, 227072, 172672, 102136, 183123, 186370, 189869, 185407, 191078, 183006,
    32711, 32714, 32948, 20252, 20930, 98438, 32792, 32794, 115572, 117809, 117854, 117715, 118011,
    123082, 118766, 122392, 118314, 143944, 143946, 118720, 23202, 23667, 29809, 29806, 23232,
    23214, 23196, 23208, 24329, 77186, 94424, 181331, 88802, 100218, 26869, 80172, 26794, 44432,
    26879, 26871, 108936, 62912, 62951, 62990, 85127, 40267, 40252, 61502, 62547, 62529, 38891,
    38792, 126474, 38745, 42029, 85432, 41990, 80107, 126720, 41839, 217348, 217459, 222678, 40161,
    38690, 63474, 63471, 40469, 215779,
  ]),
);

// Status-effect proc ability IDs (Burning, Chill, Concussion, Diseased,
// Hemorrhaging, Overcharged, Poisoned, Sundered).
export const STATUS_EFFECT_ABILITY_IDS: ReadonlySet<number> = Object.freeze(
  new Set<number>([18084, 95136, 95134, 178127, 148801, 178118, 21929, 178123]),
);

const FIRE = Number(DamageTypeFlags.FIRE); // 4
const POISON = Number(DamageTypeFlags.POISON); // 8
const FROST = Number(DamageTypeFlags.FROST); // 16
const MAGIC = Number(DamageTypeFlags.MAGIC); // 64
const DISEASE = Number(DamageTypeFlags.DISEASE); // 256
const SHOCK = Number(DamageTypeFlags.SHOCK); // 512
const PHYSICAL = Number(DamageTypeFlags.PHYSICAL); // 1
const BLEED = Number(DamageTypeFlags.BLEED); // 2

/** "Magic" damage = any of Magic / Fire / Frost / Shock flags. */
const MAGIC_FLAGS = MAGIC | FIRE | FROST | SHOCK;
/** "Martial" damage = any of Physical / Bleed / Poison / Disease flags. */
const MARTIAL_FLAGS = PHYSICAL | BLEED | POISON | DISEASE;

/** A single accumulated damage-type bucket. */
export interface DamageCategoryTotals {
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
}

/** Keys of the categorized damage buckets (excludes the `totalDamage` scalar). */
export type DamageCategoryKey =
  'magic' | 'martial' | 'direct' | 'poison' | 'dot' | 'aoe' | 'statusEffects' | 'fire';

export type CategorizedDamage = Record<DamageCategoryKey, DamageCategoryTotals> & {
  /**
   * Sum of player-outgoing damage across every counted event. This is the
   * coherent denominator for category percentages — it is built from the exact
   * same filtered population as the buckets.
   */
  totalDamage: number;
};

/** Minimal shape we need from a master-data ability record. */
export interface AbilityTypeInfo {
  type?: string | number | null;
}

export type AbilitiesLookup = Record<string | number, AbilityTypeInfo | undefined>;

const makeBucket = (): DamageCategoryTotals => ({ totalDamage: 0, hitCount: 0, criticalHits: 0 });

/**
 * Categorize a stream of damage events into the shared damage-type buckets.
 *
 * Counts only player-outgoing damage. `options.includeEvent` lets a caller apply
 * extra filtering (e.g. a selected player or target) without changing the
 * friendly/hostile invariant.
 */
export function categorizeDamageEvents(
  events: readonly DamageEvent[] | undefined | null,
  abilitiesById: AbilitiesLookup | undefined | null,
  options?: { includeEvent?: (event: DamageEvent) => boolean },
): CategorizedDamage {
  const result: CategorizedDamage = {
    magic: makeBucket(),
    martial: makeBucket(),
    direct: makeBucket(),
    poison: makeBucket(),
    dot: makeBucket(),
    aoe: makeBucket(),
    statusEffects: makeBucket(),
    fire: makeBucket(),
    totalDamage: 0,
  };

  if (!events) return result;

  const include = options?.includeEvent;

  for (const event of events) {
    // Count player-outgoing damage only (excludes damage taken, friendly fire).
    if (event.sourceIsFriendly !== true || event.targetIsFriendly) continue;
    if (include && !include(event)) continue;

    const amount = event.amount || 0;
    const crit = event.hitType === HitType.Critical ? 1 : 0;
    const ability = abilitiesById?.[event.abilityGameID];
    const typeNum = ability?.type != null ? Number(ability.type) : 0;

    result.totalDamage += amount;

    const add = (bucket: DamageCategoryTotals): void => {
      bucket.totalDamage += amount;
      bucket.hitCount += 1;
      bucket.criticalHits += crit;
    };

    const isDirectDamage =
      event.tick !== true || event.abilityGameID === KnownAbilities.RAPID_STRIKES;

    if (isDirectDamage) add(result.direct);
    if (event.tick === true) add(result.dot);
    if ((typeNum & POISON) === POISON || (typeNum & DISEASE) === DISEASE) add(result.poison);
    if ((typeNum & FIRE) === FIRE) add(result.fire);
    if (AOE_ABILITY_IDS.has(event.abilityGameID)) add(result.aoe);
    if (STATUS_EFFECT_ABILITY_IDS.has(event.abilityGameID)) add(result.statusEffects);
    if ((typeNum & MAGIC_FLAGS) !== 0) add(result.magic);
    if ((typeNum & MARTIAL_FLAGS) !== 0) add(result.martial);
  }

  return result;
}

/** A bucket within an exclusive partition. */
export type PartitionBucket = DamageCategoryTotals & { key: string; label: string };

/** An exclusive partition: every counted event lands in exactly one bucket, so
 *  the bucket percentages sum to 100%. */
export interface DamagePartition {
  buckets: PartitionBucket[];
  totalDamage: number;
}

export interface ExclusiveDamagePartitions {
  /** Direct vs Damage over Time. */
  byDelivery: DamagePartition;
  /** Magic vs Martial vs Other (magic-school flags take priority). */
  bySchool: DamagePartition;
}

/**
 * Partition player-outgoing damage into mutually-exclusive buckets (each event
 * counted once per partition), so percentages are a true 100% split — the
 * alternative presentation to the overlapping {@link categorizeDamageEvents}.
 */
export function partitionDamageEvents(
  events: readonly DamageEvent[] | undefined | null,
  abilitiesById: AbilitiesLookup | undefined | null,
  options?: { includeEvent?: (event: DamageEvent) => boolean },
): ExclusiveDamagePartitions {
  const direct = makeBucket();
  const dot = makeBucket();
  const magic = makeBucket();
  const martial = makeBucket();
  const other = makeBucket();
  let totalDamage = 0;

  const add = (bucket: DamageCategoryTotals, amount: number, crit: number): void => {
    bucket.totalDamage += amount;
    bucket.hitCount += 1;
    bucket.criticalHits += crit;
  };

  if (events) {
    const include = options?.includeEvent;
    for (const event of events) {
      if (event.sourceIsFriendly !== true || event.targetIsFriendly) continue;
      if (include && !include(event)) continue;

      const amount = event.amount || 0;
      const crit = event.hitType === HitType.Critical ? 1 : 0;
      const ability = abilitiesById?.[event.abilityGameID];
      const typeNum = ability?.type != null ? Number(ability.type) : 0;
      totalDamage += amount;

      // Delivery — exclusive (Rapid Strikes ticks count as direct).
      const isDirect = event.tick !== true || event.abilityGameID === KnownAbilities.RAPID_STRIKES;
      add(isDirect ? direct : dot, amount, crit);

      // School — exclusive, magic flags take priority over martial.
      if ((typeNum & MAGIC_FLAGS) !== 0) add(magic, amount, crit);
      else if ((typeNum & MARTIAL_FLAGS) !== 0) add(martial, amount, crit);
      else add(other, amount, crit);
    }
  }

  return {
    byDelivery: {
      totalDamage,
      buckets: [
        { key: 'direct', label: 'Direct', ...direct },
        { key: 'dot', label: 'Damage over Time', ...dot },
      ],
    },
    bySchool: {
      totalDamage,
      buckets: [
        { key: 'magic', label: 'Magic', ...magic },
        { key: 'martial', label: 'Martial', ...martial },
        { key: 'other', label: 'Other', ...other },
      ],
    },
  };
}
