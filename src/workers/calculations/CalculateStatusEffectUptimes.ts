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
  ])
);

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_DEBUFF_ABILITIES = Object.freeze(
  new Set([KnownAbilities.BURNING, KnownAbilities.POISONED, KnownAbilities.HEMMORRHAGING])
);

export interface StatusEffectUptimesCalculationTask {
  debuffsLookup: BuffLookupData;
  hostileBuffsLookup: BuffLookupData;
  fightStartTime?: number;
  fightEndTime?: number;
}

/**
 * Calculate status effect uptimes for specific abilities
 */
export function calculateStatusEffectUptimes(
  data: StatusEffectUptimesCalculationTask,
  onProgress?: OnProgressCallback
): Array<{
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
  isDebuff: boolean;
  hostilityType: 0 | 1;
}> {
  const { debuffsLookup, hostileBuffsLookup, fightStartTime, fightEndTime } = data;

  if (!fightStartTime || !fightEndTime) {
    return [];
  }

  const fightDuration = fightEndTime - fightStartTime;

  const results: Array<{
    abilityGameID: string;
    abilityName: string;
    icon?: string;
    totalDuration: number;
    uptime: number;
    uptimePercentage: number;
    applications: number;
    isDebuff: boolean;
    hostilityType: 0 | 1;
  }> = [];

  // Report progress for debuff calculations
  onProgress?.(0);

  // Calculate debuff uptimes
  for (const abilityId of STATUS_EFFECT_DEBUFF_ABILITIES) {
    const intervals = debuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      let totalUptime = 0;
      let applications = 0;

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          totalUptime += clippedEnd - clippedStart;
          applications += 1;
        }
      }

      if (totalUptime > 0) {
        results.push({
          abilityGameID: abilityId.toString(),
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          totalDuration: totalUptime,
          uptime: totalUptime / 1000, // Convert to seconds
          uptimePercentage: (totalUptime / fightDuration) * 100,
          applications,
          isDebuff: true,
          hostilityType: 1,
        });
      }
    }
  }

  // Report progress for buff calculations
  onProgress?.(0.5);

  // Calculate friendly buff uptimes
  for (const abilityId of STATUS_EFFECT_BUFF_ABILITIES) {
    const intervals = hostileBuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      let totalUptime = 0;
      let applications = 0;

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          totalUptime += clippedEnd - clippedStart;
          applications += 1;
        }
      }

      if (totalUptime > 0) {
        results.push({
          abilityGameID: abilityId.toString(),
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          totalDuration: totalUptime,
          uptime: totalUptime / 1000, // Convert to seconds
          uptimePercentage: (totalUptime / fightDuration) * 100,
          applications,
          isDebuff: false,
          hostilityType: 1,
        });
      }
    }
  }

  // Report progress for final sorting
  onProgress?.(0.9);

  // Sort by uptime percentage descending
  results.sort((a, b) => b.uptimePercentage - a.uptimePercentage);

  onProgress?.(1);

  return results;
}
