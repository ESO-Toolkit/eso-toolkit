import React from 'react';

import {
  useCriticalDamageTask,
  usePlayerData,
  useResolvedReportFightContext,
  useFightForContext,
} from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useCompanionCritEvidence } from '../../../hooks/workerTasks/useCompanionCritEvidence';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { AnalyzerPanelState, resolveAnalyzerPanelState } from '../AnalyzerPanelState';

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
  // Built from the SAME snapshots + resolvedContext the crit-damage worker uses, so the
  // detail view's evidence-driven defaults agree with the worker's baked-in wasActive.
  const companionCritEvidence = useCompanionCritEvidence(resolvedContext);

  // A missing fight is a terminal unresolved dependency, not an active request.
  // Treating it as loading would leave an invalid/deleted fight context spinning forever.
  const isLoading = Boolean(fight) && (isCriticalDamageLoading || isPlayerDataLoading);

  const criticalDamagePlayerDataMap = criticalDamageData?.playerDataMap;
  const hasCriticalDamageResults =
    criticalDamagePlayerDataMap != null && Object.keys(criticalDamagePlayerDataMap).length > 0;
  const hasViewData = Boolean(hasCriticalDamageResults && playerData?.playersById && fight);
  const hasCompleteInputs = Boolean(
    fight &&
    playerData?.playersById &&
    playerData.status === 'succeeded' &&
    criticalDamagePlayerDataMap,
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

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  // Global fighting finesse toggle state (default to false - disabled, since Fighting Finesse
  // is a slottable Champion Point that can't be confirmed from log data)
  const [globalFightingFinesseEnabled, setGlobalFightingFinesseEnabled] =
    React.useState<boolean>(false);

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

  const hasRetainedData = hasViewData && players.length > 0;
  const panelError = criticalDamageError ?? playerData?.error ?? null;
  const state = resolveAnalyzerPanelState({
    error: panelError,
    hasData: hasRetainedData,
    isComplete: hasCompleteInputs,
    isLoading,
  });

  return (
    <AnalyzerPanelState detail={panelError ?? undefined} state={state} title="Critical damage">
      {hasRetainedData && (
        <CriticalDamagePanelView
          players={players}
          fight={fight as NonNullable<typeof fight>}
          expandedPanels={expandedPanels}
          onExpandChange={handleExpandChange}
          criticalDamageData={criticalDamagePlayerDataMap || null}
          isLoading={false}
          phaseTransitionInfo={phaseTransitionInfo}
          globalFightingFinesseEnabled={globalFightingFinesseEnabled}
          onGlobalFightingFinesseToggle={handleGlobalFightingFinesseToggle}
          companionCritEvidence={companionCritEvidence}
        />
      )}
    </AnalyzerPanelState>
  );
};
