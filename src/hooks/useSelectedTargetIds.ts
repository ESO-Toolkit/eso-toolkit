import * as React from 'react';
import { useSelector } from 'react-redux';

import type { ReportActorFragment } from '../graphql/gql/graphql';
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

  const allTargets = React.useMemo(() => {
    if (!fight?.enemyNPCs) {
      return [];
    }

    return fight.enemyNPCs
      .filter((npc): npc is { id: number } => npc?.id != null)
      .map((npc) => npc.id);
  }, [fight?.enemyNPCs]);

  // Filter enemies: for duplicate names, keep only Boss subtype; for unique names, keep all
  const bossTargets = React.useMemo(() => {
    if (!fight?.enemyNPCs || !reportMasterData?.actorsById) {
      return [];
    }

    const validEnemies = fight.enemyNPCs
      .filter((npc): npc is { id: number } => npc?.id != null)
      .map((npc) => ({
        id: npc.id,
        actor: reportMasterData.actorsById[npc.id],
      }))
      .filter((enemy) => enemy.actor && enemy.actor.name);

    const enemyGroups = validEnemies.reduce(
      (acc, enemy) => {
        const name = enemy.actor.name;
        if (name && !acc[name]) {
          acc[name] = [];
        }
        if (name) {
          acc[name].push(enemy);
        }
        return acc;
      },
      {} as Record<string, Array<{ id: number; actor: ReportActorFragment }>>,
    );

    const filteredEnemies = validEnemies.filter((enemy) => {
      const name = enemy.actor.name;
      if (!name) return false;

      const sameNameEnemies = enemyGroups[name];

      if (sameNameEnemies && sameNameEnemies.length === 1) {
        return true; // Unique name
      }

      return enemy.actor.subType === 'Boss'; // Multiple names - only Boss subtype
    });

    return filteredEnemies.map((enemy) => enemy.id);
  }, [fight?.enemyNPCs, reportMasterData?.actorsById]);

  const selectedTargetsSet = React.useMemo(() => {
    const filteredIds = selectedTargetIds.filter(
      (id) => id !== ALL_TARGETS_SENTINEL && id !== ALL_ENEMIES_SENTINEL,
    );
    return new Set(filteredIds);
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

  const allTargetsSet = React.useMemo(() => new Set(allTargets), [allTargets]);
  const bossTargetsSet = React.useMemo(() => new Set(bossTargets), [bossTargets]);

  return React.useMemo(() => {
    if (hasAllEnemiesSelected) {
      return allTargetsSet;
    }

    if (hasAllTargetsSelected || isEmptySelection) {
      return bossTargetsSet.size > 0 ? bossTargetsSet : allTargetsSet;
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
