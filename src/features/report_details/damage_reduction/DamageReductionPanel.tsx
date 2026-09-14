import React from 'react';

import { usePlayerData, useResolvedReportFightContext, useFightForContext } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useDamageReductionTask } from '../../../hooks/workerTasks/useDamageReductionTask';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import type { PlayerDamageReductionData } from '../../../workers/calculations/CalculateDamageReduction';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

import { DamageReductionPanelView } from './DamageReductionPanelView';

interface DamageReductionPanelProps {
  context?: ReportFightContextInput;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

/**
 * Smart component that handles data processing and state management for damage reduction panel
 */
export const DamageReductionPanel: React.FC<DamageReductionPanelProps> = ({
  context,
  phaseTransitionInfo,
}) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const reportId = resolvedContext.reportCode ?? '';
  const resolvedFightId = resolvedContext.fightId ?? undefined;

  const { playerData, isPlayerDataLoading } = usePlayerData({ context: resolvedContext });

  // Use the worker-based damage reduction calculation
  const {
    damageReductionData: allPlayersDamageReductionData,
    isDamageReductionLoading,
    damageReductionError,
  } = useDamageReductionTask({ context: resolvedContext });

  const isLoading = isDamageReductionLoading || isPlayerDataLoading;

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

  const hasCalculationResult =
    typeof allPlayersDamageReductionData === 'object' && allPlayersDamageReductionData !== null;
  const hasRetainedData =
    players.length > 0 &&
    hasCalculationResult &&
    Object.keys(allPlayersDamageReductionData).length > 0;
  const failureDetail = damageReductionError ?? playerData?.error ?? undefined;
  const state = resolveAnalyzerPanelState({
    error: failureDetail,
    hasData: hasRetainedData,
    isComplete:
      fight !== null &&
      resolvedFightId != null &&
      playerData?.status === 'succeeded' &&
      hasCalculationResult,
    isLoading,
  });

  return (
    <AnalyzerPanelState detail={failureDetail} state={state} title="Damage Reduction Analysis">
      {hasRetainedData && fight && resolvedFightId != null && (
        <DamageReductionPanelView
          reportId={reportId}
          fightId={resolvedFightId}
          players={players}
          fight={fight}
          expandedPanels={expandedPanels}
          onExpandChange={handleExpandChange}
          damageReductionData={
            allPlayersDamageReductionData as Record<number, PlayerDamageReductionData>
          }
          isLoading={false}
          phaseTransitionInfo={phaseTransitionInfo}
        />
      )}
    </AnalyzerPanelState>
  );
};
