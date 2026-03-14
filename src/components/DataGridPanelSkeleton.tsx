import { Box, Skeleton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

interface DataGridPanelSkeletonProps {
  /** Number of columns in the grid */
  columns?: number;
  /** Visible data rows */
  rows?: number;
  /** Show a filter/select dropdown above the grid */
  showFilter?: boolean;
  /** Show a description line below the title */
  showDescription?: boolean;
  /** Show a BETA chip next to the title */
  showBetaChip?: boolean;
  'data-testid'?: string;
}

/**
 * Skeleton for any DataGrid-based panel (Auras, Buffs, Debuffs, Talents).
 * Mirrors the DataGrid toolbar → column headers → rows → pagination footer structure.
 */
export const DataGridPanelSkeleton: React.FC<DataGridPanelSkeletonProps> = ({
  columns = 4,
  rows = 8,
  showFilter = false,
  showDescription = true,
  showBetaChip = false,
  'data-testid': dataTestId = 'data-grid-panel-skeleton',
}) => {
  return (
    <Box data-testid={dataTestId} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Skeleton variant="text" width={220} height={32} />
        {showBetaChip && (
          <Skeleton variant="rounded" width={48} height={20} sx={{ borderRadius: 10 }} />
        )}
      </Box>

      {/* Description */}
      {showDescription && (
        <Skeleton variant="text" width="55%" height={20} sx={{ mb: showFilter ? 2 : 3 }} />
      )}

      {/* Optional filter dropdown */}
      {showFilter && (
        <Skeleton variant="rounded" width={200} height={40} sx={{ mb: 3, borderRadius: 1 }} />
      )}

      {/* DataGrid container */}
      <Box
        sx={{
          position: 'relative',
          height: 600,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar: search + columns button */}
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: 52,
            flexShrink: 0,
          }}
        >
          <Skeleton variant="rounded" width={180} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 1 }} />
        </Box>

        {/* Column headers */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            minHeight: 56,
            flexShrink: 0,
            backgroundColor: (theme: Theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Box key={i} sx={{ flex: i === 0 ? 2 : 1, px: 0.5 }}>
              <Skeleton variant="text" width="60%" height={18} />
            </Box>
          ))}
        </Box>

        {/* Data rows */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <Box
              key={rowIdx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                minHeight: 52,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              {/* First col: icon + name */}
              <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                <Skeleton variant="rounded" width={24} height={24} sx={{ flexShrink: 0 }} />
                <Skeleton variant="text" width={`${55 + (rowIdx % 4) * 8}%`} height={16} />
              </Box>

              {/* Remaining cols — vary content by position */}
              {Array.from({ length: columns - 1 }).map((_, colIdx) => (
                <Box key={colIdx} sx={{ flex: 1, px: 0.5 }}>
                  {colIdx === 0 ? (
                    // ID column — monospace look
                    <Skeleton variant="text" width="65%" height={16} />
                  ) : colIdx === 1 ? (
                    // Count/chip column
                    <Skeleton variant="rounded" width={36} height={20} sx={{ borderRadius: 10 }} />
                  ) : colIdx === 2 ? (
                    // Player chips column
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Skeleton
                        variant="rounded"
                        width={52}
                        height={20}
                        sx={{ borderRadius: 10 }}
                      />
                      {rowIdx % 2 === 0 && (
                        <Skeleton
                          variant="rounded"
                          width={44}
                          height={20}
                          sx={{ borderRadius: 10 }}
                        />
                      )}
                    </Box>
                  ) : (
                    // Numeric column
                    <Skeleton variant="text" width="45%" height={16} />
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </Box>

        {/* Pagination footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.5,
            px: 2,
            py: 0.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            minHeight: 52,
          }}
        >
          <Skeleton variant="text" width={110} height={16} />
          <Skeleton variant="rounded" width={55} height={28} sx={{ borderRadius: 1 }} />
          <Skeleton variant="text" width={60} height={16} />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
