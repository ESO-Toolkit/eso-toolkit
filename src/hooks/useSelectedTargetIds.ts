import * as React from 'react';
import { useSelector } from 'react-redux';

import { selectSelectedTargetIds } from '../store/ui/uiSelectors';

import { useCurrentFight } from './useCurrentFight';
import { useReportMasterData } from './useReportMasterData';

// Sentinel value for "select all targets"
export const ALL_TARGETS_SENTINEL = -1;
// Sentinel value for "select all enemies" (including non-bosses)
export const ALL_ENEMIES_SENTINEL = -2;

export function useSelectedTargetIds(): Set<number> {
  const selectedTargetIds = useSelector(selectSelectedTargetIds);
  const { fight } = useCurrentFight();
  const { reportMasterData } = useReportMasterData();

  // Memoize all targets first (cheaper operation)
  const allTargets = React.useMemo(() => {
    if (!fight?.enemyNPCs) {
      return [];
    }

    return fight.enemyNPCs
      .filter((npc): npc is { id: number } => npc?.id != null)
      .map((npc) => npc.id);
  }, [fight?.enemyNPCs]);

  // Compute boss targets (expensive operation, but properly cached)
  const bossTargets = React.useMemo(() => {
    if (!fight?.enemyNPCs || !reportMasterData?.actorsById) {
      return [];
    }

    return fight.enemyNPCs
      .filter((npc): npc is { id: number } => {
        if (!npc?.id) {
          return false;
        }

        const actor = reportMasterData.actorsById[npc.id];
        return actor && actor.subType === 'Boss';
      })
      .map((npc) => npc.id);
  }, [fight?.enemyNPCs, reportMasterData?.actorsById]);

  // Cache selected targets set for reference stability
  const selectedTargetsSet = React.useMemo(() => {
    const filteredIds = selectedTargetIds.filter(
      (id) => id !== ALL_TARGETS_SENTINEL && id !== ALL_ENEMIES_SENTINEL,
    );
    return new Set(filteredIds);
  }, [selectedTargetIds]);

  // Check sentinel states (cached)
  const hasAllTargetsSelected = React.useMemo(() => {
    return selectedTargetIds.includes(ALL_TARGETS_SENTINEL);
  }, [selectedTargetIds]);

  const hasAllEnemiesSelected = React.useMemo(() => {
    return selectedTargetIds.includes(ALL_ENEMIES_SENTINEL);
  }, [selectedTargetIds]);

  const isEmptySelection = React.useMemo(() => {
    return selectedTargetIds.length === 0;
  }, [selectedTargetIds]);

  // Cache Set objects only when needed
  const allTargetsSet = React.useMemo(() => new Set(allTargets), [allTargets]);
  const bossTargetsSet = React.useMemo(() => new Set(bossTargets), [bossTargets]);

  return React.useMemo(() => {
    // Handle "all enemies" selection
    if (hasAllEnemiesSelected) {
      return allTargetsSet;
    }

    // Treat empty selection or "all bosses" as boss targets
    if (hasAllTargetsSelected || isEmptySelection) {
      if (bossTargetsSet.size > 0) {
        // If there are bosses, return cached boss targets set
        return bossTargetsSet;
      } else {
        // If no bosses, return cached all targets set
        return allTargetsSet;
      }
    } else {
      // Return the cached selected targets set
      return selectedTargetsSet;
    }
  }, [
    hasAllTargetsSelected,
    hasAllEnemiesSelected,
    isEmptySelection,
    bossTargetsSet,
    allTargetsSet,
    selectedTargetsSet,
  ]);
}
