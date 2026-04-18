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
interface SkillTooltipLoadingFallbackProps {
  /** Test ID for testing */
  'data-testid'?: string;
}

const SkillTooltipLoadingFallback: React.FC<SkillTooltipLoadingFallbackProps> = ({
  'data-testid': dataTestId = 'skill-tooltip-loading-fallback',
}) => (
  <Box
    data-testid={dataTestId}
    sx={{
      padding: 1.5,
      minWidth: 280,
      maxWidth: { xs: 280, sm: 340, md: 380 },
      borderRadius: '12px',
      background: 'rgba(10, 16, 32, 0.78)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(148, 210, 255, 0.12)',
      boxShadow:
        '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    }}
  >
    {/* Header: badge + skill line */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
      <Skeleton
        variant="rounded"
        width={56}
        height={22}
        sx={{ borderRadius: '6px', bgcolor: 'rgba(148, 210, 255, 0.08)' }}
      />
      <Skeleton
        variant="text"
        width={80}
        height={14}
        sx={{ bgcolor: 'rgba(148, 210, 255, 0.06)' }}
      />
    </Box>

    {/* Identity block */}
    <Box
      sx={{
        p: 1,
        borderRadius: '10px',
        background: 'rgba(148, 210, 255, 0.04)',
        border: '1px solid rgba(148, 210, 255, 0.08)',
        mb: 1.25,
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
      }}
    >
      <Skeleton
        variant="rounded"
        width={48}
        height={48}
        sx={{ borderRadius: '10px', flexShrink: 0, bgcolor: 'rgba(148, 210, 255, 0.08)' }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton
          variant="text"
          height={18}
          width="75%"
          sx={{ mb: 0.4, bgcolor: 'rgba(148, 210, 255, 0.1)' }}
        />
        <Skeleton
          variant="text"
          height={12}
          width="45%"
          sx={{ bgcolor: 'rgba(148, 210, 255, 0.06)' }}
        />
      </Box>
    </Box>

    {/* Stats grid */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 0.6,
        mb: 1.25,
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Box
          key={index}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Skeleton
            variant="text"
            height={10}
            width="35%"
            sx={{ bgcolor: 'rgba(148, 210, 255, 0.06)' }}
          />
          <Skeleton
            variant="rounded"
            height={18}
            width="45%"
            sx={{ borderRadius: '4px', bgcolor: 'rgba(148, 210, 255, 0.08)' }}
          />
        </Box>
      ))}
    </Box>

    {/* Gradient divider placeholder */}
    <Box
      sx={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(148, 210, 255, 0.12), transparent)',
        my: 1.25,
      }}
    />

    {/* Description */}
    <Box>
      <Skeleton
        variant="text"
        height={13}
        width="100%"
        sx={{ mb: 0.5, bgcolor: 'rgba(148, 210, 255, 0.06)' }}
      />
      <Skeleton
        variant="text"
        height={13}
        width="92%"
        sx={{ mb: 0.5, bgcolor: 'rgba(148, 210, 255, 0.06)' }}
      />
      <Skeleton
        variant="text"
        height={13}
        width="68%"
        sx={{ bgcolor: 'rgba(148, 210, 255, 0.06)' }}
      />
    </Box>
  </Box>
);

// Wrapper component with suspense boundary
export const LazySkillTooltip: React.FC<SkillTooltipProps & { 'data-testid'?: string }> = (
  props,
) => {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    itemCount,
    'data-testid': dataTestId,
    ...filteredProps
  } = props as SkillTooltipProps & { itemCount?: unknown; 'data-testid'?: string };

  return (
    <Suspense fallback={<SkillTooltipLoadingFallback data-testid={dataTestId} />}>
      <SkillTooltip {...filteredProps} />
    </Suspense>
  );
}; // Re-export types for convenience
export type { SkillTooltipProps, SkillStat } from './SkillTooltip';
