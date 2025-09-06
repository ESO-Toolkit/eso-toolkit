import { Box, Skeleton } from '@mui/material';
import React, { Suspense } from 'react';

import type { SkillTooltipProps } from './SkillTooltip';

// Lazy load the SkillTooltip component (4.27MB chunk)
const SkillTooltip = React.lazy(() =>
  import('./SkillTooltip').then((module) => ({
    default: module.SkillTooltip,
  })),
);

// Loading fallback for skill tooltips
const SkillTooltipLoadingFallback: React.FC = () => (
  <Box
    sx={{
      padding: 1.25,
      minWidth: 260,
      maxWidth: { xs: 260, sm: 320, md: 360 },
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 1,
      backgroundColor: 'background.paper',
    }}
  >
    {/* Header with icon and name */}
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1.75 }}>
      <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '7px' }} />
      <Box sx={{ minWidth: 0, pt: 0.25, flex: 1 }}>
        <Skeleton variant="text" height={20} width="80%" sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={14} width="50%" />
      </Box>
      <Skeleton variant="rounded" height={20} width={60} />
    </Box>

    {/* Stats section */}
    <Box
      sx={{
        p: 0.75,
        borderRadius: '10px',
        backgroundColor: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.06)',
        mb: 1,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 0.8,
          alignItems: 'center',
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Box
            key={index}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Skeleton variant="text" height={12} width="40%" />
            <Skeleton variant="rounded" height={16} width="45%" />
          </Box>
        ))}
      </Box>
    </Box>

    {/* Divider */}
    <Skeleton variant="rectangular" height={1} width="100%" sx={{ my: 1 }} />

    {/* Description */}
    <Box>
      <Skeleton variant="text" height={14} width="100%" sx={{ mb: 0.5 }} />
      <Skeleton variant="text" height={14} width="90%" sx={{ mb: 0.5 }} />
      <Skeleton variant="text" height={14} width="70%" />
    </Box>
  </Box>
);

// Wrapper component with suspense boundary
export const LazySkillTooltip: React.FC<SkillTooltipProps> = (props) => {
  return (
    <Suspense fallback={<SkillTooltipLoadingFallback />}>
      <SkillTooltip {...props} />
    </Suspense>
  );
};

// Re-export types for convenience
export type { SkillTooltipProps, SkillStat } from './SkillTooltip';
