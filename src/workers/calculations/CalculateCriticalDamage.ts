import { OnProgressCallback } from '../Utils';

import { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import { CombatantInfoEvent } from '@/types/combatlogEvents';
import {
  calculateDynamicCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  CriticalDamageSourceWithActiveState,
  getAllCriticalDamageSourcesWithActiveState,
} from '@/utils/CritDamageUtils';

export interface CriticalDamageCalculationTask {
  fight: {
    startTime: number;
    endTime: number;
  };
  players: Record<number, PlayerDetailsWithRole>;
  combatantInfoEvents: Record<number, CombatantInfoEvent>;
  friendlyBuffsLookup: {
    buffIntervals: { [key: string]: Array<{ start: number; end: number; targetID: number }> };
  };
  debuffsLookup: {
    buffIntervals: { [key: string]: Array<{ start: number; end: number; targetID: number }> };
  };
}

export interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number;
}

export interface CriticalDamageAlert {
  abilityId: number;
  abilityName: string;
  timestamp: number;
  relativeTime: number;
  expectedCriticalDamage: number;
  actualCriticalDamage: number;
  normalDamage: number;
  actualCriticalMultiplier: number;
  expectedCriticalMultiplier: number;
  discrepancyPercent: number;
}

export interface PlayerCriticalDamageDataExtended {
  playerId: number;
  playerName: string;
  dataPoints: CriticalDamageDataPoint[];
  effectiveCriticalDamage: number;
  maximumCriticalDamage: number;
  timeAtCapPercentage: number;
  criticalDamageAlerts: CriticalDamageAlert[];
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  staticCriticalDamage: number;
}

export interface CriticalDamageCalculationResult {
  playerDataMap: Record<number, PlayerCriticalDamageDataExtended>;
}

export function calculateCriticalDamageData(
  data: CriticalDamageCalculationTask,
  onProgress?: OnProgressCallback,
): CriticalDamageCalculationResult {
  const { fight, players, combatantInfoEvents, friendlyBuffsLookup, debuffsLookup } = data;

  // BuffLookupData is now a POJO, no deserialization needed
  const deserializedFriendlyBuffsLookup = friendlyBuffsLookup;
  const deserializedDebuffsLookup = debuffsLookup;

  // Report initial progress
  onProgress?.(0);

  const fightStart = fight.startTime;
  const fightEnd = fight.endTime;
  const fightDurationMs = fightEnd - fightStart;
  const fightDurationSeconds = Math.ceil(fightDurationMs / 1000);

  // Pre-calculate player data that doesn't change over time
  onProgress?.(0);

  const playersData = Object.values(players)
    .map((player, index) => {
      const combatantInfo = combatantInfoEvents[player.id] || null;

      if (!combatantInfo) {
        return null;
      }

      // Get all critical damage sources with active states for this player
      const allSources = getAllCriticalDamageSourcesWithActiveState(
        deserializedFriendlyBuffsLookup,
        deserializedDebuffsLookup,
        combatantInfo,
      );

      // Calculate static critical damage for this player
      const staticCriticalDamage = calculateStaticCriticalDamage(combatantInfo);

      // Report progress
      onProgress?.((index + 1) / Object.keys(players).length);

      return {
        player,
        combatantInfo,
        allSources,
        staticCriticalDamage,
        dataPoints: [] as CriticalDamageDataPoint[],
        maxCriticalDamage: 50, // Default base critical damage
        totalCriticalDamage: 0,
        timeAtCapCount: 0,
      };
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);

  // Now iterate through timestamps and calculate critical damage for all players at once
  onProgress?.(0);

  for (let i = 0; i <= fightDurationSeconds; i++) {
    const timestamp = fightStart + i * 1000;

    // Ensure we don't go beyond the actual fight end time
    // This prevents querying buff lookups beyond their valid range
    if (timestamp > fightEnd) {
      break;
    }

    // Apply the timestamp calculations to each player
    playersData.forEach((playerData) => {
      const combatantInfo = combatantInfoEvents[playerData.player.id] || null;

      if (combatantInfo === null) {
        return;
      }

      // Calculate dynamic critical damage once per timestamp
      // This is shared across all players for buff/debuff sources
      const dynamicCriticalDamage = calculateDynamicCriticalDamageAtTimestamp(
        deserializedFriendlyBuffsLookup,
        deserializedDebuffsLookup,
        combatantInfo,
        playerData.player,
        timestamp,
      );

      const totalCriticalDamage = playerData.staticCriticalDamage + dynamicCriticalDamage;

      playerData.dataPoints.push({
        timestamp,
        criticalDamage: totalCriticalDamage,
        relativeTime: i,
      });

      // Update running statistics
      playerData.maxCriticalDamage = Math.max(playerData.maxCriticalDamage, totalCriticalDamage);
      playerData.totalCriticalDamage += totalCriticalDamage;

      // Check if at critical damage cap (125%)
      if (totalCriticalDamage >= 125) {
        playerData.timeAtCapCount++;
      }
    });
  }

  // Build the final result record
  const playerDataRecord: Record<number, PlayerCriticalDamageDataExtended> = {};

  playersData.forEach((playerData) => {
    const dataPointCount = playerData.dataPoints.length;
    const effectiveCriticalDamage =
      dataPointCount > 0 ? playerData.totalCriticalDamage / dataPointCount : 50;
    const timeAtCapPercentage =
      dataPointCount > 0 ? (playerData.timeAtCapCount / dataPointCount) * 100 : 0;

    playerDataRecord[playerData.player.id] = {
      playerId: playerData.player.id,
      playerName: playerData.player.name,
      dataPoints: playerData.dataPoints,
      effectiveCriticalDamage,
      maximumCriticalDamage: playerData.maxCriticalDamage,
      timeAtCapPercentage,
      criticalDamageAlerts: [], // TODO: Implement critical damage alerts if needed
      criticalDamageSources: playerData.allSources,
      staticCriticalDamage: playerData.staticCriticalDamage,
    };
  });

  onProgress?.(1);

  return { playerDataMap: playerDataRecord };
}
