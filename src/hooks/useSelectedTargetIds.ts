import * as React from 'react';
import { useSelector } from 'react-redux';

import { useSelectedReportAndFight } from '../ReportFightContext';
import { selectSelectedTargetId } from '../store/ui/uiSelectors';

import { useReportData, useReportMasterData } from '.';

export function useSelectedTargetIds(): Set<string> {
  const { fightId } = useSelectedReportAndFight();
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportData } = useReportData();
  const { reportMasterData } = useReportMasterData();

  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === fightId);
  }, [reportData?.fights, fightId]);

  const [targetIds, setTargetIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let newTargetIds: Set<string>;

    if (selectedTargetId) {
      newTargetIds = new Set([selectedTargetId]);
    } else if (!fight?.enemyNPCs) {
      newTargetIds = new Set();
    } else {
      newTargetIds = new Set(
        fight.enemyNPCs
          .filter((npc): npc is { id: number } => {
            if (!npc?.id) {
              return false;
            }

            const actor = reportMasterData?.actorsById?.[npc.id];
            return actor && actor.subType === 'Boss';
          })
          .map((npc) => npc.id.toString())
      );
    }

    // Only update state if the set contents have actually changed
    const currentTargetIdsArray = Array.from(targetIds).sort();
    const newTargetIdsArray = Array.from(newTargetIds).sort();

    if (
      currentTargetIdsArray.length !== newTargetIdsArray.length ||
      !currentTargetIdsArray.every((id, index) => id === newTargetIdsArray[index])
    ) {
      setTargetIds(newTargetIds);
    }
  }, [fight?.enemyNPCs, reportMasterData?.actorsById, selectedTargetId, targetIds]);

  return targetIds;
}
