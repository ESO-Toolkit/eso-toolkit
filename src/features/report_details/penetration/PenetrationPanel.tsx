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
import { PlayerPenetrationData } from '../../../workers/calculations/CalculatePenetration';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

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
  const {
    penetrationData: allPlayersPenetrationData,
    isPenetrationDataLoading,
    penetrationDataError,
  } = usePenetrationDataTask({ context: resolvedContext });

  const isLoading = Boolean(fight) && (isPenetrationDataLoading || isPlayerDataLoading);

  const penetrationData = allPlayersPenetrationData as Record<string, PlayerPenetrationData> | null;
  const hasPenetrationResults = penetrationData != null && Object.keys(penetrationData).length > 0;
  const hasViewData = Boolean(hasPenetrationResults && playerData?.playersById && fight);
  const hasCompleteInputs = Boolean(
    fight && playerData?.playersById && playerData.status === 'succeeded' && penetrationData,
  );

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

  const hasRetainedData = hasViewData && players.length > 0;
  const panelError = penetrationDataError ?? playerData?.error ?? null;
  const state = resolveAnalyzerPanelState({
    error: panelError,
    hasData: hasRetainedData,
    isComplete: hasCompleteInputs,
    isLoading,
  });

  return (
    <AnalyzerPanelState detail={panelError ?? undefined} state={state} title="Penetration">
      {hasRetainedData && (
        <PenetrationPanelView
          players={players}
          selectedTargetIds={selectedTargetIds}
          fight={fight as NonNullable<typeof fight>}
          expandedPlayers={expandedPlayers}
          onPlayerExpandChange={handlePlayerExpandChange}
          penetrationData={penetrationData}
          isLoading={false}
          phaseTransitionInfo={phaseTransitionInfo}
        />
      )}
    </AnalyzerPanelState>
  );
};
