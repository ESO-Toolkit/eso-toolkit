import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';
import { cleanArray } from '../../utils/cleanArray';

import { ReportFightsView } from './ReportFightsView';

export const ReportFights: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportData, isReportLoading } = useReportData();

  const memoizedFights = React.useMemo<FightFragment[]>((): FightFragment[] => {
    return cleanArray(reportData?.fights?.filter(Boolean));
  }, [reportData]);

  if (isReportLoading) {
    return (
      <ReportFightsView
        fights={[]}
        loading={isReportLoading}
        fightId={fightId}
        reportId={reportId}
      />
    );
  }

  return (
    <ReportFightsView
      fights={memoizedFights}
      loading={isReportLoading}
      fightId={fightId}
      reportId={reportId}
    />
  );
};
