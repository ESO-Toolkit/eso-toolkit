import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, usePlayerData } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import {
  calculateDynamicCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  getAllCriticalDamageSourcesWithActiveState,
  CriticalDamageSourceWithActiveState,
} from '../../../utils/CritDamageUtils';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';
import { PlayerCriticalDamageData } from './PlayerCriticalDamageDetailsView';

interface CriticalDamageDataPoint {
  timestamp: number;
  criticalDamage: number;
  relativeTime: number;
}

interface PlayerCriticalDamageDataExtended extends PlayerCriticalDamageData {
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  staticCriticalDamage: number;
}

interface CriticalDamagePanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
export const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight }) => {
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { friendlyBuffsLookup, isFriendlyBuffEventsLoading } = useFriendlyBuffLookup();
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();

  // Compute loading state in component
  const isLoading = useMemo(() => {
    return (
      isPlayerDataLoading ||
      isCombatantInfoEventsLoading ||
      isFriendlyBuffEventsLoading ||
      isDebuffEventsLoading
    );
  }, [
    isPlayerDataLoading,
    isCombatantInfoEventsLoading,
    isFriendlyBuffEventsLoading,
    isDebuffEventsLoading,
  ]);

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange = React.useCallback(
    (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    []
  );

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Calculate critical damage data for all players at once
  const allPlayersCriticalDamageData = React.useMemo(() => {
    if (
      !fight?.startTime ||
      !fight?.endTime ||
      !friendlyBuffsLookup ||
      !debuffsLookup ||
      !combatantInfoEvents ||
      !playerData?.playersById ||
      players.length === 0
    ) {
      return new Map<number, PlayerCriticalDamageDataExtended>();
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const fightDurationMs = fightEnd - fightStart;
    const fightDurationSeconds = Math.ceil(fightDurationMs / 1000);

    // Pre-calculate player data that doesn't change over time
    const playersData = players
      .map((player) => {
        const combatantInfo =
          combatantInfoEvents.find((info) => info.sourceID === player.id) || null;

        if (!combatantInfo) {
          return null;
        }

        // Get all critical damage sources with active states for this player
        const allSources = getAllCriticalDamageSourcesWithActiveState(
          friendlyBuffsLookup,
          debuffsLookup,
          combatantInfo
        );

        // Calculate static critical damage for this player
        const staticCriticalDamage = calculateStaticCriticalDamage(
          combatantInfo,
          playerData.playersById[player.id],
          debuffsLookup
        );

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
    for (let i = 0; i <= fightDurationSeconds; i++) {
      const timestamp = fightStart + i * 1000;

      // Calculate dynamic critical damage once per timestamp
      // This is shared across all players for buff/debuff sources
      const dynamicCriticalDamage = calculateDynamicCriticalDamageAtTimestamp(
        friendlyBuffsLookup,
        debuffsLookup,
        timestamp
      );

      // Apply the timestamp calculations to each player
      playersData.forEach((playerData) => {
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

    // Build the final result map
    const playerDataMap = new Map<number, PlayerCriticalDamageDataExtended>();

    playersData.forEach((playerData) => {
      const dataPointCount = playerData.dataPoints.length;
      const effectiveCriticalDamage =
        dataPointCount > 0 ? playerData.totalCriticalDamage / dataPointCount : 50;
      const timeAtCapPercentage =
        dataPointCount > 0 ? (playerData.timeAtCapCount / dataPointCount) * 100 : 0;

      playerDataMap.set(playerData.player.id, {
        playerId: playerData.player.id,
        playerName: playerData.player.name,
        dataPoints: playerData.dataPoints,
        effectiveCriticalDamage,
        maximumCriticalDamage: playerData.maxCriticalDamage,
        timeAtCapPercentage,
        criticalDamageAlerts: [], // TODO: Implement critical damage alerts if needed
        criticalDamageSources: playerData.allSources,
        staticCriticalDamage: playerData.staticCriticalDamage,
      });
    });

    return playerDataMap;
  }, [
    fight,
    friendlyBuffsLookup,
    debuffsLookup,
    combatantInfoEvents,
    playerData?.playersById,
    players,
  ]);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading critical damage data...</Typography>
      </Box>
    );
  }

  return (
    <CriticalDamagePanelView
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      criticalDamageData={allPlayersCriticalDamageData}
      isLoading={isLoading}
    />
  );
};
