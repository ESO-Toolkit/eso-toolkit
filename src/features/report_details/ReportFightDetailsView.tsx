import { Paper, Typography, Box } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useReportData } from '../../hooks';
import { useReportFightDetailsNavigation } from '../../ReportFightContext';
import { TabId, getSkeletonForTab } from '../../utils/getSkeletonForTab';

import { FightDetails } from './FightDetails';
import { ReportFightHeader } from './ReportFightHeader';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined | null;
  fightsLoading: boolean;
  reportId: string | undefined;
  fightId: string | undefined;
  tabId: string | undefined;
}

export const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  fightId,
}) => {
  const { selectedTabId } = useReportFightDetailsNavigation();
  const { reportData } = useReportData();

  // Show skeleton while data is loading to prevent "not found" flash
  // Only show "not found" when we're certain the data has loaded completely
  if (!fight && fightId) {
    // If fights are loading OR if we have no fights data yet, show skeleton
    if (fightsLoading || !reportData?.fights) {
      return (
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}>
          <ReportFightHeader />
          <Box sx={{ mt: { xs: 1, md: 2 }, minHeight: '600px' }}>
            {getSkeletonForTab(selectedTabId || TabId.INSIGHTS, true)}
          </Box>
        </Paper>
      );
    }

    // Only show "not found" when data has loaded but fight doesn't exist
    return <Typography variant="h6">Fight ({fightId}) not found.</Typography>;
  }

  // Render the main layout - this will show even while fight data is loading
  // if we have a fightId, improving LCP performance

  return (
    <Paper
      elevation={2}
      sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}
      data-testid={fight ? 'report-fight-details-loaded' : 'report-fight-details-loading'}
    >
      <ReportFightHeader />

      {fight ? (
        <FightDetails />
      ) : (
        <Box sx={{ mt: { xs: 1, md: 2 }, minHeight: '600px' }}>
          {getSkeletonForTab(selectedTabId || TabId.INSIGHTS, true)}
        </Box>
      )}
    </Paper>
  );
};
