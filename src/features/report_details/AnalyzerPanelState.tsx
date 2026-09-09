import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import React from 'react';

export type AnalyzerPanelStateKind = 'loading' | 'empty' | 'partial' | 'stale' | 'failed' | 'ready';

export interface AnalyzerPanelStateProps {
  /** A short, unique name used to identify the panel and its state announcement. */
  title: string;
  state: AnalyzerPanelStateKind;
  /** Content retained while the latest fetch is partial, stale, or has failed. */
  children?: React.ReactNode;
  /** Timestamp supplied by the data owner; rendered verbatim to avoid locale ambiguity. */
  asOf?: string;
  /** More specific state detail, such as an API error or partial-stream reason. */
  detail?: string;
  /**
   * A data-owner supplied recovery action. Panels omit this when their dependencies
   * do not expose a safe targeted refresh, so the state copy never promises one.
   */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Inputs shared by Analyzer panels when deciding whether their data can be
 * presented. An empty state is only valid after every required input has
 * completed; otherwise the panel remains loading or explicitly stale.
 */
export interface ResolveAnalyzerPanelStateInput {
  error?: string | null;
  hasData: boolean;
  isComplete: boolean;
  isLoading: boolean;
}

export const resolveAnalyzerPanelState = ({
  error,
  hasData,
  isComplete,
  isLoading,
}: ResolveAnalyzerPanelStateInput): AnalyzerPanelStateKind => {
  if (error) return 'failed';
  if (isLoading) return hasData ? 'partial' : 'loading';
  if (isComplete) return hasData ? 'ready' : 'empty';

  // A dependency has stopped making progress without confirming a fresh
  // result. Do not disguise this as an empty panel or an endless skeleton.
  return 'stale';
};

interface StatePresentation {
  announcement: string;
  severity?: 'error' | 'info' | 'warning';
  live: 'assertive' | 'polite';
}

const statePresentations: Record<AnalyzerPanelStateKind, StatePresentation> = {
  loading: { announcement: 'Loading data.', live: 'polite' },
  empty: { announcement: 'No data is available for this panel.', live: 'polite' },
  partial: {
    announcement: 'Updating data; showing the latest available results.',
    severity: 'warning',
    live: 'polite',
  },
  stale: {
    announcement: 'Panel data is not confirmed current.',
    severity: 'warning',
    live: 'polite',
  },
  failed: {
    announcement: 'The latest refresh failed. Retained data may be out of date.',
    severity: 'error',
    live: 'assertive',
  },
  ready: { announcement: 'Data is ready.', live: 'polite' },
};

const canShowContent = (state: AnalyzerPanelStateKind): boolean =>
  state === 'partial' || state === 'stale' || state === 'failed' || state === 'ready';

/**
 * Shared state renderer for Analyzer widgets. It makes data freshness explicit
 * and preserves usable prior content when a refresh is incomplete or fails.
 */
export const AnalyzerPanelState: React.FC<AnalyzerPanelStateProps> = ({
  title,
  state,
  children,
  asOf,
  detail,
  onRetry,
  retryLabel = 'Try again',
}) => {
  const presentation = statePresentations[state];
  const titleId = React.useId();
  const shouldShowRetry = Boolean(onRetry) && (state === 'stale' || state === 'failed');
  const announcement = detail
    ? `${presentation.announcement} ${detail}`
    : presentation.announcement;

  return (
    <Paper component="section" aria-labelledby={titleId} variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}
      >
        <Typography component="h3" id={titleId} variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {asOf && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', color: 'text.secondary' }}
          >
            <ScheduleIcon aria-hidden="true" fontSize="small" />
            <Typography variant="caption">As of {asOf}</Typography>
          </Stack>
        )}
      </Stack>

      {state === 'loading' && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CircularProgress aria-label={`${title}: loading`} size={20} />
          <Typography role="status" aria-live={presentation.live} variant="body2">
            {announcement}
          </Typography>
        </Stack>
      )}

      {state === 'empty' && (
        <Typography
          role="status"
          aria-live={presentation.live}
          color="text.secondary"
          variant="body2"
        >
          {announcement}
        </Typography>
      )}

      {(state === 'partial' || state === 'stale' || state === 'failed') && (
        <Alert
          role={state === 'failed' ? 'alert' : 'status'}
          aria-live={presentation.live}
          severity={presentation.severity}
          sx={{ mb: canShowContent(state) && children ? 1.5 : 0 }}
        >
          {announcement}
        </Alert>
      )}

      {state === 'ready' && (
        <Typography
          role="status"
          aria-live={presentation.live}
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
          }}
        >
          {announcement}
        </Typography>
      )}

      {canShowContent(state) && children && <Box>{children}</Box>}

      {shouldShowRetry && (
        <Button onClick={onRetry} size="small" startIcon={<RefreshIcon />} sx={{ mt: 1 }}>
          {retryLabel}
        </Button>
      )}

      {state === 'failed' && !children && (
        <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
          No retained panel data is available.
        </Typography>
      )}
    </Paper>
  );
};
