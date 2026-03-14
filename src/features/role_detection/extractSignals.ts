/**
 * Signal Extraction
 *
 * Extracts raw role-detection signals from combat log events for each player
 * in a fight. These signals are then fed into the classification algorithm.
 */

import {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  CastEvent,
  CombatantInfoEvent,
  DamageEvent,
  HealEvent,
  RemoveDebuffEvent,
} from '@/types/combatlogEvents';
import { ArmorType, GearSlot, PlayerGear, WeaponType } from '@/types/playerDetails';

import {
  BARRIER_ABILITY_IDS,
  DPS_MONSTER_SET_IDS,
  DPS_SET_IDS,
  HEALER_MONSTER_SET_IDS,
  HEALER_SET_IDS,
  HORN_ABILITY_IDS,
  MAJOR_COURAGE_BUFF_IDS,
  SUPPORT_DPS_SET_IDS,
  TANK_MONSTER_SET_IDS,
  TANK_SET_IDS,
  TAUNT_ABILITY_IDS,
  TAUNT_DEBUFF_ID,
} from './constants';
import { PlayerRoleSignals } from './types';

/**
 * Input events needed for role detection signal extraction.
 * The caller is responsible for filtering these from the full event stream.
 */
export interface RoleDetectionEvents {
  damageEvents: DamageEvent[];
  healEvents: HealEvent[];
  castEvents: CastEvent[];
  applyDebuffEvents: ApplyDebuffEvent[];
  removeDebuffEvents: RemoveDebuffEvent[];
  applyBuffEvents: ApplyBuffEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
}

/**
 * Metadata about the fight needed for signal extraction.
 */
export interface FightContext {
  fightId: number;
  startTime: number;
  endTime: number;
  /** Actor IDs of friendly players in this fight */
  friendlyPlayerIds: number[];
  /** Actor IDs of enemies (bosses and adds). Used to identify the primary boss. */
  enemyNpcIds: number[];
  /** The primary boss actor ID (highest-priority target for taunt analysis) */
  primaryBossId: number | null;
  /** Map of player ID → player name */
  playerNames: Map<number, string>;
}

/**
 * Extract role detection signals for all players in a fight.
 */
export function extractSignals(
  events: RoleDetectionEvents,
  context: FightContext,
): PlayerRoleSignals[] {
  const { friendlyPlayerIds } = context;
  const fightDurationMs = context.endTime - context.startTime;

  // Initialize per-player accumulators
  const playerSignals = new Map<number, PlayerRoleSignals>();
  for (const playerId of friendlyPlayerIds) {
    playerSignals.set(
      playerId,
      createEmptySignals(playerId, context.playerNames.get(playerId) ?? `Player ${playerId}`),
    );
  }

  // --- Pass 1: Gear analysis from CombatantInfoEvents ---
  extractGearSignals(events.combatantInfoEvents, playerSignals);

  // --- Pass 2: Damage output ---
  const groupTotalDamage = extractDamageSignals(events.damageEvents, playerSignals, context);

  // --- Pass 3: Healing output ---
  const groupTotalHealing = extractHealingSignals(events.healEvents, playerSignals, context);

  // --- Pass 4: Damage taken ---
  const groupTotalDamageTaken = extractDamageTakenSignals(
    events.damageEvents,
    playerSignals,
    context,
  );

  // --- Pass 5: Taunt tracking ---
  extractTauntSignals(
    events.castEvents,
    events.applyDebuffEvents,
    events.removeDebuffEvents,
    playerSignals,
    context,
    fightDurationMs,
  );

  // --- Pass 6: Ultimate and buff signals ---
  extractUltimateAndBuffSignals(events.castEvents, events.applyBuffEvents, playerSignals, context);

  // --- Pass 7: Compute ratios ---
  computeRatios(
    playerSignals,
    groupTotalDamage,
    groupTotalHealing,
    groupTotalDamageTaken,
    fightDurationMs,
  );

  return Array.from(playerSignals.values());
}

