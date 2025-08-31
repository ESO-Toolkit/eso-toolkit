import * as React from 'react';
import { useSelector } from 'react-redux';

import { useSelectedReportAndFight } from '../ReportFightContext';
import { selectSelectedTargetId } from '../store/ui/uiSelectors';

import { useReportData } from './useReportData';
import { useReportMasterData } from './useReportMasterData';

export function useSelectedTargetIds(): Set<number> {
  const { fightId } = useSelectedReportAndFight();
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportData } = useReportData();
  const { reportMasterData } = useReportMasterData();

  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === fightId);
  }, [reportData?.fights, fightId]);

  return React.useMemo(() => {
    let newTargetIds: Set<number>;

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
          .map((npc) => npc.id)
      );
    }

    return newTargetIds;
  }, [fight?.enemyNPCs, reportMasterData?.actorsById, selectedTargetId]);
}
