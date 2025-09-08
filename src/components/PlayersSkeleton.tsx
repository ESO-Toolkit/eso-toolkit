import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import React from 'react';

interface PlayersSkeletonProps {
  showHeader?: boolean;
}

export const PlayersSkeleton: React.FC<PlayersSkeletonProps> = ({ showHeader = true }) => {
  return (
    <Box sx={{ p: 2 }}>
      {showHeader && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}
          >
            Players
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '0.85rem',
              letterSpacing: '0.02em',
            }}
          >
            <Skeleton variant="text" width={60} height={16} sx={{ display: 'inline-block' }} />
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'stretch',
          minHeight: '400px',
        }}
      >
        {/* Generate 4 player card skeletons (typical party size) */}
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} sx={{ marginBottom: 2, minHeight: 380, height: '100%' }}>
            <CardContent
              sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* Player header section */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1.5 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" height={22} width="45%" sx={{ mb: 0.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Skeleton variant="circular" width={16} height={16} />
                    <Skeleton variant="text" height={14} width="20%" />
                  </Box>
                </Box>
              </Box>

              {/* Class/skill line info */}
              <Box sx={{ mb: 1.5 }}>
                <Skeleton variant="text" height={16} width="70%" sx={{ mb: 0.5 }} />
                <Skeleton variant="text" height={14} width="50%" />
              </Box>

              {/* Abilities/talents grid - 2 rows of 6 */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.25, mb: 1.25 }}>
                  {Array.from({ length: 6 }).map((_, abilityIndex) => (
                    <Skeleton
                      key={abilityIndex}
                      variant="rounded"
                      width={abilityIndex === 5 ? 34 : 32}
                      height={abilityIndex === 5 ? 34 : 32}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25 }}>
                  {Array.from({ length: 6 }).map((_, abilityIndex) => (
                    <Skeleton key={abilityIndex + 6} variant="rounded" width={32} height={32} />
                  ))}
                </Box>
              </Box>

              {/* Gear chips */}
              <Box sx={{ mb: 1.5, pt: 0.9, pb: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, minHeight: 48 }}>
                  <Skeleton variant="rounded" height={24} width={80} />
                  <Skeleton variant="rounded" height={24} width={100} />
                  <Skeleton variant="rounded" height={24} width={90} />
                  <Skeleton variant="rounded" height={24} width={70} />
                </Box>
              </Box>

              {/* Bottom status section */}
              <Box
                sx={{
                  mt: 'auto',
                  p: 1,
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 1,
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  minHeight: 120,
                }}
              >
                {/* Mundus and stats row */}
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', minHeight: 28 }}>
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <Skeleton variant="rounded" height={20} width={60} />
                  </Box>
                  <Skeleton variant="text" height={16} width="40%" />
                </Box>

                {/* Notable auras */}
                <Box sx={{ mb: 1 }}>
                  <Skeleton variant="text" height={16} width="35%" sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, minHeight: 24 }}>
                    <Skeleton variant="rounded" height={24} width={70} />
                    <Skeleton variant="rounded" height={24} width={80} />
                    <Skeleton variant="rounded" height={24} width={60} />
                  </Box>
                </Box>

                {/* Champion points */}
                <Box>
                  <Skeleton variant="text" height={16} width="40%" sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, minHeight: 24 }}>
                    <Skeleton variant="rounded" height={24} width={90} />
                    <Skeleton variant="rounded" height={24} width={85} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
