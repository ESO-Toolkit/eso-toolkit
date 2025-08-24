import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useHealingEvents, useReportMasterData } from '../../../hooks';
import { resolveActorName } from '../../../utils/resolveActorName';

import HealingDonePanelView from './HealingDonePanelView';

interface HealingDonePanelProps {
  fight: FightFragment;
  reportCode?: string;
}

/**
 * Smart component that handles data processing and state management for healing done panel
 */
const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ fight, reportCode }) => {
  // Use hooks to get data
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract data from hooks with memoization
  const events = useMemo(() => healingEvents || [], [healingEvents]);
  const masterData = useMemo(
    () => reportMasterData || { actorsById: {}, abilitiesById: {} },
    [reportMasterData]
  );

  // Compute loading state
  const isLoading = useMemo(() => {
    return isHealingEventsLoading || isMasterDataLoading;
  }, [isHealingEventsLoading, isMasterDataLoading]);

  const isDataReady = useMemo(() => {
    return !isLoading;
  }, [isLoading]);

  // IMPORTANT: All hooks must be called before any early returns

  // Memoize healing calculations to prevent unnecessary recalculations
  const healingStatistics = useMemo(() => {
    const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};

    events.forEach((event: { sourceID?: number; amount?: number; overhealing?: number }) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
        const overheal = 'overheal' in event ? Number(event.overheal) || 0 : 0;
        if (!healingByPlayer[playerId]) {
          healingByPlayer[playerId] = { raw: 0, overheal: 0 };
        }
        healingByPlayer[playerId].raw += amount;
        healingByPlayer[playerId].overheal += overheal;
      }
    });

    return healingByPlayer;
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

  const healingRows = useMemo(() => {
    return Object.entries(healingStatistics)
      .filter(([id]) => isPlayerActor(id))
      .map(([id, { raw, overheal }]) => {
        const actor = masterData.actorsById[id];
        const name = resolveActorName(actor, id, null);

        const iconUrl = actor?.icon
          ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
          : undefined;

        return {
          id,
          name,
          raw,
          hps: fightDuration > 0 ? raw / fightDuration : 0,
          overheal,
          iconUrl,
        };
      })
      .sort((a, b) => b.hps - a.hps);
  }, [healingStatistics, isPlayerActor, masterData.actorsById, fightDuration]);

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
        <Typography variant="h6">Loading healing data...</Typography>
      </Box>
    );
  }

  // Don't render until we have data
  if (!isDataReady) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No healing data available for this fight
        </Typography>
      </Box>
    );
  }

  return <HealingDonePanelView healingRows={healingRows} />;
};

export default HealingDonePanel;
