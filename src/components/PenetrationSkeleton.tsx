import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

interface PenetrationSkeletonProps {
  playerCount?: number;
  showNoTargetsState?: boolean;
}

export const PenetrationSkeleton: React.FC<PenetrationSkeletonProps> = ({
  playerCount = 8,
  showNoTargetsState = false,
}) => {
  if (showNoTargetsState) {
    return (
      <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
        {/* Title */}
        <Skeleton
          variant="text"
          width="240px"
          height={40}
          sx={{ mb: 2, fontFamily: 'Space Grotesk, sans-serif' }}
        />

        {/* No targets alert skeleton */}
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
      {/* Title */}
      <Skeleton
        variant="text"
        width="240px"
        height={40}
        sx={{ mb: 2, fontFamily: 'Space Grotesk, sans-serif' }}
      />

      {/* Description text */}
      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />

      {/* Player Accordion List */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {Array.from({ length: playerCount }).map((_, index) => (
          <Paper
            key={index}
            elevation={1}
            sx={{
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {/* Accordion Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Player Icon */}
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />

              {/* Player Name */}
              <Skeleton variant="text" width="140px" height={24} sx={{ mr: 'auto' }} />

              {/* Penetration Metrics */}
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Skeleton variant="rectangular" width={90} height={24} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rectangular" width={85} height={24} sx={{ borderRadius: 12 }} />
              </Box>

              {/* Expand Icon */}
              <Skeleton variant="circular" width={24} height={24} />
            </Box>

            {/* Expanded Content (shown for first player) */}
            {index === 0 && (
              <Box sx={{ p: 2 }}>
                {/* Target Selection */}
                <Box sx={{ mb: 3 }}>
                  <Skeleton variant="text" width="120px" height={20} sx={{ mb: 1 }} />
                  <Skeleton
                    variant="rectangular"
                    width="200px"
                    height={40}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>

                {/* Penetration Details Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
                  <Box>
                    <Skeleton variant="text" width="140px" height={20} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Array.from({ length: 4 }).map((_, statIndex) => (
                        <Box
                          key={statIndex}
                          sx={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                          <Skeleton variant="text" width="120px" height={16} />
                          <Skeleton variant="text" width="60px" height={16} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Skeleton variant="text" width="160px" height={20} sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Array.from({ length: 4 }).map((_, statIndex) => (
                        <Box
                          key={statIndex}
                          sx={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                          <Skeleton variant="text" width="140px" height={16} />
                          <Skeleton variant="text" width="50px" height={16} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>

                {/* Penetration Sources */}
                <Box>
                  <Skeleton variant="text" width="180px" height={20} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 5 }).map((_, sourceIndex) => (
                      <Box
                        key={sourceIndex}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}
                      >
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width="160px" height={16} />
                        <Skeleton variant="text" width="70px" height={16} />
                        <Skeleton variant="circular" width={16} height={16} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
