import React from 'react';

import { useReportData, useSelectedTabId } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { ReportFightDetailsView } from './ReportFightDetailsView';

import { APPLICATION_NAME } from '@/Constants';

export const ReportFightDetails: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { reportData, isReportLoading } = useReportData();

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  React.useEffect(() => {
    if (reportData?.title) {
      document.title = `${reportData.title} - ${APPLICATION_NAME}`;
    } else {
      document.title = `Untitled Report - ${APPLICATION_NAME}`;
    }
  }, [reportData?.title]);

  // Get selectedTabId from UI state and URL query params
  const selectedTabId = useSelectedTabId();

  return (
    <ReportFightDetailsView
      fight={fight}
      fightsLoading={isReportLoading}
      selectedTabId={selectedTabId ?? undefined}
      reportId={reportId || undefined}
      fightId={fightId || undefined}
    />
  );
};
