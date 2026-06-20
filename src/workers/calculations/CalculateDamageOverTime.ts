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

  // Pre-group events by (target, player) and by player-across-all-targets in a
  // single pass, so each player's buckets are filled by ONE linear sweep instead
  // of re-filtering the player's whole event list once per time bucket (the old
  // O(targets × players × buckets × events) inner loop). Output is identical.
  const eventsByTargetPlayer = new Map<number, Map<number, DamageEvent[]>>();
  const eventsByPlayerAllTargets = new Map<number, DamageEvent[]>();
  for (const event of playerDamageEvents) {
    let perPlayer = eventsByTargetPlayer.get(event.targetID);
    if (!perPlayer) {
      perPlayer = new Map();
      eventsByTargetPlayer.set(event.targetID, perPlayer);
    }
    const tpArr = perPlayer.get(event.sourceID);
    if (tpArr) tpArr.push(event);
    else perPlayer.set(event.sourceID, [event]);

    const pArr = eventsByPlayerAllTargets.get(event.sourceID);
    if (pArr) pArr.push(event);
    else eventsByPlayerAllTargets.set(event.sourceID, [event]);
  }

  const perSecond = bucketSizeMs / 1000;

  // Bucket one player's events with a single linear sweep. `floor((ts-start)/
  // bucketSizeMs)` reproduces the old per-bucket `>= bucketStart && < bucketEnd`
  // membership exactly for events inside [startTime, endTime); events outside
  // that window matched no bucket before and are skipped here too. An empty list
  // yields all-zero buckets (preserving players with no damage on a target).
  const buildBuckets = (
    playerEvents: DamageEvent[],
  ): { dataPoints: DamageOverTimeDataPoint[]; totalDamage: number; maxDps: number } => {
    const dataPoints: DamageOverTimeDataPoint[] = new Array(buckets.length);
    for (let i = 0; i < buckets.length; i++) {
      dataPoints[i] = {
        timestamp: buckets[i],
        relativeTime: (buckets[i] - startTime) / 1000,
        damage: 0,
        eventCount: 0,
      };
    }

    let totalDamage = 0;
    for (const event of playerEvents) {
      if (event.timestamp < startTime || event.timestamp >= endTime) continue;
      const idx = Math.floor((event.timestamp - startTime) / bucketSizeMs);
      const dp = dataPoints[idx];
      dp.damage += event.amount;
      dp.eventCount += 1;
      totalDamage += event.amount;
    }

    let maxDps = 0;
    for (const dp of dataPoints) {
      const dps = dp.damage / perSecond;
      if (dps > maxDps) maxDps = dps;
    }

    return { dataPoints, totalDamage, maxDps };
  };

  // Process each target separately
  let targetIndex = 0;
  for (const targetId of targetIds) {
    result.byTarget[targetId] = {};
    const perPlayer = eventsByTargetPlayer.get(targetId);

    for (const playerId of playerIds) {
      const player = players[playerId];
      if (!player) continue;

      const playerEvents = perPlayer?.get(playerId) ?? [];
      const { dataPoints, totalDamage, maxDps } = buildBuckets(playerEvents);

      result.byTarget[targetId][playerId] = {
        playerId,
        playerName: player.name,
        targetId,
        dataPoints,
        totalDamage,
        totalEvents: playerEvents.length,
        averageDps: totalDamage / (fightDuration / 1000),
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

    const playerEvents = eventsByPlayerAllTargets.get(playerId) ?? [];

    // Skip players with no damage events
    if (playerEvents.length === 0) continue;

    const { dataPoints, totalDamage, maxDps } = buildBuckets(playerEvents);

    result.allTargets[playerId] = {
      playerId,
      playerName: player.name,
      targetId: null,
      dataPoints,
      totalDamage,
      totalEvents: playerEvents.length,
      averageDps: totalDamage / (fightDuration / 1000),
      maxDps,
    };
  }

  onProgress?.(1);
  return result;
}
