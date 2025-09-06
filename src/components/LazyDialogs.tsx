// src/components/LazyDialogs.tsx
import { Dialog, DialogContent, CircularProgress, Box } from '@mui/material';
import React, { Suspense } from 'react';

// Lazy load heavy dialog components
const LazyBugReportDialog = React.lazy(() =>
  import('./BugReportDialog').then((module) => ({
    default: module.FeedbackDialog,
  })),
);

const LazyLoggerDebugPanel = React.lazy(() =>
  import('./LoggerDebugPanel').then((module) => ({
    default: module.LoggerDebugPanel,
  })),
);

// Dialog loading fallback
const DialogLoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="200px">
    <CircularProgress size={24} />
  </Box>
);

// Wrapper components with Suspense
export const BugReportDialog: React.FC<React.ComponentProps<typeof LazyBugReportDialog>> = (
  props,
) => (
  <Suspense fallback={<DialogLoadingFallback />}>
    <LazyBugReportDialog {...props} />
  </Suspense>
);

export const LoggerDebugPanel: React.FC<React.ComponentProps<typeof LazyLoggerDebugPanel>> = (
  props,
) => (
  <Suspense fallback={<DialogLoadingFallback />}>
    <LazyLoggerDebugPanel {...props} />
  </Suspense>
);
