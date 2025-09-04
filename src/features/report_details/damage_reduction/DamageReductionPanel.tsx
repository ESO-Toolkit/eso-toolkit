import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { useDamageReductionTask } from '../../../hooks/workerTasks/useDamageReductionTask';
import { PlayerDamageReductionData } from '../../../workers/calculations/CalculateDamageReduction';

import { DamageReductionPanelView } from './DamageReductionPanelView';

interface DamageReductionPanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for damage reduction panel
 */
export const DamageReductionPanel: React.FC<DamageReductionPanelProps> = ({ fight }) => {
  const { playerData } = usePlayerData();

  // Use the worker-based damage reduction calculation
  const {
    damageReductionData: allPlayersDamageReductionData,
    isDamageReductionLoading: isLoading,
  } = useDamageReductionTask();

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

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading damage reduction data...</Typography>
      </Box>
    );
  }

  return (
    <DamageReductionPanelView
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      damageReductionData={
        allPlayersDamageReductionData as Record<number, PlayerDamageReductionData> | null
      }
      isLoading={isLoading}
    />
  );
};
