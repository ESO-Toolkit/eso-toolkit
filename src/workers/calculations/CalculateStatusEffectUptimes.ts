import { KnownAbilities } from '../../types/abilities';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { OnProgressCallback } from '../Utils';

/**
 * Status Effect Uptimes Calculation Worker
 *
 * This worker calculates uptimes for status effects (hostile buffs and debuffs) with dual indexing:
 * 1. allPlayers: Aggregated uptimes across all players/targets
 * 2. byPlayer: Per-player breakdown for O(1) filtering in the UI
 *
 * IMPORTANT: ESO Logs API has inverted sourceID/targetID semantics for hostile buffs:
 * - Debuffs: sourceID = player applying, targetID = enemy receiving
 * - Hostile Buffs: sourceID = player receiving, targetID = enemy applying
 */

// Define the specific status effect buff abilities to track (hostile buffs applied TO players)
const STATUS_EFFECT_BUFF_ABILITIES = Object.freeze(
  new Set([
    KnownAbilities.OVERCHARGED,
    KnownAbilities.SUNDERED,
    KnownAbilities.CONCUSSION,
    KnownAbilities.CHILL,
    KnownAbilities.DISEASED,
  ]),
);

// Define the specific status effect debuff abilities to track (debuffs applied BY players)
const STATUS_EFFECT_DEBUFF_ABILITIES = Object.freeze(
  new Set([KnownAbilities.BURNING, KnownAbilities.POISONED, KnownAbilities.HEMMORRHAGING]),
);

export interface StatusEffectUptimesCalculationTask {
  debuffsLookup: BuffLookupData;
  hostileBuffsLookup: BuffLookupData;
  fightStartTime?: number;
  fightEndTime?: number;
  friendlyPlayerIds?: number[]; // List of friendly player IDs in the current fight
  // Remove selectedTargetIds - we'll compute for all targets and filter on main thread
}

export interface StatusEffectUptimesByTarget {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  isDebuff: boolean;
  hostilityType: 0 | 1;
  uniqueKey: string;
  // Aggregated across all players (for when no player is selected)
  allPlayers: {
    [targetId: number]: {
      totalDuration: number;
      uptime: number;
      uptimePercentage: number;
      applications: number;
    };
  };
  // Per-player data (for O(1) lookup when a player is selected)
  byPlayer: {
    [playerId: number]: {
      [targetId: number]: {
        totalDuration: number;
        uptime: number;
        uptimePercentage: number;
        applications: number;
      };
    };
  };
  // Deprecated: keeping for backward compatibility during transition
  targetData?: {
    [targetId: number]: {
      totalDuration: number;
      uptime: number;
      uptimePercentage: number;
      applications: number;
    };
  };
}

/**
 * Calculate status effect uptimes segmented by target with averaging capability
 */
