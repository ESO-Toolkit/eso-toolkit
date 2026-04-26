import { DamageEvent } from '../types/combatlogEvents';

/**
 * Calculate active combat time based on when bosses/enemies are taking damage.
 * A boss is considered "in combat" during periods when it's taking damage from players.
 * Gaps longer than 1 second without damage indicate the boss is not actively in combat.
 *
 * This is used to calculate effective stats (penetration, crit damage, damage reduction)
 * based on actual combat time rather than total fight duration.
 */

export interface ActiveCombatTimeResult {
  /** Total active combat time in milliseconds */
  activeCombatTimeMs: number;
  /** Array of active combat intervals [start, end] */
  activeCombatIntervals: Array<{ start: number; end: number }>;
}

/**
 * Calculate active combat time for a fight based on damage to enemy targets.
 * Active combat is defined as periods when enemies are taking damage,
 * with gaps of more than 1 second ending an active period.
 *
 * @param damageEvents - All damage events from the fight
 * @param fightStartTime - Fight start timestamp
 * @param fightEndTime - Fight end timestamp
 * @param selectedTargetIds - Optional array of specific target IDs to filter (e.g., boss IDs)
 * @returns Active combat time result with total time and intervals
 */
export function calculateActiveCombatTime(
  damageEvents: DamageEvent[],
  fightStartTime: number,
  fightEndTime: number,
  selectedTargetIds?: number[],
): ActiveCombatTimeResult {
  // Filter to damage events against enemies during the fight
  let relevantDamageEvents = damageEvents.filter(
    (event) =>
      event.sourceIsFriendly && // Damage from friendly players
      !event.targetIsFriendly && // To enemy targets
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      event.amount > 0, // Only count actual damage
  );

  // If specific targets are selected, filter to only those targets
  if (selectedTargetIds && selectedTargetIds.length > 0) {
    relevantDamageEvents = relevantDamageEvents.filter((event) =>
      selectedTargetIds.includes(event.targetID),
    );
  }

  if (relevantDamageEvents.length === 0) {
    return {
      activeCombatTimeMs: 0,
      activeCombatIntervals: [],
    };
  }

  // Sort by timestamp
  const sortedEvents = relevantDamageEvents.sort((a, b) => a.timestamp - b.timestamp);

  const COMBAT_GAP_THRESHOLD = 1000; // 1 second gap ends active combat period
  const intervals: Array<{ start: number; end: number }> = [];

  let currentIntervalStart = sortedEvents[0].timestamp;
  let lastDamageTime = sortedEvents[0].timestamp;

  for (let i = 1; i < sortedEvents.length; i++) {
    const damageTime = sortedEvents[i].timestamp;
    const timeSinceLastDamage = damageTime - lastDamageTime;

    if (timeSinceLastDamage > COMBAT_GAP_THRESHOLD) {
      // Gap is too large - close the current active combat period
      intervals.push({
        start: currentIntervalStart,
        end: lastDamageTime,
      });

      // Start a new active combat period
      currentIntervalStart = damageTime;
    }

    lastDamageTime = damageTime;
  }

  // Add the final active combat period
  intervals.push({
    start: currentIntervalStart,
    end: lastDamageTime,
  });

  // Calculate total active combat time
  const activeCombatTimeMs = intervals.reduce((total, interval) => {
    return total + (interval.end - interval.start);
  }, 0);

  return {
    activeCombatTimeMs,
    activeCombatIntervals: intervals,
  };
}

/**
 * Check if a given timestamp falls within an active combat interval.
 *
 * @param timestamp - Timestamp to check
 * @param intervals - Array of active combat intervals
 * @returns True if timestamp is within any active combat interval
 */
export function isTimestampInActiveCombat(
  timestamp: number,
  intervals: Array<{ start: number; end: number }>,
): boolean {
  return intervals.some((interval) => timestamp >= interval.start && timestamp <= interval.end);
}

/**
 * Filter data points to only include those within active combat intervals.
 * Useful for recalculating averages based on active time.
 *
 * @param dataPoints - Array of data points with timestamp property
 * @param intervals - Array of active combat intervals
 * @returns Filtered array of data points
 */
export function filterDataPointsByActiveCombat<T extends { timestamp: number }>(
  dataPoints: T[],
  intervals: Array<{ start: number; end: number }>,
): T[] {
  return dataPoints.filter((point) => isTimestampInActiveCombat(point.timestamp, intervals));
}
