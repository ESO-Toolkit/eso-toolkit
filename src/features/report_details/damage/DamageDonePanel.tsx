import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { useDamageEventsLookup, useReportMasterData, usePlayerData } from '../../../hooks';
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

  // Extract data from hooks with memoization
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData]
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
        if (!event.targetIsFriendly) {
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
  }, [damageEventsByPlayer]);

  // Calculate active percentages using ESO logs methodology
  const activePercentages = useMemo(() => {
    if (!fight || !damageEventsByPlayer) {
      return {};
    }

    return calculateActivePercentages(fight, damageEventsByPlayer);
  }, [fight, damageEventsByPlayer]);

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

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Loading damage data...</Typography>
      </Box>
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

  return <DamageDonePanelView damageRows={damageRows} />;
};
