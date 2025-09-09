import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

interface DamageReductionSkeletonProps {
  playerCount?: number;
}

export const DamageReductionSkeleton: React.FC<DamageReductionSkeletonProps> = ({
  playerCount = 8,
}) => {
  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
      {/* Title */}
      <Skeleton
        variant="text"
        width="320px"
        height={40}
        sx={{ mb: 2, fontFamily: 'Space Grotesk, sans-serif' }}
      />

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

              {/* Damage Reduction Metrics */}
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Skeleton variant="rectangular" width={110} height={24} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rectangular" width={95} height={24} sx={{ borderRadius: 12 }} />
              </Box>

              {/* Expand Icon */}
              <Skeleton variant="circular" width={24} height={24} />
            </Box>

            {/* Expanded Content (shown for first player) */}
            {index === 0 && (
              <Box sx={{ p: 2 }}>
                {/* Damage Reduction Chart */}
                <Box sx={{ mb: 3 }}>
                  <Skeleton variant="text" width="220px" height={20} sx={{ mb: 1 }} />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={300}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>

                {/* Summary Stats */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 2,
                    mb: 3,
                  }}
                >
                  {Array.from({ length: 4 }).map((_, statIndex) => (
                    <Box
                      key={statIndex}
                      sx={{ p: 2, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}
                    >
                      <Skeleton variant="text" width="120px" height={16} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="80px" height={24} />
                    </Box>
                  ))}
                </Box>

                {/* Damage Reduction Sources */}
                <Box sx={{ mb: 3 }}>
                  <Skeleton variant="text" width="240px" height={20} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 6 }).map((_, sourceIndex) => (
                      <Box
                        key={sourceIndex}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}
                      >
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width="200px" height={16} />
                        <Skeleton variant="text" width="60px" height={16} />
                        <Skeleton
                          variant="rectangular"
                          width="80px"
                          height={12}
                          sx={{ borderRadius: 6 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Damage Timeline */}
                <Box>
                  <Skeleton variant="text" width="180px" height={20} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: 8 }).map((_, eventIndex) => (
                      <Box
                        key={eventIndex}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}
                      >
                        <Skeleton variant="text" width="60px" height={14} />
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="text" width="150px" height={14} />
                        <Skeleton variant="text" width="70px" height={14} />
                        <Skeleton variant="text" width="50px" height={14} />
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
