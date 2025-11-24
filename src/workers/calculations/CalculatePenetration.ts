import { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import { CombatantInfoEvent, DamageEvent } from '@/types/combatlogEvents';
import {
  calculateActiveCombatTime,
  filterDataPointsByActiveCombat,
} from '@/utils/activeCombatTimeUtils';
import { BuffLookupData } from '@/utils/BuffLookupUtils';
import {
  calculateDynamicPenetrationAtTimestamp,
  calculateStaticPenetration,
  getAllPenetrationSourcesWithActiveState,
  PenetrationSourceWithActiveState,
} from '@/utils/PenetrationUtils';

import { OnProgressCallback } from '../Utils';

const PENETRATION_CAP = 18200;
const VOXEL_SIZE_SECONDS = 1;

export interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

export interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  max: number;
  effective: number;
  timeAtCapPercentage: number;
  penetrationSources: PenetrationSourceWithActiveState[];
  playerBasePenetration: number;
  /** Inactive combat intervals (gaps in boss damage) in seconds relative to fight start */
  inactiveCombatIntervals: Array<{ start: number; end: number }>;
}

export interface PenetrationCalculationTask {
  fight: {
    startTime: number;
    endTime: number;
  };
  players: Record<number, PlayerDetailsWithRole>;
  combatantInfoEvents: Record<number, CombatantInfoEvent>;
  friendlyBuffsLookup: BuffLookupData;
  debuffsLookup: BuffLookupData;
  selectedTargetIds: number[];
  damageEvents: DamageEvent[];
}

export function calculatePenetrationData(
  data: PenetrationCalculationTask,
  onProgress?: OnProgressCallback,
): Record<string, PlayerPenetrationData> {
  const {
    fight,
    players,
    combatantInfoEvents,
    friendlyBuffsLookup,
    debuffsLookup,
    selectedTargetIds,
    damageEvents,
  } = data;

  // BuffLookupData is now a POJO, no deserialization needed
  const deserializedFriendlyBuffsLookup = friendlyBuffsLookup;
  const deserializedDebuffsLookup = debuffsLookup;

  // Calculate active combat time based on when bosses are taking damage
  const activeCombatTimeResult = calculateActiveCombatTime(
    damageEvents,
    fight.startTime,
    fight.endTime,
    selectedTargetIds.length > 0 ? selectedTargetIds : undefined,
  );

  onProgress?.(0);

  const fightStart = fight.startTime;
  const fightEnd = fight.endTime;
  const fightDurationSeconds = (fightEnd - fightStart) / 1000;
  const numVoxels = Math.ceil(fightDurationSeconds / VOXEL_SIZE_SECONDS);

  // Pre-calculate player data that doesn't change over time
  onProgress?.(0);

  const playersData = Object.values(players)
    .map((player, index) => {
      const playerId = player.id.toString();
      const playerCombatantInfo = combatantInfoEvents[player.id];

      if (!playerCombatantInfo) {
        return null;
      }

      const allSources = getAllPenetrationSourcesWithActiveState(
        deserializedFriendlyBuffsLookup,
        deserializedDebuffsLookup,
        playerCombatantInfo,
        player,
        {
          playerId: player.id,
          targetIds: selectedTargetIds,
        },
      );

      const playerBasePenetration = calculateStaticPenetration(playerCombatantInfo, player);

      // Report progress for static calculations
      if (index % 5 === 0 || index === Object.keys(players).length - 1) {
        // There's two stages to this loop, so divide total progress by 2
        onProgress?.((index + 1) / (Object.keys(players).length * 2));
      }

      return {
        player,
        playerId,
        playerCombatantInfo,
        allSources,
        playerBasePenetration,
        dataPoints: [] as PenetrationDataPoint[],
        timeAtCapCount: 0,
      };
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);

  // Now iterate through timestamps and calculate penetration for all players at once
  onProgress?.(0.5);

  for (let i = 0; i < numVoxels; i++) {
    const voxelTimestamp = fightStart + i * VOXEL_SIZE_SECONDS * 1000;

    // Calculate target debuff penetration once per timestamp
    let targetDebuffPenetration = 0;
    if (selectedTargetIds.length > 0) {
      // Get the maximum debuff penetration across all selected targets
      const targetPenetrations = selectedTargetIds.map((targetId) =>
        calculateDynamicPenetrationAtTimestamp(
          null, // No friendly buffs needed for target debuffs
          deserializedDebuffsLookup, // Check debuffs on the target
          voxelTimestamp,
          null, // No specific player needed for target debuffs
          targetId, // Target ID (for debuff checks)
        ),
      );
      targetDebuffPenetration = Math.max(...targetPenetrations, 0);
    }

    // Apply the timestamp calculations to each player
    playersData.forEach((playerData) => {
      // Calculate player-specific buff penetration
      const playerBuffPenetration = calculateDynamicPenetrationAtTimestamp(
        deserializedFriendlyBuffsLookup, // Check buffs on this player
        null, // No debuffs needed for player buffs
        voxelTimestamp,
        parseInt(playerData.playerId, 10), // Player ID (for buff checks)
        null, // No target needed for player buffs
      );

      const totalDynamicPenetration = playerBuffPenetration + targetDebuffPenetration;
      const totalPenetration = playerData.playerBasePenetration + totalDynamicPenetration;

      playerData.dataPoints.push({
        timestamp: voxelTimestamp,
        penetration: totalPenetration,
        relativeTime: i * VOXEL_SIZE_SECONDS,
      });

      // Count time at cap
      if (totalPenetration >= PENETRATION_CAP) {
        playerData.timeAtCapCount++;
      }
    });

    // Report progress every 100 voxels
    if (i % 100 === 0 || i === numVoxels - 1) {
      // There's two stages to this loop, so divide total progress by 2
      onProgress?.(0.5 + (i + 1) / (numVoxels * 2));
    }
  }

  // Build the final result record
  const playerDataRecord: Record<string, PlayerPenetrationData> = {};

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
    const timeAtCapCount = activeDataPoints.filter(
      (point) => point.penetration >= PENETRATION_CAP,
    ).length;
    const timeAtCapPercentage =
      activeDataPoints.length > 0 ? (timeAtCapCount / activeDataPoints.length) * 100 : 0;

    const maxPenetration = Math.max(...playerData.dataPoints.map((point) => point.penetration), 0);

    // Calculate effective penetration based on active combat time only
    const effectivePenetration =
      activeDataPoints.length > 0
        ? activeDataPoints.reduce((sum, point) => sum + point.penetration, 0) /
          activeDataPoints.length
        : playerData.dataPoints.reduce((sum, point) => sum + point.penetration, 0) /
          playerData.dataPoints.length;

    playerDataRecord[playerData.playerId] = {
      playerId: playerData.playerId,
      playerName: playerData.player.name,
      dataPoints: playerData.dataPoints,
      max: maxPenetration,
      effective: effectivePenetration,
      timeAtCapPercentage,
      penetrationSources: playerData.allSources,
      playerBasePenetration: playerData.playerBasePenetration,
      inactiveCombatIntervals,
    };
  });

  onProgress?.(1);

  return playerDataRecord;
}