export function calculateStatusEffectUptimes(
  data: StatusEffectUptimesCalculationTask,
  onProgress?: OnProgressCallback,
): StatusEffectUptimesByTarget[] {
  const { debuffsLookup, hostileBuffsLookup, fightStartTime, fightEndTime, friendlyPlayerIds } =
    data;

  if (!fightStartTime || !fightEndTime) {
    return [];
  }

  // Create a Set for O(1) friendly player lookups
  // This filters hostile buff intervals to only include players in the current fight
  const friendlyPlayerSet = friendlyPlayerIds ? new Set(friendlyPlayerIds) : null;

  const fightDuration = fightEndTime - fightStartTime;
  const results = new Map<string, StatusEffectUptimesByTarget>();

  // Report progress for debuff calculations
  onProgress?.(0);

  // Calculate debuff uptimes segmented by target AND player
  for (const abilityId of STATUS_EFFECT_DEBUFF_ABILITIES) {
    const intervals = debuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      const abilityKey = abilityId.toString();

      // Build both allPlayers (aggregated) and byPlayer (per-player) structures
      const allPlayers: {
        [targetId: number]: {
          totalDuration: number;
          uptime: number;
          uptimePercentage: number;
          applications: number;
        };
      } = {};

      const byPlayer: {
        [playerId: number]: {
          [targetId: number]: {
            totalDuration: number;
            uptime: number;
            uptimePercentage: number;
            applications: number;
          };
        };
      } = {};

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          const duration = clippedEnd - clippedStart;
          const playerId = interval.sourceID;
          const targetId = interval.targetID;

          // Update allPlayers (aggregated across all players)
          if (!allPlayers[targetId]) {
            allPlayers[targetId] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }
          allPlayers[targetId].totalDuration += duration;
          allPlayers[targetId].uptime += duration / 1000;
          allPlayers[targetId].applications += 1;

          // Update byPlayer (per-player breakdown)
          if (!byPlayer[playerId]) {
            byPlayer[playerId] = {};
          }
          if (!byPlayer[playerId][targetId]) {
            byPlayer[playerId][targetId] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }
          byPlayer[playerId][targetId].totalDuration += duration;
          byPlayer[playerId][targetId].uptime += duration / 1000;
          byPlayer[playerId][targetId].applications += 1;
        }
      }

      // Calculate uptime percentages for allPlayers
      for (const targetId in allPlayers) {
        allPlayers[Number(targetId)].uptimePercentage =
          (allPlayers[Number(targetId)].totalDuration / fightDuration) * 100;
      }

      // Calculate uptime percentages for each player's data
      for (const playerId in byPlayer) {
        for (const targetId in byPlayer[playerId]) {
          byPlayer[playerId][Number(targetId)].uptimePercentage =
            (byPlayer[playerId][Number(targetId)].totalDuration / fightDuration) * 100;
        }
      }

      // Only create entry if we have data for at least one target
      if (Object.keys(allPlayers).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          isDebuff: true,
          hostilityType: 1,
          uniqueKey: `${abilityId}-status-effect`,
          allPlayers,
          byPlayer,
          targetData: allPlayers, // Backward compatibility
        });
      }
    }
  }

  // Report progress for hostile buff calculations
  onProgress?.(0.5);

  // Calculate hostile buff uptimes segmented by target AND player
  // NOTE: For hostile buffs, the ESO Logs API has inverted semantics:
  //   - sourceID = friendly player receiving the buff
  //   - targetID = enemy actor applying the buff
  // This is opposite of debuffs where sourceID is the player applying the debuff.
  for (const abilityId of STATUS_EFFECT_BUFF_ABILITIES) {
    const intervals = hostileBuffsLookup.buffIntervals[abilityId.toString()];

    if (intervals && intervals.length > 0) {
      const abilityKey = abilityId.toString();

      // Build both allPlayers (aggregated) and byPlayer (per-player) structures
      const allPlayers: {
        [targetId: number]: {
          totalDuration: number;
          uptime: number;
          uptimePercentage: number;
          applications: number;
        };
      } = {};

      const byPlayer: {
        [playerId: number]: {
          [targetId: number]: {
            totalDuration: number;
            uptime: number;
            uptimePercentage: number;
            applications: number;
          };
        };
      } = {};

      for (const interval of intervals) {
        // Clip interval to fight bounds
        const clippedStart = Math.max(interval.start, fightStartTime);
        const clippedEnd = Math.min(interval.end, fightEndTime);

        if (clippedEnd > clippedStart) {
          const duration = clippedEnd - clippedStart;
          // IMPORTANT: For hostile buffs, the ESO Logs API has inverted semantics:
          //   - interval.sourceID = friendly player receiving the hostile buff
          //   - interval.targetID = enemy actor applying the hostile buff
          // This is opposite of debuffs where sourceID is the player applying the debuff.
          const playerId = interval.sourceID;
          const enemySourceId = interval.targetID;

          // Filter to only include players in the current fight
          if (friendlyPlayerSet && !friendlyPlayerSet.has(playerId)) {
            continue;
          }

          // Update allPlayers (aggregated across all players)
          if (!allPlayers[playerId]) {
            allPlayers[playerId] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }
          allPlayers[playerId].totalDuration += duration;
          allPlayers[playerId].uptime += duration / 1000;
          allPlayers[playerId].applications += 1;

          // Update byPlayer (per-player breakdown, indexed by enemy source)
          // This allows filtering by BOTH player AND enemy/boss
          if (!byPlayer[playerId]) {
            byPlayer[playerId] = {};
          }
          if (!byPlayer[playerId][enemySourceId]) {
            byPlayer[playerId][enemySourceId] = {
              totalDuration: 0,
              uptime: 0,
              uptimePercentage: 0,
              applications: 0,
            };
          }
          byPlayer[playerId][enemySourceId].totalDuration += duration;
          byPlayer[playerId][enemySourceId].uptime += duration / 1000;
          byPlayer[playerId][enemySourceId].applications += 1;
        }
      }

      // Calculate uptime percentages for allPlayers
      for (const targetId in allPlayers) {
        allPlayers[Number(targetId)].uptimePercentage =
          (allPlayers[Number(targetId)].totalDuration / fightDuration) * 100;
      }

      // Calculate uptime percentages for each player's data
      for (const playerId in byPlayer) {
        for (const targetId in byPlayer[playerId]) {
          byPlayer[playerId][Number(targetId)].uptimePercentage =
            (byPlayer[playerId][Number(targetId)].totalDuration / fightDuration) * 100;
        }
      }

      // Only create entry if we have data for at least one target
      if (Object.keys(allPlayers).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          abilityName: `Ability ${abilityId}`, // Will be resolved by UI layer
          isDebuff: false,
          hostilityType: 0,
          uniqueKey: `${abilityId}-status-effect`,
          allPlayers,
          byPlayer,
          targetData: allPlayers, // Backward compatibility
        });
      }
    }
  }

  // Report progress for final sorting
  onProgress?.(0.9);

  // Convert Map to Array and sort by total target count (most targets affected first)
  const resultArray = Array.from(results.values());
  resultArray.sort((a, b) => Object.keys(b.allPlayers).length - Object.keys(a.allPlayers).length);

  onProgress?.(1);

  return resultArray;
}
