import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { ReportFightDetailsView } from './ReportFightDetailsView';

export const ReportFightDetails: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();
  const [searchParams] = useSearchParams();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { reportData, isReportLoading } = useReportData();

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  // Get selectedTabId from query param if present
  const selectedTabId = searchParams.has('selectedTabId')
    ? Number(searchParams.get('selectedTabId'))
    : undefined;

  return (
    <ReportFightDetailsView
      fight={fight}
      fightsLoading={isReportLoading}
      selectedTabId={selectedTabId}
      reportId={reportId || undefined}
      fightId={fightId || undefined}
    />
  );
};
