import React from 'react';

import { usePlayerData, useResolvedReportFightContext, useFightForContext } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useDamageReductionTask } from '../../../hooks/workerTasks/useDamageReductionTask';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';
import { PlayerDamageReductionData } from '../../../workers/calculations/CalculateDamageReduction';

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
  const { damageReductionData: allPlayersDamageReductionData, isDamageReductionLoading } =
    useDamageReductionTask({ context: resolvedContext });

  const isLoading = isDamageReductionLoading || isPlayerDataLoading;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData =
    !isLoading &&
    allPlayersDamageReductionData &&
    playerData?.playersById &&
    fight &&
    resolvedFightId != null;

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

  // Show loading state while fetching data OR if data is not complete
  if (!hasCompleteData) {
    return getSkeletonForTab(TabId.DAMAGE_REDUCTION, false, false);
  }

  const fightIdForView = resolvedFightId as number;
  const fightForView = fight as NonNullable<typeof fight>;

  return (
    <DamageReductionPanelView
      reportId={reportId}
      fightId={fightIdForView}
      players={players}
      fight={fightForView}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      damageReductionData={
        allPlayersDamageReductionData as Record<number, PlayerDamageReductionData> | null
      }
      isLoading={false}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
