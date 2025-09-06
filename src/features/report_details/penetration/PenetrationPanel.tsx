import { Box } from '@mui/material';
import React from 'react';

import { StableLoading } from '../../../components/StableLoading';
import { FightFragment } from '../../../graphql/generated';
import { usePlayerData, useSelectedTargetIds } from '../../../hooks';
import { usePenetrationDataTask } from '../../../hooks/workerTasks/usePenetrationDataTask';
import { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';

import { PenetrationPanelView } from './PenetrationPanelView';

interface PenetrationPanelProps {
  fight: FightFragment;
}

/**
 * Smart component that handles data processing and state management for penetration panel
 */
export const PenetrationPanel: React.FC<PenetrationPanelProps> = ({ fight }) => {
  // Use hooks to get data
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const selectedTargetIds = useSelectedTargetIds();

  // Use the worker-based penetration calculation
  const { penetrationData: allPlayersPenetrationData, isPenetrationDataLoading } =
    usePenetrationDataTask();

  const isLoading = isPenetrationDataLoading || isPlayerDataLoading;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData = !isLoading && allPlayersPenetrationData && playerData?.playersById;

  // State to manage which accordion panels are expanded
  const [expandedPlayers, setExpandedPlayers] = React.useState<Record<string, boolean>>({});

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Handler for accordion expand/collapse
  const handlePlayerExpandChange = React.useCallback(
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPlayers((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    [],
  );

  // Show loading state while fetching data OR if data is not complete
  if (!hasCompleteData) {
    return (
      <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
        <StableLoading variant="panel" height={400} title="Loading penetration data..." />
      </Box>
    );
  }

  return (
    <PenetrationPanelView
      players={players}
      selectedTargetIds={selectedTargetIds}
      fight={fight}
      expandedPlayers={expandedPlayers}
      onPlayerExpandChange={handlePlayerExpandChange}
      penetrationData={allPlayersPenetrationData as Record<string, PlayerPenetrationData> | null}
      isLoading={false}
    />
  );
};
