import React from 'react';

import { DynamicMetaTags } from '../../components/DynamicMetaTags';
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

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && reportData) {
      const title = `${reportData.title || reportId} - Report Analysis`;
      const fightsCount = memoizedFights.length;
      const duration = reportData.endTime - reportData.startTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      const description = `ESO combat log analysis for ${fightsCount} encounter${fightsCount !== 1 ? 's' : ''}. ` +
        `Total duration: ${minutes}:${seconds.toString().padStart(2, '0')}. ` +
        `View detailed damage, healing, and performance metrics.`;
      
      return {
        title,
        description,
        url: `${window.location.origin}${window.location.pathname}#${window.location.hash}`,
        type: 'website' as const,
      };
    }
    return null;
  }, [reportId, reportData, memoizedFights]);

  if (isReportLoading) {
    return (
      <>
        {metaTags && <DynamicMetaTags {...metaTags} />}
        <ReportFightsView
          fights={undefined}
          loading={isReportLoading}
          fightId={fightId}
          reportId={reportId}
          reportStartTime={reportData?.startTime}
          reportData={reportData}
        />
      </>
    );
  }

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <ReportFightsView
        fights={memoizedFights}
        loading={isReportLoading}
        fightId={fightId}
        reportId={reportId}
        reportStartTime={reportData?.startTime}
        reportData={reportData}
      />
    </>
  );
};
