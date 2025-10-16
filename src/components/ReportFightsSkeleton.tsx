import { Box, Paper, Skeleton } from '@mui/material';
import React from 'react';

interface ReportFightsSkeletonProps {
  /** Number of trial instances to show. Note: This parameter is currently unused as we always show a single section */
  instanceCount?: number;
  /** Test ID for testing */
  'data-testid'?: string;
}

export const ReportFightsSkeleton: React.FC<ReportFightsSkeletonProps> = ({
  instanceCount: _instanceCount,
  'data-testid': dataTestId,
}) => {
  return (
    <Paper
      elevation={0}
      square
      data-testid={dataTestId}
      sx={{
        p: 0,
        m: 0,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        background: 'transparent',
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          backgroundColor: 'background.paper',
          borderRadius: { xs: 0, sm: 1 },
          boxShadow: 2,
        }}
      >
        {/* Report Title Skeleton */}
        <Skeleton
          variant="text"
          width={300}
          height={32}
          animation={false}
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            mb: { xs: '1.5rem', sm: '2rem' },
            mt: { xs: 0, sm: '-2.7rem' },
          }}
        />

        {/* Single Always-Open Trial Section */}
        <Box
          sx={{
            mb: 3,
            '&:before': { display: 'none' },
          }}
        >
          {/* Trial Header (always visible, no accordion) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', sm: '1fr auto' },
              alignItems: 'center',
              width: '100%',
              gap: { xs: 1, sm: 2 },
              pr: 2,
              mb: 3,
              p: 2,
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'background.paper',
            }}
          >
            {/* Trial Name and Difficulty */}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Skeleton variant="text" width={180} height={24} animation={false} />
                <Skeleton variant="rounded" width={80} height={20} animation={false} />
              </Box>
            </Box>
            {/* Kill Counter Circle */}
            <Skeleton variant="circular" width={20} height={20} animation={false} />
          </Box>

          {/* Boss Encounters (always visible) */}
          {Array.from({ length: Math.floor(Math.random() * 3) + 3 }).map((_, encounterIndex) => (
            <Box
              key={encounterIndex}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.0)',
                overflow: 'visible',
              }}
            >
              {/* Encounter Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={32} height={32} animation={false} />
                  <Skeleton variant="text" width={120} height={20} animation={false} />
                </Box>
                {/* Trash toggle (shown randomly) */}
                {Math.random() > 0.5 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="text" width={30} height={16} animation={false} />
                    <Skeleton variant="rounded" width={40} height={24} animation={false} />
                  </Box>
                )}
              </Box>

              {/* Fight Cards Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 1,
                }}
              >
                {/* Generate 2-5 fight cards per encounter */}
                {Array.from({ length: Math.floor(Math.random() * 4) + 2 }).map((_, cardIndex) => (
                  <Box
                    key={cardIndex}
                    sx={{
                      width: '100%',
                      height: 64,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fight card background gradient effect */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: '20%', // Show partial fill to simulate wipe/kill states
                        background: `linear-gradient(90deg, rgba(76, 217, 100, 0.1) 0%, rgba(94, 234, 255, 0.1) 100%)`,
                        borderRadius: 1,
                      }}
                    />
                    {/* Status badge skeleton */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -120%)',
                      }}
                    >
                      <Skeleton variant="rounded" width={24} height={16} animation={false} />
                    </Box>
                    {/* Time/duration skeleton */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <Skeleton variant="text" width={60} height={12} animation={false} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
