import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoRecord, usePlayerData } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useFriendlyBuffLookup } from '../../../hooks/useFriendlyBuffEvents';
import { isBuffActiveOnTarget } from '../../../utils/BuffLookupUtils';
import {
  calculateDynamicDamageReductionAtTimestamp,
  calculateStaticResistanceValue,
  DAMAGE_REDUCTION_SOURCES,
  DamageReductionSourceWithActiveState,
  getResistanceFromComputedSource,
  isComputedSourceActive,
  resistanceToDamageReduction,
} from '../../../utils/damageReductionUtils';

import { DamageReductionPanelView } from './DamageReductionPanelView';
import {
  DamageReductionDataPoint,
  PlayerDamageReductionData,
} from './PlayerDamageReductionDetails';

interface DamageReductionPanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for damage reduction panel
 */
export const DamageReductionPanel: React.FC<DamageReductionPanelProps> = ({ fight }) => {
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { combatantInfoRecord, isCombatantInfoEventsLoading } = useCombatantInfoRecord();
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

  // Calculate damage reduction data for all players at once
  const allPlayersDamageReductionData = React.useMemo(() => {
    if (
      !fight?.startTime ||
      !fight?.endTime ||
      !friendlyBuffsLookup ||
      !debuffsLookup ||
      !combatantInfoRecord ||
      !playerData?.playersById ||
      players.length === 0
    ) {
      return new Map<number, PlayerDamageReductionData>();
    }

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Build the final result map
    const playerDataMap = new Map<number, PlayerDamageReductionData>();

    // Process each player
    players.forEach((player) => {
      const combatantInfo = combatantInfoRecord[player.id];

      if (!combatantInfo) {
        return;
      }

      // Calculate static damage reduction (gear, passives, etc.)
      const staticResistances = calculateStaticResistanceValue(combatantInfo, player);

      // Calculate damage reduction over time for this player using new methods
      const fightDurationMs = fightEnd - fightStart;
      const fightDurationSeconds = Math.ceil(fightDurationMs / 1000);

      const dataPoints: DamageReductionDataPoint[] = [];
      let maxDamageReduction = 0;

      // Calculate damage reduction at each timestamp
      for (let i = 0; i <= fightDurationSeconds; i++) {
        const timestamp = fightStart + i * 1000;

        // Calculate dynamic resistance at this timestamp
        const dynamicResistance = calculateDynamicDamageReductionAtTimestamp(
          friendlyBuffsLookup,
          debuffsLookup,
          timestamp,
          player.id
        );

        const totalResistance = staticResistances + dynamicResistance;
        const damageReductionPercent = resistanceToDamageReduction(totalResistance);

        dataPoints.push({
          timestamp,
          damageReduction: damageReductionPercent,
          totalResistance,
          staticResistance: staticResistances,
          dynamicResistance,
          relativeTime: i,
        });

        // Update statistics
        maxDamageReduction = Math.max(maxDamageReduction, damageReductionPercent);
      }

      // Calculate dynamic resistance statistics
      const dynamicResistanceValues = dataPoints.map((point) => point.dynamicResistance);
      const maxDynamicResistance = Math.max(...dynamicResistanceValues);
      const averageDynamicResistance =
        dynamicResistanceValues.length > 0
          ? dynamicResistanceValues.reduce((sum, val) => sum + val, 0) /
            dynamicResistanceValues.length
          : 0;

      // Get all damage reduction sources with their active states
      const allSources: DamageReductionSourceWithActiveState[] = DAMAGE_REDUCTION_SOURCES.map(
        (source) => {
          let isActive = false;

          switch (source.source) {
            case 'aura':
              // Auras are typically always active if present
              if ('ability' in source && combatantInfo.auras) {
                isActive = combatantInfo.auras.some((aura) => aura.ability === source.ability);
              }
              break;
            case 'gear':
              // Check if gear set requirements are met
              if ('set' in source && 'numberOfPieces' in source && combatantInfo.gear) {
                let gearCount = 0;
                for (const gearPiece of combatantInfo.gear) {
                  if (gearPiece && gearPiece.setID === source.set) {
                    gearCount++;
                  }
                }
                isActive = gearCount >= source.numberOfPieces;
              }
              break;
            case 'computed':
              // For computed sources, use the proper function to check if they would be active
              if ('key' in source) {
                isActive = isComputedSourceActive(combatantInfo, source, player);
              }
              break;
            case 'buff':
            case 'debuff':
              // Dynamic sources - check if they were active for this specific player during any part of the fight
              const lookup = source.source === 'buff' ? friendlyBuffsLookup : debuffsLookup;
              // Check if this buff/debuff was ever active for this player during the fight
              isActive = isBuffActiveOnTarget(lookup, source.ability, undefined, player.id);
              break;
          }

          return {
            ...source,
            isActive,
          };
        }
      );

      // Transform complex source objects into simple display objects for the dumb component
      // Calculate resistance values here in the smart component
      const displaySources = allSources.map((source) => {
        let resistanceValue = 0;

        if ('resistanceValue' in source) {
          // For sources with direct resistance values (buffs, debuffs, gear, auras)
          resistanceValue = source.resistanceValue;
        } else if (source.source === 'computed' && 'key' in source) {
          // For computed sources, calculate the actual resistance
          resistanceValue = getResistanceFromComputedSource(source, combatantInfo, player);
        }

        return {
          source: source.source,
          name: source.name,
          isActive: source.isActive,
          resistanceValue,
        };
      });

      playerDataMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        dataPoints,
        damageReductionSources: displaySources,
        staticResistance: staticResistances,
        maxDynamicResistance,
        averageDynamicResistance,
      });
    });

    return playerDataMap;
  }, [
    fight,
    friendlyBuffsLookup,
    debuffsLookup,
    combatantInfoRecord,
    playerData?.playersById,
    players,
  ]);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading damage reduction data...</Typography>
      </Box>
    );
  }

  return (
    <DamageReductionPanelView
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      damageReductionData={allPlayersDamageReductionData}
      isLoading={isLoading}
    />
  );
};
