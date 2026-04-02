import { Box, Card, CardContent, Skeleton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

interface ReportFightsSkeletonProps {
  /** Number of trial instances to show */
  instanceCount?: number;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Skeleton placeholder for the ReportFightsView.
 * Mirrors the real layout: outer Card → trial header → encounter sections → fight-card grid.
 */
export const ReportFightsSkeleton: React.FC<ReportFightsSkeletonProps> = ({
  instanceCount: _instanceCount,
  'data-testid': dataTestId,
}) => {
  // Encounter configs: [bossName width, cardCount]
  const encounters: Array<[number, number]> = [
    [130, 3],
    [110, 2],
    [150, 4],
    [120, 3],
  ];

  return (
    <>
      {/* ReportActionBar skeleton */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2,
          px: 1,
        }}
      >
        <Skeleton variant="text" width={220} height={28} />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" width={70} height={28} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>

      <Card
        elevation={4}
        data-testid={dataTestId}
        sx={{
          borderRadius: 2,
          border: (t: Theme) => `1px solid ${t.palette.divider}`,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'visible', position: 'relative' }}>
          {/* Single trial section */}
          <Box sx={{ mb: 2 }}>
            {/* Trial Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                width: '100%',
                gap: { xs: 1, sm: 2 },
                pr: 2,
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: (t: Theme) => `1px solid ${t.palette.divider}`,
                background: (t: Theme) =>
                  t.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.66) 0%, rgba(3, 7, 18, 0.66) 100%)'
                    : t.palette.background.paper,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Skeleton variant="text" width={180} height={28} />
                  <Skeleton variant="rounded" width={80} height={22} sx={{ borderRadius: 1 }} />
                </Box>
              </Box>
              {/* Kill counter circle */}
              <Skeleton variant="circular" width={24} height={24} />
            </Box>

            {/* Encounters */}
            {encounters.map(([nameWidth, cardCount], encounterIndex) => (
              <Box key={encounterIndex} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                {/* Encounter header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="text" width={nameWidth} height={20} />
                  </Box>
                  {/* Trash toggle on alternate encounters */}
                  {encounterIndex % 2 === 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Skeleton variant="text" width={30} height={16} />
                      <Skeleton variant="rounded" width={40} height={24} />
                    </Box>
                  )}
                </Box>

                {/* Fight cards grid — matches real responsive breakpoints */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(auto-fill, minmax(100px, 1fr))',
                      sm: 'repeat(auto-fill, minmax(120px, 1fr))',
                      md: 'repeat(auto-fill, minmax(140px, 1fr))',
                      lg: 'repeat(auto-fill, minmax(160px, 1fr))',
                    },
                    gap: { xs: 0.5, sm: 1 },
                  }}
                >
                  {Array.from({ length: cardCount }).map((_, cardIndex) => (
                    <FightCardSkeleton key={cardIndex} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </>
  );
};

/** Skeleton for a single fight card — mirrors the 3-zone layout of real cards. */
const FightCardSkeleton: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: { xs: 82, sm: 88 },
      borderRadius: '8px',
      border: '1px solid',
      borderColor: (t: Theme) =>
        t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(6, 182, 212, 0.08)',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: (t: Theme) =>
        t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
  >
    {/* Left accent bar */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 3,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(180deg, transparent 0%, rgba(56, 189, 248, 0.4) 20%, rgba(56, 189, 248, 0.4) 80%, transparent 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.3) 20%, rgba(6, 182, 212, 0.3) 80%, transparent 100%)',
        zIndex: 3,
      }}
    />
    {/* HUD corner accents */}
    <Box
      sx={{
        position: 'absolute',
        top: 3,
        left: 5,
        width: 6,
        height: 6,
        borderTop: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(6, 182, 212, 0.2)'}`,
        borderLeft: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(6, 182, 212, 0.2)'}`,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        bottom: 3,
        right: 5,
        width: 6,
        height: 6,
        borderBottom: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(6, 182, 212, 0.12)'}`,
        borderRight: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(6, 182, 212, 0.12)'}`,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
    {/* Interior 3-zone layout */}
    <Box
      sx={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        pl: { xs: 1.25, sm: 1.75 },
        pr: { xs: 0.75, sm: 1 },
        py: { xs: 0.75, sm: 1 },
      }}
    >
      {/* Zone A: Header — pull # + status badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton
          variant="text"
          width={18}
          height={12}
          sx={{ fontSize: '0.72rem' }}
        />
        <Skeleton
          variant="rounded"
          width={30}
          height={14}
          sx={{ borderRadius: '3px' }}
        />
      </Box>

      {/* Zone B: Hero duration */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Skeleton
          variant="text"
          width={60}
          height={24}
          sx={{ fontSize: { xs: '1.35rem', sm: '1.55rem' } }}
        />
      </Box>

      {/* Zone C: Data strip — timestamp + micro-bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={48} height={10} sx={{ fontSize: '0.65rem' }} />
        <Skeleton
          variant="rounded"
          width={28}
          height={3}
          sx={{ borderRadius: '1.5px', display: { xs: 'block', sm: 'block' } }}
        />
      </Box>
    </Box>
  </Box>
);
