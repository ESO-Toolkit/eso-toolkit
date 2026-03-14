import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

interface PlayersSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

/** Single player card skeleton — mirrors the real PlayerCard layout exactly. */
const PlayerCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      minHeight: 380,
      background:
        'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <CardContent sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header: class icon (rounded) + player name + gear weights + role emoji */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
        <Skeleton variant="rounded" width={40} height={40} sx={{ flexShrink: 0, borderRadius: 1 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="55%" height={22} />
        </Box>
        {/* Gear weights: H•M•L */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
          <Skeleton variant="text" width={14} height={14} />
          <Skeleton variant="text" width={6} height={10} />
          <Skeleton variant="text" width={14} height={14} />
          <Skeleton variant="text" width={6} height={10} />
          <Skeleton variant="text" width={14} height={14} />
        </Box>
        {/* Role emoji */}
        <Skeleton variant="text" width={24} height={28} sx={{ flexShrink: 0 }} />
      </Box>

      {/* Skill lines row (e.g. "Templar • Destruction Staff") */}
      <Box sx={{ mb: 1 }}>
        <Skeleton variant="text" width={`${55 + (index % 3) * 10}%`} height={14} />
      </Box>

      {/* Talents: 2 rows of 5 skills + divider + 1 ultimate (matching real card layout) */}
      <Box sx={{ mb: 1.5 }}>
        {[0, 6].map((offset) => (
          <Box
            key={offset}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center', mb: offset === 0 ? 1.25 : 0 }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i + offset} variant="rounded" width={32} height={32} />
            ))}
            {/* Cyan divider before ultimate — mirrors real card exactly */}
            <Box
              sx={{
                width: 2,
                height: 34,
                bgcolor: 'rgba(124,207,252,0.55)',
                borderRadius: 0.5,
                flexShrink: 0,
              }}
            />
            <Skeleton variant="rounded" width={34} height={34} />
          </Box>
        ))}
      </Box>

      {/* Gear section: "Gear" label + "INFO" button + gear chips */}
      <Box sx={{ mb: 1.5, pt: 0.9 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Skeleton variant="text" width={36} height={16} />
          <Skeleton variant="rounded" width={44} height={20} sx={{ borderRadius: 0.5 }} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
          <Skeleton variant="rounded" height={24} width={80} />
          <Skeleton variant="rounded" height={24} width={100} />
          <Skeleton variant="rounded" height={24} width={90} />
          <Skeleton variant="rounded" height={24} width={70} />
        </Box>
      </Box>

      {/* Spacer pushes bottom section to card base */}
      <Box sx={{ flex: 1 }} />

      {/* Bottom status section */}
      <Box
        sx={{
          mt: 'auto',
          p: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: (theme: Theme) =>
            theme.palette.mode === 'dark' ? 'rgb(0 0 0 / 26%)' : 'rgb(223 239 255 / 25%)',
          boxShadow: (theme: Theme) =>
            theme.palette.mode === 'dark'
              ? 'rgb(0 0 0) 0px 2px 4px'
              : 'rgb(167 199 220) 0px 2px 4px',
        }}
      >
        {/* Metrics row: DPS · HPS · crit · food · potion... */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, overflow: 'hidden' }}>
          {[48, 40, 46, 36, 44].map((w, i) => (
            <Skeleton key={i} variant="text" width={w} height={18} />
          ))}
        </Box>

        {/* Resource stats: magicka / health / stamina */}
        <Box
          sx={{
            p: 1,
            borderRadius: '10px',
            background:
              'linear-gradient(135deg, rgb(153 210 255 / 15%) 0%, rgb(255 210 210 / 33%) 55%, rgb(177 255 205 / 29%) 100%)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <Box
                key={i}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, flex: 1 }}
              >
                <Skeleton variant="circular" width={12} height={12} sx={{ flexShrink: 0 }} />
                <Skeleton variant="text" width={44} height={14} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Champion Points section */}
        <Box sx={{ mt: 1 }}>
          <Skeleton variant="text" width={120} height={16} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 40 }}>
            <Skeleton variant="rounded" height={22} width={88} sx={{ borderRadius: 12 }} />
            <Skeleton variant="rounded" height={22} width={72} sx={{ borderRadius: 12 }} />
            <Skeleton variant="rounded" height={22} width={96} sx={{ borderRadius: 12 }} />
          </Box>
        </Box>

        {/* Build status bar — mirrors green "Build checks out" bar (48px) */}
        <Box
          sx={{
            mt: 1,
            height: 48,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'success.main',
            backgroundColor: 'rgba(76,175,80,0.07)',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            gap: 1,
          }}
        >
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={110} height={16} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const PlayersSkeleton: React.FC<PlayersSkeletonProps> = ({
  'data-testid': dataTestId = 'players-skeleton',
}) => {
  return (
    <Box data-testid={dataTestId} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Controls: search · sort · role filter · Customize Chips button */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 200 } }} />
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 180 } }} />
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 120 } }} />
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ minWidth: { sm: 40 }, maxWidth: { sm: 48 } }}
        />
      </Stack>

      {/* Results summary line */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Skeleton variant="text" width={150} height={20} />
      </Box>

      {/* Player cards grid — 2 columns at ≥772px matching the real layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            '@media (min-width: 772px)': {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            },
          },
          gap: 2,
          alignItems: 'stretch',
          minHeight: '400px',
          width: '100%',
          maxWidth: '100vw',
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <PlayerCardSkeleton key={index} index={index} />
        ))}
      </Box>
    </Box>
  );
};
