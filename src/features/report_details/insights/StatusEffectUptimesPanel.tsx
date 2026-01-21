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

import { BuffUptime } from './BuffUptimeProgressBar';
import { EffectUptimeTimelineModal } from './EffectUptimeTimelineModal';
import { StatusEffectUptimesView } from './StatusEffectUptimesView';
import { buildUptimeTimelineSeries } from './utils/buildUptimeTimeline';

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null; // Optional: if provided, show per-player uptimes with group average deltas
}

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
    return targetArray.find((id) => id !== ALL_TARGETS_SENTINEL) || null;
  }, [selectedTargetIds]);

  // Get all dependency loading states to ensure complete data
  const { hostileBuffLookupData, isHostileBuffLookupLoading } = useHostileBuffLookupTask();
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  // Use the worker-based selector for status effect uptimes (now returns target-segmented data)
  const { statusEffectUptimesData, isStatusEffectUptimesLoading } = useStatusEffectUptimesTask();

  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;

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
    if (!statusEffectUptimesData || selectedTargetIds.size === 0) {
      return [];
    }

    // Cache fight duration calculation
    const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 1;

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

    statusEffectUptimesData.forEach((uptimeData) => {
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

      // Calculate aggregated values
      let totalDuration = 0;
      let totalUptime = 0;
      let totalApplications = 0;
      const targetCount = targetsToInclude.length;

      for (let j = 0; j < targetCount; j++) {
        const data = targetData[targetsToInclude[j]];
        if (data) {
          totalDuration += data.totalDuration;
          totalUptime += data.uptime;
          totalApplications += data.applications;
        }
      }

      const avgTotalDuration = totalDuration / targetCount;
      const avgUptime = totalUptime / targetCount;
      const avgUptimePercentage = (avgTotalDuration / fightDuration) * 100;

      results.push({
        ...baseData,
        totalDuration: avgTotalDuration,
        uptime: avgUptime,
        uptimePercentage: avgUptimePercentage,
        applications: totalApplications,
      });
    });

    return results;
  }, [statusEffectUptimesData, selectedTargetIds, fightStartTime, fightEndTime]);

  // Recalculate uptimes when a specific player is selected - now O(1) lookup!
  const playerFilteredStatusEffectUptimes = React.useMemo<BuffUptime[]>(() => {
    // Use selectedPlayerId for comparison (comes from selectedFriendlyPlayerId in parent)
    // Use selectedFriendlyPlayerId for additional source filtering
    const playerIdToFilter = selectedFriendlyPlayerId;

    // If no player selected, return the original data
    if (playerIdToFilter == null || !statusEffectUptimesData) {
      return filteredStatusEffectUptimes;
    }

    // If no fight time bounds, can't calculate
    if (!fightStartTime || !fightEndTime) {
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
      // Find the corresponding entry in statusEffectUptimesData
      const uptimeData = statusEffectUptimesData.find(
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

      // Calculate aggregated values for the player's contributions
      let totalDuration = 0;
      let totalUptime = 0;
      let totalApplications = 0;
      const targetCount = targetsToInclude.length;

      for (let j = 0; j < targetCount; j++) {
        const data = playerData[targetsToInclude[j]];
        if (data) {
          totalDuration += data.totalDuration;
          totalUptime += data.uptime;
          totalApplications += data.applications;
        }
      }

      const avgTotalDuration = totalDuration / targetCount;
      const avgUptime = totalUptime / targetCount;
      const avgUptimePercentage = (avgTotalDuration / fightDuration) * 100;

      results.push({
        ...originalUptime,
        totalDuration: avgTotalDuration,
        uptime: avgUptime,
        uptimePercentage: avgUptimePercentage,
        applications: totalApplications,
      });
    });

    return results;
  }, [
    filteredStatusEffectUptimes,
    selectedFriendlyPlayerId,
    statusEffectUptimesData,
    selectedTargetIds,
    fightStartTime,
    fightEndTime,
  ]);

  // Enhance the results with ability names from master data
  const enhancedStatusEffectUptimes = React.useMemo<BuffUptime[]>(() => {
    if (!reportMasterData?.abilitiesById) {
      return playerFilteredStatusEffectUptimes;
    }

    // When a player is selected, we need to show their data compared to group average
    // The key insight: playerFilteredStatusEffectUptimes already contains the player's data
    // We just need to attach the group average to it
    const usePlayerData = selectedPlayerId && selectedFriendlyPlayerId;
    const sourceData = usePlayerData
      ? playerFilteredStatusEffectUptimes
      : playerFilteredStatusEffectUptimes;

    const enhanced = sourceData.map((uptime) => {
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
    if (usePlayerData && statusEffectUptimesData && fightStartTime && fightEndTime) {
      const fightDuration = fightEndTime - fightStartTime;
      const shouldIncludeAllTargets = selectedTargetIds.has(ALL_TARGETS_SENTINEL);
      const selectedTargetsArray = shouldIncludeAllTargets
        ? null
        : Array.from(selectedTargetIds).filter((id) => id !== ALL_TARGETS_SENTINEL);

      const groupAverageMap = new Map<string, number>();

      // For each status effect, calculate the average of individual player uptimes
      statusEffectUptimesData.forEach((uptimeData) => {
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

          // Calculate this player's average uptime
          let totalDuration = 0;
          const targetCount = targetsToInclude.length;

          for (let j = 0; j < targetCount; j++) {
            const data = playerData[targetsToInclude[j]];
            if (data) {
              totalDuration += data.totalDuration;
            }
          }

          const avgTotalDuration = totalDuration / targetCount;
          const playerUptimePercentage = (avgTotalDuration / fightDuration) * 100;
          playerUptimePercentages.push(playerUptimePercentage);
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
    statusEffectUptimesData,
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
    // Note: statusEffectUptimesData can be null, undefined, or [] depending on state
    if (statusEffectUptimesData === undefined || statusEffectUptimesData === null) {
      return true;
    }

    // Data is ready - statusEffectUptimesData is either [] (no effects) or contains effects
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
    if (!mergedStatusEffectLookup || !fightStartTime || !fightEndTime) {
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
  ]);

  const canOpenTimeline = prefetchedSeries.length > 0;

  if (isDataLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={null}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
        canOpenTimeline={false}
      />
    );
  }

  return (
    <React.Fragment>
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={enhancedStatusEffectUptimes}
        isLoading={false}
        reportId={reportId}
        fightId={fightId}
        onOpenTimeline={canOpenTimeline ? () => setIsTimelineOpen(true) : undefined}
        canOpenTimeline={canOpenTimeline}
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
