/**
 * Damage Done Multiplier Utilities
 *
 * Calculates the "damage done" multiplier from buffs/debuffs that scale final damage
 * multiplicatively. These are distinct from tooltip damage (which is scaled by
 * Brutality/Sorcery/Courage) and from critical damage bonuses.
 *
 * ESO "damage done" modifiers:
 *   - Minor Berserk (61744): +5% damage done (buff on attacker)
 *   - Major Berserk (61745): +10% damage done (buff on attacker)
 *   - Minor Slayer (147226): +5% PvE damage done (buff on attacker)
 *   - Major Slayer (93109): +10% PvE damage done (buff on attacker)
 *
 * ESO "damage taken" modifiers (debuff on target):
 *   - Minor Vulnerability (79717): +5% damage taken (debuff on target)
 *   - Major Vulnerability (106754): +10% damage taken (debuff on target)
 *
 * ESO Empower:
 *   - Empower (61737): +80% direct damage for light/heavy attacks (buff on attacker)
 *     Only applies to non-DoT (non-tick) direct damage from light/heavy attacks.
 *
 * The combined multiplier is:
 *   damageDone = (1 + sum_of_damage_done%) × (1 + sum_of_damage_taken%)
 *
 * Empower is applied separately as another multiplier on top of direct-damage abilities.
 */

import { KnownAbilities } from '../types/abilities';

