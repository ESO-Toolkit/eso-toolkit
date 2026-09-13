import { FightFragment } from '../graphql/gql/graphql';
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

export interface DamageStatisticsWithActivity {
  damageByPlayer: Record<number, number>;
  criticalDamageByPlayer: Record<number, number>;
  damageEventsBySource: Record<number, number>;
  activePercentages: Record<number, ActivePercentageResult>;
}

type ActivityTimestampsByPlayer = Record<number, number[]>;

const getFightTiming = (
  fight: Pick<FightFragment, 'startTime' | 'endTime'>,
): { fightStartTime: number; fightEndTime: number; totalFightDuration: number } | null => {
  if (fight.startTime == null || fight.endTime == null) {
    return null;
  }

  const fightStartTime = Number(fight.startTime);
  const fightEndTime = Number(fight.endTime);
  const totalFightDuration = fightEndTime - fightStartTime;

  if (
    !Number.isFinite(fightStartTime) ||
    !Number.isFinite(fightEndTime) ||
    !Number.isFinite(totalFightDuration) ||
    totalFightDuration <= 0
  ) {
    return null;
  }

  return { fightStartTime, fightEndTime, totalFightDuration };
};

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
  const timing = getFightTiming(fight);
  if (!timing) return {};

  const activityTimestampsByPlayer: ActivityTimestampsByPlayer = {};

  for (const [playerIdStr, events] of Object.entries(damageEvents)) {
    const playerId = Number(playerIdStr);
    const timestamps: number[] = [];
    activityTimestampsByPlayer[playerId] = timestamps;

    for (const event of events) {
      if (
        event.sourceID === playerId &&
        event.timestamp >= timing.fightStartTime &&
        event.timestamp <= timing.fightEndTime &&
        !event.targetIsFriendly &&
        event.amount > 0
      ) {
        timestamps.push(event.timestamp);
      }
    }
  }

  return calculateActivePercentagesFromTimestamps(fight, activityTimestampsByPlayer);
}

/**
 * Calculate active percentages from the compact timestamp summaries produced while
 * damage totals are calculated. Timestamps have already been filtered for source,
 * target, fight range, and positive damage by the caller.
 */
export function calculateActivePercentagesFromTimestamps(
  fight: FightFragment,
  activityTimestampsByPlayer: ActivityTimestampsByPlayer,
): Record<number, ActivePercentageResult> {
  const timing = getFightTiming(fight);
  if (!timing) return {};

  const results: Record<number, ActivePercentageResult> = {};

  for (const [playerIdStr, timestamps] of Object.entries(activityTimestampsByPlayer)) {
    const playerId = Number(playerIdStr);
    const activeTimeMs = calculatePlayerActiveTimeFromTimestamps(timestamps);

    results[playerId] = {
      playerId,
      activeTimeMs,
      totalTimeMs: timing.totalFightDuration,
      activePercentage:
        timing.totalFightDuration > 0 ? (activeTimeMs / timing.totalFightDuration) * 100 : 0,
    };
  }

  return results;
}

/**
 * Calculate Damage Done totals and the activity timestamps in one traversal of
 * each player's event list. Events remain grouped by their attributed player ID;
 * activity intentionally retains the source ID check used by ESO Logs so pet
 * damage (including charged atronachs) contributes to totals but not its owner's
 * direct-damage activity time.
 */
export function calculateDamageStatisticsWithActivity(
  fight: FightFragment | null | undefined,
  damageEventsByPlayer: Record<string, DamageEvent[]>,
  selectedTargetIds: ReadonlySet<number>,
): DamageStatisticsWithActivity {
  const damageByPlayer: Record<number, number> = {};
  const criticalDamageByPlayer: Record<number, number> = {};
  const damageEventsBySource: Record<number, number> = {};
  const activityTimestampsByPlayer: ActivityTimestampsByPlayer = {};
  const timing = fight ? getFightTiming(fight) : null;

  for (const [playerIdStr, events] of Object.entries(damageEventsByPlayer)) {
    const playerId = Number(playerIdStr);
    let totalDamage = 0;
    let totalCriticalDamage = 0;
    let eventCount = 0;
    let activityTimestamps: number[] | undefined;

    for (const event of events) {
      if (event.targetIsFriendly) continue;
      if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) continue;

      const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
      totalDamage += amount;
      if (event.hitType === 2) totalCriticalDamage += amount;
      eventCount += 1;

      // Keep an empty summary for qualifying events, matching the previous
      // filtered-event lookup's zero-activity entries.
      activityTimestamps ??= activityTimestampsByPlayer[playerId] = [];
      if (
        timing &&
        event.sourceID === playerId &&
        event.timestamp >= timing.fightStartTime &&
        event.timestamp <= timing.fightEndTime &&
        event.amount > 0
      ) {
        activityTimestamps.push(event.timestamp);
      }
    }

    if (totalDamage > 0) {
      damageByPlayer[playerId] = totalDamage;
      criticalDamageByPlayer[playerId] = totalCriticalDamage;
      damageEventsBySource[playerId] = eventCount;
    }
  }

  return {
    damageByPlayer,
    criticalDamageByPlayer,
    damageEventsBySource,
    activePercentages: fight
      ? calculateActivePercentagesFromTimestamps(fight, activityTimestampsByPlayer)
      : {},
  };
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
function calculatePlayerActiveTimeFromTimestamps(timestamps: readonly number[]): number {
  if (timestamps.length === 0) {
    return 0; // No damage = no activity
  }

  // Event order is not guaranteed. Sorting numeric timestamps preserves the
  // existing interval semantics without copying or sorting event objects.
  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

  const ACTIVITY_GAP_THRESHOLD = 10000; // 10 seconds gap ends an active period
  let totalActiveTime = 0;
  let lastDamageTime = sortedTimestamps[0];
  let currentPeriodStart = sortedTimestamps[0];

  for (let i = 1; i < sortedTimestamps.length; i++) {
    const damageTime = sortedTimestamps[i];
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
