import { Box, Skeleton } from '@mui/material';
import React from 'react';

/**
 * Skeleton for the Synergies tab.
 * Mirrors: summary chips → "Who is taking synergies?" header → player cards grid →
 *          "Synergy Abilities" header → ability table → "Activation Timeline" header → timeline table.
 */
export const SynergyPanelSkeleton: React.FC = () => (
  <Box sx={{ mt: 1 }}>
    {/* Summary header row: title + toggle + chips */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      <Skeleton variant="text" width={180} height={32} />
      {/* Alkosh-only toggle */}
      <Skeleton variant="rounded" width={130} height={24} sx={{ borderRadius: 1 }} />
      {/* activations chip */}
      <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 12 }} />
      {/* synergies chip */}
      <Skeleton variant="rounded" width={88} height={24} sx={{ borderRadius: 12 }} />
      {/* players chip */}
      <Skeleton variant="rounded" width={76} height={24} sx={{ borderRadius: 12 }} />
      {/* View on ESO Logs chip */}
      <Skeleton variant="rounded" width={130} height={24} sx={{ borderRadius: 12 }} />
    </Box>

    {/* "Who is taking synergies?" section header */}
    <Skeleton variant="text" width={220} height={24} sx={{ mb: 1.5 }} />

    {/* Player cards grid */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 4,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
      ))}
    </Box>

    {/* "Synergy Abilities" section header */}
    <Skeleton variant="text" width={170} height={24} sx={{ mb: 1.5 }} />

    {/* Synergy abilities table */}
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        mb: 4,
      }}
    >
      {/* Table header */}
      <Box
        sx={{
          display: 'flex',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'action.hover',
        }}
      >
        <Box sx={{ flex: 2 }}>
          <Skeleton variant="text" width="50%" height={16} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton variant="text" width="70%" height={16} />
        </Box>
        <Box sx={{ flex: 2, pl: 2 }}>
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
      </Box>

      {/* Ability rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            minHeight: 44,
            borderBottom: i < 5 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {/* Ability icon + name */}
          <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} sx={{ flexShrink: 0 }} />
            <Skeleton variant="text" width={`${50 + (i % 3) * 12}%`} height={16} />
          </Box>
          {/* Total activations */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Skeleton variant="text" width={32} height={16} />
          </Box>
          {/* Player chips */}
          <Box sx={{ flex: 2, pl: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Skeleton variant="rounded" width={80} height={20} sx={{ borderRadius: 10 }} />
            {i % 2 === 0 && (
              <Skeleton variant="rounded" width={68} height={20} sx={{ borderRadius: 10 }} />
            )}
          </Box>
        </Box>
      ))}
    </Box>

    {/* "Activation Timeline" section header */}
    <Skeleton variant="text" width={190} height={24} sx={{ mb: 1.5 }} />

    {/* Timeline table */}
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Table header */}
      <Box
        sx={{
          display: 'flex',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'action.hover',
        }}
      >
        {['Time', 'Player', 'Synergy'].map((_, idx) => (
          <Box key={idx} sx={{ flex: idx === 2 ? 2 : 1 }}>
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        ))}
      </Box>

      {/* Timeline rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.75,
            minHeight: 40,
            borderBottom: i < 7 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {/* Time */}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={40} height={16} />
          </Box>
          {/* Player */}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={`${45 + (i % 4) * 10}%`} height={16} />
          </Box>
          {/* Synergy icon + name */}
          <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={20} height={20} sx={{ flexShrink: 0 }} />
            <Skeleton variant="text" width={`${40 + (i % 3) * 12}%`} height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);
