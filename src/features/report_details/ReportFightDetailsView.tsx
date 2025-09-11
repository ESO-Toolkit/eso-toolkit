import { Paper, Typography, Box, Stack, Skeleton } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { useSelectedReportAndFight } from '../../ReportFightContext';
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
  const { selectedTabId } = useSelectedReportAndFight();

  // Immediate render strategy: show layout immediately for better LCP
  // Only show full loading state if we don't have a fightId yet
  if (fightsLoading && !fightId) {
    return (
      <Paper elevation={2} sx={{ p: 3, position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={96} height={32} />
          <Skeleton variant="rounded" width={120} height={32} />
        </Box>

        {/* Back to Fight List skeleton */}
        <Skeleton variant="text" width={140} height={24} sx={{ mb: 2 }} />

        {/* Fight title skeleton with exact dimensions */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Skeleton
            variant="text"
            width="450px"
            height="2.7rem"
            sx={{
              // Responsive width and height overrides
              width: { xs: '250px', sm: '350px', md: '450px' },
              height: { xs: '1.8rem', sm: '2.4rem', md: '2.7rem' },
              minHeight: { xs: '1.8rem', sm: '2.4rem', md: '2.7rem' },
              // Use same font properties for consistent sizing
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
            }}
          />
        </Stack>

        <Box sx={{ mt: 2, minHeight: '600px' }}>
          {getSkeletonForTab(selectedTabId || TabId.INSIGHTS, true)}
        </Box>
      </Paper>
    );
  }

  // Render immediately if we have a fightId, even without fight data
  // This improves LCP by showing the layout and title immediately
  if (!fight && !fightsLoading && fightId) {
    return <Typography variant="h6">Fight ({fightId}) not found.</Typography>;
  }

  // Render the main layout - this will show even while fight data is loading
  // if we have a fightId, improving LCP performance

  return (
    <Paper elevation={2} sx={{ p: 3, position: 'relative' }}>
      <ReportFightHeader />

      {fight ? (
        <FightDetails />
      ) : (
        <Box sx={{ mt: 2, minHeight: '600px' }}>
          {getSkeletonForTab(selectedTabId || TabId.INSIGHTS, true)}
        </Box>
      )}
    </Paper>
  );
};
