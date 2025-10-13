import { Box, Skeleton } from '@mui/material';
import React from 'react';

interface StableLoadingProps {
  height?: number | string;
  width?: number | string;
  variant?: 'chart' | 'table' | 'card' | 'panel';
  title?: string;
  _title?: string; // Unused title prop
  /** Test ID for testing */
  'data-testid'?: string;
}

export const StableLoading: React.FC<StableLoadingProps> = ({
  height = 400,
  width = '100%',
  variant = 'panel',
  _title = 'Loading...',
  'data-testid': dataTestId = 'stable-loading',
}) => {
  const getContent = (): React.ReactElement => {
    switch (variant) {
      case 'chart':
        return (
          <Box sx={{ p: 2, width, height, display: 'flex', flexDirection: 'column' }}>
            <Skeleton variant="text" height={32} width="40%" sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height="100%" width="100%" sx={{ borderRadius: 1 }} />
          </Box>
        );

      case 'table':
        return (
          <Box sx={{ p: 2, width, minHeight: height }}>
            <Skeleton variant="text" height={32} width="40%" sx={{ mb: 2 }} />
            {/* Table header */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 1,
                pb: 1,
                borderBottom: '1px solid rgba(0,0,0,0.12)',
              }}
            >
              <Skeleton variant="text" width="30%" height={20} />
              <Skeleton variant="text" width="20%" height={20} />
              <Skeleton variant="text" width="15%" height={20} />
              <Skeleton variant="text" width="15%" height={20} />
              <Skeleton variant="text" width="20%" height={20} />
            </Box>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1.5 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="text" width="25%" height={16} />
                <Skeleton variant="text" width="15%" height={16} />
                <Skeleton variant="text" width="12%" height={16} />
                <Skeleton variant="text" width="18%" height={16} />
                <Skeleton variant="rectangular" width="25%" height={8} sx={{ borderRadius: 999 }} />
              </Box>
            ))}
          </Box>
        );

      case 'card':
        return (
          <Box
            sx={{
              p: 2,
              width,
              minHeight: height,
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" height={24} width="60%" />
                <Skeleton variant="text" height={16} width="40%" />
              </Box>
            </Box>
            <Skeleton variant="rectangular" height="60%" width="100%" sx={{ borderRadius: 1 }} />
          </Box>
        );

      case 'panel':
      default:
        return (
          <Box sx={{ p: 2, width, minHeight: height }}>
            <Skeleton variant="text" height={32} width="50%" sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height="80%" width="100%" sx={{ borderRadius: 1 }} />
          </Box>
        );
    }
  };

  return (
    <Box data-testid={dataTestId} sx={{ width, minHeight: height, display: 'flex', flexDirection: 'column' }}>
      {getContent()}
    </Box>
  );
};