function createEmptySignals(playerId: number, playerName: string): PlayerRoleSignals {
  return {
    playerId,
    playerName,
    tauntCastCount: 0,
    tauntUptimeOnBossMs: 0,
    tauntedUniqueEnemies: 0,
    hasShieldWeapon: false,
    hasFrostStaff: false,
    heavyArmorCount: 0,
    tankSetIds: [],
    healerSetIds: [],
    dpsSetIds: [],
    supportDpsSetIds: [],
    totalDamage: 0,
    dps: 0,
    totalHealing: 0,
    hps: 0,
    overhealRatio: 0,
    damageShareOfGroup: 0,
    healingShareOfGroup: 0,
    damageTaken: 0,
    damageTakenShareOfGroup: 0,
    blockedHitCount: 0,
    totalHitsTaken: 0,
    hornCasts: 0,
    barrierCasts: 0,
    majorCourageTargets: 0,
    shieldAppliedToOthers: 0,
  };
}

// ============================================================
// Gear Signal Extraction
// ============================================================

function extractGearSignals(
  combatantInfoEvents: CombatantInfoEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
): void {
  // Use the last combatantinfo event per player (most up-to-date gear)
  const latestInfoByPlayer = new Map<number, CombatantInfoEvent>();
  for (const event of combatantInfoEvents) {
    latestInfoByPlayer.set(event.sourceID, event);
  }

  for (const [playerId, event] of latestInfoByPlayer) {
    const signals = playerSignals.get(playerId);
    if (!signals) continue;

    const gear = event.gear;
    if (!gear?.length) continue;

    // Analyze weapons — gear array index IS the slot (ESO Logs API doesn't include a slot field)
    const weaponSlotIndices = new Set([
      GearSlot.MAIN_HAND,
      GearSlot.OFF_HAND,
      GearSlot.BACKUP_MAIN_HAND,
      GearSlot.BACKUP_OFF_HAND,
    ]);
    const bodySlotIndices = new Set([
      GearSlot.HEAD,
      GearSlot.CHEST,
      GearSlot.SHOULDERS,
      GearSlot.WAIST,
      GearSlot.HANDS,
      GearSlot.LEGS,
      GearSlot.FEET,
    ]);

    for (let i = 0; i < gear.length; i++) {
      const item = gear[i];
      const slot = item.slot ?? i;

      if (weaponSlotIndices.has(slot)) {
        if (item.type === WeaponType.SHIELD) {
          signals.hasShieldWeapon = true;
        }
        if (item.type === WeaponType.FROST_STAFF) {
          signals.hasFrostStaff = true;
        }
      }

      if (bodySlotIndices.has(slot) && item.type === ArmorType.HEAVY) {
        signals.heavyArmorCount++;
      }
    }

    // Classify set IDs
    classifyGearSets(gear, signals);
  }
}

function classifyGearSets(gear: PlayerGear[], signals: PlayerRoleSignals): void {
  const seenSetIds = new Set<number>();

  for (const item of gear) {
    if (item.setID === 0 || seenSetIds.has(item.setID)) continue;
    seenSetIds.add(item.setID);

    if (TANK_SET_IDS.has(item.setID) || TANK_MONSTER_SET_IDS.has(item.setID)) {
      signals.tankSetIds.push(item.setID);
    }
    if (HEALER_SET_IDS.has(item.setID) || HEALER_MONSTER_SET_IDS.has(item.setID)) {
      signals.healerSetIds.push(item.setID);
    }
    if (DPS_SET_IDS.has(item.setID) || DPS_MONSTER_SET_IDS.has(item.setID)) {
      signals.dpsSetIds.push(item.setID);
    }
    if (SUPPORT_DPS_SET_IDS.has(item.setID)) {
      signals.supportDpsSetIds.push(item.setID);
    }
  }
}

// ============================================================
// Damage Output Signals
// ============================================================

function extractDamageSignals(
  damageEvents: DamageEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
  context: FightContext,
): number {
  let groupTotal = 0;

  for (const event of damageEvents) {
    if (!event.sourceIsFriendly) continue;
    // Only count damage to enemies (targetIsFriendly is false on DamageEvent)
    if (event.fight !== context.fightId) continue;

    const signals = playerSignals.get(event.sourceID);
    if (signals) {
      signals.totalDamage += event.amount;
      groupTotal += event.amount;
    }
  }

  return groupTotal;
}

// ============================================================
// Healing Output Signals
// ============================================================

