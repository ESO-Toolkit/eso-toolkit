import React from 'react';

import { DynamicMetaTags, generateReportMetaTags } from '../../components/DynamicMetaTags';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { DamageAnalysisView } from './DamageAnalysisView';

import { APPLICATION_NAME } from '@/Constants';

export const DamageAnalysis: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get report data using existing hook
  const { reportData, isReportLoading } = useReportData();

  // Find the selected fight
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && fight) {
      return generateReportMetaTags(
        reportId,
        `${fight.name} - Damage Analysis`,
        undefined, // playerName - could be added later for player-specific views
        undefined, // dps - could be calculated from fight data
        fight.endTime - fight.startTime,
      );
    }
    return null;
  }, [reportId, fight]);

  React.useEffect(() => {
    if (reportData?.title && fight) {
      document.title = `${reportData.title} - ${fight.name} - Damage Analysis - ${APPLICATION_NAME}`;
    } else {
      document.title = `Damage Analysis - ${APPLICATION_NAME}`;
    }
  }, [reportData?.title, fight]);

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <DamageAnalysisView
        fight={fight}
        fightsLoading={isReportLoading}
        reportId={reportId || undefined}
        fightId={fightId || undefined}
      />
    </>
  );
};
