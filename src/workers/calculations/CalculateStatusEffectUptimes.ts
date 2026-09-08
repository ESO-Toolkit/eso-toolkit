import { KnownAbilities } from '../../types/abilities';
import type { BuffLookupData, BuffTimeInterval } from '../../utils/BuffLookupUtils';
import type { OnProgressCallback } from '../Utils';

import { getStatusEffectIcon, getStatusEffectName } from './statusEffectMetadata';

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

export type StatusEffectUptimesNoDataReason =
  | 'missing-fight-start'
  | 'missing-fight-end'
  | 'non-finite-fight-start'
  | 'non-finite-fight-end'
  | 'invalid-fight-window';

export interface StatusEffectUptimesSuccessResult {
  status: 'ok';
  data: StatusEffectUptimesByTarget[];
}

export interface StatusEffectUptimesNoDataResult {
  status: 'no-data';
  reason: StatusEffectUptimesNoDataReason;
  data: [];
}

export type StatusEffectUptimesResult =
  StatusEffectUptimesSuccessResult | StatusEffectUptimesNoDataResult;

interface UptimeMetrics {
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

type UptimeByTarget = Record<number, UptimeMetrics>;
type UptimeByPlayer = Record<number, Record<number, UptimeMetrics>>;

interface UptimeGroupKeys {
  allPlayersTargetId: number;
  playerId: number;
  byPlayerTargetId: number;
}

/**
 * Calculate status effect uptimes segmented by target with averaging capability
 */
export function calculateStatusEffectUptimes(
  data: StatusEffectUptimesCalculationTask,
  onProgress?: OnProgressCallback,
): StatusEffectUptimesResult {
  const { debuffsLookup, hostileBuffsLookup, fightStartTime, fightEndTime, friendlyPlayerIds } =
    data;

  if (typeof fightStartTime !== 'number') {
    return { status: 'no-data', reason: 'missing-fight-start', data: [] };
  }
  if (typeof fightEndTime !== 'number') {
    return { status: 'no-data', reason: 'missing-fight-end', data: [] };
  }
  if (!Number.isFinite(fightStartTime)) {
    return { status: 'no-data', reason: 'non-finite-fight-start', data: [] };
  }
  if (!Number.isFinite(fightEndTime)) {
    return { status: 'no-data', reason: 'non-finite-fight-end', data: [] };
  }
  const fightDuration = fightEndTime - fightStartTime;
  if (fightEndTime <= fightStartTime || !Number.isFinite(fightDuration) || fightDuration <= 0) {
    return { status: 'no-data', reason: 'invalid-fight-window', data: [] };
  }

  const normalizedFightStartTime = normalizeZero(fightStartTime);
  const normalizedFightEndTime = normalizeZero(fightEndTime);

  // Create a Set for O(1) friendly player lookups
  // This filters hostile buff intervals to only include players in the current fight
  const friendlyPlayerSet = friendlyPlayerIds
    ? new Set(friendlyPlayerIds.filter(Number.isFinite))
    : null;

  const results = new Map<string, StatusEffectUptimesByTarget>();

  // Report progress for debuff calculations
  onProgress?.(0);

  // Calculate debuff uptimes segmented by target AND player
  for (const abilityId of STATUS_EFFECT_DEBUFF_ABILITIES) {
    const intervals = debuffsLookup.buffIntervals[abilityId.toString()];
    if (intervals && intervals.length > 0) {
      const abilityKey = abilityId.toString();

      const { allPlayers, byPlayer } = calculateSegmentedUptimes(
        intervals,
        normalizedFightStartTime,
        normalizedFightEndTime,
        fightDuration,
        (interval) => ({
          allPlayersTargetId: interval.targetID,
          playerId: interval.sourceID,
          byPlayerTargetId: interval.targetID,
        }),
      );

      // Only create entry if we have data for at least one target
      if (Object.keys(allPlayers).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          // Canonical name/icon for this fixed status effect. The UI still
          // prefers per-report master data when present, but these status-effect
          // ids are frequently absent from it — without this fallback the panel
          // rendered a raw "Ability <id>" placeholder with no icon.
          abilityName: getStatusEffectName(abilityId),
          icon: getStatusEffectIcon(abilityId),
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

      const { allPlayers, byPlayer } = calculateSegmentedUptimes(
        intervals,
        normalizedFightStartTime,
        normalizedFightEndTime,
        fightDuration,
        (interval) => ({
          // For hostile buffs, targetID is the player receiving the effect and
          // sourceID is the enemy applying it.
          allPlayersTargetId: interval.targetID,
          playerId: interval.targetID,
          byPlayerTargetId: interval.sourceID,
        }),
        (interval) => !friendlyPlayerSet || friendlyPlayerSet.has(interval.targetID),
      );

      // Only create entry if we have data for at least one target
      if (Object.keys(allPlayers).length > 0) {
        results.set(abilityKey, {
          abilityGameID: abilityKey,
          // Canonical name/icon for this fixed status effect (see debuff branch).
          abilityName: getStatusEffectName(abilityId),
          icon: getStatusEffectIcon(abilityId),
          isDebuff: false,
          hostilityType: 1,
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

  return { status: 'ok', data: resultArray };
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function calculateSegmentedUptimes(
  intervals: readonly BuffTimeInterval[],
  fightStartTime: number,
  fightEndTime: number,
  fightDuration: number,
  getKeys: (interval: BuffTimeInterval) => UptimeGroupKeys,
  includeInterval: (interval: BuffTimeInterval) => boolean = () => true,
): { allPlayers: UptimeByTarget; byPlayer: UptimeByPlayer } {
  const allPlayers: UptimeByTarget = {};
  const byPlayer: UptimeByPlayer = {};
  const allPlayerIntervals: Record<number, Array<{ start: number; end: number }>> = {};
  const byPlayerIntervals: Record<
    number,
    Record<number, Array<{ start: number; end: number }>>
  > = {};

  for (const interval of intervals) {
    if (
      !includeInterval(interval) ||
      !Number.isFinite(interval.start) ||
      !Number.isFinite(interval.end)
    ) {
      continue;
    }

    const keys = getKeys(interval);
    if (
      !Number.isFinite(keys.allPlayersTargetId) ||
      !Number.isFinite(keys.playerId) ||
      !Number.isFinite(keys.byPlayerTargetId)
    ) {
      continue;
    }

    const start = Math.max(interval.start, fightStartTime);
    const end = Math.min(interval.end, fightEndTime);
    if (end <= start) {
      continue;
    }

    const normalized = { start, end };
    const allPlayersTarget = ensureMetrics(allPlayers, keys.allPlayersTargetId);
    allPlayersTarget.applications += 1;
    (allPlayerIntervals[keys.allPlayersTargetId] ??= []).push(normalized);

    const byPlayerTargets = (byPlayer[keys.playerId] ??= {});
    const byPlayerTarget = ensureMetrics(byPlayerTargets, keys.byPlayerTargetId);
    byPlayerTarget.applications += 1;
    ((byPlayerIntervals[keys.playerId] ??= {})[keys.byPlayerTargetId] ??= []).push(normalized);
  }

  for (const targetId of Object.keys(allPlayers)) {
    setUnionedDuration(
      allPlayers[Number(targetId)],
      allPlayerIntervals[Number(targetId)],
      fightDuration,
    );
  }
  for (const playerId of Object.keys(byPlayer)) {
    for (const targetId of Object.keys(byPlayer[Number(playerId)])) {
      setUnionedDuration(
        byPlayer[Number(playerId)][Number(targetId)],
        byPlayerIntervals[Number(playerId)][Number(targetId)],
        fightDuration,
      );
    }
  }

  return { allPlayers, byPlayer };
}

function ensureMetrics(metricsByTarget: UptimeByTarget, targetId: number): UptimeMetrics {
  return (metricsByTarget[targetId] ??= {
    totalDuration: 0,
    uptime: 0,
    uptimePercentage: 0,
    applications: 0,
  });
}

function setUnionedDuration(
  metrics: UptimeMetrics,
  intervals: Array<{ start: number; end: number }>,
  fightDuration: number,
): void {
  const totalDuration = unionDuration(intervals);
  metrics.totalDuration = totalDuration;
  metrics.uptime = totalDuration / 1000;
  metrics.uptimePercentage = (totalDuration / fightDuration) * 100;
}

function unionDuration(intervals: Array<{ start: number; end: number }>): number {
  if (intervals.length === 0) {
    return 0;
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  let totalDuration = 0;
  let start = sorted[0].start;
  let end = sorted[0].end;

  for (let index = 1; index < sorted.length; index += 1) {
    const interval = sorted[index];
    if (interval.start <= end) {
      end = Math.max(end, interval.end);
      continue;
    }

    totalDuration += end - start;
    start = interval.start;
    end = interval.end;
  }

  return totalDuration + (end - start);
}
