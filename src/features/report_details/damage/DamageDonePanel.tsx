import { Box, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { GenericTabSkeleton } from '../../../components/GenericTabSkeleton';
import {
  useDamageEventsLookup,
  useReportMasterData,
  usePlayerData,
  useSelectedTargetIds,
} from '../../../hooks';
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';
import { calculateActivePercentages } from '../../../utils/activePercentageUtils';
import { resolveActorName } from '../../../utils/resolveActorName';

import { DamageDonePanelView } from './DamageDonePanelView';

import { useSelectedFight } from '@/hooks/useSelectedFight';

/**
 * Smart component that handles data processing and state management for damage done panel
 */
export const DamageDonePanel: React.FC = () => {
  // Use hooks to get data
  const { damageEventsByPlayer, isDamageEventsLookupLoading } = useDamageEventsLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const fight = useSelectedFight();
  const selectedTargetIds = useSelectedTargetIds();
  const actorsById = useSelector(selectActorsById);

  // Resolve selected target names for display
  const selectedTargetNames = useMemo(() => {
    if (selectedTargetIds.size === 0) return null;

    const names = Array.from(selectedTargetIds).map((targetId) => {
      const actor = actorsById[targetId];
      return resolveActorName(actor, targetId);
    });

    return names;
  }, [selectedTargetIds, actorsById]);

  // Extract data from hooks with memoization
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData],
  );

  // Compute loading and error states
  const isLoading = useMemo(() => {
    return isDamageEventsLookupLoading || isMasterDataLoading || isPlayerDataLoading;
  }, [isDamageEventsLookupLoading, isMasterDataLoading, isPlayerDataLoading]);

  const isDataReady = useMemo(() => {
    return !isLoading;
  }, [isLoading]);

  // Memoize damage calculations to prevent unnecessary recalculations
  const damageStatistics = useMemo(() => {
    const damageByPlayer: Record<number, number> = {};
    const damageEventsBySource: Record<number, number> = {};

    // Convert string keys to numbers and calculate totals
    Object.entries(damageEventsByPlayer).forEach(([playerIdStr, events]) => {
      const playerId = Number(playerIdStr);
      let totalDamage = 0;
      let eventCount = 0;

      events.forEach((event) => {
        // Skip events that damage friendly targets
        if (!event.targetIsFriendly) {
          // Apply target filter if specific targets are selected
          if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
            return; // Skip this event
          }

          const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
          totalDamage += amount;
          eventCount++;
        }
      });

      if (totalDamage > 0) {
        damageByPlayer[playerId] = totalDamage;
        damageEventsBySource[playerId] = eventCount;
      }
    });

    return { damageByPlayer, damageEventsBySource };
  }, [damageEventsByPlayer, selectedTargetIds]);

  // Calculate active percentages using ESO logs methodology with target filtering
  const activePercentages = useMemo(() => {
    if (!fight || !damageEventsByPlayer) {
      return {};
    }

    // Filter damage events by selected target before calculating active percentages
    const filteredDamageEventsByPlayer: Record<string, (typeof damageEventsByPlayer)[string]> = {};

    Object.entries(damageEventsByPlayer).forEach(([playerIdStr, events]) => {
      const filteredEvents = events.filter((event) => {
        // Skip events that damage friendly targets
        if (event.targetIsFriendly) {
          return false;
        }

        // Apply target filter if specific targets are selected
        if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
          return false;
        }

        return true;
      });

      if (filteredEvents.length > 0) {
        filteredDamageEventsByPlayer[playerIdStr] = filteredEvents;
      }
    });

    return calculateActivePercentages(fight, filteredDamageEventsByPlayer);
  }, [fight, damageEventsByPlayer, selectedTargetIds]);

  const fightDuration = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return (Number(fight.endTime) - Number(fight.startTime)) / 1000;
    }
    return 1;
  }, [fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string) => {
      const actor = masterData.actorsById[id];
      if (!actor) {
        return false;
      }

      if (fight?.friendlyPlayers?.some((friendlyId) => friendlyId?.toString() === id)) {
        return true;
      }

      return fight?.friendlyNPCs?.some((npc) => npc?.id?.toString() === id);
    };
  }, [masterData.actorsById, fight]);

  // Helper function to determine player role
  const getPlayerRole = useMemo(() => {
    return (playerId: string): 'dps' | 'tank' | 'healer' => {
      if (!playerData?.playersById) return 'dps';

      // Try both string and numeric keys since playerData might use either
      const player = playerData.playersById[playerId] || playerData.playersById[Number(playerId)];
      const role = player?.role;

      // The role should already be normalized in the store
      if (role === 'tank') return 'tank';
      if (role === 'healer') return 'healer';
      if (role === 'dps') return 'dps';

      return 'dps'; // default fallback
    };
  }, [playerData]);

  const damageRows = useMemo(() => {
    return Object.entries(damageStatistics.damageByPlayer)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, total]) => {
        const totalDamage = Number(total);
        const playerId = Number(id);

        // Prefer masterData actor name if available
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        const role = getPlayerRole(id);

        // Get active percentage for this player
        const activeData = activePercentages[playerId];
        const activePercentage = activeData?.activePercentage ?? 0;

        return {
          id,
          name,
          total: totalDamage,
          dps: fightDuration > 0 ? totalDamage / fightDuration : 0,
          activePercentage,
          iconUrl,
          role,
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }, [
    damageStatistics.damageByPlayer,
    isPlayerActor,
    masterData.actorsById,
    fightDuration,
    getPlayerRole,
    activePercentages,
  ]);

  // Show table skeleton while data is being fetched
  if (isLoading) {
    return (
      <GenericTabSkeleton title="Damage Done" showChart={false} showTable={true} tableRows={10} />
    );
  }

  // Don't render until we have data
  if (!isDataReady) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No damage data available for this fight
        </Typography>
      </Box>
    );
  }

  return <DamageDonePanelView damageRows={damageRows} selectedTargetNames={selectedTargetNames} />;
};
