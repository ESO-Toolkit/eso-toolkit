import { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import { CombatantInfoEvent, DamageEvent } from '@/types/combatlogEvents';
import {
  calculateActiveCombatTime,
  filterDataPointsByActiveCombat,
} from '@/utils/activeCombatTimeUtils';
import { BuffLookupData } from '@/utils/BuffLookupUtils';
import {
  calculateDynamicCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  CriticalDamageSourceWithActiveState,
  getAllCriticalDamageSourcesWithActiveState,
} from '@/utils/CritDamageUtils';

import { OnProgressCallback } from '../Utils';

export interface CriticalDamageCalculationTask {
  fight: {
    startTime: number;
    endTime: number;
  };
  players: Record<number, PlayerDetailsWithRole>;
  combatantInfoEvents: Record<number, CombatantInfoEvent>;
  friendlyBuffsLookup: BuffLookupData;
  debuffsLookup: BuffLookupData;
  damageEvents: DamageEvent[];
  selectedTargetIds?: number[];
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
  /** Inactive combat intervals (gaps in boss damage) in seconds relative to fight start */
  inactiveCombatIntervals: Array<{ start: number; end: number }>;
}

export interface CriticalDamageCalculationResult {
  playerDataMap: Record<number, PlayerCriticalDamageDataExtended>;
}

export function calculateCriticalDamageData(
  data: CriticalDamageCalculationTask,
  onProgress?: OnProgressCallback,
): CriticalDamageCalculationResult {
  const {
    fight,
    players,
    combatantInfoEvents,
    friendlyBuffsLookup,
    debuffsLookup,
    damageEvents,
    selectedTargetIds,
  } = data;

  // BuffLookupData is now a POJO, no deserialization needed
  const deserializedFriendlyBuffsLookup = friendlyBuffsLookup;
  const deserializedDebuffsLookup = debuffsLookup;

  // Calculate active combat time based on when bosses are taking damage
  const activeCombatTimeResult = calculateActiveCombatTime(
    damageEvents,
    fight.startTime,
    fight.endTime,
    selectedTargetIds && selectedTargetIds.length > 0 ? selectedTargetIds : undefined,
  );

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

  // Calculate inactive intervals (gaps between active periods) in seconds relative to fight start
  const inactiveCombatIntervals: Array<{ start: number; end: number }> = [];
  const activeIntervals = activeCombatTimeResult.activeCombatIntervals;

  if (activeIntervals.length === 0) {
    // If no active intervals, the entire fight is inactive
    inactiveCombatIntervals.push({
      start: 0,
      end: fightDurationSeconds,
    });
  } else {
    // Add inactive period before first active period
    if (activeIntervals[0].start > fightStart) {
      inactiveCombatIntervals.push({
        start: 0,
        end: (activeIntervals[0].start - fightStart) / 1000,
      });
    }

    // Add inactive periods between active periods
    for (let i = 0; i < activeIntervals.length - 1; i++) {
      const gapStart = (activeIntervals[i].end - fightStart) / 1000;
      const gapEnd = (activeIntervals[i + 1].start - fightStart) / 1000;
      if (gapEnd > gapStart) {
        inactiveCombatIntervals.push({
          start: gapStart,
          end: gapEnd,
        });
      }
    }

    // Add inactive period after last active period
    const lastActiveEnd = activeIntervals[activeIntervals.length - 1].end;
    if (lastActiveEnd < fightEnd) {
      inactiveCombatIntervals.push({
        start: (lastActiveEnd - fightStart) / 1000,
        end: fightDurationSeconds,
      });
    }
  }

  playersData.forEach((playerData) => {
    // Filter data points to only include those during active combat
    const activeDataPoints = filterDataPointsByActiveCombat(
      playerData.dataPoints,
      activeCombatTimeResult.activeCombatIntervals,
    );

    // Calculate time at cap based on active combat periods only
    const timeAtCapCount = activeDataPoints.filter((point) => point.criticalDamage >= 125).length;
    const timeAtCapPercentage =
      activeDataPoints.length > 0 ? (timeAtCapCount / activeDataPoints.length) * 100 : 0;

    // Calculate effective critical damage based on active combat time only
    const effectiveCriticalDamage =
      activeDataPoints.length > 0
        ? activeDataPoints.reduce((sum, point) => sum + point.criticalDamage, 0) /
          activeDataPoints.length
        : playerData.dataPoints.length > 0
          ? playerData.totalCriticalDamage / playerData.dataPoints.length
          : 50;

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
      inactiveCombatIntervals,
    };
  });

  onProgress?.(1);

  return { playerDataMap: playerDataRecord };
}
