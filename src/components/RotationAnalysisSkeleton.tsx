import { Box, Skeleton } from '@mui/material';
import React from 'react';

/**
 * Skeleton for the Rotation Analysis tab.
 * Mirrors the real panel: title → accordion list where each accordion
 * shows a player name + APM chip in the collapsed header.
 */
export const RotationAnalysisSkeleton: React.FC = () => (
  <Box>
    {/* Section title */}
    <Skeleton variant="text" width={220} height={36} sx={{ mb: 2 }} />

    {/* Player accordions */}
    {Array.from({ length: 4 }).map((_, i) => (
      <Box
        key={i}
        sx={{
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* Accordion summary row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            minHeight: 48,
            backgroundColor: 'action.hover',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Player name */}
            <Skeleton variant="text" width={100 + i * 20} height={20} />
            {/* APM chip */}
            <Skeleton variant="rounded" width={68} height={22} sx={{ borderRadius: 12 }} />
          </Box>
          {/* Expand icon placeholder */}
          <Skeleton variant="circular" width={20} height={20} />
        </Box>
      </Box>
    ))}
  </Box>
);
