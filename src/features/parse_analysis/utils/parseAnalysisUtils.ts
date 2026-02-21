/**
 * Utilities for parse log analysis
 * Includes food detection, CPM calculation, weave analysis, and trial dummy buff detection
 */

import {
  STAMINA_FOOD,
  MAGICKA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
  INCREASE_MAX_MAGICKA_AND_STAMINA,
  TRI_STAT_FOOD,
  HEALTH_AND_REGEN_FOOD,
  MAX_STAMINA_AND_MAGICKA_RECOVERY,
  WITCHES_BREW,
  EXPERIENCE_BOOST_FOOD,
  KnownAbilities,
  MundusStones,
  SYNERGY_ABILITY_IDS,
} from '../../../types/abilities';
import {
  BeginCastEvent,
  BuffEvent,
  CastEvent,
  CombatantInfoEvent,
  DamageEvent,
  UnifiedCastEvent,
} from '../../../types/combatlogEvents';
import { GearTrait } from '../../../types/playerDetails';
import { Logger, LogLevel } from '../../../utils/logger';
import { TRIAL_DUMMY_BUFF_IDS, TRIAL_DUMMY_BUFF_NAMES } from '../constants/trialDummyConstants';

// Logger used for detailed parse analysis diagnostics
const logger = new Logger({
  level: LogLevel.DEBUG,
  contextPrefix: 'ParseAnalysisUtils',
});

/**
 * Food type detection result
 */
export interface FoodDetectionResult {
  hasFood: boolean;
  foodType:
    | 'none'
    | 'stamina'
    | 'magicka'
    | 'health-stamina'
    | 'health-magicka'
    | 'magicka-stamina'
    | 'tri-stat'
    | 'health-regen'
    | 'event'
    | 'xp-boost'
    | 'stamina-magicka-recovery'
    | 'other';
  foodAbilityIds: number[];
  foodNames: string[];
}

/**
 * Light attack ability IDs - comprehensive list covering all weapon types.
 * Sourced from abilities.json data. Name-based fallback (`isLightAttackAbility`)
 * handles any IDs not listed here.
 */
export const LIGHT_ATTACK_ABILITY_IDS = new Set([
  7880, // Light Attack (generic)
  15435, // Light Attack (One Handed / Sword & Board)
  16037, // Light Attack (Two Handed)
  16145, // Light Attack (Restoration Staff)
  16165, // Light Attack (Inferno Staff)
  16277, // Light Attack (Ice Staff)
  16499, // Light Attack (Dual Wield)
  16688, // Light Attack (Bow)
  18350, // Light Attack (Lightning Staff)
  23604, // Light Attack (Unarmed)
  24792, // Light Attack (Overload)
  26111, // Light Attack (Overload)
  26112, // Light Attack (Overload)
  27786, // Light Attack (Overload)
  32464, // Light Attack (Werewolf)
  114769, // Light Attack (Power Overload)
  114770, // Light Attack (Power Overload)
  114773, // Light Attack (Energy Overload)
  114774, // Light Attack (Energy Overload)
  116762, // Light Attack (Volendrung)
]);

/**
 * Heavy attack ability IDs - comprehensive list covering all weapon types.
 * Sourced from abilities.json data. Name-based fallback (`isHeavyAttackAbility`)
 * handles any IDs not listed here.
 */
export const HEAVY_ATTACK_ABILITY_IDS = new Set([
  7095, // Heavy Attack (generic)
  15279, // Heavy Attack (One Handed)
  15282, // Heavy Attack (One Handed)
  15383, // Heavy Attack (Inferno Staff)
  15385, // Heavy Attack (Inferno Staff)
  15829, // Heavy Attack (One Handed)
  16041, // Heavy Attack (Two Handed)
  16212, // Heavy Attack (Restoration Staff)
  16261, // Heavy Attack (Ice Staff)
  16321, // Heavy Attack (Inferno Staff)
  16420, // Heavy Attack (Dual Wield)
  16691, // Heavy Attack (Bow)
  17162, // Heavy Attack (Two Handed)
  17169, // Heavy Attack (Dual Wield)
  17173, // Heavy Attack (Bow)
  18396, // Heavy Attack (Lightning Staff)
  18405, // Heavy Attack (Ice Staff)
  18406, // Heavy Attack (Ice Staff)
  18429, // Heavy Attack (Unarmed)
  18430, // Heavy Attack (Unarmed)
  18431, // Heavy Attack (Unarmed)
  18622, // Heavy Attack (Dual Wield)
  19277, // Heavy Attack (Lightning Staff)
  24794, // Heavy Attack (Overload)
  24798, // Heavy Attack (Overload)
  32477, // Heavy Attack (Werewolf)
  32479, // Heavy Attack (Werewolf)
]);

// Ability name substrings that should not count toward CPM or activity uptime
const IGNORED_CAST_ABILITY_NAME_KEYWORDS = ['restore health'];

type AbilityNameMapper = {
  getAbilityById: (id: number) => { name: string | null } | null;
};

function getAbilityNameFromMapper(
  abilityId: number,
  abilityMapper?: AbilityNameMapper,
): string | null {
  if (!abilityMapper) {
    return null;
  }

  const ability = abilityMapper.getAbilityById(abilityId);
  if (!ability || !ability.name) {
    return null;
  }

  return ability.name;
}

function isLightAttackAbility(abilityId: number, abilityMapper?: AbilityNameMapper): boolean {
  if (LIGHT_ATTACK_ABILITY_IDS.has(abilityId)) {
    return true;
  }

  const abilityName = getAbilityNameFromMapper(abilityId, abilityMapper);
  if (!abilityName) {
    return false;
  }

  return abilityName.toLowerCase().includes('light attack');
}

function isHeavyAttackAbility(abilityId: number, abilityMapper?: AbilityNameMapper): boolean {
  if (HEAVY_ATTACK_ABILITY_IDS.has(abilityId)) {
    return true;
  }

  const abilityName = getAbilityNameFromMapper(abilityId, abilityMapper);
  if (!abilityName) {
    return false;
  }

  return abilityName.toLowerCase().includes('heavy attack');
}

function isSynergyAbility(abilityId: number, abilityMapper?: AbilityNameMapper): boolean {
  if (SYNERGY_ABILITY_IDS.has(abilityId)) {
    return true;
  }
  const abilityName = getAbilityNameFromMapper(abilityId, abilityMapper);
  if (abilityName) {
    return abilityName.trim().toLowerCase().includes('synergy');
  }
  return false;
}

