import * as React from 'react';
import { useSelector } from 'react-redux';

import { selectSelectedTargetId } from '../store/ui/uiSelectors';

import { useCurrentFight } from './useCurrentFight';
import { useReportMasterData } from './useReportMasterData';

export function useSelectedTargetIds(): Set<number> {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { fight } = useCurrentFight();
  const { reportMasterData } = useReportMasterData();

  return React.useMemo(() => {
    let newTargetIds: Set<number>;

    if (selectedTargetId) {
      // If a specific target is selected, return only that target
      newTargetIds = new Set([selectedTargetId]);
    } else if (!fight?.enemyNPCs) {
      // If no fight or no enemy NPCs, return empty set
      newTargetIds = new Set();
    } else {
      // Find all boss targets
      const bossTargets = fight.enemyNPCs
        .filter((npc): npc is { id: number } => {
          if (!npc?.id) {
            return false;
          }

          const actor = reportMasterData?.actorsById?.[npc.id];
          return actor && actor.subType === 'Boss';
        })
        .map((npc) => npc.id);

      if (bossTargets.length > 0) {
        // If there are bosses, return only boss targets
        newTargetIds = new Set(bossTargets);
      } else {
        // If no bosses and no individual target selected, return all targets
        newTargetIds = new Set(
          fight.enemyNPCs
            .filter((npc): npc is { id: number } => npc?.id != null)
            .map((npc) => npc.id),
        );
      }
    }

    return newTargetIds;
  }, [fight?.enemyNPCs, reportMasterData?.actorsById, selectedTargetId]);
}
