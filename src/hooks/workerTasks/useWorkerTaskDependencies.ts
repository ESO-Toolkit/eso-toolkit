import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { FightFragment } from '../../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { selectReportFights } from '../../store/report/reportSelectors';
import { useAppDispatch } from '../../store/useAppDispatch';

// Helper hook to get selected fight and basic dependencies for worker tasks
export function useWorkerTaskDependencies(): {
  dispatch: ReturnType<typeof useAppDispatch>;
  reportId: string | null;
  fightId: string | null;
  selectedFight: FightFragment | null;
  client: ReturnType<typeof useEsoLogsClientInstance>;
} {
  const dispatch = useAppDispatch();
  const { reportId, fightId } = useSelectedReportAndFight();
  const fights = useSelector(selectReportFights);
  const client = useEsoLogsClientInstance();

  // Get the specific fight from the report data
  const selectedFight = React.useMemo(() => {
    if (!fightId || !fights) return null;
    const fightIdNumber = parseInt(fightId, 10);
    return fights.find((fight) => fight && fight.id === fightIdNumber) || null;
  }, [fightId, fights]);

  return {
    dispatch,
    reportId,
    fightId,
    selectedFight,
    client,
  };
}
