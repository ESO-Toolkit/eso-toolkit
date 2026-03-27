// src/components/LazyDataGrid.tsx
import { Box, Skeleton } from '@mui/material';
import React, { Suspense } from 'react';

// Lazy load the DataGrid component which includes heavy @tanstack/react-table
const LazyDataGrid = React.lazy(() =>
  import('./DataGrid/DataGrid').then((module) => ({ default: module.DataGrid })),
);

// DataGrid loading fallback — table-shaped skeleton instead of spinner
const DataGridLoadingFallback: React.FC = () => (
  <Box sx={{ height: 400, p: 2 }}>
    {/* Header row */}
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 1.5,
        pb: 1.5,
        borderBottom: '2px solid',
        borderColor: 'divider',
      }}
    >
      {[60, '25%', '35%', 80, 70].map((w, i) => (
        <Skeleton key={i} variant="text" width={w} height={16} />
      ))}
    </Box>
    {/* Data rows */}
    {Array.from({ length: 10 }).map((_, i) => (
      <Box
        key={i}
        sx={{
          display: 'flex',
          gap: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Skeleton variant="text" width={60} height={16} sx={{ flexShrink: 0 }} />
        <Skeleton variant="text" width={`${22 + ((i * 11) % 18)}%`} height={16} />
        <Skeleton variant="text" width={`${30 + ((i * 7) % 15)}%`} height={16} />
        <Skeleton variant="text" width={80} height={16} sx={{ flexShrink: 0 }} />
        <Skeleton variant="text" width={70} height={16} sx={{ flexShrink: 0 }} />
      </Box>
    ))}
  </Box>
);

// Wrapper component with Suspense
export const DataGrid: React.FC<React.ComponentProps<typeof LazyDataGrid>> = (props) => (
  <Suspense fallback={<DataGridLoadingFallback />}>
    <LazyDataGrid {...props} />
  </Suspense>
);
