import { KnownAbilities } from '../../types/abilities';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { OnProgressCallback } from '../Utils';

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_BUFF_ABILITIES = Object.freeze(
  new Set([
    KnownAbilities.OVERCHARGED,
    KnownAbilities.SUNDERED,
    KnownAbilities.CONCUSSION,
    KnownAbilities.CHILL,
    KnownAbilities.DISEASED,
  ]),
);

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_DEBUFF_ABILITIES = Object.freeze(
  new Set([KnownAbilities.BURNING, KnownAbilities.POISONED, KnownAbilities.HEMMORRHAGING]),
);

export interface StatusEffectUptimesCalculationTask {
  debuffsLookup: BuffLookupData;
  hostileBuffsLookup: BuffLookupData;
  fightStartTime?: number;
  fightEndTime?: number;
  // Remove selectedTargetIds - we'll compute for all targets and filter on main thread
}

export interface StatusEffectUptimesByTarget {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  isDebuff: boolean;
  hostilityType: 0 | 1;
  uniqueKey: string;
  targetData: {
    [targetId: number]: {
      totalDuration: number;
      uptime: number;
      uptimePercentage: number;
      applications: number;
    };
  };
  // Remove aggregate values - will be calculated on main thread
}

/**
 * Calculate status effect uptimes segmented by target with averaging capability
 */
export function calculateStatusEffectUptimes(
  data: StatusEffectUptimesCalculationTask,
  onProgress?: OnProgressCallback,
): StatusEffectUptimesByTarget[] {
  const { debuffsLookup, hostileBuffsLookup, fightStartTime, fightEndTime } = data;

  if (!fightStartTime || !fightEndTime) {
    return [];
  }

  const fightDuration = fightEndTime - fightStartTime;
  const results = new Map<string, StatusEffectUptimesByTarget>();

  // Report progress for debuff calculations
  onProgress?.(0);

  // Calculate debuff uptimes segmented by target
  for (const abilityId of STATUS_EFFECT_DEBUFF_ABILITIES) {
    const intervals = debuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      const abilityKey = abilityId.toString();

      // Group intervals by target
      const targetData: {
        [targetId: number]: {
          totalDuration: number;
          uptime: number;
          uptimePercentage: number;
          applications: number;
        };
      } = {};

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          const duration = clippedEnd - clippedStart;

          if (!targetData[interval.targetID]) {
            targetData[interval.targetID] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }

          targetData[interval.targetID].totalDuration += duration;
          targetData[interval.targetID].uptime += duration / 1000; // Convert to seconds
          targetData[interval.targetID].applications += 1;
        }
      }

      // Calculate uptime percentages for each target
      for (const targetId in targetData) {
        targetData[Number(targetId)].uptimePercentage =
          (targetData[Number(targetId)].totalDuration / fightDuration) * 100;
      }

      // Only create entry if we have data for at least one target
      if (Object.keys(targetData).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          isDebuff: true,
          hostilityType: 1,
          uniqueKey: `${abilityId}-status-effect`,
          targetData,
        });
      }
    }
  }

  // Report progress for buff calculations
  onProgress?.(0.5);

  // Calculate friendly buff uptimes segmented by target
  for (const abilityId of STATUS_EFFECT_BUFF_ABILITIES) {
    const intervals = hostileBuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      const abilityKey = abilityId.toString();

      // Group intervals by target
      const targetData: {
        [targetId: number]: {
          totalDuration: number;
          uptime: number;
          uptimePercentage: number;
          applications: number;
        };
      } = {};

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          const duration = clippedEnd - clippedStart;

          if (!targetData[interval.targetID]) {
            targetData[interval.targetID] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }

          targetData[interval.targetID].totalDuration += duration;
          targetData[interval.targetID].uptime += duration / 1000; // Convert to seconds
          targetData[interval.targetID].applications += 1;
        }
      }

      // Calculate uptime percentages for each target
      for (const targetId in targetData) {
        targetData[Number(targetId)].uptimePercentage =
          (targetData[Number(targetId)].totalDuration / fightDuration) * 100;
      }

      // Only create entry if we have data for at least one target
      if (Object.keys(targetData).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          isDebuff: false,
          hostilityType: 1,
          uniqueKey: `${abilityId}-status-effect`,
          targetData,
        });
      }
    }
  }

  // Report progress for final sorting
  onProgress?.(0.9);

  // Convert Map to Array and sort by total target count (most targets affected first)
  const resultArray = Array.from(results.values());
  resultArray.sort((a, b) => Object.keys(b.targetData).length - Object.keys(a.targetData).length);

  onProgress?.(1);

  return resultArray;
}
