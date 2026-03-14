import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

interface PlayersSkeletonProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Single player card skeleton — mirrors the real PlayerCard layout exactly.
 *
 * Structure (matches PlayerCard.tsx):
 *   Card (gradient bg, outlined, height:100%)
 *     CardContent (p:2, pb:1, flex column)
 *       Inner wrapper (flex:1, gap:2)
 *         Left col (identity, skill lines, talents, gear)
 *           Header: icon + name + gear weights + role emoji
 *           Skill lines row
 *           Talents box (mb:1.5, wraps talent rows AND gear section)
 *             Row 1: 5 skills + cyan divider + ultimate (mb:1.25)
 *             Row 2: 5 skills + cyan divider + ultimate (mt:0.25)
 *             Gear section (mt:1.25, pt:0.9)
 *               Gear label + INFO button (mb:2.5)
 *               Gear chips
 *         Spacer (flex:1)
 *         Bottom section (width:100%, pt:1, flex column)
 *           Metrics box (p:1, border, bg, shadow)
 *             Metrics chips row (mb:1)
 *             Resource stats box (mb:1.5, gradient, borderRadius:10px)
 *             Champion Points section (mt:1)
 *           Build status bar — sibling to metrics box (mt:1, height:48)
 */
const PlayerCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <Card
    variant="outlined"
    sx={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background:
        'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <CardContent sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Inner wrapper — flex:1 gap:2 (mirrors the <Box flex={1} minHeight={0} gap={2}> wrapper) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
        {/* ── Left column: identity, skills, talents, gear ── */}
        <Box sx={{ flex: 0, minWidth: 0 }}>
          {/* Header: class icon + player name + gear weights (H•M•L) + role emoji */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
            {/* Class icon — rounded square (PlayerIcon) */}
            <Skeleton variant="rounded" width={40} height={40} sx={{ flexShrink: 0, borderRadius: 1 }} />

            {/* Name + gear weights + role emoji */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0, gap: 1 }}>
              {/* Player name */}
              <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Skeleton variant="text" width="55%" height={22} />
              </Box>

              {/* Gear weights: shield icon + H•M•L */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, flex: '0 0 auto' }}>
                <Skeleton variant="rounded" width={16} height={16} sx={{ flexShrink: 0 }} />
                <Skeleton variant="text" width={14} height={14} />
                <Skeleton variant="text" width={6} height={10} />
                <Skeleton variant="text" width={14} height={14} />
                <Skeleton variant="text" width={6} height={10} />
                <Skeleton variant="text" width={14} height={14} />
              </Box>

              {/* Role emoji */}
              <Skeleton variant="text" width={28} height={32} sx={{ flexShrink: 0 }} />
            </Box>
          </Box>

          {/* Skill lines row (e.g. "Destruction Staff • Templar") — mt:0.25, mb:0.5 */}
          <Box sx={{ mt: 0.25, mb: 0.5 }}>
            <Skeleton variant="text" width={`${55 + (index % 3) * 10}%`} height={14} />
          </Box>

          {/* Talents + Gear — the real card wraps both in one <Box mb={1.5}> */}
          <Box sx={{ mb: 1.5 }}>
            {/* Row 1: 5 skills + cyan divider + 1 ultimate (mb:1.25) */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center', mb: 1.25 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={32} height={32} />
              ))}
              {/* Cyan divider before ultimate — mirrors real card */}
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

            {/* Row 2: 5 skills + cyan divider + 1 ultimate (mt:0.25) */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center', mt: 0.25 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={32} height={32} />
              ))}
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

            {/* Gear section — inside the talent box (mt:1.25, pt:0.9 matches real) */}
            <Box sx={{ mt: 1.25, pt: 0.9 }}>
              {/* "Gear" label + INFO button (mb:2.5 matches real card) */}
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}
              >
                <Skeleton variant="text" width={36} height={16} />
                <Skeleton variant="rounded" width={44} height={20} sx={{ borderRadius: 0.5 }} />
              </Box>
              {/* Gear chips (minHeight:32 matches real) */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, minHeight: 32 }}>
                <Skeleton variant="rounded" height={24} width={80} />
                <Skeleton variant="rounded" height={24} width={100} />
                <Skeleton variant="rounded" height={24} width={90} />
                <Skeleton variant="rounded" height={24} width={70} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Spacer — pushes bottom section to card base */}
        <Box sx={{ flex: 1 }} />

        {/* ── Bottom section (width:100%, pt:1, flex column) ── */}
        <Box
          sx={{
            width: '100%',
            pt: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Inner bordered box: metrics + resource stats + Champion Points */}
          <Box
            sx={{
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
            {/* Metrics chips row (mb:1, minHeight: { xs:40, sm:28 } matches real) */}
            <Box
              sx={{
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                minHeight: { xs: 40, sm: 28 },
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', flex: '1 1 auto', minWidth: 0 }}>
                {[48, 40, 46, 36, 44].map((w, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Skeleton variant="text" width={6} height={18} />}
                    <Skeleton variant="text" width={w} height={18} />
                  </React.Fragment>
                ))}
              </Box>
            </Box>

            {/* Resource stats: magicka / health / stamina (mb:1.5, borderRadius:10px, gradient) */}
            <Box
              sx={{
                mb: 1.5,
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

            {/* Champion Points section (mt:1, minHeight:40 matches real) */}
            <Box sx={{ mt: 1 }}>
              <Skeleton variant="text" width={120} height={16} sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 40 }}>
                <Skeleton variant="rounded" height={22} width={88} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rounded" height={22} width={72} sx={{ borderRadius: 12 }} />
                <Skeleton variant="rounded" height={22} width={96} sx={{ borderRadius: 12 }} />
              </Box>
            </Box>
          </Box>

          {/* Build status bar — sibling to metrics box (mt:1, height:48, green border) */}
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
      </Box>
    </CardContent>
  </Card>
);

export const PlayersSkeleton: React.FC<PlayersSkeletonProps> = ({
  'data-testid': dataTestId = 'players-skeleton',
}) => {
  return (
    <Box data-testid={dataTestId} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Controls: search · sort · role filter · Stats (Customize Chips) button */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 200 } }} />
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 180 } }} />
        <Skeleton variant="rounded" height={40} sx={{ minWidth: { sm: 120 } }} />
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ minWidth: { sm: 40 }, maxWidth: { sm: 100 } }}
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
        {Array.from({ length: 2 }).map((_, index) => (
          <Box
            key={index}
            sx={{
              height: '100%',
              minWidth: 0,
              maxWidth: '100%',
              paddingTop: '2px', // matches real card wrapper — gives hover room
            }}
          >
            <PlayerCardSkeleton index={index} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
