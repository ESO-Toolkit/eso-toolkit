import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, usePlayerData, useSelectedTargetIds } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import {
  getAllPenetrationSourcesWithActiveState,
  calculateStaticPenetration,
  calculateDynamicPenetrationAtTimestamp,
  PenetrationSourceWithActiveState,
} from '../../../utils/PenetrationUtils';

import { PenetrationPanelView } from './PenetrationPanelView';

interface PenetrationDataPoint {
  timestamp: number;
  penetration: number;
  relativeTime: number; // Time since fight start in seconds
}

interface PlayerPenetrationData {
  playerId: string;
  playerName: string;
  dataPoints: PenetrationDataPoint[];
  max: number;
  effective: number;
  timeAtCapPercentage: number;
  penetrationSources: PenetrationSourceWithActiveState[];
  playerBasePenetration: number;
}

interface PenetrationPanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for penetration panel
 */
export const PenetrationPanel: React.FC<PenetrationPanelProps> = ({ fight }) => {
  // Use hooks to get data
  const { playerData } = usePlayerData();
  const selectedTargetIds = useSelectedTargetIds();

  // Get combat events data
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();

  const isLoading =
    isCombatantInfoEventsLoading || isDebuffEventsLoading || isFriendlyBuffEventsLoading;

  // State to manage which accordion panels are expanded
  const [expandedPlayers, setExpandedPlayers] = React.useState<Record<string, boolean>>({});

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Calculate penetration data for all players at once
  const allPlayersPenetrationData = React.useMemo(() => {
    if (
      !fight?.startTime ||
      !fight?.endTime ||
      !debuffsLookup ||
      !friendlyBuffsLookup ||
      !combatantInfoEvents ||
      players.length === 0
    ) {
      return new Map<string, PlayerPenetrationData>();
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const fightDurationSeconds = (fightEnd - fightStart) / 1000;
    const voxelSizeSeconds = 1;
    const numVoxels = Math.ceil(fightDurationSeconds / voxelSizeSeconds);
    const cap = 18200; // Penetration cap

    // Pre-calculate player data that doesn't change over time
    const playersData = players
      .map((player) => {
        const playerId = player.id.toString();
        const playerCombatantInfo =
          combatantInfoEvents.find((info) => info.sourceID.toString() === playerId) || null;

        if (!playerCombatantInfo) {
          return null;
        }

        const allSources = getAllPenetrationSourcesWithActiveState(
          friendlyBuffsLookup,
          debuffsLookup,
          playerCombatantInfo,
          player
        );

        const playerBasePenetration = calculateStaticPenetration(playerCombatantInfo, player);

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
    for (let i = 0; i < numVoxels; i++) {
      const voxelTimestamp = fightStart + i * voxelSizeSeconds * 1000;

      // Calculate target debuff penetration once per timestamp
      let targetDebuffPenetration = 0;
      if (selectedTargetIds.size > 0) {
        // Get the maximum debuff penetration across all selected targets
        const targetPenetrations = Array.from(selectedTargetIds).map((targetId) =>
          calculateDynamicPenetrationAtTimestamp(
            null, // No friendly buffs needed for target debuffs
            debuffsLookup, // Check debuffs on the target
            voxelTimestamp,
            null, // No specific player needed for target debuffs
            targetId // Target ID (for debuff checks)
          )
        );
        targetDebuffPenetration = Math.max(...targetPenetrations, 0);
      }

      // Apply the timestamp calculations to each player
      playersData.forEach((playerData) => {
        // Calculate player-specific buff penetration
        const playerBuffPenetration = calculateDynamicPenetrationAtTimestamp(
          friendlyBuffsLookup, // Check buffs on this player
          null, // No debuffs needed for player buffs
          voxelTimestamp,
          parseInt(playerData.playerId, 10), // Player ID (for buff checks)
          null // No target needed for player buffs
        );

        const totalDynamicPenetration = playerBuffPenetration + targetDebuffPenetration;
        const totalPenetration = playerData.playerBasePenetration + totalDynamicPenetration;

        playerData.dataPoints.push({
          timestamp: voxelTimestamp,
          penetration: totalPenetration,
          relativeTime: i * voxelSizeSeconds,
        });

        // Count time at cap
        if (totalPenetration >= cap) {
          playerData.timeAtCapCount++;
        }
      });
    }

    // Build the final result map
    const playerDataMap = new Map<string, PlayerPenetrationData>();

    playersData.forEach((playerData) => {
      const timeAtCapPercentage = numVoxels > 0 ? (playerData.timeAtCapCount / numVoxels) * 100 : 0;
      const maxPenetration = Math.max(
        ...playerData.dataPoints.map((point) => point.penetration),
        0
      );
      const effectivePenetration =
        playerData.dataPoints.reduce((sum, point) => sum + point.penetration, 0) /
        playerData.dataPoints.length;

      playerDataMap.set(playerData.playerId, {
        playerId: playerData.playerId,
        playerName: playerData.player.name,
        dataPoints: playerData.dataPoints,
        max: maxPenetration,
        effective: effectivePenetration,
        timeAtCapPercentage,
        penetrationSources: playerData.allSources,
        playerBasePenetration: playerData.playerBasePenetration,
      });
    });

    return playerDataMap;
  }, [fight, debuffsLookup, friendlyBuffsLookup, combatantInfoEvents, players, selectedTargetIds]);

  // Handler for accordion expand/collapse
  const handlePlayerExpandChange = React.useCallback(
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPlayers((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    []
  );

  return (
    <PenetrationPanelView
      players={players}
      selectedTargetIds={selectedTargetIds}
      fight={fight}
      expandedPlayers={expandedPlayers}
      onPlayerExpandChange={handlePlayerExpandChange}
      penetrationData={allPlayersPenetrationData}
      isLoading={isLoading}
    />
  );
};
