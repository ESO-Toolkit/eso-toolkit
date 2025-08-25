import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, useReportMasterData } from '../../../hooks';
import { resolveActorName } from '../../../utils/resolveActorName';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';

interface CriticalDamagePanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
export const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight }) => {
  // Use hooks to get data
  const { isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract data from hooks
  const actorsById = useMemo(
    () => reportMasterData?.actorsById || {},
    [reportMasterData?.actorsById]
  );

  // Compute loading state in component
  const isLoading = useMemo(() => {
    return isCombatantInfoEventsLoading || isMasterDataLoading;
  }, [isCombatantInfoEventsLoading, isMasterDataLoading]);

  // Process player data
  const players = React.useMemo(() => {
    return Object.values(actorsById)
      .filter((actor) => actor?.type === 'Player' && actor?.id)
      .map((actor) => ({
        id: String(actor.id),
        name: String(resolveActorName(actor)),
      }));
  }, [actorsById]);

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange = React.useCallback(
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    []
  );

  // Show loading state while fetching data
  if (isLoading && players.length === 0) {
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
    />
  );
};
