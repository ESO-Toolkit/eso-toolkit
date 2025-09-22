import React from 'react';

import { APPLICATION_NAME } from '@/Constants';

import { DynamicMetaTags, generateReportMetaTags } from '../../components/DynamicMetaTags';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { ReportFightDetailsView } from './ReportFightDetailsView';

export const ReportFightDetails: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId, tabId } = useSelectedReportAndFight();

  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { reportData, isReportLoading } = useReportData();

  // FIXED: Memoize fight lookup to prevent infinite renders in child components
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && fight) {
      return generateReportMetaTags(
        reportId,
        fight.name,
        undefined, // playerName - could be added later for player-specific views
        undefined, // dps - could be calculated from fight data
        fight.endTime - fight.startTime,
      );
    }
    return null;
  }, [reportId, fight]);

  React.useEffect(() => {
    if (reportData?.title) {
      document.title = `${reportData.title} - ${APPLICATION_NAME}`;
    } else {
      document.title = `Untitled Report - ${APPLICATION_NAME}`;
    }
  }, [reportData?.title]);

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <ReportFightDetailsView
        fight={fight}
        fightsLoading={isReportLoading}
        reportId={reportId || undefined}
        fightId={fightId || undefined}
        tabId={tabId || undefined}
      />
    </>
  );
};
