import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
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

const REFETCH_INTERVAL = 5000; // 5 seconds

export const RaidDashboardPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const client = useEsoLogsClientInstance();

  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = React.useState(false);

  const { reportData, isReportLoading } = useReportData();
  const widgets = useSelector((state: RootState) => state.dashboard.widgets);
  const autoRefreshEnabled = useSelector((state: RootState) => state.dashboard.autoRefreshEnabled);

  // Auto-refresh report data
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

  // Get fights sorted by most recent first
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

  if (isReportLoading && !reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Loading Dashboard...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Card>
          <CardContent>
            <Typography variant="h5" color="error">
              Failed to load report
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <DynamicMetaTags {...metaTags} />

      {/* Development Banner */}
      <WorkInProgressDisclaimer featureName="Raid Dashboard" sx={{ mb: 3 }} />

      {/* Header */}
      <ReportActionBar
        reportId={reportId || ''}
        title={reportData.title || 'Raid Dashboard'}
        activePage="dashboard"
        actions={
          <>
            <FormControlLabel
              control={<Switch checked={autoRefreshEnabled} onChange={handleToggleAutoRefresh} size="small" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Auto-refresh</Typography>
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
              sx={{ fontSize: '0.8rem', textTransform: 'none' }}
            >
              Add Widget
            </Button>
          </>
        }
      />

      {/* Widgets Grid */}
      {sortedFights.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No fights found in this report. Waiting for data...
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            columnCount: {
              xs: 1,
              lg: 2,
            },
            columnGap: 3,
          }}
        >
          {widgets
            .filter((w) => w.enabled)
            .map((widget) => {
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
                <Box key={widget.id} sx={{ display: 'inline-block', width: '100%', mb: 3 }}>
                  {widgetComponent}
                </Box>
              );
            })}
        </Box>
      )}

      {/* Add Widget Dialog */}
      <AddWidgetDialog
        open={addWidgetDialogOpen}
        onClose={() => setAddWidgetDialogOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </Box>
  );
};
