import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

import { useCriticalDamageTask, useCurrentFight, usePlayerData } from '../../../hooks';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
export const CriticalDamagePanel: React.FC = () => {
  const fight = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { criticalDamageData, isCriticalDamageLoading, criticalDamageError } =
    useCriticalDamageTask();

  const isLoading = isCriticalDamageLoading || isPlayerDataLoading;

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  console.log({ criticalDamageData });

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange = React.useCallback(
    (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    [],
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

  // Show error state if there was an error
  if (criticalDamageError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Typography color="error">
          Error calculating critical damage: {criticalDamageError}
        </Typography>
      </Box>
    );
  }

  return (
    <CriticalDamagePanelView
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      criticalDamageData={criticalDamageData?.playerDataMap || null}
      isLoading={isLoading}
    />
  );
};
