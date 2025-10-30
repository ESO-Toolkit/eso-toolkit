import { Box, Typography } from '@mui/material';
import React from 'react';

import {
  useCriticalDamageTask,
  usePlayerData,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';

import { CriticalDamagePanelView } from './CriticalDamagePanelView';

/**
 * Smart component that handles data processing and state management for critical damage panel
 */
interface CriticalDamagePanelProps {
  context?: ReportFightContextInput;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

export const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({
  context,
  phaseTransitionInfo,
}) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const { criticalDamageData, isCriticalDamageLoading, criticalDamageError } =
    useCriticalDamageTask({ context: resolvedContext });

  const isLoading = isCriticalDamageLoading || isPlayerDataLoading || !fight;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData =
    !isLoading &&
    criticalDamageData?.playerDataMap &&
    playerData?.playersById &&
    fight;

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
  const [globalFightingFinesseEnabled, setGlobalFightingFinesseEnabled] =
    React.useState<boolean>(true);

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

  const fightForView = fight as NonNullable<typeof fight>;

  return (
    <CriticalDamagePanelView
      players={players}
      fight={fightForView}
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
