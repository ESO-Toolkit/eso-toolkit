import type { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import type { DamageEvent } from '@/types/combatlogEvents';

import type { OnProgressCallback } from '../Utils';

const DEFAULT_BUCKET_SIZE_MS = 1000;
const MAX_BUCKET_COUNT = 100_000;

type BucketCountResult =
  { status: 'ok'; bucketCount: number } | { status: 'no-data'; reason: DamageOverTimeNoDataReason };

type BucketBuildResult =
  | {
      status: 'ok';
      dataPoints: DamageOverTimeDataPoint[];
      totalDamage: number;
      maxDps: number;
      averageDps: number;
    }
  | { status: 'no-data' };

export interface DamageTimelineFightWindow {
  startTime: number;
  endTime: number;
}

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
interface DamageOverTimeResultMetadata {
  /** Fight metadata */
  fightStartTime: number;
  fightEndTime: number;
  fightDuration: number;
  bucketSizeMs: number;
}

export type DamageOverTimeNoDataReason =
  | 'non-finite-fight-start'
  | 'non-finite-fight-end'
  | 'invalid-fight-window'
  | 'non-finite-bucket-size'
  | 'invalid-bucket-size'
  | 'bucket-count-exceeded'
  | 'non-finite-damage-output';

export interface DamageOverTimeSuccessResult extends DamageOverTimeResultMetadata {
  /** A valid calculation, including valid fights with no matching damage events. */
  status: 'ok';

  /** Data organized by target (targetId -> playerId -> data) */
  byTarget: Record<number, Record<number, PlayerDamageOverTimeData>>;

  /** Combined data for all targets (playerId -> data) */
  allTargets: Record<number, PlayerDamageOverTimeData>;
}

export interface DamageOverTimeNoDataResult extends DamageOverTimeResultMetadata {
  /** Input was invalid, so no timeline calculation was performed. */
  status: 'no-data';
  reason: DamageOverTimeNoDataReason;
  byTarget: Record<number, never>;
  allTargets: Record<number, never>;
}

/**
 * A successful timeline is distinct from invalid input: consumers can safely
 * render an empty `ok` result while handling malformed input as `no-data`.
 */
export type DamageOverTimeResult = DamageOverTimeSuccessResult | DamageOverTimeNoDataResult;

/**
 * Input data for damage over time calculation
 */
export interface DamageOverTimeCalculationTask {
  fight: DamageTimelineFightWindow;
  players: Readonly<Record<number, PlayerDetailsWithRole>>;
  damageEvents: readonly DamageEvent[];
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
  const { fight, players, damageEvents, bucketSizeMs = DEFAULT_BUCKET_SIZE_MS } = data;
  const { startTime: inputStartTime, endTime: inputEndTime } = fight;

  onProgress?.(0);

  const bucketCountResult = getSafeBucketCount(inputStartTime, inputEndTime, bucketSizeMs);
  if (bucketCountResult.status === 'no-data') {
    onProgress?.(1);
    return createNoDataResult(inputStartTime, inputEndTime, bucketSizeMs, bucketCountResult.reason);
  }
  const { bucketCount: numBuckets } = bucketCountResult;
  const startTime = normalizeZero(inputStartTime);
  const endTime = normalizeZero(inputEndTime);
  const fightDuration = endTime - startTime;

  // Filter to only friendly player damage events (exclude friendly fire)
  const playerDamageEvents = damageEvents.filter(
    (event) =>
      event.sourceIsFriendly &&
      !event.targetIsFriendly &&
      Number.isFinite(event.timestamp) &&
      event.timestamp >= startTime &&
      event.timestamp < endTime &&
      Number.isFinite(event.amount) &&
      Number.isFinite(event.sourceID) &&
      Number.isFinite(event.targetID),
  );

  // Get all unique target IDs
  const targetIds = new Set(playerDamageEvents.map((event) => event.targetID));

  // Get all unique player IDs from the events (in case some players have no damage)
  const playerIds = new Set(playerDamageEvents.map((event) => event.sourceID));
  // Include all players from the players record
  Object.keys(players).forEach((playerId) => playerIds.add(Number(playerId)));

  // Create time buckets
  const buckets: number[] = [];
  for (let i = 0; i < numBuckets; i++) {
    buckets.push(startTime + i * bucketSizeMs);
  }

  onProgress?.(0.1);

  // Initialize result structure
  const result: DamageOverTimeSuccessResult = {
    status: 'ok',
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
  const buildBuckets = (playerEvents: DamageEvent[]): BucketBuildResult => {
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
      if (!dp) continue;
      const nextBucketDamage = dp.damage + event.amount;
      const nextTotalDamage = totalDamage + event.amount;
      if (!Number.isFinite(nextBucketDamage) || !Number.isFinite(nextTotalDamage)) {
        return { status: 'no-data' };
      }
      dp.damage = normalizeZero(nextBucketDamage);
      dp.eventCount += 1;
      totalDamage = normalizeZero(nextTotalDamage);
    }

    let maxDps = 0;
    for (const dp of dataPoints) {
      const dps = dp.damage / perSecond;
      if (!Number.isFinite(dps)) return { status: 'no-data' };
      if (dps > maxDps) maxDps = dps;
    }

    const averageDps = totalDamage / (fightDuration / 1000);
    if (!Number.isFinite(averageDps)) return { status: 'no-data' };

    return {
      status: 'ok',
      dataPoints,
      totalDamage: normalizeZero(totalDamage),
      maxDps: normalizeZero(maxDps),
      averageDps: normalizeZero(averageDps),
    };
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
      const bucketResult = buildBuckets(playerEvents);
      if (bucketResult.status === 'no-data') {
        onProgress?.(1);
        return createNoDataResult(startTime, endTime, bucketSizeMs, 'non-finite-damage-output');
      }
      const { dataPoints, totalDamage, maxDps, averageDps } = bucketResult;

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

    const playerEvents = eventsByPlayerAllTargets.get(playerId) ?? [];

    // Skip players with no damage events
    if (playerEvents.length === 0) continue;

    const bucketResult = buildBuckets(playerEvents);
    if (bucketResult.status === 'no-data') {
      onProgress?.(1);
      return createNoDataResult(startTime, endTime, bucketSizeMs, 'non-finite-damage-output');
    }
    const { dataPoints, totalDamage, maxDps, averageDps } = bucketResult;

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

function getSafeBucketCount(
  startTime: number,
  endTime: number,
  bucketSizeMs: number,
): BucketCountResult {
  if (!Number.isFinite(startTime)) return { status: 'no-data', reason: 'non-finite-fight-start' };
  if (!Number.isFinite(endTime)) return { status: 'no-data', reason: 'non-finite-fight-end' };
  if (!Number.isFinite(bucketSizeMs)) {
    return { status: 'no-data', reason: 'non-finite-bucket-size' };
  }
  if (bucketSizeMs <= 0 || bucketSizeMs / 1000 <= 0) {
    return { status: 'no-data', reason: 'invalid-bucket-size' };
  }

  const fightDuration = endTime - startTime;
  if (!Number.isFinite(fightDuration) || fightDuration <= 0) {
    return { status: 'no-data', reason: 'invalid-fight-window' };
  }
  if (fightDuration / 1000 <= 0) {
    return { status: 'no-data', reason: 'invalid-fight-window' };
  }

  const bucketCount = Math.ceil(fightDuration / bucketSizeMs);
  if (!Number.isSafeInteger(bucketCount) || bucketCount <= 0 || bucketCount > MAX_BUCKET_COUNT) {
    return { status: 'no-data', reason: 'bucket-count-exceeded' };
  }

  return { status: 'ok', bucketCount };
}

function createNoDataResult(
  startTime: number,
  endTime: number,
  bucketSizeMs: number,
  reason: DamageOverTimeNoDataReason,
): DamageOverTimeNoDataResult {
  return {
    status: 'no-data',
    reason,
    fightStartTime: sanitizeMetadataNumber(startTime),
    fightEndTime: sanitizeMetadataNumber(endTime),
    fightDuration: 0,
    bucketSizeMs:
      Number.isFinite(bucketSizeMs) && bucketSizeMs > 0
        ? sanitizeMetadataNumber(bucketSizeMs)
        : DEFAULT_BUCKET_SIZE_MS,
    byTarget: {},
    allTargets: {},
  };
}

function sanitizeMetadataNumber(value: number): number {
  return Number.isFinite(value) ? normalizeZero(value) : 0;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
