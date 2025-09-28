import { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import { DamageEvent } from '@/types/combatlogEvents';

import { OnProgressCallback } from '../Utils';

/**
 * Data point for damage over time - represents aggregated damage in a time bucket
 */
export interface DamageOverTimeDataPoint {
  /** Timestamp of the bucket (start of the bucket period) */
  timestamp: number;
  /** Relative time in seconds from fight start */
  relativeTime: number;
  /** Total damage done in this time bucket */
  damage: number;
  /** Number of damage events in this bucket */
  eventCount: number;
}

/**
 * Player's damage over time data for a specific target
 */
export interface PlayerDamageOverTimeData {
  playerId: number;
  playerName: string;
  targetId: number | null; // null means all targets combined
  dataPoints: DamageOverTimeDataPoint[];
  totalDamage: number;
  totalEvents: number;
  averageDps: number;
  maxDps: number;
}

/**
 * Complete damage over time result for all players and targets
 */
export interface DamageOverTimeResult {
  /** Fight metadata */
  fightStartTime: number;
  fightEndTime: number;
  fightDuration: number;
  bucketSizeMs: number;

  /** Data organized by target (targetId -> playerId -> data) */
  byTarget: Record<number, Record<number, PlayerDamageOverTimeData>>;

  /** Combined data for all targets (playerId -> data) */
  allTargets: Record<number, PlayerDamageOverTimeData>;
}

/**
 * Input data for damage over time calculation
 */
export interface DamageOverTimeCalculationTask {
  fight: {
    startTime: number;
    endTime: number;
  };
  players: Record<number, PlayerDetailsWithRole>;
  damageEvents: DamageEvent[];
  /** Time bucket size in milliseconds (default: 1000ms = 1 second) */
  bucketSizeMs?: number;
}

/**
 * Calculate damage over time data for all players and targets
 * Groups damage events into time buckets and calculates DPS for each player
 */
export function calculateDamageOverTimeData(
  data: DamageOverTimeCalculationTask,
  onProgress?: OnProgressCallback,
): DamageOverTimeResult {
  const { fight, players, damageEvents, bucketSizeMs = 1000 } = data;
  const { startTime, endTime } = fight;
  const fightDuration = endTime - startTime;

  onProgress?.(0);

  // Filter to only friendly player damage events (exclude friendly fire)
  const playerDamageEvents = damageEvents.filter(
    (event) => event.sourceIsFriendly && !event.targetIsFriendly,
  );

  // Get all unique target IDs
  const targetIds = new Set(playerDamageEvents.map((event) => event.targetID));

  // Get all unique player IDs from the events (in case some players have no damage)
  const playerIds = new Set(playerDamageEvents.map((event) => event.sourceID));
  // Include all players from the players record
  Object.keys(players).forEach((playerId) => playerIds.add(Number(playerId)));

  // Create time buckets
  const numBuckets = Math.ceil(fightDuration / bucketSizeMs);
  const buckets: number[] = [];
  for (let i = 0; i < numBuckets; i++) {
    buckets.push(startTime + i * bucketSizeMs);
  }

  onProgress?.(0.1);

  // Initialize result structure
  const result: DamageOverTimeResult = {
    fightStartTime: startTime,
    fightEndTime: endTime,
    fightDuration,
    bucketSizeMs,
    byTarget: {},
    allTargets: {},
  };

  // Process each target separately
  let targetIndex = 0;
  for (const targetId of targetIds) {
    result.byTarget[targetId] = {};

    // Get events for this target
    const targetEvents = playerDamageEvents.filter((event) => event.targetID === targetId);

    // Process each player for this target
    for (const playerId of playerIds) {
      const player = players[playerId];
      if (!player) continue;

      const playerEvents = targetEvents.filter((event) => event.sourceID === playerId);

      // Create data points for each time bucket
      const dataPoints: DamageOverTimeDataPoint[] = [];
      let totalDamage = 0;
      let maxDps = 0;

      for (let i = 0; i < buckets.length; i++) {
        const bucketStart = buckets[i];
        const bucketEnd = buckets[i + 1] || endTime;

        // Get events in this bucket
        const bucketEvents = playerEvents.filter(
          (event) => event.timestamp >= bucketStart && event.timestamp < bucketEnd,
        );

        const bucketDamage = bucketEvents.reduce((sum, event) => sum + event.amount, 0);
        const dps = bucketDamage / (bucketSizeMs / 1000); // Convert to per-second

        totalDamage += bucketDamage;
        maxDps = Math.max(maxDps, dps);

        dataPoints.push({
          timestamp: bucketStart,
          relativeTime: (bucketStart - startTime) / 1000,
          damage: bucketDamage,
          eventCount: bucketEvents.length,
        });
      }

      const averageDps = totalDamage / (fightDuration / 1000);

      result.byTarget[targetId][playerId] = {
        playerId,
        playerName: player.name,
        targetId,
        dataPoints,
        totalDamage,
        totalEvents: playerEvents.length,
        averageDps,
        maxDps,
      };
    }

    // Report progress
    targetIndex++;
    onProgress?.(0.1 + (targetIndex / targetIds.size) * 0.8);
  }

  // Calculate combined data for all targets
  for (const playerId of playerIds) {
    const player = players[playerId];
    if (!player) continue;

    const playerEvents = playerDamageEvents.filter((event) => event.sourceID === playerId);

    // Create data points for each time bucket (all targets combined)
    const dataPoints: DamageOverTimeDataPoint[] = [];
    let totalDamage = 0;
    let maxDps = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucketStart = buckets[i];
      const bucketEnd = buckets[i + 1] || endTime;

      // Get events in this bucket
      const bucketEvents = playerEvents.filter(
        (event) => event.timestamp >= bucketStart && event.timestamp < bucketEnd,
      );

      const bucketDamage = bucketEvents.reduce((sum, event) => sum + event.amount, 0);
      const dps = bucketDamage / (bucketSizeMs / 1000); // Convert to per-second

      totalDamage += bucketDamage;
      maxDps = Math.max(maxDps, dps);

      dataPoints.push({
        timestamp: bucketStart,
        relativeTime: (bucketStart - startTime) / 1000,
        damage: bucketDamage,
        eventCount: bucketEvents.length,
      });
    }

    const averageDps = totalDamage / (fightDuration / 1000);

    result.allTargets[playerId] = {
      playerId,
      playerName: player.name,
      targetId: null,
      dataPoints,
      totalDamage,
      totalEvents: playerEvents.length,
      averageDps,
      maxDps,
    };
  }

  onProgress?.(1);
  return result;
}
