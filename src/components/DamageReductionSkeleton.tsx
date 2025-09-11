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
        sx={{
          mb: 2,
          fontFamily: 'Space Grotesk, sans-serif',
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.08) 100%)',
        }}
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
              borderRadius: 2,
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.02)',
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
                minHeight: 72,
              }}
            >
              {/* Player Icon */}
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                sx={{
                  mr: 2,
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 100%)',
                }}
              />

              {/* Player Name */}
              <Skeleton
                variant="text"
                width={140}
                height={28}
                sx={{
                  mr: 'auto',
                  background:
                    'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.08) 100%)',
                }}
              />

              {/* Damage Reduction Metrics */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
                <Skeleton
                  variant="rectangular"
                  width={95}
                  height={24}
                  sx={{
                    borderRadius: 12,
                    background:
                      'linear-gradient(90deg, rgba(244, 67, 54, 0.2) 0%, rgba(244, 67, 54, 0.3) 100%)',
                  }}
                />
                <Skeleton
                  variant="rectangular"
                  width={85}
                  height={24}
                  sx={{
                    borderRadius: 12,
                    background:
                      'linear-gradient(90deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 152, 0, 0.3) 100%)',
                  }}
                />
                <Skeleton
                  variant="rectangular"
                  width={75}
                  height={24}
                  sx={{
                    borderRadius: 12,
                    background:
                      'linear-gradient(90deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.3) 100%)',
                  }}
                />
              </Box>

              {/* Expand Icon */}
              <Skeleton
                variant="circular"
                width={24}
                height={24}
                sx={{
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 100%)',
                }}
              />
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
