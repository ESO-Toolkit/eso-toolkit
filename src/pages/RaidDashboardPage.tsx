import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, FormControlLabel, Switch, Typography } from '@mui/material';
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
import { FightFragment } from '../graphql/gql/graphql';
import { useReportData } from '../hooks';
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

  const { reportData, isReportLoading } = useReportData();
  const widgets = useSelector((state: RootState) => state.dashboard.widgets);
  const autoRefreshEnabled = useSelector((state: RootState) => state.dashboard.autoRefreshEnabled);

  const fetchLatestReport = React.useCallback(() => {
    if (reportId && client) {
      void dispatch(fetchReportData({ reportId, client }));
    }
  }, [reportId, client, dispatch]);

  React.useEffect(() => {
    if (!autoRefreshEnabled) return;

    fetchLatestReport();
    const interval = setInterval(() => {
      fetchLatestReport();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLatestReport, autoRefreshEnabled]);

  const sortedFights = useMemo(() => {
    if (!reportData?.fights) return [];

    return [...reportData.fights]
      .filter((f): f is FightFragment => f !== null)
      .sort((a, b) => {
        const aEnd = a?.endTime ?? a?.startTime ?? 0;
        const bEnd = b?.endTime ?? b?.startTime ?? 0;
        return bEnd - aEnd;
      });
  }, [reportData?.fights]);

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
      title: `Raid Dashboard - ${reportData?.title || reportId}`,
      description: `Live raid dashboard for ${reportId}`,
      url: `${window.location.origin}/#/report/${reportId}/dashboard`,
    };
  }, [reportId, reportData]);

  const enabledWidgets = widgets.filter((w) => w.enabled);

  if (isReportLoading && !reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Typography
          sx={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', p: '20px 16px' }}
        >
          Loading dashboard…
        </Typography>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Typography variant="h5" color="error">
          Failed to load report
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <DynamicMetaTags {...metaTags} />

      <WorkInProgressDisclaimer featureName="Raid Dashboard" sx={{ mx: { xs: 1, sm: 2, md: 4 }, mt: 2 }} />

      <ReportActionBar
        reportId={reportId || ''}
        title={reportData.title || 'Raid Dashboard'}
        activePage="dashboard"
        actions={
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefreshEnabled}
                  onChange={handleToggleAutoRefresh}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Auto-refresh
                  </Typography>
                  {autoRefreshEnabled && (
                    <RefreshIcon
                      color="primary"
                      sx={{
                        fontSize: '0.9rem',
                        animation: 'spin 2s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                  )}
                </Box>
              }
              sx={{ mr: 0 }}
            />
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
                '&:hover': { filter: 'brightness(1.08)' },
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
              {reportData.title || 'Analysis Dashboard'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', maxWidth: '68ch' }}>
              A widget-based analysis surface. Each widget is independently scoped — narrow it to
              the most recent pull, the last few fights, or the whole log. Auto-refresh picks up new
              data mid-raid.
            </Typography>
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
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            No fights found in this report. Waiting for data…
          </Typography>
        ) : (
          <Box
            sx={{
              columnCount: { xs: 1, md: 2, xl: 3 },
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
                <Box
                  key={widget.id}
                  sx={{ display: 'inline-block', width: '100%', mb: '16px' }}
                >
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
    </Box>
  );
};
