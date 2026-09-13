import type { FightFragment } from '@/graphql/gql/graphql';
import type { DamageEvent } from '@/types/combatlogEvents';
import {
  calculateActivePercentagesFromTimestamps,
  calculateDamageStatisticsWithActivity,
  type DamageStatisticsWithActivity,
} from '@/utils/activePercentageUtils';

/**
 * Clone-safe input for damage totals and activity calculations.
 *
 * `Set` cannot cross the Comlink boundary reliably, so callers pass selected
 * target ids as an array and the worker reconstructs the lookup locally.
 */
export interface DamageStatisticsCalculationTask {
  fight: FightFragment | null | undefined;
  damageEventsByPlayer: Record<string, DamageEvent[]>;
  selectedTargetIds: readonly number[];
}

export interface PackedDamagePlayerEvents {
  playerId: number;
  /** source id, target id, timestamp, amount, hit type, target-is-friendly (0/1). */
  values: Float64Array;
}

export interface PackedDamageStatisticsCalculationTask {
  fight: FightFragment | null | undefined;
  playerEvents: PackedDamagePlayerEvents[];
  selectedTargetIds: readonly number[];
}

export type DamageStatisticsCalculationResult = DamageStatisticsWithActivity;

/**
 * Calculates selected-target damage statistics off the browser main thread.
 */
export function calculateDamageStatistics(
  data: DamageStatisticsCalculationTask | PackedDamageStatisticsCalculationTask,
): DamageStatisticsCalculationResult {
  if ('playerEvents' in data) {
    return calculatePackedDamageStatistics(data);
  }

  return calculateDamageStatisticsWithActivity(
    data.fight,
    data.damageEventsByPlayer,
    new Set(data.selectedTargetIds),
  );
}

const PACKED_EVENT_WIDTH = 6;

function calculatePackedDamageStatistics(
  data: PackedDamageStatisticsCalculationTask,
): DamageStatisticsCalculationResult {
  const selectedTargetIds = new Set(data.selectedTargetIds);
  const damageByPlayer: Record<number, number> = {};
  const criticalDamageByPlayer: Record<number, number> = {};
  const damageEventsBySource: Record<number, number> = {};
  const activityTimestampsByPlayer: Record<number, number[]> = {};
  const fightStartTime = Number(data.fight?.startTime);
  const fightEndTime = Number(data.fight?.endTime);
  const hasValidFightTiming =
    Number.isFinite(fightStartTime) &&
    Number.isFinite(fightEndTime) &&
    fightEndTime > fightStartTime;

  for (const { playerId, values } of data.playerEvents) {
    let totalDamage = 0;
    let totalCriticalDamage = 0;
    let eventCount = 0;
    let activityTimestamps: number[] | undefined;

    for (let offset = 0; offset < values.length; offset += PACKED_EVENT_WIDTH) {
      const sourceId = values[offset];
      const targetId = values[offset + 1];
      const timestamp = values[offset + 2];
      const amount = values[offset + 3];
      const hitType = values[offset + 4];
      const targetIsFriendly = values[offset + 5] === 1;

      if (targetIsFriendly) continue;
      if (selectedTargetIds.size > 0 && !selectedTargetIds.has(targetId)) continue;

      const finiteAmount = Number(amount) || 0;
      totalDamage += finiteAmount;
      if (hitType === 2) totalCriticalDamage += finiteAmount;
      eventCount += 1;

      activityTimestamps ??= activityTimestampsByPlayer[playerId] = [];
      if (
        hasValidFightTiming &&
        sourceId === playerId &&
        timestamp >= fightStartTime &&
        timestamp <= fightEndTime &&
        amount > 0
      ) {
        activityTimestamps.push(timestamp);
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
    activePercentages: data.fight
      ? calculateActivePercentagesFromTimestamps(data.fight, activityTimestampsByPlayer)
      : {},
  };
}
