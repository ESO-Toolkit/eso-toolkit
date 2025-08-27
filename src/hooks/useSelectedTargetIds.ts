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

  return React.useMemo(() => {
    if (selectedTargetId) {
      return new Set([selectedTargetId]);
    }

    if (!fight?.enemyNPCs) {
      return new Set();
    }

    return new Set(
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
  }, [fight?.enemyNPCs, reportMasterData?.actorsById, selectedTargetId]);
}
