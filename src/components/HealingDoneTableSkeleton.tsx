import { Box, Skeleton } from '@mui/material';
import React from 'react';

interface HealingDoneTableSkeletonProps {
  rowCount?: number;
  /** Test ID for testing */
  'data-testid'?: string;
}

export const HealingDoneTableSkeleton: React.FC<HealingDoneTableSkeletonProps> = ({
  rowCount = 8,
  'data-testid': dataTestId = 'healing-done-table-skeleton',
}) => {
  return (
    <Box data-testid={dataTestId}>
      {/* Title Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Skeleton variant="text" width="200px" height={28} />
        <Skeleton variant="text" width="180px" height={20} />
      </Box>

      {/* Mobile Sort Controls */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rectangular" width={90} height={32} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rectangular" width={70} height={32} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: '12px' }} />
      </Box>

      {/* Table */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '25px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow:
            '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'grid' },
            gridTemplateColumns: '2fr 3fr 1fr 1fr',
            gap: 2,
            p: 1.5,
            backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '25px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow:
              '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
            background:
              'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)',
          }}
        >
          <Skeleton variant="text" width="60px" height={20} />
          <Skeleton variant="text" width="80px" height={20} />
          <Skeleton variant="text" width="50px" height={20} />
          <Skeleton variant="text" width="70px" height={20} />
        </Box>

        {/* Desktop Data Rows */}
        {Array.from({ length: rowCount }).map((_, index) => (
          <Box
            key={index}
            sx={{
              display: { xs: 'none', sm: 'grid' },
              gridTemplateColumns: '2fr 3fr 1fr 1fr',
              gap: 2,
              p: 1.5,
              backgroundColor: 'transparent',
              borderBottom: index < rowCount - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width="100px" height={16} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <Skeleton variant="text" width="40px" height={16} />
              <Box sx={{ flex: 1, minWidth: '80px' }}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={8}
                  sx={{ borderRadius: 999 }}
                />
              </Box>
              <Skeleton variant="text" width="60px" height={16} />
            </Box>

            <Skeleton variant="text" width="50px" height={16} />
            <Skeleton variant="text" width="60px" height={16} />
          </Box>
        ))}

        {/* Mobile Card Layout */}
        {Array.from({ length: Math.min(rowCount, 5) }).map((_, index) => (
          <Box
            key={`mobile-${index}`}
            sx={{
              display: { xs: 'block', sm: 'none' },
              p: 2,
              backgroundColor: 'transparent',
              borderBottom: index < rowCount - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="text" width="100px" height={16} />
              </Box>
              <Skeleton variant="text" width="70px" height={16} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Skeleton variant="text" width="40px" height={14} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={6}
                  sx={{ borderRadius: 999 }}
                />
              </Box>
              <Skeleton variant="text" width="60px" height={14} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton variant="text" width="80px" height={14} />
              <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 12 }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
