import type { FightFragment } from '@/graphql/gql/graphql';
import type { DamageEvent } from '@/types/combatlogEvents';
import {
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

export type DamageStatisticsCalculationResult = DamageStatisticsWithActivity;

/**
 * Calculates selected-target damage statistics off the browser main thread.
 */
export function calculateDamageStatistics(
  data: DamageStatisticsCalculationTask,
): DamageStatisticsCalculationResult {
  return calculateDamageStatisticsWithActivity(
    data.fight,
    data.damageEventsByPlayer,
    new Set(data.selectedTargetIds),
  );
}