function extractHealingSignals(
  healEvents: HealEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
  context: FightContext,
): number {
  let groupTotal = 0;

  // Track raw healing (amount + overheal) per player for overheal ratio
  const playerRawHealing = new Map<number, number>();

  for (const event of healEvents) {
    if (!event.sourceIsFriendly) continue;
    if (event.fight !== context.fightId) continue;

    const signals = playerSignals.get(event.sourceID);
    if (signals) {
      const amount = event.amount ?? 0;
      const overheal = event.overheal ?? 0;
      signals.totalHealing += amount;
      groupTotal += amount;

      const rawHeal = amount + overheal;
      playerRawHealing.set(event.sourceID, (playerRawHealing.get(event.sourceID) ?? 0) + rawHeal);
    }
  }

  // Compute overheal ratios
  for (const [playerId, rawTotal] of playerRawHealing) {
    const signals = playerSignals.get(playerId);
    if (signals && rawTotal > 0) {
      signals.overhealRatio = 1 - signals.totalHealing / rawTotal;
    }
  }

  return groupTotal;
}

// ============================================================
// Damage Taken Signals
// ============================================================

function extractDamageTakenSignals(
  damageEvents: DamageEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
  context: FightContext,
): number {
  let groupTotal = 0;

  for (const event of damageEvents) {
    // Damage taken = damage events where source is enemy and target is friendly player
    if (event.sourceIsFriendly) continue;
    if (event.fight !== context.fightId) continue;

    const signals = playerSignals.get(event.targetID);
    if (signals) {
      signals.damageTaken += event.amount;
      signals.totalHitsTaken++;
      if (event.blocked && event.blocked > 0) {
        signals.blockedHitCount++;
      }
      groupTotal += event.amount;
    }
  }

  return groupTotal;
}

// ============================================================
// Taunt Signal Extraction
// ============================================================

interface TauntInterval {
  sourceId: number;
  targetId: number;
  startTime: number;
  endTime: number | null; // null = still active at fight end
}

