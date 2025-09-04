import React from 'react';

import { DynamicMetaTags, generateReportMetaTags } from '../../components/DynamicMetaTags';
import { useReportData } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { FightReplayView } from './FightReplayView';

import { APPLICATION_NAME } from '@/Constants';

export const FightReplay: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get report data
  const { reportData, isReportLoading } = useReportData();

  // Find the specific fight
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && fight) {
      return generateReportMetaTags(
        reportId,
        `${fight.name} - Replay`,
        undefined, // playerName
        undefined, // dps
        fight.endTime - fight.startTime,
      );
    }
    return null;
  }, [reportId, fight]);

  React.useEffect(() => {
    if (reportData?.title && fight) {
      document.title = `${fight.name} Replay - ${reportData.title} - ${APPLICATION_NAME}`;
    } else {
      document.title = `Fight Replay - ${APPLICATION_NAME}`;
    }
  }, [reportData?.title, fight]);

  if (!fight && !isReportLoading) {
    return (
      <div>
        <h2>Fight not found</h2>
        <p>The requested fight could not be found in this report.</p>
      </div>
    );
  }

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <FightReplayView
        fight={fight || undefined}
        fightsLoading={isReportLoading}
        reportId={reportId || undefined}
        fightId={fightId || undefined}
      />
    </>
  );
};
