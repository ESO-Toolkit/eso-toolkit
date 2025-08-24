import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDamageEvents, useReportMasterData, usePlayerData } from '../../../hooks';
import { resolveActorName } from '../../../utils/resolveActorName';

import DamageDonePanelView from './DamageDonePanelView';

interface DamageDonePanelProps {
  fight: FightFragment;
  reportCode?: string;
}

/**
 * Smart component that handles data processing and state management for damage done panel
 */
const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ fight, reportCode }) => {
  // Use hooks to get data
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { isPlayerDataLoading } = usePlayerData();

  // Extract data from hooks with memoization
  const events = useMemo(() => damageEvents || [], [damageEvents]);
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData]
  );

  // Compute loading and error states
  const isLoading = useMemo(() => {
    return isDamageEventsLoading || isMasterDataLoading || isPlayerDataLoading;
  }, [isDamageEventsLoading, isMasterDataLoading, isPlayerDataLoading]);

  const isDataReady = useMemo(() => {
    return !isLoading;
  }, [isLoading]);

  // IMPORTANT: All hooks must be called before any early returns

  // Memoize damage calculations to prevent unnecessary recalculations
  const damageStatistics = useMemo(() => {
    const damageByPlayer: Record<number, number> = {};
    const damageEventsBySource: Record<number, number> = {};

    events.forEach((event) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
        if (!damageByPlayer[playerId]) {
          damageByPlayer[playerId] = 0;
        }
        damageByPlayer[playerId] += amount;
        if (!damageEventsBySource[playerId]) {
          damageEventsBySource[playerId] = 0;
        }
        damageEventsBySource[playerId]++;
      }
    });

    return { damageByPlayer, damageEventsBySource };
  }, [events]);

  const fightDuration = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return (Number(fight.endTime) - Number(fight.startTime)) / 1000;
    }
    return 1;
  }, [fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string | number) => {
      const actor = masterData.actorsById[id];
      return actor && actor.type === 'Player';
    };
  }, [masterData.actorsById]);

  const damageRows = useMemo(() => {
    return Object.entries(damageStatistics.damageByPlayer)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, total]) => {
        const totalDamage = Number(total);

        // Prefer masterData actor name if available
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        return {
          id,
          name,
          total: totalDamage,
          dps: fightDuration > 0 ? totalDamage / fightDuration : 0,
          iconUrl,
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }, [damageStatistics.damageByPlayer, isPlayerActor, masterData.actorsById, fightDuration]);

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

export default DamageDonePanel;
