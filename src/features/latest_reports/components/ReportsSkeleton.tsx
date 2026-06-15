import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

import type { ReportViewMode } from '../hooks/useReportViewPrefs';

interface ReportsSkeletonProps {
  viewMode: ReportViewMode;
  isDesktop: boolean;
  rows?: number;
}

/** Loading placeholder sized to the active layout, to avoid layout shift. */
export const ReportsSkeleton: React.FC<ReportsSkeletonProps> = ({
  viewMode,
  isDesktop,
  rows = 8,
}) => {
  if (viewMode === 'cards' || !isDesktop) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(300px, 1fr))' },
          gap: 2,
        }}
      >
        {Array.from({ length: rows }).map((_, index) => (
          <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Skeleton variant="text" width="70%" height={26} />
            <Skeleton variant="text" width="40%" height={16} sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Skeleton variant="text" width={80} height={32} />
              <Skeleton variant="text" width={80} height={32} />
              <Skeleton variant="text" width={80} height={32} />
            </Box>
          </Paper>
        ))}
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            borderBottom: index < rows - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={`${28 + ((index * 11) % 20)}%`} height={18} />
          <Skeleton variant="text" width={120} height={18} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="text" width={60} height={18} />
          <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: '6px' }} />
        </Box>
      ))}
    </Paper>
  );
};
