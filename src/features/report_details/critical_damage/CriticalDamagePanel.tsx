import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import {
  useDamageEvents,
  useBuffEvents,
  useDebuffEvents,
  useCombatantInfoEvents,
  useReportMasterData,
} from '../../../hooks';
import { resolveActorName } from '../../../utils/resolveActorName';

import CriticalDamagePanelView from './CriticalDamagePanelView';

interface CriticalDamagePanelProps {
  fight: FightFragment;
  reportCode?: string;
}

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight, reportCode }) => {
  // Use hooks to get data
  const { isDamageEventsLoading } = useDamageEvents();
  const { isBuffEventsLoading } = useBuffEvents();
  const { isDebuffEventsLoading } = useDebuffEvents();
  const { isCombatantInfoEventsLoading } = useCombatantInfoEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Extract data from hooks
  const actorsById = useMemo(
    () => reportMasterData?.actorsById || {},
    [reportMasterData?.actorsById]
  );

  // Compute loading state in component
  const isLoading = useMemo(() => {
    return (
      isDamageEventsLoading ||
      isBuffEventsLoading ||
      isDebuffEventsLoading ||
      isCombatantInfoEventsLoading ||
      isMasterDataLoading
    );
  }, [
    isDamageEventsLoading,
    isBuffEventsLoading,
    isDebuffEventsLoading,
    isCombatantInfoEventsLoading,
    isMasterDataLoading,
  ]);

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

export default CriticalDamagePanel;
