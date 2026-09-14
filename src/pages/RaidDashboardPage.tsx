import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import {
  BuildIssuesWidget,
  DeathCausesWidget,
  LowBuffUptimesWidget,
  LowDpsWidget,
  MissingBuffsWidget,
  MissingFoodWidget,
} from '../components/dashboard';
import { AddWidgetDialog } from '../components/dashboard/AddWidgetDialog';
import { DynamicMetaTags } from '../components/DynamicMetaTags';
import { ReportActionBar } from '../components/ReportActionBar';
import { WorkInProgressDisclaimer } from '../components/WorkInProgressDisclaimer';
import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import {
  formatLiveDuration,
  formatLiveTimestamp,
  getNewestReportActivityAt,
  LiveDashboardAsOfContext,
  LiveDashboardHealthStatus,
  useLiveDashboardHealth,
} from '../features/live_logging/liveDashboardHealth';
import { FightFragment } from '../graphql/gql/graphql';
import { useReportData } from '../hooks';
import { useVisibilityGatedInterval } from '../hooks/useVisibilityGatedInterval';
import {
  addWidget,
  removeWidget,
  updateWidgetScope,
  setAutoRefreshEnabled,
  WidgetType,
  WidgetScope,
} from '../store/dashboard/dashboardSlice';
import { fetchReportData } from '../store/report/reportSlice';
import { RootState, AppDispatch } from '../store/storeWithHistory';

const REFETCH_INTERVAL = 5000;

