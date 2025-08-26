import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useCombatantInfoEvents, usePlayerData, useReportMasterData } from '../../../hooks';
import { resolveActorName } from '../../../utils/resolveActorName';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';

interface CriticalDamagePanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
export const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight }) => {
  const { playerData, isPlayerDataLoading } = usePlayerData();

  // Compute loading state in component
  const isLoading = useMemo(() => {
    return isPlayerDataLoading;
  }, [isPlayerDataLoading]);

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
      players={playerData?.playersById}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
    />
  );
};
