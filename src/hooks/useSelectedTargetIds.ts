import * as React from 'react';
import { useSelector } from 'react-redux';

import type { ReportFightContextInput } from '../store/contextTypes';
import { selectSelectedTargetIds } from '../store/ui/uiSelectors';

import { resolveTargetScopes } from './targetScopes';
import { useFightForContext } from './useFightForContext';
import { useReportMasterData } from './useReportMasterData';
import { useResolvedReportFightContext } from './useResolvedReportFightContext';

// Legacy sentinel for the authoritative "All Bosses" aggregate scope.
export const ALL_TARGETS_SENTINEL = -1;
// Sentinel value for "select all enemies" (including non-bosses)
export const ALL_ENEMIES_SENTINEL = -2;

interface UseSelectedTargetIdsOptions {
  context?: ReportFightContextInput;
}

export function useSelectedTargetIds(options?: UseSelectedTargetIdsOptions): Set<number> {
  const selectedTargetIds = useSelector(selectSelectedTargetIds);
  const resolvedContext = useResolvedReportFightContext(options?.context);
  const fight = useFightForContext(resolvedContext);
  const { reportMasterData } = useReportMasterData({ context: resolvedContext });

  const targetScopes = React.useMemo(
    () => resolveTargetScopes(fight?.enemyNPCs, reportMasterData?.actorsById),
    [fight?.enemyNPCs, reportMasterData?.actorsById],
  );

  const selectedTargetsSet = React.useMemo(() => {
    const filteredIds = selectedTargetIds.filter(
      (id: number) => id !== ALL_TARGETS_SENTINEL && id !== ALL_ENEMIES_SENTINEL,
    );
    return new Set<number>(filteredIds);
  }, [selectedTargetIds]);

  const hasAllTargetsSelected = React.useMemo(() => {
    return selectedTargetIds.includes(ALL_TARGETS_SENTINEL);
  }, [selectedTargetIds]);

  const hasAllEnemiesSelected = React.useMemo(() => {
    return selectedTargetIds.includes(ALL_ENEMIES_SENTINEL);
  }, [selectedTargetIds]);

  const isEmptySelection = React.useMemo(() => {
    return selectedTargetIds.length === 0;
  }, [selectedTargetIds]);

  const allTargetsSet = React.useMemo(
    () => new Set(targetScopes.allEnemyIds),
    [targetScopes.allEnemyIds],
  );
  const bossTargetsSet = React.useMemo(() => new Set(targetScopes.bossIds), [targetScopes.bossIds]);

  return React.useMemo<Set<number>>(() => {
    if (hasAllEnemiesSelected) {
      return allTargetsSet;
    }

    if (hasAllTargetsSelected || isEmptySelection) {
      return bossTargetsSet;
    }

    return selectedTargetsSet;
  }, [
    hasAllTargetsSelected,
    hasAllEnemiesSelected,
    isEmptySelection,
    bossTargetsSet,
    allTargetsSet,
    selectedTargetsSet,
  ]);
}
