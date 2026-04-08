import { Box, Card, CardContent, Skeleton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import { ReportActionBar } from './ReportActionBar';

interface ReportFightsSkeletonProps {
  /** Number of trial instances to show */
  instanceCount?: number;
  /** Test ID for testing */
  'data-testid'?: string;
  /**
   * Encounter configs: [bossNameWidth, cardCount] tuples.
   * Pass from previous report data for an accurate skeleton on re-loads.
   */
  encounters?: Array<[number, number]>;
}

const DEFAULT_ENCOUNTERS: Array<[number, number]> = [
  [130, 3],
  [110, 2],
  [150, 4],
  [120, 3],
];

/**
 * Skeleton placeholder for the ReportFightsView.
 * Renders the real ReportActionBar + matching Card → trial header → encounter → fight-card grid.
 */
export const ReportFightsSkeleton: React.FC<ReportFightsSkeletonProps> = ({
  instanceCount: _instanceCount,
  'data-testid': dataTestId,
  encounters = DEFAULT_ENCOUNTERS,
}) => {
  return (
    <>
      {/* Real ReportActionBar with placeholder title */}
      <ReportActionBar reportId="" title="Loading Report..." activePage="fights" />

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
          boxShadow: (t: Theme) => (t.palette.mode === 'dark' ? t.shadows[6] : t.shadows[4]),
          overflow: 'visible',
        }}
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 4 },
            overflow: 'visible',
            position: 'relative',
          }}
        >
          {/* Single trial section */}
          <Box sx={{ mb: 2 }}>
            {/* Trial Header — matches ReportFightsView trial header exactly */}
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
                border: (t: Theme) => `1px solid ${t.palette.divider}`,
                background: (t: Theme) =>
                  t.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.66) 0%, rgba(3, 7, 18, 0.66) 100%)'
                    : t.palette.background.paper,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: (t: Theme) =>
                  t.palette.mode === 'dark'
                    ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                    : '0 2px 8px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Trial Name + Difficulty badge */}
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  }}
                >
                  <Skeleton
                    variant="text"
                    width={160}
                    sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                  />
                  <Skeleton
                    variant="rounded"
                    width={80}
                    height={24}
                    sx={{ borderRadius: 1, flexShrink: 0 }}
                  />
                </Box>
              </Box>
              {/* Kill counter circle — styled like the real one */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: (t: Theme) =>
                    `2px solid ${t.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Skeleton variant="text" width={10} height={14} />
              </Box>
            </Box>

            {/* Encounters */}
            {encounters.map(([nameWidth, cardCount], encounterIndex) => (
              <Box key={encounterIndex} sx={{ mb: 2, p: 2, borderRadius: 2, overflow: 'visible' }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Skeleton variant="text" width={nameWidth} height={20} />
                      <Skeleton
                        variant="text"
                        width={70}
                        height={18}
                        sx={{
                          color: (t: Theme) => (t.palette.mode === 'dark' ? '#d2e5ff' : '#64748b'),
                        }}
                      />
                      <Skeleton variant="text" width={20} height={18} />
                    </Box>
                  </Box>
                  {/* Trash toggle on alternate encounters */}
                  {encounterIndex % 2 === 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                      <Skeleton
                        variant="rounded"
                        width={34}
                        height={20}
                        sx={{ borderRadius: 10 }}
                      />
                      <Skeleton variant="text" width={30} height={16} />
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
                    overflow: 'visible',
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

/** Skeleton for a single fight card — mirrors the 3-zone layout of real cards with muted tones. */
const FightCardSkeleton: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: { xs: 82, sm: 88 },
      borderRadius: '8px',
      border: '1px solid',
      borderColor: (t: Theme) =>
        t.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.18)',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: (t: Theme) =>
        t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
  >
    {/* Left accent bar — muted */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 3,
        background: (t: Theme) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.3) 20%, rgba(148,163,184,0.3) 80%, transparent 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(148,163,184,0.25) 20%, rgba(148,163,184,0.25) 80%, transparent 100%)',
        zIndex: 3,
      }}
    />
    {/* HUD corner accents — top-left */}
    <Box
      sx={{
        position: 'absolute',
        top: 3,
        left: 5,
        width: 6,
        height: 6,
        borderTop: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.15)'}`,
        borderLeft: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.15)'}`,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
    {/* HUD corner accents — bottom-right */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 3,
        right: 5,
        width: 6,
        height: 6,
        borderBottom: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.1)'}`,
        borderRight: (t: Theme) =>
          `1px solid ${t.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.1)'}`,
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
        <Skeleton variant="text" width={18} sx={{ fontSize: '0.72rem' }} />
        <Skeleton variant="rounded" width={32} height={16} sx={{ borderRadius: '3px' }} />
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
        <Skeleton variant="text" width={70} sx={{ fontSize: { xs: '1.35rem', sm: '1.55rem' } }} />
      </Box>

      {/* Zone C: Data strip — timestamp + player count + micro-bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
        }}
      >
        <Skeleton variant="text" width={48} sx={{ fontSize: '0.65rem', flexShrink: 0 }} />
        <Skeleton
          variant="text"
          width={16}
          sx={{ fontSize: '0.6rem', display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
        />
        <Skeleton
          variant="rounded"
          width={28}
          height={3}
          sx={{ borderRadius: '1.5px', flexShrink: 0 }}
        />
      </Box>
    </Box>
  </Box>
);
