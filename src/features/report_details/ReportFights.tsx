import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { ReportFightsView } from './ReportFightsView';

export const ReportFights: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportData, isReportLoading } = useReportData();

  return (
    <ReportFightsView
      fights={(reportData?.fights?.filter(Boolean) as FightFragment[]) || []}
      loading={isReportLoading}
      fightId={fightId || undefined}
      reportId={reportId || undefined}
      reportStartTime={reportData?.startTime ?? null}
    />
  );
};
