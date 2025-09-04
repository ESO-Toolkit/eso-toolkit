import { FightFragment } from '../graphql/generated';
import { DamageEvent } from '../types/combatlogEvents';

/**
 * Calculates the active percentage for each player during a fight.
 * A player is considered "active" based on their combat activity - casting abilities, dealing damage, etc.
 * This matches the ESO logs active percentage calculation logic.
 */

export interface ActivePercentageResult {
  playerId: number;
  activeTimeMs: number;
  totalTimeMs: number;
  activePercentage: number;
}

/**
 * Calculate active percentage for all players in a fight
 * Based on damage output: player is active during periods when they are dealing damage.
 * This approach focuses on actual damage output as the primary indicator of activity,
 * which may align better with ESO logs methodology.
 */
export function calculateActivePercentages(
  fight: FightFragment,
  damageEvents: Record<string, DamageEvent[]>,
): Record<number, ActivePercentageResult> {
  if (fight.startTime == null || fight.endTime == null) {
    return {};
  }

  const fightStartTime = Number(fight.startTime);
  const fightEndTime = Number(fight.endTime);
  const totalFightDuration = fightEndTime - fightStartTime;

  if (totalFightDuration <= 0) {
    return {};
  }

  const results: Record<number, ActivePercentageResult> = {};

  // For each player, calculate their active time using a running tally approach
  Object.entries(damageEvents).forEach(([playerIdStr, damageEvents]) => {
    const playerId = Number(playerIdStr);

    const activeTimeMs = calculatePlayerActiveTime(
      playerId,
      fightStartTime,
      fightEndTime,
      damageEvents,
    );

    const activePercentage = totalFightDuration > 0 ? (activeTimeMs / totalFightDuration) * 100 : 0;

    results[playerId] = {
      playerId,
      activeTimeMs,
      totalTimeMs: totalFightDuration,
      activePercentage,
    };
  });

  return results;
}

/**
 * Calculate active time intervals for a specific player based on damage output
 * This approach focuses on when players are actually dealing damage as the primary
 * indicator of activity, which may be closer to ESO logs methodology.
 *
 * A player is considered active during periods when they are dealing damage:
 * - Uses damage events (both direct and DOT) to identify active periods
 * - Groups damage events into continuous periods of activity
 * - A gap of more than 10 seconds without damage ends an active period
 */
function calculatePlayerActiveTime(
  playerId: number,
  fightStartTime: number,
  fightEndTime: number,
  damageEvents: DamageEvent[],
): number {
  // Focus primarily on damage events as the indicator of player activity
  const playerDamageEvents = damageEvents
    .filter(
      (event) =>
        event.sourceID === playerId &&
        event.timestamp >= fightStartTime &&
        event.timestamp <= fightEndTime &&
        !event.targetIsFriendly &&
        event.amount > 0,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (playerDamageEvents.length === 0) {
    return 0; // No damage = no activity
  }

  const ACTIVITY_GAP_THRESHOLD = 10000; // 10 seconds gap ends an active period
  let totalActiveTime = 0;
  let lastDamageTime = playerDamageEvents[0].timestamp;
  let currentPeriodStart = playerDamageEvents[0].timestamp;

  for (let i = 1; i < playerDamageEvents.length; i++) {
    const damageTime = playerDamageEvents[i].timestamp;
    const timeSinceLastDamage = damageTime - lastDamageTime;

    if (timeSinceLastDamage < ACTIVITY_GAP_THRESHOLD) {
      // Continuous activity - no need to do anything, keep extending the current period
    } else {
      // Gap is too large - close the current active period and add its duration
      totalActiveTime += lastDamageTime - currentPeriodStart;

      // Start a new active period
      currentPeriodStart = damageTime;
    }

    lastDamageTime = damageTime;
  }

  // Add the final active period
  totalActiveTime += lastDamageTime - currentPeriodStart;

  return totalActiveTime;
}
