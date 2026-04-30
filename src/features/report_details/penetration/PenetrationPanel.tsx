import React from 'react';

import {
  usePlayerData,
  useSelectedTargetIds,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { usePenetrationDataTask } from '../../../hooks/workerTasks/usePenetrationDataTask';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';
import { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';

import { PenetrationPanelView } from './PenetrationPanelView';

interface PenetrationPanelProps {
  context?: ReportFightContextInput;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

/**
 * Smart component that handles data processing and state management for penetration panel
 */
export const PenetrationPanel: React.FC<PenetrationPanelProps> = ({
  context,
  phaseTransitionInfo,
}) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  // Use hooks to get data
  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const selectedTargetIds = useSelectedTargetIds();

  // Use the worker-based penetration calculation
  const { penetrationData: allPlayersPenetrationData, isPenetrationDataLoading } =
    usePenetrationDataTask({ context: resolvedContext });

  const isLoading = isPenetrationDataLoading || isPlayerDataLoading;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData =
    !isLoading && allPlayersPenetrationData && playerData?.playersById && fight != null;

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
    return getSkeletonForTab(TabId.PENETRATION, false, false);
  }

  const fightForView = fight as NonNullable<typeof fight>;

  return (
    <PenetrationPanelView
      players={players}
      selectedTargetIds={selectedTargetIds}
      fight={fightForView}
      expandedPlayers={expandedPlayers}
      onPlayerExpandChange={handlePlayerExpandChange}
      penetrationData={allPlayersPenetrationData as Record<string, PlayerPenetrationData> | null}
      isLoading={false}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
