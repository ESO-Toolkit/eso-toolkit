import React from 'react';
import { useSelector } from 'react-redux';

import {
  useStatusEffectUptimesTask,
  useHostileBuffLookupTask,
  useDebuffLookupTask,
  useReportMasterData,
  useSelectedTargetIds,
} from '@/hooks';

import { FightFragment } from '../../../graphql/gql/graphql';
import { ALL_TARGETS_SENTINEL } from '../../../hooks/useSelectedTargetIds';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedFriendlyPlayerId } from '../../../store/ui/uiSelectors';
import type { BuffLookupData } from '../../../utils/BuffLookupUtils';
import type {
  StatusEffectUptimesByTarget,
  StatusEffectUptimesResult,
} from '../../../workers/calculations/CalculateStatusEffectUptimes';
import { resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { BuffUptime } from './BuffUptimeProgressBar';
import { EffectUptimeTimelineModal } from './EffectUptimeTimelineModal';
import { StatusEffectUptimesView } from './StatusEffectUptimesView';
import { buildUptimeTimelineSeries } from './utils/buildUptimeTimeline';

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null; // Optional: if provided, show per-player uptimes with group average deltas
}

export function getStatusEffectUptimesForPanel(
  result: StatusEffectUptimesResult | null | undefined,
): StatusEffectUptimesByTarget[] | null {
  return result?.status === 'ok' ? result.data : null;
}

export function isStatusEffectUptimesResultPending(
  result: StatusEffectUptimesResult | null | undefined,
): boolean {
  return result === undefined || result === null;
}

export function getStatusEffectUptimesUnavailableMessage(
  result: StatusEffectUptimesResult | null | undefined,
): string | undefined {
  if (result?.status !== 'no-data') {
    return undefined;
  }

  switch (result.reason) {
    case 'missing-fight-start':
    case 'missing-fight-end':
      return 'Status effect uptimes are unavailable because this fight is missing timing data.';
    case 'non-finite-fight-start':
    case 'non-finite-fight-end':
    case 'invalid-fight-window':
      return 'Status effect uptimes are unavailable because this fight has invalid timing data.';
  }
}

export interface UptimeSample {
  totalDuration: number;
  uptime: number;
  applications: number;
}

const isValidUptimeSample = (sample: UptimeSample | undefined): sample is UptimeSample =>
  sample !== undefined &&
  Number.isFinite(sample.totalDuration) &&
  sample.totalDuration >= 0 &&
  Number.isFinite(sample.uptime) &&
  sample.uptime >= 0 &&
  Number.isFinite(sample.applications) &&
  sample.applications >= 0;

