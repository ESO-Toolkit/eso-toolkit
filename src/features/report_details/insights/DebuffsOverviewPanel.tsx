import React from 'react';
import { useSelector } from 'react-redux';

import { useDebuffEvents, usePlayerData, useReportMasterData } from '../../../hooks';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';

import { DebuffsOverviewPanelView } from './DebuffsOverviewPanelView';

// Define the interface for the data expected by the view
export interface DebuffOverviewData extends Record<string, unknown> {
  debuffName: string;
  debuffId: number;
  icon: string;
  gameId: string; // Keep for compatibility with existing view
  activeTargetsCount: number;
  totalApplications: number;
  extraAbilities: Array<{ id: number; name: string }>; // All extra abilities used with this debuff
}

export const DebuffsOverviewPanel: React.FC = () => {
  const { debuffLookupData, isDebuffLookupLoading, debuffLookupError } = useDebuffLookupTask();
  const { reportMasterData } = useReportMasterData();
  const { debuffEvents } = useDebuffEvents();
  const { playerData } = usePlayerData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // Local state for selected player filter
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<number | null>(null);

  // Get available players who are sources of debuffs for the player selector
  const availablePlayers = React.useMemo(() => {
    if (!debuffEvents || !playerData?.playersById) return [];

    const playerSet = new Set<number>();
    debuffEvents.forEach((event) => {
      if (event.sourceIsFriendly && event.sourceID) {
        playerSet.add(event.sourceID);
      }
    });

    return Array.from(playerSet)
      .map((playerId) => ({
        id: playerId,
        name:
          playerData.playersById[playerId]?.name ||
          playerData.playersById[playerId]?.displayName ||
          `Player ${playerId}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [debuffEvents, playerData?.playersById]);

  // Create a mapping of abilityGameID + targetID to sourceIDs for filtering
  const debuffSourceMapping = React.useMemo(() => {
    if (!debuffEvents) return new Map<string, Set<number>>();

    const mapping = new Map<string, Set<number>>();

    debuffEvents.forEach((event) => {
      if (event.type === 'applydebuff' || event.type === 'applydebuffstack') {
        const key = `${event.abilityGameID}_${event.targetID}`;
        if (!mapping.has(key)) {
          mapping.set(key, new Set<number>());
        }
        const sourceSet = mapping.get(key);
        if (sourceSet) {
          sourceSet.add(event.sourceID);
        }
      }
    });

    return mapping;
  }, [debuffEvents]);

  // Create a mapping of abilityGameID to all extraAbilityGameIDs for resolving extra abilities
  const extraAbilityMapping = React.useMemo(() => {
    if (!debuffEvents) return new Map<number, Set<number>>();

    const mapping = new Map<number, Set<number>>();

    debuffEvents.forEach((event) => {
      if (
        (event.type === 'applydebuff' || event.type === 'removedebuff') &&
        event.extraAbilityGameID
      ) {
        if (!mapping.has(event.abilityGameID)) {
          mapping.set(event.abilityGameID, new Set<number>());
        }
        const extraAbilitySet = mapping.get(event.abilityGameID);
        if (extraAbilitySet) {
          extraAbilitySet.add(event.extraAbilityGameID);
        }
      }
    });

    return mapping;
  }, [debuffEvents]);

  // Transform the BuffLookupData into DebuffOverviewData
  const debuffOverviewData: DebuffOverviewData[] = React.useMemo(() => {
    if (!debuffLookupData || !reportMasterData?.abilitiesById) return [];

    const overviewData: DebuffOverviewData[] = [];

    // Iterate through each debuff ability in the debuff intervals
    for (const [abilityIdStr, intervals] of Object.entries(debuffLookupData.buffIntervals)) {
      const abilityId = parseInt(abilityIdStr, 10);
      const ability = reportMasterData.abilitiesById[abilityId];

      // Filter intervals by selected target if one is selected
      let filteredIntervals = selectedTargetId
        ? intervals.filter((interval) => interval.targetID === selectedTargetId)
        : intervals;

      // Filter by selected player (sourceID) if one is selected
      if (selectedPlayerId) {
        filteredIntervals = filteredIntervals.filter((interval) => {
          const key = `${abilityId}_${interval.targetID}`;
          const sources = debuffSourceMapping.get(key);
          return sources && sources.has(selectedPlayerId);
        });
      }

      // Skip abilities that have no intervals after filtering
      if (filteredIntervals.length === 0) {
        continue;
      }

      // Get unique targets that have this debuff at any point
      const uniqueTargets = new Set<number>();
      let totalApplications = 0;

      for (const interval of filteredIntervals) {
        uniqueTargets.add(interval.targetID);
        totalApplications += 1; // Each interval represents one application
      }

      // Check if this debuff has extra abilities
      const extraAbilityIds = extraAbilityMapping.get(abilityId);
      const extraAbilities: Array<{ id: number; name: string }> = [];

      if (extraAbilityIds && reportMasterData) {
        extraAbilityIds.forEach((extraAbilityId) => {
          const extraAbility = reportMasterData.abilitiesById[extraAbilityId];
          if (extraAbility?.name) {
            extraAbilities.push({
              id: extraAbilityId,
              name: extraAbility.name,
            });
          }
        });
      }

      overviewData.push({
        debuffName: ability?.name || `Unknown Debuff (${abilityId})`,
        debuffId: abilityId,
        icon: ability?.icon || '',
        gameId: abilityIdStr, // Use string version for compatibility
        activeTargetsCount: uniqueTargets.size,
        totalApplications,
        extraAbilities,
      });
    }

    // Sort by total applications (descending) then by name
    return overviewData.sort((a, b) => {
      if (a.totalApplications !== b.totalApplications) {
        return b.totalApplications - a.totalApplications;
      }
      return a.debuffName.localeCompare(b.debuffName);
    });
  }, [
    debuffLookupData,
    reportMasterData,
    selectedTargetId,
    selectedPlayerId,
    debuffSourceMapping,
    extraAbilityMapping,
  ]);

  return (
    <DebuffsOverviewPanelView
      debuffOverviewData={debuffOverviewData}
      isLoading={isDebuffLookupLoading}
      error={debuffLookupError}
      selectedTargetId={selectedTargetId}
      selectedPlayerId={selectedPlayerId}
      availablePlayers={availablePlayers}
      onPlayerChange={setSelectedPlayerId}
    />
  );
};
