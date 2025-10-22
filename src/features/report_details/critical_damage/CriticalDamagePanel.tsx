import { Box, Typography } from '@mui/material';
import React from 'react';

import { useCriticalDamageTask, useCurrentFight, usePlayerData } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
interface CriticalDamagePanelProps {
  phaseTransitionInfo?: PhaseTransitionInfo;
}

export const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({
  phaseTransitionInfo,
}) => {
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const { criticalDamageData, isCriticalDamageLoading, criticalDamageError } =
    useCriticalDamageTask();

  const isLoading = isCriticalDamageLoading || isPlayerDataLoading || isFightLoading;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData =
    !isLoading && criticalDamageData?.playerDataMap && playerData?.playersById;

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  // Global fighting finesse toggle state (default to true - enabled)
  const [globalFightingFinesseEnabled, setGlobalFightingFinesseEnabled] = React.useState<boolean>(true);

  const handleExpandChange = React.useCallback(
    (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    [],
  );

  const handleGlobalFightingFinesseToggle = React.useCallback((enabled: boolean) => {
    setGlobalFightingFinesseEnabled(enabled);
  }, []);

  // Show loading state while fetching data OR if data is not complete
  if (!hasCompleteData) {
    return getSkeletonForTab(TabId.CRITICAL_DAMAGE, false, false);
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
      isLoading={false}
      phaseTransitionInfo={phaseTransitionInfo}
      globalFightingFinesseEnabled={globalFightingFinesseEnabled}
      onGlobalFightingFinesseToggle={handleGlobalFightingFinesseToggle}
    />
  );
};
