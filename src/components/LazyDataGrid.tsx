// src/components/LazyDataGrid.tsx
import { Box, CircularProgress, Typography } from '@mui/material';
import React, { Suspense } from 'react';

// Lazy load the DataGrid component which includes heavy @tanstack/react-table
const LazyDataGrid = React.lazy(() =>
  import('./DataGrid/DataGrid').then((module) => ({ default: module.DataGrid })),
);

// DataGrid loading fallback with proper sizing
const DataGridLoadingFallback: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    height="400px"
    sx={{ p: 2 }}
  >
    <CircularProgress size={32} />
    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
      Loading data table...
    </Typography>
  </Box>
);

// Wrapper component with Suspense
export const DataGrid: React.FC<React.ComponentProps<typeof LazyDataGrid>> = (props) => (
  <Suspense fallback={<DataGridLoadingFallback />}>
    <LazyDataGrid {...props} />
  </Suspense>
);
