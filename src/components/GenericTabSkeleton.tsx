import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

interface GenericTabSkeletonProps {
  title?: string;
  showChart?: boolean;
  chartHeight?: number;
  showTable?: boolean;
  tableRows?: number;
}

export const GenericTabSkeleton: React.FC<GenericTabSkeletonProps> = ({
  title = "Loading...",
  showChart = false,
  chartHeight = 300,
  showTable = true,
  tableRows = 8,
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Skeleton variant="text" width="200px" height={28} sx={{ mb: 2 }} />
        
        {showChart && (
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" width="100%" height={chartHeight} sx={{ borderRadius: 1 }} />
          </Box>
        )}
        
        {showTable && (
          <Box>
            {/* Table header */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1, pb: 1, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
              <Skeleton variant="text" width="30%" height={20} />
              <Skeleton variant="text" width="20%" height={20} />
              <Skeleton variant="text" width="15%" height={20} />
              <Skeleton variant="text" width="15%" height={20} />
              <Skeleton variant="text" width="20%" height={20} />
            </Box>
            
            {/* Table rows */}
            {Array.from({ length: tableRows }).map((_, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="text" width="25%" height={16} />
                <Skeleton variant="text" width="15%" height={16} />
                <Skeleton variant="text" width="12%" height={16} />
                <Skeleton variant="text" width="18%" height={16} />
                <Skeleton variant="rectangular" width="25%" height={8} sx={{ borderRadius: 999 }} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};