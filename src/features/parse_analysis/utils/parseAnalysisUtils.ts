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
  WITCHES_BREW,
  EXPERIENCE_BOOST_FOOD,
} from '../../../types/abilities';
import {
  BuffEvent,
  CastEvent,
  DamageEvent,
  UnifiedCastEvent,
} from '../../../types/combatlogEvents';

/**
 * Food type detection result
 */
export interface FoodDetectionResult {
  hasFood: boolean;
  foodType: 'none' | 'stamina' | 'magicka' | 'health-stamina' | 'health-magicka' | 'magicka-stamina' | 'tri-stat' | 'health-regen' | 'event' | 'xp-boost' | 'other';
  foodAbilityIds: number[];
  foodNames: string[];
}

/**
 * Trial dummy expected buffs (from a 21M or 51M dummy)
 * These are the buffs that a trial dummy typically provides
 */
export const TRIAL_DUMMY_BUFFS = {
  // Major buffs
  MAJOR_SLAYER: 61713, // Major Slayer - 15% damage done to dungeon/trial enemies
  MAJOR_COURAGE: 109966, // Major Courage - 258 weapon/spell damage
  MAJOR_FORCE: 61694, // Major Force - 20% critical damage
  
  // Minor buffs
  MINOR_SLAYER: 147226, // Minor Slayer - 5% damage done to dungeon/trial enemies
  MINOR_COURAGE: 109974, // Minor Courage - 129 weapon/spell damage
  MINOR_BERSERK: 61693, // Minor Berserk - 5% damage done
  MINOR_FORCE: 61744, // Minor Force - 10% critical damage
  
  // Penetration debuffs on target
  MAJOR_BREACH: 61742, // Major Breach - 5948 resistance reduction
  MINOR_BREACH: 61743, // Minor Breach - 2974 resistance reduction
  
  // Combat Prayer / Blessing of Protection
  COMBAT_PRAYER_BUFF: 37009, // Combat Prayer - 10% damage mitigation
} as const;

/**
 * Light attack ability ID
 * ESO logs report light attacks with this ability ID
 */
export const LIGHT_ATTACK_ABILITY_ID = 15279;

/**
 * Heavy attack ability IDs (basic heavy attacks, can be expanded)
 */
export const HEAVY_ATTACK_ABILITY_IDS = new Set([
  16041, // Two-handed heavy
  15279, // Other heavy attacks may have different IDs
]);

/**
 * Detect food/drink buffs on a player
 */
export function detectFood(
  buffEvents: BuffEvent[],
  playerId: number,
  _fightStartTime: number,
  _fightEndTime: number,
): FoodDetectionResult {
  const result: FoodDetectionResult = {
    hasFood: false,
    foodType: 'none',
    foodAbilityIds: [],
    foodNames: [],
  };

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
      WITCHES_BREW.has(abilityId) ||
      EXPERIENCE_BOOST_FOOD.has(abilityId)
    );
  });

  if (activeFoodBuffs.length === 0) {
    return result;
  }

  result.hasFood = true;
  result.foodAbilityIds = activeFoodBuffs.map((e) => e.abilityGameID);

  // Determine food type based on the buffs
  const hasStaminaFood = activeFoodBuffs.some((e) => STAMINA_FOOD.has(e.abilityGameID));
  const hasMagickaFood = activeFoodBuffs.some((e) => MAGICKA_FOOD.has(e.abilityGameID));
  const hasHealthStamina = activeFoodBuffs.some((e) =>
    INCREASE_MAX_HEALTH_AND_STAMINA.has(e.abilityGameID),
  );
  const hasHealthMagicka = activeFoodBuffs.some((e) =>
    INCREASE_MAX_HEALTH_AND_MAGICKA.has(e.abilityGameID),
  );
  const hasMagickaStamina = activeFoodBuffs.some((e) =>
    INCREASE_MAX_MAGICKA_AND_STAMINA.has(e.abilityGameID),
  );
  const hasTriStat = activeFoodBuffs.some((e) => TRI_STAT_FOOD.has(e.abilityGameID));
  const hasHealthRegen = activeFoodBuffs.some((e) => HEALTH_AND_REGEN_FOOD.has(e.abilityGameID));
  const hasWitchesBrew = activeFoodBuffs.some((e) => WITCHES_BREW.has(e.abilityGameID));
  const hasXpBoost = activeFoodBuffs.some((e) => EXPERIENCE_BOOST_FOOD.has(e.abilityGameID));

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
): number {
  // Count cast events for this player (excluding fake casts)
  const playerCasts = castEvents.filter(
    (event) =>
      event.type === 'cast' && event.sourceID === playerId && !(event as CastEvent).fake,
  );

  // Calculate fight duration in minutes
  const durationMs = fightEndTime - fightStartTime;
  const minutes = durationMs > 0 ? durationMs / 60000 : 0;

  if (minutes === 0) return 0;

  return playerCasts.length / minutes;
}

/**
 * Weave analysis result
 */
export interface WeaveAnalysisResult {
  totalSkills: number;
  lightAttacks: number; // Count from damage events
  heavyAttacks: number; // Count from damage events
  properWeaves: number; // Skills that had a light attack damage within 1s before them
  weaveAccuracy: number; // Percentage of skills that were properly woven
  missedWeaves: number; // Skills without a light attack before them
  averageWeaveTiming: number; // Average time between light attack damage and skill cast (ms)
}

/**
 * Analyze weaving patterns (light attack -> skill)
 * 
 * This function detects proper light attack weaving by checking if each skill cast
 * has a light attack damage event within 1 second before it.
 * 
 * We use damage events for light attacks because ESO Logs doesn't include
 * light attacks in the Casts data type - they only appear in DamageDone events.
 * We use cast events for skills to get the player's actual skill usage.
 */
