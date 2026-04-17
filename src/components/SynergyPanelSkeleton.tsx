import { Box, Skeleton, useTheme } from '@mui/material';
import React from 'react';

/**
 * Skeleton for the Synergies tab.
 * Mirrors: header → stats row → player cards grid → ability cards grid → timeline list.
 */
export const SynergyPanelSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const glass = {
    borderRadius: '16px',
    background: isDark
      ? 'linear-gradient(135deg, rgb(110 170 240 / 20%) 0%, rgb(152 131 227 / 12%) 50%, rgb(173 192 255 / 6%) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.78) 100%)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(59,130,246,0.22)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  } as const;

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2.5,
          flexWrap: 'wrap',
        }}
      >
        <Skeleton variant="text" width={120} height={32} />
        <Skeleton variant="rounded" width={32} height={24} sx={{ borderRadius: 1 }} />
        <Skeleton variant="text" width={220} height={20} />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Skeleton variant="rounded" width={130} height={26} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={100} height={26} sx={{ borderRadius: 13 }} />
      </Box>

      {/* Stats row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.25,
          mb: 3,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 1 }} />
        ))}
      </Box>

      {/* Player section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: '8px' }} />
        <Skeleton variant="text" width={220} height={22} />
      </Box>

      {/* Player cards grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            xl: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3.5,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ ...glass, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={18} />
                <Skeleton variant="text" width="55%" height={14} />
              </Box>
              <Skeleton variant="text" width={40} height={28} />
            </Box>
            <Skeleton variant="rounded" height={4} sx={{ borderRadius: 2, mb: 1.25 }} />
            {Array.from({ length: 3 }).map((__, j) => (
              <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5 }}>
                <Skeleton variant="rounded" width={20} height={20} sx={{ borderRadius: 1 }} />
                <Skeleton variant="text" sx={{ flex: 1 }} height={14} />
                <Skeleton variant="text" width={18} height={14} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* Ability section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: '8px' }} />
        <Skeleton variant="text" width={170} height={22} />
      </Box>

      {/* Ability cards grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            xl: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3.5,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ ...glass, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
              <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '10px' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="75%" height={18} />
                <Skeleton variant="text" width="50%" height={14} />
              </Box>
              <Skeleton variant="text" width={44} height={28} />
            </Box>
            <Skeleton variant="rounded" height={4} sx={{ borderRadius: 2, mb: 1.25 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 12 }} />
              <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 12 }} />
              <Skeleton variant="rounded" width={72} height={24} sx={{ borderRadius: 12 }} />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Timeline section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: '8px' }} />
        <Skeleton variant="text" width={200} height={22} />
      </Box>

      {/* Timeline list */}
      <Box sx={{ ...glass, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '72px 1fr 1.4fr',
            gap: 1.5,
            px: 2,
            py: 1.25,
            borderBottom: isDark
              ? '1px solid rgba(148,163,184,0.12)'
              : '1px solid rgba(148,163,184,0.18)',
          }}
        >
          <Skeleton variant="text" width={36} height={14} />
          <Skeleton variant="text" width={50} height={14} />
          <Skeleton variant="text" width={60} height={14} />
        </Box>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: '72px 1fr 1.4fr',
              gap: 1.5,
              alignItems: 'center',
              px: 2,
              py: 1,
              borderBottom:
                i < 7
                  ? isDark
                    ? '1px solid rgba(148,163,184,0.06)'
                    : '1px solid rgba(148,163,184,0.1)'
                  : 'none',
            }}
          >
            <Skeleton variant="text" width={40} height={14} />
            <Skeleton variant="text" width={`${50 + (i % 4) * 10}%`} height={14} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Skeleton variant="rounded" width={22} height={22} sx={{ borderRadius: '5px' }} />
              <Skeleton variant="text" width={`${45 + (i % 3) * 12}%`} height={14} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
