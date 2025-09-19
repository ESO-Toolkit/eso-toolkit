import React from 'react';
import { useParams } from 'react-router-dom';

import { useLiveLogData } from '../../hooks/useLiveLogData';

import { DashboardContextProvider } from './DashboardContextProvider';
import { RaidDashboard } from './RaidDashboard';

/**
 * Standalone dashboard page that uses the latest fight from a report
 * Route: /report/:reportId/dashboard
 */
export const ReportDashboard: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { latestFightId, isPolling } = useLiveLogData(reportId);

  if (!reportId) {
    return <div>Report ID is required</div>;
  }

  if (!latestFightId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading latest fight...</div>
        {!isPolling && <div>Unable to find fights in this report.</div>}
      </div>
    );
  }

  return (
    <DashboardContextProvider reportId={reportId} fightId={latestFightId}>
      <RaidDashboard />
    </DashboardContextProvider>
  );
};
