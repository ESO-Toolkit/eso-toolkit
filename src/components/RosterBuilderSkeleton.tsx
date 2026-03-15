import { Box, Container, Skeleton, useTheme } from '@mui/material';
import React from 'react';

/**
 * Skeleton placeholder for the Roster Builder page.
 * Mirrors the actual layout: alert banner, header with mode toggle,
 * name input, toolbar, 3-column set assignments grid, and ultimates rows.
 */
export const RosterBuilderSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const skeletonBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const skeletonBgLight = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  /** Reusable gear set row skeleton */
  const GearSetRow = ({ width = '70%' }: { width?: string }): React.JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: '8px',
        background: cardBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Skeleton
        variant="circular"
        width={20}
        height={20}
        sx={{ bgcolor: skeletonBgLight, flexShrink: 0 }}
      />
      <Skeleton variant="text" width={width} height={20} sx={{ bgcolor: skeletonBg }} />
    </Box>
  );

  /** Section header badge skeleton (e.g. TANK, HEALER, FLEXIBLE) */
  const SectionBadge = ({ width = 60 }: { width?: number }): React.JSX.Element => (
    <Skeleton
      variant="rounded"
      width={width}
      height={22}
      sx={{ borderRadius: '6px', bgcolor: skeletonBg, mb: 1 }}
    />
  );

  /** Ultimate row skeleton (role badge + 4 ultimate buttons) */
  const UltimateRow = (): React.JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
      <Skeleton
        variant="rounded"
        width={28}
        height={22}
        sx={{ borderRadius: '4px', bgcolor: skeletonBg }}
      />
      {[70, 68, 56, 72].map((w, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          width={w}
          height={30}
          sx={{ borderRadius: '6px', bgcolor: skeletonBgLight }}
        />
      ))}
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ pt: 2, pb: 6 }}>
      {/* Alert banner */}
      <Skeleton
        variant="rounded"
        height={52}
        sx={{ borderRadius: '12px', bgcolor: skeletonBg, mb: 2 }}
      />

      {/* Community rosters link bar */}
      <Skeleton
        variant="rounded"
        height={40}
        sx={{ borderRadius: '10px', bgcolor: skeletonBgLight, mb: 3 }}
      />

      {/* Main content card */}
      <Box
        sx={{
          background: isDark ? 'rgba(15,20,35,0.6)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: 3,
          border: `1px solid ${borderColor}`,
          p: { xs: 2, sm: 3 },
        }}
      >
        {/* Header: title + mode toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Skeleton
              variant="text"
              width={60}
              height={14}
              sx={{ bgcolor: skeletonBgLight, mb: 0.5 }}
            />
            <Skeleton variant="text" width={160} height={32} sx={{ bgcolor: skeletonBg }} />
          </Box>
          <Skeleton
            variant="rounded"
            width={200}
            height={36}
            sx={{ borderRadius: '18px', bgcolor: skeletonBg }}
          />
        </Box>

        {/* Roster name input */}
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ borderRadius: '8px', bgcolor: skeletonBgLight, mb: 2 }}
        />

        {/* Toolbar row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          {[90, 80, 95, 80].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={34}
              sx={{ borderRadius: '8px', bgcolor: skeletonBg }}
            />
          ))}
          <Box sx={{ flexGrow: 1 }} />
          {[90, 75, 75, 85].map((w, i) => (
            <Skeleton
              key={`r${i}`}
              variant="rounded"
              width={w}
              height={34}
              sx={{ borderRadius: '8px', bgcolor: skeletonBg }}
            />
          ))}
        </Box>

        {/* Set Assignments header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Skeleton
              variant="text"
              width={50}
              height={14}
              sx={{ bgcolor: skeletonBgLight, mb: 0.5 }}
            />
            <Skeleton variant="text" width={150} height={26} sx={{ bgcolor: skeletonBg }} />
          </Box>
          <Skeleton
            variant="rounded"
            width={160}
            height={34}
            sx={{ borderRadius: '18px', bgcolor: skeletonBg }}
          />
        </Box>

        {/* 3-column set assignments grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          {/* TANK column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SectionBadge width={55} />
            {[0, 1, 2, 3, 4].map((i) => (
              <GearSetRow key={i} width={`${60 + (i % 3) * 10}%`} />
            ))}
          </Box>

          {/* FLEXIBLE column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SectionBadge width={72} />
            {[0, 1, 2].map((i) => (
              <GearSetRow key={i} width={`${65 + (i % 3) * 8}%`} />
            ))}
          </Box>

          {/* HEALER column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SectionBadge width={60} />
            {[0, 1, 2].map((i) => (
              <GearSetRow key={i} width={`${68 + (i % 3) * 7}%`} />
            ))}
          </Box>
        </Box>

        {/* Monster & Mythic section */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Skeleton
            variant="rounded"
            width={140}
            height={22}
            sx={{ borderRadius: '6px', bgcolor: skeletonBg }}
          />
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          {[0, 1, 2].map((col) => (
            <Box key={col} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <GearSetRow key={i} width={`${55 + (i % 3) * 12}%`} />
              ))}
            </Box>
          ))}
        </Box>

        {/* Tank Ultimates section */}
        <SectionBadge width={130} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
          <UltimateRow />
          <UltimateRow />
        </Box>

        {/* Healer Ultimates section */}
        <SectionBadge width={140} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
          <UltimateRow />
          <UltimateRow />
        </Box>

        {/* Champion Points section */}
        <SectionBadge width={135} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
              <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: skeletonBg }} />
              <Skeleton variant="text" width="45%" height={20} sx={{ bgcolor: skeletonBgLight }} />
              <Skeleton variant="text" width="30%" height={20} sx={{ bgcolor: skeletonBgLight }} />
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
};
