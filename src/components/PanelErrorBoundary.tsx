import { ErrorOutlined, Refresh } from '@mui/icons-material';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import React, { ReactNode } from 'react';

import { ErrorBoundary } from './ErrorBoundary';

interface PanelErrorFallbackProps {
  panelName: string;
  onRetry: () => void;
}

const PanelErrorFallback: React.FC<PanelErrorFallbackProps> = ({ panelName, onRetry }) => (
  <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Alert
      severity="error"
      icon={<ErrorOutlined />}
      sx={{ width: '100%', maxWidth: 500 }}
      action={
        <Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRetry} sx={{ minHeight: 44, minWidth: 44 }}>
          Retry
        </Button>
      }
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">{panelName} failed to load</Typography>
        <Typography variant="body2" color="text.secondary">
          An error occurred while rendering this panel. Other tabs are unaffected.
        </Typography>
      </Stack>
    </Alert>
  </Box>
);

interface PanelErrorBoundaryProps {
  panelName: string;
  children: ReactNode;
}

/**
 * Lightweight error boundary for individual report detail panels.
 *
 * Wraps the shared `ErrorBoundary` with a compact, panel-appropriate fallback
 * instead of the full-page default. Isolates panel failures so one broken tab
 * doesn't crash the entire view.
 */
export const PanelErrorBoundary: React.FC<PanelErrorBoundaryProps> = ({ panelName, children }) => {
  const [retryKey, setRetryKey] = React.useState(0);

  return (
    <ErrorBoundary
      key={retryKey}
      fallback={
        <PanelErrorFallback panelName={panelName} onRetry={() => setRetryKey((k) => k + 1)} />
      }
    >
      {children}
    </ErrorBoundary>
  );
};
