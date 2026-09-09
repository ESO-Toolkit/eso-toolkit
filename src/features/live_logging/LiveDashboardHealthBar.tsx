import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import React from 'react';

import {
  formatLiveDuration,
  formatLiveTimestamp,
  type LiveDashboardHealth,
} from './liveDashboardHealth';

interface LiveDashboardHealthBarProps {
  health: LiveDashboardHealth;
  autoRefreshEnabled: boolean;
  isRefreshing: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
}

const getStatusCopy = (
  health: LiveDashboardHealth,
): { severity: 'success' | 'warning' | 'error'; title: string; detail: string } => {
  switch (health.status) {
    case 'fresh':
      return {
        severity: 'success',
        title: 'Live synchronization is current',
        detail: 'The dashboard completed a recent refresh. Fight activity is reported separately.',
      };
    case 'delayed':
      return {
        severity: 'warning',
        title: 'Live synchronization is delayed',
        detail: 'The latest successful refresh is older than expected.',
      };
    case 'offline':
      return {
        severity: 'error',
        title: 'You are offline',
        detail: 'Displayed data may be stale. Refresh resumes when the connection returns.',
      };
    case 'api-error':
      return {
        severity: 'error',
        title: 'Live refresh failed',
        detail:
          health.lastSuccessfulSyncAt === null
            ? 'A successful live synchronization has not completed yet.'
            : 'Displayed data may be stale. The previous successful result is still shown.',
      };
    default:
      return {
        severity: 'warning',
        title: 'Live synchronization is stale',
        detail: 'A recent successful synchronization is unavailable.',
      };
  }
};

/**
 * Feature-local live synchronization surface. It deliberately exposes the
 * freshness contract instead of allowing retained report data to look live.
 */
export const LiveDashboardHealthBar: React.FC<LiveDashboardHealthBarProps> = ({
  health,
  autoRefreshEnabled,
  isRefreshing,
  onToggleAutoRefresh,
  onRefresh,
}) => {
  const copy = getStatusCopy(health);
  const retryCopy = health.nextRetryAt
    ? `Next retry at ${formatLiveTimestamp(health.nextRetryAt)}.`
    : null;

  return (
    <Box component="section" aria-label="Live synchronization status" sx={{ mb: 2 }}>
      {health.newPullDetected ? (
        <Alert severity="info" role="status" aria-live="polite" sx={{ mb: 1 }}>
          New pull arrived. Live analysis has been updated.
        </Alert>
      ) : null}
      <Alert
        severity={copy.severity}
        role={health.status === 'fresh' || health.status === 'delayed' ? 'status' : 'alert'}
        aria-live={
          health.status === 'fresh' || health.status === 'delayed' ? 'polite' : 'assertive'
        }
        sx={{ alignItems: 'flex-start' }}
      >
        <Stack spacing={0.5}>
          <Typography component="p" variant="subtitle2" sx={{ fontWeight: 700 }}>
            {copy.title}
          </Typography>
          <Typography component="p" variant="body2">
            {copy.detail}
          </Typography>
          <Typography component="p" variant="body2" color="text.secondary">
            Last successful synchronization: {formatLiveTimestamp(health.lastSuccessfulSyncAt)}.
            Newest completed fight: {formatLiveTimestamp(health.newestActivityAt)}. Fight activity
            lag: {formatLiveDuration(health.lagMs)}.
          </Typography>
          {health.status === 'api-error' ? (
            <Typography component="p" variant="body2" color="text.secondary">
              {retryCopy ?? 'Automatic retry is not currently scheduled.'}
            </Typography>
          ) : null}
        </Stack>
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onToggleAutoRefresh}
          aria-pressed={autoRefreshEnabled}
          sx={{
            minHeight: 44,
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          {autoRefreshEnabled ? 'Pause automatic refresh' : 'Resume automatic refresh'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={onRefresh}
          disabled={isRefreshing}
          sx={{
            minHeight: 44,
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          {isRefreshing ? 'Refreshing live data' : 'Refresh now'}
        </Button>
      </Stack>
    </Box>
  );
};
