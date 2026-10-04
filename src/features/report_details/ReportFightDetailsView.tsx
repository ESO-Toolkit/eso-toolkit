import { Alert, AlertTitle, Button, Paper, Typography, Box } from '@mui/material';
import React from 'react';

import { FightFragment, ReportFragment } from '../../graphql/gql/graphql';
import { useReportFightDetailsNavigation } from '../../ReportFightContext';
import { TabId, getSkeletonForTab } from '../../utils/getSkeletonForTab';

import { FightDetails } from './FightDetails';
import { ReportFightHeader } from './ReportFightHeader';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined | null;
  fightsLoading: boolean;
  reportData: ReportFragment | null;
  reportError: string | null;
  onRetry: () => void;
  reportId: string | undefined;
  fightId: string | undefined;
  tabId: string | undefined;
}

export const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  reportId,
  fightId,
  reportData,
  reportError,
  onRetry,
}) => {
  const { selectedTabId } = useReportFightDetailsNavigation();

  if (!reportId) {
    return <Typography variant="h6">No report selected.</Typography>;
  }

  if (reportError && !fightsLoading) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        <AlertTitle>Unable to load report</AlertTitle>
        {reportError}
      </Alert>
    );
  }

  // Show skeleton while data is loading to prevent "not found" flash
  // Only show "not found" when we're certain the data has loaded completely
  if (!fight && fightId) {
    // If fights are loading OR if we have no fights data yet, show skeleton
    if (fightsLoading || !reportData) {
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