export function analyzeWeaving(
  castEvents: UnifiedCastEvent[],
  damageEvents: DamageEvent[],
  playerId: number,
  _fightStartTime: number,
  _fightEndTime: number,
): WeaveAnalysisResult {
  // Sort events by timestamp
  const playerCasts = castEvents
    .filter((event) => event.sourceID === playerId && event.type === 'cast')
    .sort((a, b) => a.timestamp - b.timestamp);

  const playerDamage = damageEvents
    .filter((event) => event.sourceID === playerId)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Debug: Log unique ability IDs to see what's being cast
  const uniqueSkillIds = new Set(playerCasts.map(e => e.abilityGameID));
  const uniqueDamageIds = new Set(playerDamage.map(e => e.abilityGameID));
  
  console.log('🔍 Weave Analysis Debug:');
  console.log(`  Total player casts: ${playerCasts.length}`);
  console.log(`  Total player damage events: ${playerDamage.length}`);
  console.log(`  Unique skill abilities: ${uniqueSkillIds.size}`);
  console.log(`  Unique damage abilities: ${uniqueDamageIds.size}`);
  console.log(`  Light attack ID we're looking for: ${LIGHT_ATTACK_ABILITY_ID}`);
  
  // Show first 20 unique damage ability IDs
  const damageArray = Array.from(uniqueDamageIds).slice(0, 20);
  console.log(`  Sample damage ability IDs (first 20):`, damageArray);
  
  // Check if light attack ID exists in the damage events
  const hasLightAttacks = uniqueDamageIds.has(LIGHT_ATTACK_ABILITY_ID);
  console.log(`  Contains light attack ID ${LIGHT_ATTACK_ABILITY_ID} in damage? ${hasLightAttacks}`);

  // Count light attacks and heavy attacks from damage events
  const lightAttackDamage = playerDamage.filter(
    (event) => event.abilityGameID === LIGHT_ATTACK_ABILITY_ID,
  );
  const heavyAttackDamage = playerDamage.filter((event) =>
    HEAVY_ATTACK_ABILITY_IDS.has(event.abilityGameID),
  );

  console.log(`  Light attacks found in damage: ${lightAttackDamage.length}`);
  console.log(`  Heavy attacks found in damage: ${heavyAttackDamage.length}`);

  // Analyze weaving patterns
  let properWeaves = 0;
  let totalWeaveTiming = 0;
  let weaveTimingCount = 0;

  // For each skill cast, check if there was a light attack cast within the weave window before it
  const WEAVE_WINDOW_MS = 1000; // 1 second before skill cast

  playerCasts.forEach((castEvent) => {
    // Skip light/heavy attacks (though they shouldn't appear in casts anyway)
    if (
      castEvent.abilityGameID === LIGHT_ATTACK_ABILITY_ID ||
      HEAVY_ATTACK_ABILITY_IDS.has(castEvent.abilityGameID)
    ) {
      return;
    }

    // Find light attack damage events within the weave window before this skill cast
    const recentLightAttack = lightAttackDamage
      .filter(
        (la) =>
          la.timestamp < castEvent.timestamp &&
          la.timestamp >= castEvent.timestamp - WEAVE_WINDOW_MS,
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0]; // Get most recent

    if (recentLightAttack) {
      properWeaves++;
      const timeDiff = castEvent.timestamp - recentLightAttack.timestamp;
      totalWeaveTiming += timeDiff;
      weaveTimingCount++;
    }
  });

  // Count total skills (excluding light/heavy attacks from casts)
  const totalSkills = playerCasts.filter(
    (event) =>
      event.abilityGameID !== LIGHT_ATTACK_ABILITY_ID &&
      !HEAVY_ATTACK_ABILITY_IDS.has(event.abilityGameID),
  ).length;

  const weaveAccuracy = totalSkills > 0 ? (properWeaves / totalSkills) * 100 : 0;
  const missedWeaves = totalSkills - properWeaves;
  const averageWeaveTiming =
    weaveTimingCount > 0 ? totalWeaveTiming / weaveTimingCount : 0;

  return {
    totalSkills,
    lightAttacks: lightAttackDamage.length,
    heavyAttacks: heavyAttackDamage.length,
    properWeaves,
    weaveAccuracy,
    missedWeaves,
    averageWeaveTiming,
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
 * Buff name mapping for trial dummy buffs
 */
export const TRIAL_DUMMY_BUFF_NAMES: Record<number, string> = {
  [TRIAL_DUMMY_BUFFS.MAJOR_SLAYER]: 'Major Slayer',
  [TRIAL_DUMMY_BUFFS.MAJOR_COURAGE]: 'Major Courage',
  [TRIAL_DUMMY_BUFFS.MAJOR_FORCE]: 'Major Force',
  [TRIAL_DUMMY_BUFFS.MINOR_SLAYER]: 'Minor Slayer',
  [TRIAL_DUMMY_BUFFS.MINOR_COURAGE]: 'Minor Courage',
  [TRIAL_DUMMY_BUFFS.MINOR_BERSERK]: 'Minor Berserk',
  [TRIAL_DUMMY_BUFFS.MINOR_FORCE]: 'Minor Force',
  [TRIAL_DUMMY_BUFFS.MAJOR_BREACH]: 'Major Breach',
  [TRIAL_DUMMY_BUFFS.MINOR_BREACH]: 'Minor Breach',
  [TRIAL_DUMMY_BUFFS.COMBAT_PRAYER_BUFF]: 'Combat Prayer',
};

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

  // Check each expected buff
  Object.entries(TRIAL_DUMMY_BUFFS).forEach(([buffKey, buffId]) => {
    const buffName = TRIAL_DUMMY_BUFF_NAMES[buffId] || buffKey;

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