function extractTauntSignals(
  castEvents: CastEvent[],
  applyDebuffEvents: ApplyDebuffEvent[],
  removeDebuffEvents: RemoveDebuffEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
  context: FightContext,
  fightDurationMs: number,
): void {
  // Count taunt ability casts per player
  for (const event of castEvents) {
    if (!event.sourceIsFriendly) continue;
    if (event.fight !== context.fightId) continue;

    if (TAUNT_ABILITY_IDS.has(event.abilityGameID)) {
      const signals = playerSignals.get(event.sourceID);
      if (signals) {
        signals.tauntCastCount++;
      }
    }
  }

  // Build taunt intervals from debuff apply/remove events
  const activeIntervals: TauntInterval[] = [];
  // Map of targetId → current active taunt interval
  const activeTaunts = new Map<number, TauntInterval>();

  // Process events in timestamp order (they should already be sorted)
  const debuffEvents = [
    ...applyDebuffEvents
      .filter((e) => e.abilityGameID === TAUNT_DEBUFF_ID && e.fight === context.fightId)
      .map((e) => ({ ...e, eventType: 'apply' as const })),
    ...removeDebuffEvents
      .filter((e) => e.abilityGameID === TAUNT_DEBUFF_ID && e.fight === context.fightId)
      .map((e) => ({ ...e, eventType: 'remove' as const })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Auto-detect primary boss if not provided: the enemy with the most taunt debuff applications
  let effectiveBossId = context.primaryBossId;
  if (effectiveBossId === null) {
    const tauntCountByTarget = new Map<number, number>();
    for (const event of debuffEvents) {
      if (event.eventType === 'apply') {
        tauntCountByTarget.set(event.targetID, (tauntCountByTarget.get(event.targetID) ?? 0) + 1);
      }
    }
    let maxTaunts = 0;
    for (const [targetId, count] of tauntCountByTarget) {
      if (count > maxTaunts) {
        maxTaunts = count;
        effectiveBossId = targetId;
      }
    }
  }

  for (const event of debuffEvents) {
    if (event.eventType === 'apply') {
      // Close any existing taunt on this target
      const existing = activeTaunts.get(event.targetID);
      if (existing) {
        existing.endTime = event.timestamp;
        activeIntervals.push(existing);
      }

      // Start new taunt interval
      const interval: TauntInterval = {
        sourceId: event.sourceID,
        targetId: event.targetID,
        startTime: event.timestamp,
        endTime: null,
      };
      activeTaunts.set(event.targetID, interval);
    } else {
      // Remove — close the active taunt on this target
      const existing = activeTaunts.get(event.targetID);
      if (existing) {
        existing.endTime = event.timestamp;
        activeIntervals.push(existing);
        activeTaunts.delete(event.targetID);
      }
    }
  }

  // Close any still-open intervals at fight end
  for (const interval of activeTaunts.values()) {
    interval.endTime = context.endTime;
    activeIntervals.push(interval);
  }

  // Count unique enemies taunted + boss taunt uptime per player
  const playerTauntedEnemies = new Map<number, Set<number>>();

  for (const interval of activeIntervals) {
    const signals = playerSignals.get(interval.sourceId);
    if (!signals) continue;

    // Track unique enemies
    if (!playerTauntedEnemies.has(interval.sourceId)) {
      playerTauntedEnemies.set(interval.sourceId, new Set());
    }
    playerTauntedEnemies.get(interval.sourceId)!.add(interval.targetId);

    // Track boss taunt uptime
    if (effectiveBossId !== null && interval.targetId === effectiveBossId) {
      const duration = (interval.endTime ?? context.endTime) - interval.startTime;
      signals.tauntUptimeOnBossMs += Math.max(0, Math.min(duration, fightDurationMs));
    }
  }

  // Set taunted unique enemy counts
  for (const [playerId, enemies] of playerTauntedEnemies) {
    const signals = playerSignals.get(playerId);
    if (signals) {
      signals.tauntedUniqueEnemies = enemies.size;
    }
  }
}

// ============================================================
// Ultimate and Buff Signal Extraction
// ============================================================

function extractUltimateAndBuffSignals(
  castEvents: CastEvent[],
  applyBuffEvents: ApplyBuffEvent[],
  playerSignals: Map<number, PlayerRoleSignals>,
  context: FightContext,
): void {
  // Horn and Barrier casts
  for (const event of castEvents) {
    if (!event.sourceIsFriendly) continue;
    if (event.fight !== context.fightId) continue;

    const signals = playerSignals.get(event.sourceID);
    if (!signals) continue;

    if (HORN_ABILITY_IDS.has(event.abilityGameID)) {
      signals.hornCasts++;
    }
    if (BARRIER_ABILITY_IDS.has(event.abilityGameID)) {
      signals.barrierCasts++;
    }
  }

  // Major Courage application tracking
  const playerCourageTargets = new Map<number, Set<number>>();

  for (const event of applyBuffEvents) {
    if (event.fight !== context.fightId) continue;
    if (!MAJOR_COURAGE_BUFF_IDS.has(event.abilityGameID)) continue;

    // Only count buffs applied to OTHER players
    if (event.sourceID === event.targetID) continue;

    if (!playerCourageTargets.has(event.sourceID)) {
      playerCourageTargets.set(event.sourceID, new Set());
    }
    playerCourageTargets.get(event.sourceID)!.add(event.targetID);
  }

  for (const [playerId, targets] of playerCourageTargets) {
    const signals = playerSignals.get(playerId);
    if (signals) {
      signals.majorCourageTargets = targets.size;
    }
  }
}

// ============================================================
// Ratio Computation
// ============================================================

function computeRatios(
  playerSignals: Map<number, PlayerRoleSignals>,
  groupTotalDamage: number,
  groupTotalHealing: number,
  groupTotalDamageTaken: number,
  fightDurationMs: number,
): void {
  const durationSeconds = fightDurationMs / 1000;

  for (const signals of playerSignals.values()) {
    // DPS/HPS
    signals.dps = durationSeconds > 0 ? signals.totalDamage / durationSeconds : 0;
    signals.hps = durationSeconds > 0 ? signals.totalHealing / durationSeconds : 0;

    // Group shares
    signals.damageShareOfGroup = groupTotalDamage > 0 ? signals.totalDamage / groupTotalDamage : 0;
    signals.healingShareOfGroup =
      groupTotalHealing > 0 ? signals.totalHealing / groupTotalHealing : 0;
    signals.damageTakenShareOfGroup =
      groupTotalDamageTaken > 0 ? signals.damageTaken / groupTotalDamageTaken : 0;
  }
}
