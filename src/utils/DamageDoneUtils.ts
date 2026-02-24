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

import { KnownAbilities, KnownSetIDs } from '../types/abilities';
import type { CombatantInfoEvent } from '../types/combatlogEvents';

import {
  type BuffLookupData,
  isBuffActive as isBuffActiveAtTimestamp,
  isBuffActiveOnTarget,
} from './BuffLookupUtils';
import { getSetCount } from './gearUtilities';

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
  // ── Champion Point sources ──
  /** Deadly Aim: +10% direct damage done */
  DEADLY_AIM: 10,
  /** Thaumaturge: +10% DoT damage done */
  THAUMATURGE: 10,
  /** Master-at-Arms: +5% direct damage done */
  MASTER_AT_ARMS: 5,
  /** Biting Aura: +3% damage done to nearby enemies */
  BITING_AURA: 3,
  /** Exploiter: +10% damage done vs Off Balance targets */
  EXPLOITER: 10,
  // ── Set bonus sources ──
  /** Deadly Strike (5pc): +15% DoT damage done */
  DEADLY_STRIKE: 15,
  // ── Target debuff sources ──
  /** Engulfing Flames: +10% Flame damage taken (applied to all damage when active — no type detection) */
  ENGULFING_FLAMES: 10,
  /** Touch of Z'en: +1% damage taken per DoT stack, max 5 stacks (assume max in trials) */
  TOUCH_OF_ZEN: 5,
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
  /** Ability ID, CP ID, or set ID depending on the source type */
  sourceId: number;
  value: number;
  type: 'damage_done' | 'damage_taken' | 'empower' | 'cp_damage_done' | 'set_damage_done';
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
  {
    name: 'Engulfing Flames',
    abilityId: KnownAbilities.ENGULFING_FLAMES_BUFF,
    value: DamageDoneValues.ENGULFING_FLAMES,
  },
  {
    name: 'Touch of Z\'en',
    abilityId: KnownAbilities.TOUCH_OF_ZEN,
    value: DamageDoneValues.TOUCH_OF_ZEN,
  },
];

/**
 * Champion Point slottable stars that increase damage done.
 *
 * These CPs do NOT appear in the ESO Logs API auras — they're baked into the
 * server-side damage formula. We assume DPS players have the standard meta CPs
 * slotted (Deadly Aim, Thaumaturge, Biting Aura, Master-at-Arms). This is a
 * valid assumption for organized trial content.
 *
 * Exploiter is handled separately since it DOES appear as aura 63880.
 */
const CP_DAMAGE_DONE_SOURCES: ReadonlyArray<{
  name: string;
  value: number;
  /** 'direct' = only non-tick, 'dot' = only tick, 'always' = both */
  condition: 'direct' | 'dot' | 'always';
}> = [
  {
    name: 'Deadly Aim',
    value: DamageDoneValues.DEADLY_AIM,
    condition: 'direct',
  },
  {
    name: 'Thaumaturge',
    value: DamageDoneValues.THAUMATURGE,
    condition: 'dot',
  },
  {
    name: 'Master-at-Arms',
    value: DamageDoneValues.MASTER_AT_ARMS,
    condition: 'direct',
  },
  {
    name: 'Biting Aura',
    value: DamageDoneValues.BITING_AURA,
    condition: 'always',
  },
];