export const averageValidUptimeSamples = (
  samples: readonly (UptimeSample | undefined)[],
  fightDuration: number,
): (UptimeSample & { uptimePercentage: number }) | undefined => {
  if (!Number.isFinite(fightDuration) || fightDuration <= 0) {
    return undefined;
  }

  const validSamples = samples.filter(isValidUptimeSample);
  if (validSamples.length === 0) {
    return undefined;
  }

  const totalDuration = validSamples.reduce((sum, sample) => sum + sample.totalDuration, 0);
  const uptime = validSamples.reduce((sum, sample) => sum + sample.uptime, 0);
  const applications = validSamples.reduce((sum, sample) => sum + sample.applications, 0);
  const averageTotalDuration = totalDuration / validSamples.length;
  const uptimePercentage = (averageTotalDuration / fightDuration) * 100;

  if (!Number.isFinite(uptimePercentage) || uptimePercentage < 0 || uptimePercentage > 100) {
    return undefined;
  }

  return {
    totalDuration: averageTotalDuration,
    uptime: uptime / validSamples.length,
    applications,
    uptimePercentage,
  };
};

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({
  fight,
  selectedPlayerId,
}) => {
  const selectedTargetIds = useSelectedTargetIds();
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);

  // Convert Set to single target ID for backward compatibility with StatusEffectUptimesView
  const selectedTargetId = React.useMemo(() => {
    if (selectedTargetIds.size === 0) {
      return null;
    }
    const targetArray = Array.from(selectedTargetIds);
    // Return first non-sentinel target, or null if only sentinel values
    return targetArray.find((id) => id !== ALL_TARGETS_SENTINEL) ?? null;
  }, [selectedTargetIds]);

  // Get all dependency loading states to ensure complete data
  const { hostileBuffLookupData, isHostileBuffLookupLoading, hostileBuffLookupError } =
    useHostileBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading, debuffLookupError } = useDebuffLookupTask();

  // Use the worker-based selector for status effect uptimes (now returns target-segmented data)
  const { statusEffectUptimesData, isStatusEffectUptimesLoading, statusEffectUptimesError } =
    useStatusEffectUptimesTask();
  const statusEffectUptimes = getStatusEffectUptimesForPanel(statusEffectUptimesData);
  const unavailableMessage = getStatusEffectUptimesUnavailableMessage(statusEffectUptimesData);

  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const hasValidFightWindow =
    Number.isFinite(fightStartTime) &&
    Number.isFinite(fightEndTime) &&
    fightEndTime > fightStartTime;
  const fightWindowError = hasValidFightWindow
    ? null
    : 'Uptime data is unavailable because this fight has an invalid time window.';

  const realTargetFilter = React.useMemo(() => {
    if (selectedTargetIds.size === 0 || selectedTargetIds.has(ALL_TARGETS_SENTINEL)) {
      return null;
    }

    const realTargets = new Set(
      Array.from(selectedTargetIds).filter((id) => id !== ALL_TARGETS_SENTINEL),
    );

    return realTargets.size > 0 ? realTargets : null;
  }, [selectedTargetIds]);

  const mergedStatusEffectLookup = React.useMemo(() => {
    if (!hostileBuffLookupData && !debuffLookupData) {
      return null;
    }

    const merged: BuffLookupData = { buffIntervals: {} };

    const mergeSource = (source: BuffLookupData | null): void => {
      if (!source) {
        return;
      }

      Object.entries(source.buffIntervals).forEach(([abilityId, intervals]) => {
        const existing = merged.buffIntervals[abilityId];
        if (existing) {
          merged.buffIntervals[abilityId] = existing.concat(intervals);
        } else {
          merged.buffIntervals[abilityId] = intervals.slice();
        }
      });
    };

    mergeSource(hostileBuffLookupData);
    mergeSource(debuffLookupData);

    return merged;
  }, [hostileBuffLookupData, debuffLookupData]);

  // Filter and average the target-segmented data based on selected targets
  const filteredStatusEffectUptimes = React.useMemo<BuffUptime[]>(() => {
    if (!statusEffectUptimes || selectedTargetIds.size === 0) {
      return [];
    }

    // Cache fight duration calculation
    if (!hasValidFightWindow) {
      return [];
    }

    const fightDuration = fightEndTime - fightStartTime;

    // If "All Targets" is selected, include all available targets
    const shouldIncludeAllTargets = selectedTargetIds.has(ALL_TARGETS_SENTINEL);

    // Pre-compute targets to include outside the map loop
    let selectedTargetsArray: number[] | null = null;
    if (!shouldIncludeAllTargets) {
      selectedTargetsArray = Array.from(selectedTargetIds).filter(
        (id) => id !== ALL_TARGETS_SENTINEL,
      );
    }

    const results: BuffUptime[] = [];

    statusEffectUptimes.forEach((uptimeData) => {
      // Use allPlayers data (aggregated across all players)
      const targetData = uptimeData.allPlayers || uptimeData.targetData || {};
      const baseData = {
        abilityGameID: uptimeData.abilityGameID,
        abilityName: uptimeData.abilityName,
        icon: uptimeData.icon,
        isDebuff: uptimeData.isDebuff,
        hostilityType: uptimeData.hostilityType,
        uniqueKey: uptimeData.uniqueKey,
      };

      // Hostile buffs (isDebuff=false) are indexed by player IDs in allPlayers,
      // but byPlayer is indexed as byPlayer[playerId][enemySourceId]
      // Debuffs (isDebuff=true) are indexed by enemy IDs in allPlayers,
      // and byPlayer is indexed as byPlayer[playerId][enemyTargetId]
      let targetsToInclude: number[];
      if (uptimeData.isDebuff) {
        // Debuffs: filter by selected enemy targets (bosses)
        if (shouldIncludeAllTargets) {
          targetsToInclude = Object.keys(targetData).map(Number);
        } else {
          targetsToInclude =
            selectedTargetsArray?.filter((id) => targetData[id] !== undefined) || [];
        }
      } else {
        // Hostile buffs: indexed by player IDs, not enemy IDs
        // For the aggregated view, show all players regardless of boss selection
        targetsToInclude = Object.keys(targetData).map(Number);
      }

      if (targetsToInclude.length === 0) {
        return; // Skip this status effect
      }

      const aggregatedUptime = averageValidUptimeSamples(
        targetsToInclude.map((targetId) => targetData[targetId]),
        fightDuration,
      );
      if (!aggregatedUptime) {
        return;
      }

      results.push({
        ...baseData,
        ...aggregatedUptime,
      });
    });

    return results;
  }, [statusEffectUptimes, selectedTargetIds, fightStartTime, fightEndTime, hasValidFightWindow]);

  // Recalculate uptimes when a specific player is selected - now O(1) lookup!
  const playerFilteredStatusEffectUptimes = React.useMemo<BuffUptime[]>(() => {
    // Use selectedPlayerId for comparison (comes from selectedFriendlyPlayerId in parent)
    // Use selectedFriendlyPlayerId for additional source filtering
    const playerIdToFilter = selectedFriendlyPlayerId;

    // If no player selected, return the original data
    if (playerIdToFilter == null || !statusEffectUptimes) {
      return filteredStatusEffectUptimes;
    }

    // If no fight time bounds, can't calculate
    if (!hasValidFightWindow) {
      return filteredStatusEffectUptimes;
    }

    const fightDuration = fightEndTime - fightStartTime;
    const shouldIncludeAllTargets = selectedTargetIds.has(ALL_TARGETS_SENTINEL);
    const selectedTargetsArray = shouldIncludeAllTargets
      ? null
      : Array.from(selectedTargetIds).filter((id) => id !== ALL_TARGETS_SENTINEL);

    const results: BuffUptime[] = [];

    // For each status effect, use O(1) lookup to get player-specific data
    filteredStatusEffectUptimes.forEach((originalUptime) => {
      // Find the corresponding entry in statusEffectUptimes
      const uptimeData = statusEffectUptimes.find(
        (data) => data.abilityGameID === originalUptime.abilityGameID,
      );
      if (!uptimeData || !uptimeData.byPlayer) {
        return; // Skip if no data
      }

      // O(1) lookup for player's data
      const playerData = uptimeData.byPlayer[playerIdToFilter];
      if (!playerData) {
        return; // Player didn't contribute to this effect
      }

      // Determine which targets/sources to include based on effect type
      let targetsToInclude: number[];
      if (uptimeData.isDebuff) {
        // Debuffs: byPlayer[playerId][enemyTargetId]
        // Filter by selected enemy targets (bosses)
        if (shouldIncludeAllTargets) {
          targetsToInclude = Object.keys(playerData).map(Number);
        } else {
          targetsToInclude =
            selectedTargetsArray?.filter((id) => playerData[id] !== undefined) || [];
        }
      } else {
        // Hostile buffs: byPlayer[playerId][enemySourceId]
        // For hostile buffs, don't filter by boss selection - show all enemy sources
        // The player received this effect, that's what matters
        targetsToInclude = Object.keys(playerData).map(Number);
      }

      if (targetsToInclude.length === 0) {
        return; // Skip this effect - no matching targets/sources
      }

      const aggregatedUptime = averageValidUptimeSamples(
        targetsToInclude.map((targetId) => playerData[targetId]),
        fightDuration,
      );
      if (!aggregatedUptime) {
        return;
      }

      results.push({
        ...originalUptime,
        ...aggregatedUptime,
      });
    });

    return results;
  }, [
    filteredStatusEffectUptimes,
    selectedFriendlyPlayerId,
    statusEffectUptimes,
    selectedTargetIds,
    fightStartTime,
    fightEndTime,
    hasValidFightWindow,
  ]);

  // Enhance the results with ability names from master data
  const enhancedStatusEffectUptimes = React.useMemo<BuffUptime[]>(() => {
    if (!reportMasterData?.abilitiesById) {
      return playerFilteredStatusEffectUptimes;
    }

    // When a player is selected, we need to show their data compared to group average.
    // playerFilteredStatusEffectUptimes already contains the player's data either way;
    // when a player is selected we additionally attach the group average below.
    const usePlayerData = selectedPlayerId != null && selectedFriendlyPlayerId != null;

    const enhanced = playerFilteredStatusEffectUptimes.map((uptime) => {
      const ability = reportMasterData.abilitiesById[uptime.abilityGameID as string];
      return {
        ...uptime,
        uniqueKey: `${uptime.abilityGameID}`,
        abilityName: ability?.name || uptime.abilityName,
        icon: ability?.icon || uptime.icon,
      } as BuffUptime;
    });

    // If a player is selected, add group average for comparison
    // Calculate the AVERAGE of individual player uptimes (not the combined/overlapping total)
    if (usePlayerData && statusEffectUptimes && hasValidFightWindow) {
      const fightDuration = fightEndTime - fightStartTime;
      const shouldIncludeAllTargets = selectedTargetIds.has(ALL_TARGETS_SENTINEL);
      const selectedTargetsArray = shouldIncludeAllTargets
        ? null
        : Array.from(selectedTargetIds).filter((id) => id !== ALL_TARGETS_SENTINEL);

      const groupAverageMap = new Map<string, number>();

      // For each status effect, calculate the average of individual player uptimes
      statusEffectUptimes.forEach((uptimeData) => {
        if (!uptimeData.byPlayer) {
          return;
        }

        // Get all player IDs who contributed to this effect
        const playerIds = Object.keys(uptimeData.byPlayer).map(Number);
        if (playerIds.length === 0) {
          return;
        }

        // Calculate uptime for each player individually
        const playerUptimePercentages: number[] = [];

        playerIds.forEach((playerId) => {
          const playerData = uptimeData.byPlayer![playerId];
          if (!playerData) {
            return;
          }

          // Determine which targets to include
          let targetsToInclude: number[];
          if (uptimeData.isDebuff) {
            // Debuffs: filter by selected enemy targets
            if (shouldIncludeAllTargets) {
              targetsToInclude = Object.keys(playerData).map(Number);
            } else {
              targetsToInclude =
                selectedTargetsArray?.filter((id) => playerData[id] !== undefined) || [];
            }
          } else {
            // Hostile buffs: include all enemy sources
            targetsToInclude = Object.keys(playerData).map(Number);
          }

          if (targetsToInclude.length === 0) {
            return;
          }

          const playerUptime = averageValidUptimeSamples(
            targetsToInclude.map((targetId) => playerData[targetId]),
            fightDuration,
          );
          if (playerUptime) {
            playerUptimePercentages.push(playerUptime.uptimePercentage);
          }
        });

        // Calculate the average of all player uptimes
        if (playerUptimePercentages.length > 0) {
          const average =
            playerUptimePercentages.reduce((sum, val) => sum + val, 0) /
            playerUptimePercentages.length;
          groupAverageMap.set(uptimeData.abilityGameID, average);
        }
      });

      return enhanced.map((uptime) => ({
        ...uptime,
        groupAverageUptimePercentage: groupAverageMap.get(uptime.abilityGameID),
      }));
    }

    return enhanced;
  }, [
    playerFilteredStatusEffectUptimes,
    reportMasterData?.abilitiesById,
    selectedPlayerId,
    selectedFriendlyPlayerId,
    fightEndTime,
    fightStartTime,
    selectedTargetIds,
    statusEffectUptimes,
    hasValidFightWindow,
  ]);

  // Enhanced loading check: ensure ALL required data is available and processing is complete
  const isDataLoading = React.useMemo(() => {
    // Still loading if any of the core data sources are loading
    if (isMasterDataLoading || isStatusEffectUptimesLoading) {
      return true;
    }

    // Still loading if dependency tasks are loading
    if (isHostileBuffLookupLoading || isDebuffLookupLoading) {
      return true;
    }

    // Still loading if we don't have master data (required for enhancement)
    if (!reportMasterData) {
      return true;
    }

    // Still loading if status effect task hasn't completed yet
    // An absent task result is loading; an `ok` empty array and a typed no-data
    // result are both completed states; typed no-data renders its reason.
    if (isStatusEffectUptimesResultPending(statusEffectUptimesData)) {
      return true;
    }

    // Data is ready - the completed task can have no effects or an invalid window.
    return false;
  }, [
    isMasterDataLoading,
    isStatusEffectUptimesLoading,
    isHostileBuffLookupLoading,
    isDebuffLookupLoading,
    reportMasterData,
    statusEffectUptimesData,
  ]);

  const prefetchedSeries = React.useMemo(() => {
    if (!mergedStatusEffectLookup || !hasValidFightWindow) {
      return [];
    }

    if (enhancedStatusEffectUptimes.length === 0) {
      return [];
    }

    return buildUptimeTimelineSeries({
      uptimes: enhancedStatusEffectUptimes,
      lookup: mergedStatusEffectLookup,
      fightStartTime,
      fightEndTime,
      targetFilter: realTargetFilter,
    });
  }, [
    mergedStatusEffectLookup,
    fightStartTime,
    fightEndTime,
    enhancedStatusEffectUptimes,
    realTargetFilter,
    hasValidFightWindow,
  ]);

  const canOpenTimeline = prefetchedSeries.length > 0;
  const requestError =
    statusEffectUptimesError ?? hostileBuffLookupError ?? debuffLookupError ?? null;
  const panelState = resolveAnalyzerPanelState({
    error: requestError ?? unavailableMessage ?? fightWindowError,
    hasData: enhancedStatusEffectUptimes.length > 0,
    isComplete:
      statusEffectUptimesData != null &&
      hostileBuffLookupData !== null &&
      debuffLookupData !== null &&
      reportMasterData?.loaded === true &&
      hasValidFightWindow,
    isLoading: isDataLoading,
  });

  return (
    <React.Fragment>
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={enhancedStatusEffectUptimes}
        state={panelState}
        stateDetail={
          requestError ??
          unavailableMessage ??
          fightWindowError ??
          (panelState === 'stale'
            ? 'Status effect data is incomplete. Showing the latest available values.'
            : undefined)
        }
        reportId={reportId}
        fightId={fightId}
        onOpenTimeline={canOpenTimeline ? () => setIsTimelineOpen(true) : undefined}
        canOpenTimeline={canOpenTimeline}
        unavailableMessage={unavailableMessage}
      />
      <EffectUptimeTimelineModal
        open={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title="Status Effect Uptimes Timeline"
        subtitle="Toggle legend entries to focus on individual status effects."
        category="statusEffect"
        uptimes={enhancedStatusEffectUptimes ?? []}
        lookup={mergedStatusEffectLookup}
        fightStartTime={fightStartTime}
        fightEndTime={fightEndTime}
        targetFilter={realTargetFilter}
        prefetchedSeries={prefetchedSeries}
      />
    </React.Fragment>
  );
};