export const RaidDashboardPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const client = useEsoLogsClientInstance();

  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = React.useState(false);

  const {
    reportData,
    isReportLoading: reportStateLoading,
    reportError: reportStateError,
    reportStateId,
  } = useReportData();
  const widgets = useSelector((state: RootState) => state.dashboard.widgets);
  const autoRefreshEnabled = useSelector((state: RootState) => state.dashboard.autoRefreshEnabled);

  // Redux can retain the last report briefly while a route change loads the
  // next one. Never let that retained data render under the new report URL.
  // Loading and error state belong to the report context, rather than to the
  // route currently being rendered. While the provider catches up after an
  // A -> B navigation, continue to show B as loading instead of presenting
  // A's failure as if it applied to B.
  const hasCurrentReportState =
    !reportId || reportStateId === undefined || reportStateId === reportId;
  const currentReportData =
    hasCurrentReportState && reportData?.code === reportId ? reportData : null;
  const isReportLoading = hasCurrentReportState ? reportStateLoading : true;
  const reportError = hasCurrentReportState ? reportStateError : null;

  const fetchLatestReport = React.useCallback(() => {
    if (reportId && client) {
      void dispatch(fetchReportData({ reportId, client, force: true }));
    }
  }, [reportId, client, dispatch]);

  const hasCurrentReportData = currentReportData !== null;
  const newestActivityAt = useMemo(
    () =>
      hasCurrentReportData
        ? getNewestReportActivityAt(currentReportData?.startTime, currentReportData?.fights ?? [])
        : null,
    [currentReportData?.fights, currentReportData?.startTime, hasCurrentReportData],
  );
  // Redux can retain an already-loaded prior report for a route-change render.
  // scopeKey makes the health hook mask that timestamp until the new report has
  // its own completed request lifecycle; retained data must not look freshly synced.
  const liveHealth = useLiveDashboardHealth({
    scopeKey: reportId,
    hasData: hasCurrentReportData,
    isLoading: isReportLoading,
    apiError: reportError,
    autoRefreshEnabled,
    newestActivityAt,
    onRetry: fetchLatestReport,
  });

  // Visibility-gated: a backgrounded dashboard must not re-fetch the whole
  // report every 5s (and re-render the widget tree) for nobody. On return, a
  // catch-up fetch fires immediately if a full interval elapsed hidden.
  useVisibilityGatedInterval(fetchLatestReport, REFETCH_INTERVAL, {
    enabled: autoRefreshEnabled && !reportError,
    leading: true,
  });

  const sortedFights = useMemo(() => {
    if (!currentReportData?.fights) return [];

    return [...currentReportData.fights]
      .filter((f): f is FightFragment => f !== null)
      .sort((a, b) => {
        const aEnd = a?.endTime ?? a?.startTime ?? 0;
        const bEnd = b?.endTime ?? b?.startTime ?? 0;
        return bEnd - aEnd;
      });
  }, [currentReportData?.fights]);

  const handleAddWidget = (type: WidgetType): void => {
    dispatch(addWidget({ type }));
  };

  const handleRemoveWidget = (widgetId: string): void => {
    dispatch(removeWidget(widgetId));
  };

  const handleUpdateWidgetScope = (widgetId: string, scope: WidgetScope): void => {
    dispatch(updateWidgetScope({ id: widgetId, scope }));
  };

  const handleToggleAutoRefresh = (): void => {
    dispatch(setAutoRefreshEnabled(!autoRefreshEnabled));
  };

  const metaTags = React.useMemo(() => {
    return {
      title: `Raid Dashboard - ${currentReportData?.title || reportId}`,
      description: `Live raid dashboard for ${reportId}`,
      url: `${window.location.origin}/report/${reportId}/dashboard`,
    };
  }, [currentReportData?.title, reportId]);

  const enabledWidgets = widgets.filter((w) => w.enabled);
  const widgetAsOf = React.useMemo(
    () => ({ asOf: liveHealth.lastSuccessfulSyncAt }),
    [liveHealth.lastSuccessfulSyncAt],
  );
  const healthLabels: Record<LiveDashboardHealthStatus, string> = {
    fresh: 'Fresh',
    delayed: 'Delayed',
    stale: 'Stale',
    offline: 'Offline',
    'api-error': 'API error',
  };
  const healthColors: Record<LiveDashboardHealthStatus, string> = {
    fresh: '#5ce572',
    delayed: '#ffd54f',
    stale: '#ff9a4a',
    offline: '#94a3b8',
    'api-error': '#ff6666',
  };
  const healthLabel = healthLabels[liveHealth.status];
  const healthDetail = reportError
    ? `API error. Showing data from ${formatLiveTimestamp(liveHealth.lastSuccessfulSyncAt)}.`
    : `Last successful sync ${formatLiveTimestamp(liveHealth.lastSuccessfulSyncAt)}. Fight activity lag ${formatLiveDuration(
        liveHealth.lagMs,
      )}.`;

  if (isReportLoading && !currentReportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleToggleAutoRefresh}
            aria-label={autoRefreshEnabled ? 'Pause live refresh' : 'Resume live refresh'}
            aria-pressed={autoRefreshEnabled}
            sx={{ minHeight: 44, '&:focus-visible': { outline: '3px solid #38bdf8' } }}
          >
            {autoRefreshEnabled ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outlined"
            onClick={fetchLatestReport}
            disabled
            aria-label="Refresh dashboard now"
            sx={{ minHeight: 44, '&:focus-visible': { outline: '3px solid #38bdf8' } }}
          >
            Refresh
          </Button>
        </Box>
        <Typography
          sx={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.3)',
            p: '20px 16px',
          }}
        >
          Loading dashboard…
        </Typography>
      </Box>
    );
  }

  if (!currentReportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleToggleAutoRefresh}
            aria-label={autoRefreshEnabled ? 'Pause live refresh' : 'Resume live refresh'}
            aria-pressed={autoRefreshEnabled}
            sx={{ minHeight: 44, '&:focus-visible': { outline: '3px solid #38bdf8' } }}
          >
            {autoRefreshEnabled ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outlined"
            onClick={fetchLatestReport}
            aria-label="Refresh dashboard now"
            sx={{ minHeight: 44, '&:focus-visible': { outline: '3px solid #38bdf8' } }}
          >
            Try Again
          </Button>
        </Box>
        <Typography
          role="status"
          aria-live="polite"
          aria-label={`Live synchronization status: ${healthLabel}. ${healthDetail}`}
          sx={{ mb: 1, color: healthColors[liveHealth.status], fontFamily: 'monospace' }}
        >
          {healthLabel} · {healthDetail}
          {liveHealth.nextRetryAt !== null &&
            ` Retrying in ${formatLiveDuration(liveHealth.nextRetryAt - Date.now())}.`}
        </Typography>
        <Typography variant="h5" color="error" role={reportError ? 'alert' : 'status'}>
          {reportError
            ? `API error: ${reportError}`
            : liveHealth.status === 'offline'
              ? 'Offline: unable to load report'
              : 'Failed to load report'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <DynamicMetaTags {...metaTags} />

      <LiveDashboardAsOfContext.Provider value={widgetAsOf}>
        <WorkInProgressDisclaimer
          featureName="Raid Dashboard"
          sx={{ mx: { xs: 1, sm: 2, md: 4 }, mt: 2 }}
        />

        <ReportActionBar
          reportId={reportId || ''}
          title={currentReportData.title || 'Raid Dashboard'}
          activePage="dashboard"
          actions={
            <>
              <Box
                component="button"
                type="button"
                onClick={handleToggleAutoRefresh}
                aria-label={autoRefreshEnabled ? 'Pause live refresh' : 'Resume live refresh'}
                aria-pressed={autoRefreshEnabled}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  px: '12px',
                  py: '7px',
                  background: autoRefreshEnabled
                    ? 'rgba(92,229,114,0.08)'
                    : 'rgba(148,163,184,0.06)',
                  border: autoRefreshEnabled
                    ? '1px solid rgba(92,229,114,0.3)'
                    : '1px solid rgba(148,163,184,0.18)',
                  borderRadius: '8px',
                  color: autoRefreshEnabled ? '#5ce572' : 'rgba(255,255,255,0.3)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: 44,
                  minHeight: 44,
                  '&:focus-visible': {
                    outline: '3px solid #38bdf8',
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    border: autoRefreshEnabled
                      ? '1.5px solid rgba(92,229,114,0.3)'
                      : '1.5px solid rgba(255,255,255,0.15)',
                    borderTopColor: autoRefreshEnabled ? '#5ce572' : 'rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    animation: autoRefreshEnabled ? 'spin 1.2s linear infinite' : 'none',
                    '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    // Activity indicator, not decoration — keep spinning on the
                    // low perf tier (opts out of the index.css animation kill).
                    '--perf-anim-duration': '1.2s',
                    '--perf-anim-iteration': 'infinite',
                    flexShrink: 0,
                  }}
                />
                {autoRefreshEnabled ? 'AUTO · 5s' : 'PAUSED'}
              </Box>
              <Button
                variant="outlined"
                onClick={fetchLatestReport}
                disabled={isReportLoading}
                aria-label="Refresh dashboard now"
                size="small"
                sx={{
                  textTransform: 'none',
                  color: '#dbeafe',
                  borderColor: 'rgba(148,163,184,0.35)',
                  minWidth: 44,
                  minHeight: 44,
                  '&:focus-visible': {
                    outline: '3px solid #38bdf8',
                    outlineOffset: 2,
                  },
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddWidgetDialogOpen(true)}
                size="small"
                sx={{
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #38bdf8, #00e1ff)',
                  color: '#0b1220',
                  fontWeight: 700,
                  minWidth: 44,
                  minHeight: 44,
                  '&:hover': { filter: 'brightness(1.08)' },
                  '&:focus-visible': {
                    outline: '3px solid #f8fafc',
                    outlineOffset: 2,
                  },
                }}
              >
                Add Widget
              </Button>
            </>
          }
        />

        {/* Dashboard body */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pb: 8 }}>
          {/* Intro section */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 3,
              my: 3,
            }}
          >
            <Box>
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#38bdf8',
                  mb: '6px',
                }}
              >
                Raid Dashboard
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 20, sm: 26 },
                  fontWeight: 800,
                  letterSpacing: '-0.015em',
                  color: '#ffffff',
                  mb: '6px',
                }}
              >
                {currentReportData.title || 'Analysis Dashboard'}
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', maxWidth: '68ch' }}>
                A widget-based analysis surface. Each widget is independently scoped — narrow it to
                the most recent pull, the last few fights, or the whole log. Auto-refresh picks up
                new data mid-raid.
              </Typography>
              <Box
                role="status"
                aria-live="polite"
                aria-label={`Live synchronization status: ${healthLabel}. ${healthDetail}`}
                id="live-sync-status"
                sx={{
                  mt: 1.5,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: healthColors[liveHealth.status],
                }}
              >
                LIVE SYNC · {healthLabel} · {healthDetail}
                {liveHealth.nextRetryAt !== null && (
                  <span>
                    {' '}
                    Retrying in {formatLiveDuration(liveHealth.nextRetryAt - Date.now())}.
                  </span>
                )}
              </Box>
              {liveHealth.newPullDetected && (
                <Typography
                  role="status"
                  aria-live="polite"
                  sx={{ mt: 0.5, color: '#38bdf8', fontSize: 12 }}
                >
                  New pull detected
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              <div>{enabledWidgets.length} widgets</div>
              {autoRefreshEnabled && (
                <div style={{ color: '#38bdf8', marginTop: 4 }}>Auto-refresh active</div>
              )}
            </Box>
          </Box>

          {/* Widget grid */}
          {sortedFights.length === 0 ? (
            <Typography
              sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
            >
              No fights found in this report. Waiting for data…
            </Typography>
          ) : (
            <Box
              sx={{
                columnCount: { xs: 1, md: 2 },
                columnGap: '16px',
              }}
            >
              {enabledWidgets.map((widget) => {
                const commonProps = {
                  id: widget.id,
                  scope: widget.scope,
                  reportId: reportId || '',
                  fights: sortedFights,
                  onRemove: () => handleRemoveWidget(widget.id),
                  onScopeChange: (scope: WidgetScope) => handleUpdateWidgetScope(widget.id, scope),
                };

                let widgetComponent: React.ReactNode = null;

                switch (widget.type) {
                  case 'death-causes':
                    widgetComponent = <DeathCausesWidget {...commonProps} />;
                    break;
                  case 'missing-buffs':
                    widgetComponent = <MissingBuffsWidget {...commonProps} />;
                    break;
                  case 'build-issues':
                    widgetComponent = <BuildIssuesWidget {...commonProps} />;
                    break;
                  case 'low-buff-uptimes':
                    widgetComponent = <LowBuffUptimesWidget {...commonProps} />;
                    break;
                  case 'low-dps':
                    widgetComponent = <LowDpsWidget {...commonProps} />;
                    break;
                  case 'missing-food':
                    widgetComponent = <MissingFoodWidget {...commonProps} />;
                    break;
                }

                return (
                  <Box key={widget.id} sx={{ display: 'inline-block', width: '100%', mb: '16px' }}>
                    {widgetComponent}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <AddWidgetDialog
          open={addWidgetDialogOpen}
          onClose={() => setAddWidgetDialogOpen(false)}
          onAddWidget={handleAddWidget}
        />
      </LiveDashboardAsOfContext.Provider>
    </Box>
  );
};