/** Set bonuses that increase damage done (checked from combatantInfo.gear) */
const SET_DAMAGE_DONE_SOURCES: ReadonlyArray<{
  name: string;
  setId: KnownSetIDs;
  requiredPieces: number;
  value: number;
  condition: 'direct' | 'dot' | 'always';
}> = [
  {
    name: 'Deadly Strike',
    setId: KnownSetIDs.DEADLY_STRIKE,
    requiredPieces: 5,
    value: DamageDoneValues.DEADLY_STRIKE,
    condition: 'dot',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Check if a specific aura ability ID is present in combatantInfo.auras */
function hasAura(combatantInfo: CombatantInfoEvent | null, abilityId: number): boolean {
  if (!combatantInfo?.auras) return false;
  return combatantInfo.auras.some((aura) => aura.ability === abilityId);
}

/** Check if a set bonus is active (has enough pieces equipped) */
function isSetActive(
  combatantInfo: CombatantInfoEvent | null,
  setId: KnownSetIDs,
  requiredPieces: number,
): boolean {
  if (!combatantInfo?.gear) return false;
  return getSetCount(combatantInfo.gear, setId) >= requiredPieces;
}

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
 * @param combatantInfo - Optional combatant info for aura and set bonus detection
 * @param playerRole - Player role ('dps', 'healer', 'tank') for role-based CP assumptions
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
  combatantInfo?: CombatantInfoEvent | null,
  playerRole?: 'dps' | 'healer' | 'tank' | null,
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
      sourceId: source.abilityId,
      value: source.value,
      type: 'damage_done',
      isActive,
    });
    if (isActive) {
      damageDonePercent += source.value;
    }
  }

  // 2. Check Champion Point damage-done stars (assumed active for DPS role)
  //    These CPs don't appear in the ESO Logs API auras — they're baked into the
  //    server-side damage formula. We assume all DPS players have them slotted.
  const isDps = playerRole === 'dps';
  for (const source of CP_DAMAGE_DONE_SOURCES) {
    const meetsCondition =
      source.condition === 'always' ||
      (source.condition === 'direct' && isDirectDamage) ||
      (source.condition === 'dot' && !isDirectDamage);
    const isActive = meetsCondition && isDps;
    activeSources.push({
      name: `${source.name} (CP)`,
      sourceId: 0, // No real ESO ability ID — these CPs don't appear in API data
      value: source.value,
      type: 'cp_damage_done',
      isActive,
    });
    if (isActive) {
      damageDonePercent += source.value;
    }
  }

  // 3. Check Exploiter CP (+10% vs Off Balance targets)
  //    Exploiter DOES appear as aura 63880 in the ESO Logs API.
  {
    const hasExploiterCp = hasAura(combatantInfo ?? null, KnownAbilities.EXPLOITER);
    const targetOffBalance = isBuffActiveOnTarget(
      debuffLookup, KnownAbilities.OFF_BALANCE, timestamp, targetID,
    );
    const isActive = hasExploiterCp && targetOffBalance;
    activeSources.push({
      name: 'Exploiter (CP)',
      sourceId: KnownAbilities.EXPLOITER,
      value: DamageDoneValues.EXPLOITER,
      type: 'cp_damage_done',
      isActive,
    });
    if (isActive) {
      damageDonePercent += DamageDoneValues.EXPLOITER;
    }
  }

  // 4. Check set bonus damage-done sources (from combatantInfo.gear)
  for (const source of SET_DAMAGE_DONE_SOURCES) {
    const meetsCondition =
      source.condition === 'always' ||
      (source.condition === 'direct' && isDirectDamage) ||
      (source.condition === 'dot' && !isDirectDamage);
    const isActive = meetsCondition && isSetActive(combatantInfo ?? null, source.setId, source.requiredPieces);
    activeSources.push({
      name: `${source.name} (Set)`,
      sourceId: source.setId,
      value: source.value,
      type: 'set_damage_done',
      isActive,
    });
    if (isActive) {
      damageDonePercent += source.value;
    }
  }

  // 5. Check damage-taken debuffs on the target (always use debuffLookup)
  let damageTakenPercent = 0;
  for (const source of DAMAGE_TAKEN_DEBUFF_SOURCES) {
    const isActive = isBuffActiveOnTarget(debuffLookup, source.abilityId, timestamp, targetID);
    activeSources.push({
      name: source.name,
      sourceId: source.abilityId,
      value: source.value,
      type: 'damage_taken',
      isActive,
    });
    if (isActive) {
      damageTakenPercent += source.value;
    }
  }

  // 6. Check Empower (buff on attacker, only applies to direct damage)
  let empowerPercent = 0;
  if (isDirectDamage) {
    const empowerActive = eventBuffIds
      ? eventBuffIds.has(KnownAbilities.EMPOWER)
      : isBuffActiveAtTimestamp(buffLookup, KnownAbilities.EMPOWER, timestamp);
    activeSources.push({
      name: 'Empower',
      sourceId: KnownAbilities.EMPOWER,
      value: DamageDoneValues.EMPOWER,
      type: 'empower',
      isActive: empowerActive,
    });
    if (empowerActive) {
      empowerPercent = DamageDoneValues.EMPOWER;
    }
  }

  // 7. Combine: (1 + damageDone%) × (1 + damageTaken%) × (1 + empower%)
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