function isIgnoredAbility(abilityId: number, abilityMapper?: AbilityNameMapper): boolean {
  const abilityName = getAbilityNameFromMapper(abilityId, abilityMapper);
  if (!abilityName) {
    return false;
  }

  const normalized = abilityName.trim().toLowerCase();
  return IGNORED_CAST_ABILITY_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isCastEvent(event: UnifiedCastEvent): event is CastEvent {
  return event.type === 'cast';
}

function normalizeToCastEvent(event: UnifiedCastEvent): CastEvent {
  if (isCastEvent(event)) {
    return {
      ...event,
      castTrackID: event.castTrackID,
      sourceResources: event.sourceResources,
      targetResources: event.targetResources,
    };
  }

  const beginEvent = event as BeginCastEvent;
  return {
    timestamp: beginEvent.timestamp,
    type: 'cast',
    sourceID: beginEvent.sourceID,
    sourceIsFriendly: beginEvent.sourceIsFriendly,
    targetID: beginEvent.targetID,
    targetIsFriendly: beginEvent.targetIsFriendly,
    abilityGameID: beginEvent.abilityGameID,
    fight: beginEvent.fight,
    castTrackID: beginEvent.castTrackID,
    sourceResources: beginEvent.sourceResources,
    targetResources: beginEvent.targetResources,
  };
}

interface CastFilterOptions {
  excludeLightAttacks: boolean;
  excludeHeavyAttacks: boolean;
  excludeSynergies: boolean;
  excludeWeaponSwap: boolean;
}

function filterPlayerCasts(
  castEvents: UnifiedCastEvent[],
  playerId: number,
  abilityMapper: AbilityNameMapper | undefined,
  options: CastFilterOptions,
): CastEvent[] {
  const { excludeLightAttacks, excludeHeavyAttacks, excludeSynergies, excludeWeaponSwap } = options;

  const uniqueEvents = new Map<string, UnifiedCastEvent>();
  let fallbackCounter = 0;

  for (const event of castEvents) {
    if (event.sourceID !== playerId || !event.sourceIsFriendly) continue;
    if (event.type !== 'cast' && event.type !== 'begincast') continue;
    if ((event as CastEvent).fake) continue;

    const abilityId = event.abilityGameID;

    if (excludeWeaponSwap && abilityId === KnownAbilities.SWAP_WEAPONS) continue;
    if (excludeSynergies && isSynergyAbility(abilityId, abilityMapper)) continue;
    if (excludeLightAttacks && isLightAttackAbility(abilityId, abilityMapper)) continue;
    if (excludeHeavyAttacks && isHeavyAttackAbility(abilityId, abilityMapper)) continue;
    if (isIgnoredAbility(abilityId, abilityMapper)) continue;

    const baseKey =
      event.castTrackID != null
        ? `track-${event.castTrackID}`
        : `time-${event.timestamp}-${abilityId}-${event.targetID ?? 'unknown'}`;

    const existing = uniqueEvents.get(baseKey);

    if (!existing) {
      uniqueEvents.set(baseKey, event);
      continue;
    }

    if (existing.type === 'begincast' && event.type === 'cast') {
      uniqueEvents.set(baseKey, event);
      continue;
    }

    if (existing.type === 'cast' && event.type === 'begincast') {
      continue;
    }

    const fallbackKey = `${baseKey}-dup-${fallbackCounter++}`;
    uniqueEvents.set(fallbackKey, event);
  }

  return Array.from(uniqueEvents.values())
    .map(normalizeToCastEvent)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ESO's global cooldown is 1 second (1000ms), as per game mechanics.
// This is the minimum time between most ability casts in ESO.
const GLOBAL_COOLDOWN_MS = 1000;

// Channel gap threshold of 600ms is used to distinguish between consecutive channel casts
// and interruptions, based on empirical log analysis. If two channel events are within
// 600ms, they're considered part of the same channeled ability cast.
const CHANNEL_GAP_THRESHOLD_MS = 600;

// Maximum channel duration of 5000ms (5 seconds) is set to filter out abnormally long
// channels, which are likely logging artifacts or errors. Most channeled abilities in
// ESO complete within a few seconds.
const MAX_CHANNEL_DURATION_MS = 5000;

/**
 * Detect food/drink buffs on a player
 * Checks both buff events and combatant info auras
 */
export function detectFood(
  buffEvents: BuffEvent[],
  playerId: number,
  _fightStartTime: number,
  _fightEndTime: number,
  combatantInfoEvents?: CombatantInfoEvent[],
): FoodDetectionResult {
  const result: FoodDetectionResult = {
    hasFood: false,
    foodType: 'none',
    foodAbilityIds: [],
    foodNames: [],
  };

  // Debug: Log all buff events for the player
  const playerBuffs = buffEvents.filter((e) => e.targetID === playerId && e.type === 'applybuff');

  // Get unique ability IDs and their counts
  const abilityIdCounts = new Map<number, number>();
  playerBuffs.forEach((buff) => {
    const count = abilityIdCounts.get(buff.abilityGameID) || 0;
    abilityIdCounts.set(buff.abilityGameID, count + 1);
  });

  // Sort by count descending and show top 20
  const sortedAbilities = Array.from(abilityIdCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  logger.debug('Food detection: buff event scan summary', {
    totalBuffEvents: buffEvents.length,
    playerBuffEvents: playerBuffs.length,
    topAbilityIds: sortedAbilities,
    trackedFoodIds: {
      triStat: Array.from(TRI_STAT_FOOD),
      stamina: Array.from(STAMINA_FOOD).slice(0, 3),
      magicka: Array.from(MAGICKA_FOOD).slice(0, 3),
    },
  });

  // Find food buffs that are active during the fight
  const activeFoodBuffs = buffEvents.filter((event) => {
    if (event.targetID !== playerId) return false;
    if (event.type !== 'applybuff') return false;

    const abilityId = event.abilityGameID;

    // Check if this is a food/drink buff
    return (
      STAMINA_FOOD.has(abilityId) ||
      MAGICKA_FOOD.has(abilityId) ||
      INCREASE_MAX_HEALTH_AND_STAMINA.has(abilityId) ||
      INCREASE_MAX_HEALTH_AND_MAGICKA.has(abilityId) ||
      INCREASE_MAX_MAGICKA_AND_STAMINA.has(abilityId) ||
      TRI_STAT_FOOD.has(abilityId) ||
      HEALTH_AND_REGEN_FOOD.has(abilityId) ||
      MAX_STAMINA_AND_MAGICKA_RECOVERY.has(abilityId) ||
      WITCHES_BREW.has(abilityId) ||
      EXPERIENCE_BOOST_FOOD.has(abilityId)
    );
  });

  // Also check combatant info auras
  const foodAbilityIds = new Set(activeFoodBuffs.map((e) => e.abilityGameID));
  const foodNamesByAbilityId = new Map<number, string>();

  if (combatantInfoEvents && combatantInfoEvents.length > 0) {
    const playerCombatantInfo = combatantInfoEvents.find((e) => e.sourceID === playerId);
    if (playerCombatantInfo && playerCombatantInfo.auras) {
      logger.debug('Food detection: checking combatant info auras', {
        auraCount: playerCombatantInfo.auras.length,
        auraIds: playerCombatantInfo.auras.map((a) => a.ability),
        auraNames: playerCombatantInfo.auras.map((a) => a.name),
      });

      playerCombatantInfo.auras.forEach((aura) => {
        const abilityId = aura.ability;
        if (
          STAMINA_FOOD.has(abilityId) ||
          MAGICKA_FOOD.has(abilityId) ||
          INCREASE_MAX_HEALTH_AND_STAMINA.has(abilityId) ||
          INCREASE_MAX_HEALTH_AND_MAGICKA.has(abilityId) ||
          INCREASE_MAX_MAGICKA_AND_STAMINA.has(abilityId) ||
          TRI_STAT_FOOD.has(abilityId) ||
          HEALTH_AND_REGEN_FOOD.has(abilityId) ||
          MAX_STAMINA_AND_MAGICKA_RECOVERY.has(abilityId) ||
          WITCHES_BREW.has(abilityId) ||
          EXPERIENCE_BOOST_FOOD.has(abilityId)
        ) {
          logger.debug('Food detection: aura matched food ability', {
            abilityId,
            name: aura.name,
          });
          foodAbilityIds.add(abilityId);
          foodNamesByAbilityId.set(abilityId, aura.name);
        }
      });
    }
  }

  logger.debug('Food detection result', {
    activeFoodBuffs: activeFoodBuffs.length,
    foundFromAuras: foodAbilityIds.size - activeFoodBuffs.length,
    allFoundIds: Array.from(foodAbilityIds),
    foodNames: Array.from(foodNamesByAbilityId.values()),
  });

  if (foodAbilityIds.size === 0) {
    // Explicitly set empty arrays for consistency
    result.foodAbilityIds = [];
    result.foodNames = [];
    return result;
  }

  result.hasFood = true;
  result.foodAbilityIds = Array.from(foodAbilityIds);
  result.foodNames = Array.from(foodNamesByAbilityId.values());

  // Determine food type based on the buffs
  const hasStaminaFood = Array.from(foodAbilityIds).some((id) => STAMINA_FOOD.has(id));
  const hasMagickaFood = Array.from(foodAbilityIds).some((id) => MAGICKA_FOOD.has(id));
  const hasHealthStamina = Array.from(foodAbilityIds).some((id) =>
    INCREASE_MAX_HEALTH_AND_STAMINA.has(id),
  );
  const hasHealthMagicka = Array.from(foodAbilityIds).some((id) =>
    INCREASE_MAX_HEALTH_AND_MAGICKA.has(id),
  );
  const hasMagickaStamina = Array.from(foodAbilityIds).some((id) =>
    INCREASE_MAX_MAGICKA_AND_STAMINA.has(id),
  );
  const hasTriStat = Array.from(foodAbilityIds).some((id) => TRI_STAT_FOOD.has(id));
  const hasHealthRegen = Array.from(foodAbilityIds).some((id) => HEALTH_AND_REGEN_FOOD.has(id));
  const hasStaminaMagickaRecovery = Array.from(foodAbilityIds).some((id) =>
    MAX_STAMINA_AND_MAGICKA_RECOVERY.has(id),
  );
  const hasWitchesBrew = Array.from(foodAbilityIds).some((id) => WITCHES_BREW.has(id));
  const hasXpBoost = Array.from(foodAbilityIds).some((id) => EXPERIENCE_BOOST_FOOD.has(id));

  if (hasTriStat) {
    result.foodType = 'tri-stat';
  } else if (hasStaminaFood) {
    result.foodType = 'stamina';
  } else if (hasMagickaFood) {
    result.foodType = 'magicka';
  } else if (hasHealthStamina) {
    result.foodType = 'health-stamina';
  } else if (hasHealthMagicka) {
    result.foodType = 'health-magicka';
  } else if (hasMagickaStamina) {
    result.foodType = 'magicka-stamina';
  } else if (hasStaminaMagickaRecovery) {
    result.foodType = 'stamina-magicka-recovery';
  } else if (hasHealthRegen) {
    result.foodType = 'health-regen';
  } else if (hasWitchesBrew) {
    result.foodType = 'event';
  } else if (hasXpBoost) {
    result.foodType = 'xp-boost';
  } else {
    result.foodType = 'other';
  }

  return result;
}

/**
 * Calculate casts per minute for a player
 */
export function calculateCPM(
  castEvents: UnifiedCastEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper?: AbilityNameMapper,
): number {
  const playerCasts = filterPlayerCasts(castEvents, playerId, abilityMapper, {
    excludeLightAttacks: false,
    excludeHeavyAttacks: false,
    excludeSynergies: true,
    excludeWeaponSwap: true,
  });

  // Debug: Show distinct abilities cast
  const abilityCounts = new Map<number, number>();
  playerCasts.forEach((cast) => {
    const abilityId = cast.abilityGameID;
    abilityCounts.set(abilityId, (abilityCounts.get(abilityId) || 0) + 1);
  });

  const sortedAbilities = Array.from(abilityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => {
      const abilityData = abilityMapper?.getAbilityById(id);
      return {
        abilityId: id,
        name: abilityData?.name || `Unknown (${id})`,
        count,
      };
    });

  logger.debug('CPM analysis: distinct abilities cast', {
    totalCasts: playerCasts.length,
    uniqueAbilities: abilityCounts.size,
    topAbilities: sortedAbilities.slice(0, 20),
    allAbilities: sortedAbilities,
  });

  // Calculate fight duration in minutes
  const durationMs = fightEndTime - fightStartTime;
  const minutes = durationMs > 0 ? durationMs / 60000 : 0;

  if (minutes === 0) return 0;

  return playerCasts.length / minutes;
}

export interface ActivePercentageResult {
  activePercentage: number;
  activeSeconds: number;
  fightDurationMs: number;
  totalCasts: number;
  baseActiveSeconds: number;
  channelExtraSeconds: number;
  downtimeSeconds: number;
}

function estimateChannelDurationMs(
  cast: CastEvent,
  relatedDamageEvents: DamageEvent[] | undefined,
): number {
  if (!relatedDamageEvents || relatedDamageEvents.length === 0) {
    return 0;
  }

  let lastTimestamp = cast.timestamp;
  let sawEvent = false;

  for (const event of relatedDamageEvents) {
    if (event.timestamp < cast.timestamp) {
      continue;
    }

    const deltaFromCast = event.timestamp - cast.timestamp;
    if (deltaFromCast > MAX_CHANNEL_DURATION_MS) {
      break;
    }

    if (sawEvent) {
      const gapFromLast = event.timestamp - lastTimestamp;
      if (gapFromLast > CHANNEL_GAP_THRESHOLD_MS) {
        break;
      }
    }

    if (event.timestamp > lastTimestamp) {
      lastTimestamp = event.timestamp;
    }

    sawEvent = true;
  }

  const duration = lastTimestamp - cast.timestamp;
  return duration > 0 ? duration : 0;
}

export function calculateActivePercentage(
  castEvents: UnifiedCastEvent[],
  damageEvents: DamageEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper?: AbilityNameMapper,
): ActivePercentageResult {
  const fightDurationMs = fightEndTime - fightStartTime;
  if (fightDurationMs <= 0) {
    return {
      activePercentage: 0,
      activeSeconds: 0,
      fightDurationMs: 0,
      totalCasts: 0,
      baseActiveSeconds: 0,
      channelExtraSeconds: 0,
      downtimeSeconds: 0,
    };
  }

  const relevantCasts = filterPlayerCasts(castEvents, playerId, abilityMapper, {
    excludeLightAttacks: true,
    excludeHeavyAttacks: false,
    excludeSynergies: true,
    excludeWeaponSwap: true,
  });

  const baseActiveMs = relevantCasts.length * GLOBAL_COOLDOWN_MS;

  const damageEventsByTrack = new Map<number, DamageEvent[]>();
  for (const event of damageEvents) {
    if (event.sourceID !== playerId || !event.sourceIsFriendly) {
      continue;
    }

    if (event.castTrackID == null) {
      continue;
    }

    let list = damageEventsByTrack.get(event.castTrackID);
    if (!list) {
      list = [];
      damageEventsByTrack.set(event.castTrackID, list);
    }

    list.push(event);
  }

  for (const list of damageEventsByTrack.values()) {
    list.sort((a, b) => a.timestamp - b.timestamp);
  }

  let channelExtraMs = 0;
  for (const cast of relevantCasts) {
    if (cast.castTrackID == null) {
      continue;
    }

    const estimatedDuration = estimateChannelDurationMs(
      cast,
      damageEventsByTrack.get(cast.castTrackID),
    );

    if (estimatedDuration > GLOBAL_COOLDOWN_MS) {
      const cappedDuration = Math.min(estimatedDuration, MAX_CHANNEL_DURATION_MS);
      channelExtraMs += cappedDuration - GLOBAL_COOLDOWN_MS;
    }
  }

  let totalActiveMs = baseActiveMs + channelExtraMs;
  if (totalActiveMs > fightDurationMs) {
    totalActiveMs = fightDurationMs;
    channelExtraMs = Math.max(0, fightDurationMs - baseActiveMs);
  }

  const downtimeMs = Math.max(fightDurationMs - totalActiveMs, 0);
  const activePercentage = fightDurationMs > 0 ? (totalActiveMs / fightDurationMs) * 100 : 0;

  return {
    activePercentage,
    activeSeconds: totalActiveMs / 1000,
    fightDurationMs,
    totalCasts: relevantCasts.length,
    baseActiveSeconds: baseActiveMs / 1000,
    channelExtraSeconds: channelExtraMs / 1000,
    downtimeSeconds: downtimeMs / 1000,
  };
}

/**
 * DPS calculation result
 */
export interface DPSResult {
  totalDamage: number;
  dps: number;
  durationMs: number;
}

/**
 * Calculate total damage and DPS for a player
 */
export function calculateDPS(
  damageEvents: DamageEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
): DPSResult {
  // Sum all damage dealt by the player
  const playerDamageEvents = damageEvents.filter(
    (event) => event.sourceID === playerId && event.sourceIsFriendly,
  );

  const totalDamage = playerDamageEvents.reduce((sum, event) => sum + event.amount, 0);

  // Calculate fight duration
  const durationMs = fightEndTime - fightStartTime;
  const durationSeconds = durationMs > 0 ? durationMs / 1000 : 0;

  const dps = durationSeconds > 0 ? totalDamage / durationSeconds : 0;

  return {
    totalDamage,
    dps,
    durationMs: durationMs > 0 ? durationMs : 0,
  };
}

/**
 * Ability cast in rotation
 */
export interface AbilityCast {
  abilityId: number;
  abilityName: string;
  timestamp: number;
}

/**
 * Skill interval information for rotation building
 */
export interface SkillInterval {
  abilityId: number;
  abilityName: string;
  avgInterval: number; // Average number of casts between uses
  castCount: number;
  isRotationSkill: boolean; // Skills with consistent intervals
  isSpammable: boolean; // Skills with very short intervals
  isExecute: boolean; // Skills only cast in execute phase (last 25% of fight)
  firstCastPercent: number; // Percentage into fight when first cast
}

/**
 * Rotation analysis result
 */
export interface RotationAnalysisResult {
  opener: AbilityCast[]; // First ~10 seconds of abilities
  rotation: AbilityCast[]; // Main rotation abilities after opener
  allCasts: AbilityCast[]; // All ability casts for reference
  openerDuration: number; // Duration of opener in seconds
  rotationPattern?: AbilityCast[]; // Detected repeating pattern in rotation
  patternRepetitions?: number; // How many times the pattern repeats
  spammableAbilities?: Array<{
    abilityId: number;
    abilityName: string;
    count: number;
    percentage: number;
  }>; // Frequently used spammable abilities
  skillIntervals?: SkillInterval[]; // Interval analysis for each skill
  recommendedRotation?: AbilityCast[]; // Recommended rotation order based on intervals
}

/**
 * Detect repeating patterns in a sequence of ability casts
 * Returns the shortest repeating pattern found, if any
 * Now uses a more flexible approach that allows for some variation
 */
function detectRotationPattern(
  casts: AbilityCast[],
): { pattern: AbilityCast[]; repetitions: number } | null {
  if (casts.length < 4) return null; // Need at least 4 casts to detect a pattern

  // Try different pattern lengths, starting from shortest (2 abilities)
  // and going up to a reasonable maximum
  const minPatternLength = 2;
  const maxPatternLength = Math.min(Math.floor(casts.length / 2), 25);

  for (let patternLength = minPatternLength; patternLength <= maxPatternLength; patternLength++) {
    // Try starting the pattern at different positions (sometimes the rotation doesn't start perfectly)
    for (
      let startOffset = 0;
      startOffset < Math.min(3, casts.length - patternLength);
      startOffset++
    ) {
      const pattern = casts.slice(startOffset, startOffset + patternLength);
      let matches = 1;
      let position = startOffset + patternLength;
      let totalMatchedAbilities = patternLength;

      // Check how many times this pattern repeats (allowing for some flexibility)
      while (position < casts.length) {
        const remainingCasts = casts.length - position;
        const segmentLength = Math.min(patternLength, remainingCasts);
        const segment = casts.slice(position, position + segmentLength);

        // Count how many abilities match in this segment
        let matchingAbilities = 0;
        for (let i = 0; i < segmentLength; i++) {
          if (segment[i].abilityId === pattern[i].abilityId) {
            matchingAbilities++;
          }
        }

        // If at least 60% of the segment matches the pattern, consider it a match
        const matchPercentage = matchingAbilities / segmentLength;
        if (matchPercentage >= 0.6 && segmentLength === patternLength) {
          matches++;
          totalMatchedAbilities += matchingAbilities;
          position += patternLength;
        } else {
          break;
        }
      }

      // If pattern repeats at least twice and covers a significant portion of the rotation
      const coverage = totalMatchedAbilities / casts.length;
      if (matches >= 2 && coverage >= 0.4) {
        return { pattern, repetitions: matches };
      }
    }
  }

  return null;
}

/**
 * Analyze player's rotation - opener and main rotation pattern
 */
export function analyzeRotation(
  castEvents: UnifiedCastEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper: AbilityNameMapper,
): RotationAnalysisResult {
  // Filter to player's casts only, excluding certain abilities
  const playerCasts = castEvents.filter((event) => {
    if (event.sourceID !== playerId || !event.sourceIsFriendly) return false;
    if (event.type !== 'cast') return false;

    // Exclude light attacks, heavy attacks, weapon swaps, and synergies
    if (isLightAttackAbility(event.abilityGameID, abilityMapper)) return false;
    if (isHeavyAttackAbility(event.abilityGameID, abilityMapper)) return false;
    if (event.abilityGameID === KnownAbilities.SWAP_WEAPONS) return false;
    if (isSynergyAbility(event.abilityGameID)) return false;

    return true;
  });

  // Sort by timestamp
  playerCasts.sort((a, b) => a.timestamp - b.timestamp);

  // Map to AbilityCast objects with names
  const allCasts: AbilityCast[] = playerCasts.map((cast) => {
    const ability = abilityMapper.getAbilityById(cast.abilityGameID);
    return {
      abilityId: cast.abilityGameID,
      abilityName: ability?.name || `Unknown (${cast.abilityGameID})`,
      timestamp: cast.timestamp,
    };
  });

  // Dynamically detect opener end by finding when abilities start repeating at consistent intervals
  // The opener is typically the initial setup before the rotation stabilizes
  let openerEndIndex = 0;
  if (allCasts.length > 15) {
    const abilitySequence = allCasts.map((c) => c.abilityId);

    // Analyze cast intervals for each ability to find rotation skills
    // Rotation skills are cast at consistent intervals (e.g., every 5-8 casts)
    const abilityIntervals = new Map<number, number[]>();

    // Track positions where each ability is cast
    abilitySequence.forEach((abilityId, index) => {
      if (!abilityIntervals.has(abilityId)) {
        abilityIntervals.set(abilityId, []);
      }
      abilityIntervals.get(abilityId)!.push(index);
    });

    // Debug: Log interval analysis for each ability
    const totalSequenceLength = abilitySequence.length;
    const intervalAnalysis: Array<{
      abilityId: number;
      abilityName: string;
      castCount: number;
      avgInterval: number;
      intervals: number[];
      variance: number;
      firstCastPercent: number;
      isRotationSkill: boolean;
      isExecute: boolean;
    }> = [];

    for (const [abilityId, positions] of abilityIntervals.entries()) {
      if (positions.length >= 2) {
        // Calculate intervals between consecutive casts
        const intervals: number[] = [];
        for (let i = 1; i < positions.length; i++) {
          intervals.push(positions[i] - positions[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const maxDeviation =
          intervals.length > 1 ? Math.max(...intervals.map((i) => Math.abs(i - avgInterval))) : 0;
        const variance = avgInterval > 0 ? maxDeviation / avgInterval : 0;
        // Skills cast 3+ times are rotation skills, unless they're executes
        const isRotationSkill = positions.length >= 3;

        // Detect execute skills - only cast in the last 50% of the fight
        const firstCastPercent = (positions[0] / totalSequenceLength) * 100;
        const isExecute = firstCastPercent >= 50 && positions.length >= 2;

        const ability = abilityMapper.getAbilityById(abilityId);
        intervalAnalysis.push({
          abilityId,
          abilityName: ability?.name || `Unknown (${abilityId})`,
          castCount: positions.length,
          avgInterval: Math.round(avgInterval * 10) / 10,
          intervals: intervals.slice(0, 5), // First 5 intervals
          variance: Math.round(variance * 100),
          firstCastPercent: Math.round(firstCastPercent),
          isRotationSkill,
          isExecute,
        });
      }
    }

    // Sort by average interval (rotation skills first)
    intervalAnalysis.sort((a, b) => b.avgInterval - a.avgInterval);

    logger.debug('Rotation interval analysis results', { intervalAnalysis });

    // Find spammable abilities (low interval, high usage)
    const spammableIds = new Set<number>();
    for (const [abilityId, positions] of abilityIntervals.entries()) {
      if (positions.length > 5) {
        const castIntervals: number[] = [];
        for (let i = 1; i < positions.length; i++) {
          castIntervals.push(positions[i] - positions[i - 1]);
        }
        const avgInterval = castIntervals.reduce((a, b) => a + b, 0) / castIntervals.length;

        // Spammable: avgInterval <= 3 casts
        if (avgInterval <= 3) {
          spammableIds.add(abilityId);
        }
      }
    }

    // Find the first occurrence of any spammable ability
    // Opener = all skills cast before the first spammable
    if (spammableIds.size > 0) {
      for (let i = 0; i < allCasts.length; i++) {
        if (spammableIds.has(allCasts[i].abilityId)) {
          openerEndIndex = i;
          break;
        }
      }
    }
  }

  // Fall back to time-based if we can't detect a pattern (e.g., very short fights)
  // or if the detected opener is unreasonably long
  const openerDurationMs =
    openerEndIndex > 0 && openerEndIndex < 20
      ? allCasts[openerEndIndex].timestamp - fightStartTime
      : 10000; // 10 seconds fallback

  const openerEndTime = fightStartTime + openerDurationMs;

  const opener =
    openerEndIndex > 0
      ? allCasts.slice(0, openerEndIndex)
      : allCasts.filter((cast) => cast.timestamp <= openerEndTime);

  const rotation =
    openerEndIndex > 0
      ? allCasts.slice(openerEndIndex)
      : allCasts.filter((cast) => cast.timestamp > openerEndTime);

  // Detect spammable abilities (abilities used very frequently, >30% of rotation)
  const abilityCounts = new Map<number, { name: string; count: number }>();
  rotation.forEach((cast) => {
    const existing = abilityCounts.get(cast.abilityId) || { name: cast.abilityName, count: 0 };
    abilityCounts.set(cast.abilityId, { name: existing.name, count: existing.count + 1 });
  });

  const spammableAbilities = Array.from(abilityCounts.entries())
    .filter(([, data]) => data.count / rotation.length > 0.3) // More than 30% of casts
    .map(([abilityId, data]) => ({
      abilityId,
      abilityName: data.name,
      count: data.count,
      percentage: Math.round((data.count / rotation.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Try pattern detection with the full rotation first
  let patternResult = detectRotationPattern(rotation);

  // If no pattern found and there are spammable abilities, try again without them
  if (!patternResult && spammableAbilities.length > 0) {
    const spammableIds = new Set(spammableAbilities.map((s) => s.abilityId));
    const rotationWithoutSpam = rotation.filter((cast) => !spammableIds.has(cast.abilityId));
    patternResult = detectRotationPattern(rotationWithoutSpam);
  }
  // Collect skill intervals for display
  const skillIntervals: SkillInterval[] =
    allCasts.length > 15
      ? (() => {
          const abilitySequence = allCasts.map((c) => c.abilityId);
          const abilityIntervals = new Map<number, number[]>();

          abilitySequence.forEach((abilityId, index) => {
            if (!abilityIntervals.has(abilityId)) {
              abilityIntervals.set(abilityId, []);
            }
            abilityIntervals.get(abilityId)!.push(index);
          });

          const totalCasts = abilitySequence.length;
          const intervals: SkillInterval[] = [];
          for (const [abilityId, positions] of abilityIntervals.entries()) {
            if (positions.length >= 2) {
              const castIntervals: number[] = [];
              for (let i = 1; i < positions.length; i++) {
                castIntervals.push(positions[i] - positions[i - 1]);
              }

              const avgInterval = castIntervals.reduce((a, b) => a + b, 0) / castIntervals.length;
              // Skills cast 3+ times are rotation skills, unless they're executes
              const isRotationSkill = positions.length >= 3;
              const isSpammable = avgInterval <= 3 && positions.length > 5;

              // Detect execute skills - only cast in the last 50% of the fight
              const firstCastPercent = (positions[0] / totalCasts) * 100;
              const isExecute = firstCastPercent >= 50 && positions.length >= 2;

              const ability = abilityMapper.getAbilityById(abilityId);
              intervals.push({
                abilityId,
                abilityName: ability?.name || `Unknown (${abilityId})`,
                avgInterval: Math.round(avgInterval * 10) / 10,
                castCount: positions.length,
                isRotationSkill,
                isSpammable,
                isExecute,
                firstCastPercent: Math.round(firstCastPercent),
              });
            }
          }

          return intervals.sort((a, b) => b.avgInterval - a.avgInterval);
        })()
      : [];

  return {
    opener,
    rotation,
    allCasts,
    openerDuration: openerDurationMs / 1000,
    rotationPattern: patternResult?.pattern,
    patternRepetitions: patternResult?.repetitions,
    spammableAbilities: spammableAbilities.length > 0 ? spammableAbilities : undefined,
    skillIntervals: skillIntervals.length > 0 ? skillIntervals : undefined,
    recommendedRotation:
      openerEndIndex > 0 && allCasts.length > 15
        ? (() => {
            // Filter out only execute skills from the recommended rotation (keep spammables)
            const rotationSkills = skillIntervals.filter(
              (skill) => skill.isRotationSkill && skill.avgInterval >= 3 && !skill.isExecute,
            );

            const spammableSkills = skillIntervals.filter(
              (skill) => skill.isSpammable && !skill.isExecute,
            );

            logger.debug('Recommended rotation inputs', {
              totalSkillsAnalyzed: skillIntervals.length,
              rotationSkills: rotationSkills.map((skill) => ({
                name: skill.abilityName,
                interval: skill.avgInterval,
                isExecute: skill.isExecute,
                firstCastPercent: `${skill.firstCastPercent}%`,
              })),
              spammableSkills: spammableSkills.map((skill) => ({
                name: skill.abilityName,
                isExecute: skill.isExecute,
                isSpammable: skill.isSpammable,
                avgInterval: skill.avgInterval,
                firstCastPercent: `${skill.firstCastPercent}%`,
              })),
              executeSkills: skillIntervals
                .filter((skill) => skill.isExecute)
                .map((skill) => ({
                  name: skill.abilityName,
                  isSpammable: skill.isSpammable,
                  isRotationSkill: skill.isRotationSkill,
                  firstCastPercent: `${skill.firstCastPercent}%`,
                })),
            });

            const recommended: AbilityCast[] = [];
            if (rotationSkills.length > 0) {
              rotationSkills.sort((a, b) => b.avgInterval - a.avgInterval);
              logger.debug('Recommended rotation sorted skills', {
                rotationSkills: rotationSkills.map((skill) => ({
                  name: skill.abilityName,
                  interval: skill.avgInterval,
                })),
              });
              const totalCasts =
                Math.max(...rotationSkills.map((s) => Math.ceil(s.avgInterval))) + 1;
              logger.debug('Recommended rotation total casts for pattern', { totalCasts });

              // Build rotation by placing each skill at intervals based on their avgInterval
              // Skills with shorter intervals will appear multiple times
              const rotationPattern: (AbilityCast | null)[] = new Array(totalCasts).fill(null);

              // First pass: Place the first occurrence of each skill at the beginning (longest interval first)
              let firstAvailablePosition = 0;
              const skillFirstPositions = new Map<number, number>();

              for (const skill of rotationSkills) {
                // Find next available position for this skill's first cast
                while (
                  rotationPattern[firstAvailablePosition] !== null &&
                  firstAvailablePosition < totalCasts
                ) {
                  firstAvailablePosition++;
                }

                if (firstAvailablePosition < totalCasts) {
                  rotationPattern[firstAvailablePosition] = {
                    abilityId: skill.abilityId,
                    abilityName: skill.abilityName,
                    timestamp: 0,
                  };
                  skillFirstPositions.set(skill.abilityId, firstAvailablePosition);
                  firstAvailablePosition++;
                }
              }

              // Second pass: Add repeat casts based on intervals
              for (const skill of rotationSkills) {
                const interval = Math.round(skill.avgInterval);
                const firstPos = skillFirstPositions.get(skill.abilityId);

                if (firstPos !== undefined) {
                  // Place at firstPos + interval, firstPos + interval*2, etc.
                  for (
                    let position = firstPos + interval;
                    position < totalCasts;
                    position += interval
                  ) {
                    // Find next available position starting from ideal position
                    let actualPosition = position;
                    while (
                      actualPosition < totalCasts &&
                      rotationPattern[actualPosition] !== null
                    ) {
                      actualPosition++;
                    }

                    if (actualPosition < totalCasts) {
                      rotationPattern[actualPosition] = {
                        abilityId: skill.abilityId,
                        abilityName: skill.abilityName,
                        timestamp: 0,
                      };
                    }
                  }
                }
              }

              // Fill empty slots with spammables
              if (spammableSkills.length > 0) {
                for (let i = 0; i < rotationPattern.length; i++) {
                  if (rotationPattern[i] === null) {
                    rotationPattern[i] = {
                      abilityId: spammableSkills[0].abilityId,
                      abilityName: spammableSkills[0].abilityName,
                      timestamp: 0,
                    };
                  }
                }
              }

              // Convert to array, filtering out nulls
              recommended.push(
                ...rotationPattern.filter((skill): skill is AbilityCast => skill !== null),
              );
            }

            logger.debug('Recommended rotation result', {
              rotation: recommended.map((cast) => cast.abilityName),
            });
            return recommended.length > 0 ? recommended : undefined;
          })()
        : undefined,
  };
}

/**
 * Weave analysis result
 */
export interface WeaveAnalysisResult {
  totalSkills: number;
  lightAttacks: number; // Count from cast events
  heavyAttacks: number; // Count from cast events
  properWeaves: number; // Skills that had a light attack cast within weave window before them
  weaveAccuracy: number; // Percentage of skills that were properly woven
  missedWeaves: number; // Skills without a light attack before them
  averageWeaveTiming: number; // Average time between light attack cast and skill cast (ms)
  castDetails?: CastDetail[]; // Detailed breakdown of each skill cast
}

export interface CastDetail {
  timestamp: number;
  skillAbilityId: number;
  precedingCastAbilityId: number | null;
  precedingCastType: 'light' | 'heavy' | 'skill' | 'none';
  timeSincePrecedingCast: number | null; // milliseconds
  isProperWeave: boolean;
}

/**
 * Analyze weaving patterns (light attack -> skill)
 *
 * This function detects proper light attack weaving by checking if each skill cast
 * has a light attack cast within 1 second before it.
 *
 * We use cast events for both light attacks and skills because cast events show
 * player intent (button press) which is more accurate than damage events for timing.
 */
export function analyzeWeaving(
  castEvents: UnifiedCastEvent[],
  damageEvents: DamageEvent[],
  playerId: number,
  _fightStartTime: number,
  _fightEndTime: number,
): WeaveAnalysisResult {
  // Sort events by timestamp
  // Include BOTH 'cast' and 'begincast' events - light attacks may appear in either
  // Exclude synergies and weapon swaps from the cast list
  const playerCasts = castEvents
    .filter(
      (event) =>
        event.sourceID === playerId &&
        (event.type === 'cast' || event.type === 'begincast') &&
        event.abilityGameID !== KnownAbilities.SWAP_WEAPONS &&
        !SYNERGY_ABILITY_IDS.has(event.abilityGameID),
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  // Debug: Log event types distribution
  const castTypeCount = castEvents.filter((e) => e.type === 'cast').length;
  const beginCastTypeCount = castEvents.filter((e) => e.type === 'begincast').length;
  const playerCastTypeCount = castEvents.filter(
    (e) => e.sourceID === playerId && e.type === 'cast',
  ).length;
  const playerBeginCastTypeCount = castEvents.filter(
    (e) => e.sourceID === playerId && e.type === 'begincast',
  ).length;

  // Debug: Log unique ability IDs to see what's being cast
  const uniqueSkillIds = new Set(playerCasts.map((e) => e.abilityGameID));

  // Separate light attacks, heavy attacks, and regular skills from cast events
  const lightAttackCasts = playerCasts.filter((event) =>
    LIGHT_ATTACK_ABILITY_IDS.has(event.abilityGameID),
  );

  const heavyAttackCasts = playerCasts.filter((event) =>
    HEAVY_ATTACK_ABILITY_IDS.has(event.abilityGameID),
  );

  const skillCasts = playerCasts.filter(
    (event) =>
      !LIGHT_ATTACK_ABILITY_IDS.has(event.abilityGameID) &&
      !HEAVY_ATTACK_ABILITY_IDS.has(event.abilityGameID) &&
      event.abilityGameID !== KnownAbilities.SWAP_WEAPONS &&
      !SYNERGY_ABILITY_IDS.has(event.abilityGameID),
  );

  logger.debug('Weave analysis debug metrics', {
    totalCastEvents: castEvents.length,
    castTypeCount,
    beginCastTypeCount,
    playerId,
    playerCastTypeCount,
    playerBeginCastTypeCount,
    totalPlayerCasts: playerCasts.length,
    uniqueCastAbilities: uniqueSkillIds.size,
    lightAttackIdsTracked: Array.from(LIGHT_ATTACK_ABILITY_IDS),
    lightAttacksDetected: lightAttackCasts.length,
    heavyAttacksDetected: heavyAttackCasts.length,
    regularSkillCasts: skillCasts.length,
  });

  // Analyze weaving patterns
  let properWeaves = 0;
  let totalWeaveTiming = 0;
  let weaveTimingCount = 0;
  const castDetails: CastDetail[] = [];

  skillCasts.forEach((castEvent) => {
    // Find the immediately preceding cast, skipping excluded abilities (weapon swaps and synergies)
    let precedingCast: UnifiedCastEvent | null = null;
    const currentIndex = playerCasts.indexOf(castEvent);

    for (let i = currentIndex - 1; i >= 0; i--) {
      const cast = playerCasts[i];
      // Skip excluded abilities (weapon swaps and synergies)
      if (
        cast.abilityGameID === KnownAbilities.SWAP_WEAPONS ||
        SYNERGY_ABILITY_IDS.has(cast.abilityGameID)
      ) {
        continue;
      }
      precedingCast = cast;
      break;
    }

    // Determine if this is a proper weave (light attack immediately before skill)
    const isProperWeave = precedingCast
      ? LIGHT_ATTACK_ABILITY_IDS.has(precedingCast.abilityGameID)
      : false;

    if (isProperWeave && precedingCast) {
      properWeaves++;
      const timeDiff = castEvent.timestamp - precedingCast.timestamp;
      totalWeaveTiming += timeDiff;
      weaveTimingCount++;
    }

    // Determine preceding cast type
    let precedingCastType: 'light' | 'heavy' | 'skill' | 'none' = 'none';
    if (precedingCast) {
      if (LIGHT_ATTACK_ABILITY_IDS.has(precedingCast.abilityGameID)) {
        precedingCastType = 'light';
      } else if (HEAVY_ATTACK_ABILITY_IDS.has(precedingCast.abilityGameID)) {
        precedingCastType = 'heavy';
      } else {
        precedingCastType = 'skill';
      }
    }

    castDetails.push({
      timestamp: castEvent.timestamp,
      skillAbilityId: castEvent.abilityGameID,
      precedingCastAbilityId: precedingCast?.abilityGameID ?? null,
      precedingCastType,
      timeSincePrecedingCast: precedingCast ? castEvent.timestamp - precedingCast.timestamp : null,
      isProperWeave,
    });
  });

  const totalSkills = skillCasts.length;
  const weaveAccuracy = totalSkills > 0 ? (properWeaves / totalSkills) * 100 : 0;
  const missedWeaves = totalSkills - properWeaves;
  const averageWeaveTiming = weaveTimingCount > 0 ? totalWeaveTiming / weaveTimingCount : 0;

  logger.debug('Weave analysis results summary', {
    properWeavesDetected: properWeaves,
    totalSkills,
    weaveAccuracy: Number(weaveAccuracy.toFixed(1)),
    averageWeaveTimingMs: Number(averageWeaveTiming.toFixed(0)),
  });

  return {
    totalSkills,
    lightAttacks: lightAttackCasts.length,
    heavyAttacks: heavyAttackCasts.length,
    properWeaves,
    weaveAccuracy,
    missedWeaves,
    averageWeaveTiming,
    castDetails,
  };
}

/**
 * Trial dummy buff detection result
 */
export interface TrialDummyBuffResult {
  activeBuffs: string[];
  missingBuffs: string[];
  buffDetails: Array<{
    name: string;
    abilityId: number;
    isActive: boolean;
  }>;
}

/**
 * Detect trial dummy buffs on a player
 */
export function detectTrialDummyBuffs(
  buffEvents: BuffEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
): TrialDummyBuffResult {
  const result: TrialDummyBuffResult = {
    activeBuffs: [],
    missingBuffs: [],
    buffDetails: [],
  };

  // Check each expected buff from the trial dummy
  Array.from(TRIAL_DUMMY_BUFF_IDS).forEach((buffId) => {
    const buffName = TRIAL_DUMMY_BUFF_NAMES[buffId] || `Unknown Buff (${buffId})`;

    // Check if the player has this buff during the fight
    const hasBuff = buffEvents.some(
      (event) =>
        event.targetID === playerId &&
        event.abilityGameID === buffId &&
        event.type === 'applybuff' &&
        event.timestamp >= fightStartTime &&
        event.timestamp <= fightEndTime,
    );

    const buffDetail = {
      name: buffName,
      abilityId: buffId,
      isActive: hasBuff,
    };

    result.buffDetails.push(buffDetail);

    if (hasBuff) {
      result.activeBuffs.push(buffName);
    } else {
      result.missingBuffs.push(buffName);
    }
  });

  return result;
}

// ─── Bar Swap Analysis ─────────────────────────────────────────────────────────

/**
 * Bar swap analysis result
 */
export interface BarSwapAnalysisResult {
  totalSwaps: number;
  swapsPerMinute: number;
  averageTimeBetweenSwaps: number; // milliseconds
  longestTimeOnOneBar: number; // milliseconds
  /** True if the player stayed on one bar for more than 15 seconds at any point */
  barCampingDetected: boolean;
  barCampingInstances: number;
}

/**
 * Analyze bar swap frequency and detect bar camping.
 * ESO rotations typically swap every 5-8 GCDs (~5-8 seconds).
 * Staying on one bar for >15s is considered "bar camping."
 */
export function analyzeBarSwaps(
  castEvents: UnifiedCastEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
): BarSwapAnalysisResult {
  const BAR_CAMPING_THRESHOLD_MS = 15000;

  const swapEvents = castEvents
    .filter(
      (event) =>
        event.sourceID === playerId &&
        event.sourceIsFriendly &&
        event.abilityGameID === KnownAbilities.SWAP_WEAPONS &&
        event.timestamp >= fightStartTime &&
        event.timestamp <= fightEndTime,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  const totalSwaps = swapEvents.length;
  const durationMinutes = (fightEndTime - fightStartTime) / 60000;

  if (totalSwaps === 0) {
    const totalDuration = fightEndTime - fightStartTime;
    return {
      totalSwaps: 0,
      swapsPerMinute: 0,
      averageTimeBetweenSwaps: 0,
      longestTimeOnOneBar: totalDuration,
      barCampingDetected: totalDuration > BAR_CAMPING_THRESHOLD_MS,
      barCampingInstances: totalDuration > BAR_CAMPING_THRESHOLD_MS ? 1 : 0,
    };
  }

  const intervals: number[] = [];
  let longestTimeOnOneBar = swapEvents[0].timestamp - fightStartTime;
  let barCampingInstances = longestTimeOnOneBar > BAR_CAMPING_THRESHOLD_MS ? 1 : 0;

  for (let i = 1; i < swapEvents.length; i++) {
    const interval = swapEvents[i].timestamp - swapEvents[i - 1].timestamp;
    intervals.push(interval);
    if (interval > longestTimeOnOneBar) {
      longestTimeOnOneBar = interval;
    }
    if (interval > BAR_CAMPING_THRESHOLD_MS) {
      barCampingInstances++;
    }
  }

  // Also check time from last swap to fight end
  const lastInterval = fightEndTime - swapEvents[swapEvents.length - 1].timestamp;
  if (lastInterval > longestTimeOnOneBar) {
    longestTimeOnOneBar = lastInterval;
  }
  if (lastInterval > BAR_CAMPING_THRESHOLD_MS) {
    barCampingInstances++;
  }

  const averageTimeBetweenSwaps =
    intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

  return {
    totalSwaps,
    swapsPerMinute: durationMinutes > 0 ? totalSwaps / durationMinutes : 0,
    averageTimeBetweenSwaps,
    longestTimeOnOneBar,
    barCampingDetected: longestTimeOnOneBar > BAR_CAMPING_THRESHOLD_MS,
    barCampingInstances,
  };
}

// ─── Ultimate Usage Analysis ────────────────────────────────────────────────────

/**
 * Ultimate usage analysis result
 */
export interface UltimateUsageResult {
  totalUltimateCasts: number;
  ultimateAbilities: Array<{
    abilityId: number;
    abilityName: string;
    castCount: number;
    timestamps: number[];
  }>;
  averageTimeBetweenUltimates: number; // milliseconds
  fightDurationSeconds: number;
}

/** Known ultimate cost threshold — abilities costing >= this are ultimates */
const _ULTIMATE_COST_THRESHOLD = 75;

/**
 * Well-known ultimate ability IDs from ESO.
 * This set covers popular ultimates used in PvE content.
 */
const KNOWN_ULTIMATE_ABILITY_IDS = new Set([
  // Nightblade
  33398, // Incapacitating Strike
  36508, // Soul Harvest
  61907, // Toxic Barrage
  61919, // Ballista
  // Dragonknight
  32958, // Standard of Might
  32947, // Shifting Standard
  32715, // Ferocious Leap
  32719, // Take Flight
  // Sorcerer
  24785, // Greater Storm Atronach
  24799, // Suppression Field
  27706, // Absorption Field
  // Templar
  22223, // Crescent Sweep
  22226, // Radiant Glory (morph ult)
  22139, // Flawless Dawnbreaker
  40161, // Flawless Dawnbreaker (morph)
  // Necromancer
  115238, // Pestilent Colossus
  122174, // Glacial Colossus
  122388, // Ruinous Colossus
  // Warden
  85982, // Feral Guardian
  85986, // Eternal Guardian
  85990, // Wild Guardian
  // Arcanist
  183006, // Tide King's Gaze
  183623, // Exhausting Fatecarver
  183625, // Pragmatic Fatecarver
  // Weapon skill lines
  22139, // Flawless Dawnbreaker
  40161, // Flawless Dawnbreaker (morph)
  40158, // Dawnbreaker of Smiting
  // Fighters Guild
  35713, // Flawless Dawnbreaker
  // Mages Guild
  40468, // Shooting Star
  63430, // Ice Comet
  // Undaunted
  39489, // Aggressive Horn
  40223, // Aggressive Warhorn
  // Assault
  38563, // Aggressive Horn
  40220, // Sturdy Horn
]);

/**
 * Analyze ultimate ability usage during a fight.
 * Uses a combination of known ultimate IDs and name-based heuristics.
 */
export function analyzeUltimateUsage(
  castEvents: UnifiedCastEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper?: AbilityNameMapper,
): UltimateUsageResult {
  const fightDurationSeconds = (fightEndTime - fightStartTime) / 1000;

  // Filter to player's casts
  const playerCasts = castEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      event.sourceIsFriendly &&
      event.type === 'cast' &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime,
  );

  // Identify ultimate casts by known IDs or name heuristics
  const ultimateCasts = playerCasts.filter((cast) => {
    if (KNOWN_ULTIMATE_ABILITY_IDS.has(cast.abilityGameID)) return true;

    // Name-based fallback — check for common ultimate keywords
    const name = getAbilityNameFromMapper(cast.abilityGameID, abilityMapper);
    if (!name) return false;
    const lower = name.toLowerCase();
    return (
      lower.includes('ultimate') ||
      lower.includes('colossus') ||
      lower.includes('atronach') ||
      lower.includes('dawnbreaker') ||
      lower.includes('warhorn') ||
      lower.includes('aggressive horn')
    );
  });

  // Group by ability
  const abilityMap = new Map<
    number,
    { abilityName: string; castCount: number; timestamps: number[] }
  >();

  for (const cast of ultimateCasts) {
    const existing = abilityMap.get(cast.abilityGameID);
    const name =
      getAbilityNameFromMapper(cast.abilityGameID, abilityMapper) ||
      `Unknown (${cast.abilityGameID})`;
    if (existing) {
      existing.castCount++;
      existing.timestamps.push(cast.timestamp);
    } else {
      abilityMap.set(cast.abilityGameID, {
        abilityName: name,
        castCount: 1,
        timestamps: [cast.timestamp],
      });
    }
  }

  // Calculate average time between ultimates
  const allUltTimestamps = ultimateCasts.map((c) => c.timestamp).sort((a, b) => a - b);
  let averageTimeBetweenUltimates = 0;
  if (allUltTimestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < allUltTimestamps.length; i++) {
      intervals.push(allUltTimestamps[i] - allUltTimestamps[i - 1]);
    }
    averageTimeBetweenUltimates = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  return {
    totalUltimateCasts: ultimateCasts.length,
    ultimateAbilities: Array.from(abilityMap.entries()).map(([abilityId, data]) => ({
      abilityId,
      ...data,
    })),
    averageTimeBetweenUltimates,
    fightDurationSeconds,
  };
}

// ─── DoT Uptime Analysis ────────────────────────────────────────────────────────

/**
 * DoT uptime result for a single ability
 */
export interface DotUptimeEntry {
  abilityId: number;
  abilityName: string;
  uptimePercentage: number;
  totalActiveMs: number;
  tickCount: number;
}

/**
 * Overall DoT uptime analysis result
 */
export interface DotUptimeResult {
  dotAbilities: DotUptimeEntry[];
  overallDotUptimePercentage: number;
  totalDotDamage: number;
  totalDirectDamage: number;
  dotDamagePercentage: number;
}

/**
 * Analyze DoT uptime and direct vs DoT damage breakdown.
 * DoTs are identified by `tick: true` on damage events.
 * Uptime is estimated by finding the active windows for each DoT ability
 * where ticks occur within a reasonable gap threshold.
 */
export function analyzeDotUptime(
  damageEvents: DamageEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper?: AbilityNameMapper,
): DotUptimeResult {
  const DOT_GAP_THRESHOLD_MS = 3000; // If no tick for 3s, DoT is considered down
  const fightDurationMs = fightEndTime - fightStartTime;

  const playerDamage = damageEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      event.sourceIsFriendly &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime,
  );

  // Split into DoT and direct damage
  const dotEvents = playerDamage.filter((event) => event.tick);
  const directEvents = playerDamage.filter((event) => !event.tick);

  const totalDotDamage = dotEvents.reduce((sum, e) => sum + e.amount, 0);
  const totalDirectDamage = directEvents.reduce((sum, e) => sum + e.amount, 0);
  const totalDamage = totalDotDamage + totalDirectDamage;

  // Group DoT ticks by ability
  const dotTicksByAbility = new Map<number, DamageEvent[]>();
  for (const event of dotEvents) {
    const existing = dotTicksByAbility.get(event.abilityGameID) || [];
    existing.push(event);
    dotTicksByAbility.set(event.abilityGameID, existing);
  }

  const dotAbilities: DotUptimeEntry[] = [];

  for (const [abilityId, ticks] of dotTicksByAbility.entries()) {
    ticks.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate active windows
    let totalActiveMs = 0;
    let windowStart = ticks[0].timestamp;
    let lastTick = ticks[0].timestamp;

    for (let i = 1; i < ticks.length; i++) {
      const gap = ticks[i].timestamp - lastTick;
      if (gap > DOT_GAP_THRESHOLD_MS) {
        // Window ended; add a grace period after the last tick
        totalActiveMs += lastTick - windowStart + DOT_GAP_THRESHOLD_MS;
        windowStart = ticks[i].timestamp;
      }
      lastTick = ticks[i].timestamp;
    }

    // Close last window
    totalActiveMs += lastTick - windowStart + DOT_GAP_THRESHOLD_MS;

    // Clamp to fight duration
    totalActiveMs = Math.min(totalActiveMs, fightDurationMs);

    const uptimePercentage = fightDurationMs > 0 ? (totalActiveMs / fightDurationMs) * 100 : 0;
    const name = getAbilityNameFromMapper(abilityId, abilityMapper) || `Unknown (${abilityId})`;

    dotAbilities.push({
      abilityId,
      abilityName: name,
      uptimePercentage,
      totalActiveMs,
      tickCount: ticks.length,
    });
  }

  // Sort by tick count descending (most used DoTs first)
  dotAbilities.sort((a, b) => b.tickCount - a.tickCount);

  // Overall DoT uptime: merge all DoT windows
  const allDotTicks = dotEvents.sort((a, b) => a.timestamp - b.timestamp);
  let overallActiveMs = 0;
  if (allDotTicks.length > 0) {
    let windowStart = allDotTicks[0].timestamp;
    let lastTick = allDotTicks[0].timestamp;
    for (let i = 1; i < allDotTicks.length; i++) {
      const gap = allDotTicks[i].timestamp - lastTick;
      if (gap > DOT_GAP_THRESHOLD_MS) {
        overallActiveMs += lastTick - windowStart + DOT_GAP_THRESHOLD_MS;
        windowStart = allDotTicks[i].timestamp;
      }
      lastTick = allDotTicks[i].timestamp;
    }
    overallActiveMs += lastTick - windowStart + DOT_GAP_THRESHOLD_MS;
    overallActiveMs = Math.min(overallActiveMs, fightDurationMs);
  }

  return {
    dotAbilities,
    overallDotUptimePercentage: fightDurationMs > 0 ? (overallActiveMs / fightDurationMs) * 100 : 0,
    totalDotDamage,
    totalDirectDamage,
    dotDamagePercentage: totalDamage > 0 ? (totalDotDamage / totalDamage) * 100 : 0,
  };
}

// ─── Mundus Stone Detection ─────────────────────────────────────────────────────

/**
 * Mundus stone detection result
 */
export interface MundusStoneResult {
  hasMundus: boolean;
  mundusName: string | null;
  mundusAbilityId: number | null;
}

/** Map of mundus stone ability IDs to display names */
const MUNDUS_STONE_NAMES: Record<number, string> = {
  [MundusStones.THE_WARRIOR]: 'The Warrior (Weapon Damage)',
  [MundusStones.THE_MAGE]: 'The Mage (Spell Damage)',
  [MundusStones.THE_SERPENT]: 'The Serpent (Stamina Recovery)',
  [MundusStones.THE_THIEF]: 'The Thief (Critical Chance)',
  [MundusStones.THE_LADY]: 'The Lady (Resistance)',
  [MundusStones.THE_STEED]: 'The Steed (Movement Speed)',
  [MundusStones.THE_LORD]: 'The Lord (Max Health)',
  [MundusStones.THE_APPRENTICE]: 'The Apprentice (Max Magicka)',
  [MundusStones.THE_RITUAL]: 'The Ritual (Healing Done)',
  [MundusStones.THE_LOVER]: 'The Lover (Penetration)',
  [MundusStones.THE_ATRONACH]: 'The Atronach (Magicka Recovery)',
  [MundusStones.THE_SHADOW]: 'The Shadow (Critical Damage)',
  [MundusStones.THE_TOWER]: 'The Tower (Max Stamina)',
};

const MUNDUS_STONE_IDS = new Set(
  Object.values(MundusStones).filter((v): v is number => typeof v === 'number'),
);

/**
 * Detect equipped mundus stone from combatant info auras.
 */
export function detectMundusStone(
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number,
): MundusStoneResult {
  const playerCombatantInfo = combatantInfoEvents.find((e) => e.sourceID === playerId);
  if (!playerCombatantInfo?.auras) {
    return { hasMundus: false, mundusName: null, mundusAbilityId: null };
  }

  for (const aura of playerCombatantInfo.auras) {
    if (MUNDUS_STONE_IDS.has(aura.ability)) {
      return {
        hasMundus: true,
        mundusName: MUNDUS_STONE_NAMES[aura.ability] || `Mundus Stone (${aura.ability})`,
        mundusAbilityId: aura.ability,
      };
    }
  }

  return { hasMundus: false, mundusName: null, mundusAbilityId: null };
}

// ─── Resource Sustain Analysis ──────────────────────────────────────────────────

/**
 * Resource sustain analysis result
 */
export interface ResourceSustainResult {
  /** Average stamina % during the fight */
  averageStaminaPercent: number;
  /** Average magicka % during the fight */
  averageMagickaPercent: number;
  /** Seconds spent below 30% on primary resource */
  secondsBelowThreshold: number;
  /** Total resource snapshots sampled */
  sampleCount: number;
  /** Primary resource type detected */
  primaryResource: 'stamina' | 'magicka' | 'unknown';
}

/**
 * Analyze resource sustain over the fight duration using sourceResources from damage events.
 * Determines whether the player is stamina or magicka-based from max resource pools.
 */
export function analyzeResourceSustain(
  damageEvents: DamageEvent[],
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
): ResourceSustainResult {
  const LOW_RESOURCE_THRESHOLD = 0.3;
  const BUCKET_SIZE_MS = 1000;
  const fightDurationMs = fightEndTime - fightStartTime;

  const playerDamage = damageEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      event.sourceIsFriendly &&
      event.sourceResources != null &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime,
  );

  if (playerDamage.length === 0) {
    return {
      averageStaminaPercent: 0,
      averageMagickaPercent: 0,
      secondsBelowThreshold: 0,
      sampleCount: 0,
      primaryResource: 'unknown',
    };
  }

  // Determine primary resource from max pools (first available snapshot)
  const firstRes = playerDamage[0].sourceResources;
  const primaryResource = firstRes.maxStamina > firstRes.maxMagicka ? 'stamina' : 'magicka';

  // Bucket by 1-second intervals, take last snapshot per bucket
  const bucketCount = Math.ceil(fightDurationMs / BUCKET_SIZE_MS);
  const bucketSnapshots = new Array<{ stamPct: number; magPct: number } | null>(bucketCount).fill(
    null,
  );

  for (const event of playerDamage) {
    const bucketIndex = Math.min(
      Math.floor((event.timestamp - fightStartTime) / BUCKET_SIZE_MS),
      bucketCount - 1,
    );
    const res = event.sourceResources;
    bucketSnapshots[bucketIndex] = {
      stamPct: res.maxStamina > 0 ? res.stamina / res.maxStamina : 1,
      magPct: res.maxMagicka > 0 ? res.magicka / res.maxMagicka : 1,
    };
  }

  // Forward-fill empty buckets
  for (let i = 1; i < bucketSnapshots.length; i++) {
    if (bucketSnapshots[i] === null) {
      bucketSnapshots[i] = bucketSnapshots[i - 1];
    }
  }

  const filledBuckets = bucketSnapshots.filter(
    (b): b is { stamPct: number; magPct: number } => b !== null,
  );

  if (filledBuckets.length === 0) {
    return {
      averageStaminaPercent: 0,
      averageMagickaPercent: 0,
      secondsBelowThreshold: 0,
      sampleCount: 0,
      primaryResource,
    };
  }

  const avgStamPct =
    (filledBuckets.reduce((sum, b) => sum + b.stamPct, 0) / filledBuckets.length) * 100;
  const avgMagPct =
    (filledBuckets.reduce((sum, b) => sum + b.magPct, 0) / filledBuckets.length) * 100;

  const secondsBelowThreshold = filledBuckets.filter((b) => {
    const pct = primaryResource === 'stamina' ? b.stamPct : b.magPct;
    return pct < LOW_RESOURCE_THRESHOLD;
  }).length; // Each bucket = 1 second

  return {
    averageStaminaPercent: avgStamPct,
    averageMagickaPercent: avgMagPct,
    secondsBelowThreshold,
    sampleCount: filledBuckets.length,
    primaryResource,
  };
}

// ─── Penetration & Critical Damage Cap Estimation ───────────────────────────────

/**
 * Simplified penetration estimate for parse analysis (lightweight, no worker needed)
 */
export interface PenCritCapResult {
  /** Estimated penetration from gear/CP (static, from combatant info) */
  estimatedPenetration: number;
  /** Whether the player likely exceeds the 18,200 cap without group support */
  likelyOverPenCap: boolean;
  /** Whether the player has The Lover mundus (pen mundus) */
  hasLoverMundus: boolean;
}

/**
 * Estimate penetration from gear traits and mundus.
 * This is a quick estimate — the full worker calculation is more accurate,
 * but isn't available in the standalone parse analysis page.
 */
export function estimatePenCritCap(
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number,
): PenCritCapResult {
  const PEN_CAP = 18200;

  const mundusResult = detectMundusStone(combatantInfoEvents, playerId);
  const hasLoverMundus = mundusResult.mundusAbilityId === MundusStones.THE_LOVER;

  // Look for Sharpened trait on gear
  const playerInfo = combatantInfoEvents.find((e) => e.sourceID === playerId);
  let sharpenedCount = 0;
  if (playerInfo?.gear) {
    for (const gear of playerInfo.gear) {
      if (gear.trait === GearTrait.SHARPENED) {
        sharpenedCount++;
      }
    }
  }

  // Rough estimation: each Sharpened weapon ≈ 1638 pen, Lover ≈ 2752 pen
  const estimatedPenetration = sharpenedCount * 1638 + (hasLoverMundus ? 2752 : 0);

  return {
    estimatedPenetration,
    likelyOverPenCap: estimatedPenetration > PEN_CAP,
    hasLoverMundus,
  };
}