import {
  type BuffLookupData,
  isBuffActive as isBuffActiveAtTimestamp,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Damage done percentage values for each buff source */
export const DamageDoneValues = {
  /** Minor Berserk: +5% damage done */
  MINOR_BERSERK: 5,
  /** Major Berserk: +10% damage done */
  MAJOR_BERSERK: 10,
  /** Minor Slayer: +5% PvE damage done */
  MINOR_SLAYER: 5,
  /** Major Slayer: +10% PvE damage done */
  MAJOR_SLAYER: 10,
  /** Minor Vulnerability: +5% damage taken */
  MINOR_VULNERABILITY: 5,
  /** Major Vulnerability: +10% damage taken */
  MAJOR_VULNERABILITY: 10,
  /** Empower: +80% light/heavy attack damage */
  EMPOWER: 80,
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DamageDoneBreakdown {
  /** Sum of "damage done" buff percentages on the attacker (Berserk + Slayer) */
  damageDonePercent: number;
  /** Sum of "damage taken" debuff percentages on the target (Vulnerability) */
  damageTakenPercent: number;
  /** Empower bonus percentage (80% for direct light/heavy attacks, 0 otherwise) */
  empowerPercent: number;
  /** Combined multiplier: (1 + damageDone%) × (1 + damageTaken%) × (1 + empower%) */
  totalMultiplier: number;
  /** Which sources are active */
  activeSources: DamageDoneSource[];
}

export interface DamageDoneSource {
  name: string;
  abilityId: KnownAbilities;
  value: number;
  type: 'damage_done' | 'damage_taken' | 'empower';
  isActive: boolean;
}

// ─── Source Definitions ─────────────────────────────────────────────────────────

/** Buffs that increase damage DONE (applied to attacker) */
const DAMAGE_DONE_BUFF_SOURCES: ReadonlyArray<{
  name: string;
  abilityId: KnownAbilities;
  value: number;
}> = [
  {
    name: 'Minor Berserk',
    abilityId: KnownAbilities.MINOR_BERSERK,
    value: DamageDoneValues.MINOR_BERSERK,
  },
  {
    name: 'Major Berserk',
    abilityId: KnownAbilities.MAJOR_BERSERK,
    value: DamageDoneValues.MAJOR_BERSERK,
  },
  {
    name: 'Minor Slayer',
    abilityId: KnownAbilities.MINOR_SLAYER,
    value: DamageDoneValues.MINOR_SLAYER,
  },
  {
    name: 'Major Slayer',
    abilityId: KnownAbilities.MAJOR_SLAYER,
    value: DamageDoneValues.MAJOR_SLAYER,
  },
];

/** Debuffs that increase damage TAKEN (applied to target) */
const DAMAGE_TAKEN_DEBUFF_SOURCES: ReadonlyArray<{
  name: string;
  abilityId: KnownAbilities;
  value: number;
}> = [
  {
    name: 'Minor Vulnerability',
    abilityId: KnownAbilities.MINOR_VULNERABILITY,
    value: DamageDoneValues.MINOR_VULNERABILITY,
  },
  {
    name: 'Major Vulnerability',
    abilityId: KnownAbilities.MAJOR_VULNERABILITY,
    value: DamageDoneValues.MAJOR_VULNERABILITY,
  },
];

// ─── Core Computation ───────────────────────────────────────────────────────────

/**
 * Calculate the damage-done multiplier at a specific timestamp for a damage event.
 *
 * Uses event.buffs snapshot as primary source for attacker-side buffs (Berserk, Slayer,
 * Empower) when available, with BuffLookup as fallback. Target-side debuffs (Vulnerability)
 * always use debuffLookup since event.buffs only contains attacker buffs.
 *
 * @param buffLookup - Buff lookup data (fallback for attacker buffs: Berserk, Slayer, Empower)
 * @param debuffLookup - Debuff lookup data (for target debuffs: Vulnerability)
 * @param timestamp - The timestamp of the damage event
 * @param sourceID - The attacker's ID (buffs are checked on this target)
 * @param targetID - The target's ID (debuffs are checked on this target)
 * @param isDirectDamage - Whether this is direct damage (not a DoT tick). Empower only applies to direct damage.
 * @param eventBuffIds - Optional set of buff ability IDs from event.buffs snapshot (preferred for attacker buffs)
 * @returns DamageDoneBreakdown with the computed multiplier and active sources
 */
export function calculateDamageDoneAtTimestamp(
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  timestamp: number,
  sourceID: number,
  targetID: number,
  isDirectDamage: boolean,
  eventBuffIds?: ReadonlySet<number> | null,
): DamageDoneBreakdown {
  const activeSources: DamageDoneSource[] = [];

  // 1. Check damage-done buffs on the attacker (use event.buffs when available)
  let damageDonePercent = 0;
  for (const source of DAMAGE_DONE_BUFF_SOURCES) {
    const isActive = eventBuffIds
      ? eventBuffIds.has(source.abilityId)
      : isBuffActiveOnTarget(buffLookup, source.abilityId, timestamp, sourceID);
    activeSources.push({
      name: source.name,
      abilityId: source.abilityId,
      value: source.value,
      type: 'damage_done',
      isActive,
    });
    if (isActive) {
      damageDonePercent += source.value;
    }
  }

  // 2. Check damage-taken debuffs on the target (always use debuffLookup)
  let damageTakenPercent = 0;
  for (const source of DAMAGE_TAKEN_DEBUFF_SOURCES) {
    const isActive = isBuffActiveOnTarget(debuffLookup, source.abilityId, timestamp, targetID);
    activeSources.push({
      name: source.name,
      abilityId: source.abilityId,
      value: source.value,
      type: 'damage_taken',
      isActive,
    });
    if (isActive) {
      damageTakenPercent += source.value;
    }
  }

  // 3. Check Empower (buff on attacker, only applies to direct damage)
  let empowerPercent = 0;
  if (isDirectDamage) {
    const empowerActive = eventBuffIds
      ? eventBuffIds.has(KnownAbilities.EMPOWER)
      : isBuffActiveAtTimestamp(buffLookup, KnownAbilities.EMPOWER, timestamp);
    activeSources.push({
      name: 'Empower',
      abilityId: KnownAbilities.EMPOWER,
      value: DamageDoneValues.EMPOWER,
      type: 'empower',
      isActive: empowerActive,
    });
    if (empowerActive) {
      empowerPercent = DamageDoneValues.EMPOWER;
    }
  }

  // 4. Combine: (1 + damageDone%) × (1 + damageTaken%) × (1 + empower%)
  const totalMultiplier =
    (1 + damageDonePercent / 100) *
    (1 + damageTakenPercent / 100) *
    (1 + empowerPercent / 100);

  return {
    damageDonePercent,
    damageTakenPercent,
    empowerPercent,
    totalMultiplier,
    activeSources,
  };
}
