import BarChartIcon from '@mui/icons-material/BarChart';
import DangerousIcon from '@mui/icons-material/Dangerous';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';

import { DynamicMetaTags } from '../../components/DynamicMetaTags';
import { ReportActionBar } from '../../components/ReportActionBar';
import { ReportFragment } from '../../graphql/gql/graphql';
import { useReportData } from '../../hooks';
import { glassCardSurfaceSx, SUMMARY_ACCENTS } from '../../theme/glassCardSurface';
import { ReportSummaryData } from '../../types/reportSummaryTypes';

// Lazy load heavy sections for better performance
const DamageBreakdownSection = React.lazy(() =>
  import('./DamageBreakdownSection').then((m) => ({ default: m.DamageBreakdownSection })),
);
const EnhancedDeathAnalysisSection = React.lazy(() =>
  import('./EnhancedDeathAnalysisSection').then((m) => ({
    default: m.EnhancedDeathAnalysisSection,
  })),
);

import {
  isUsableFight,
  useOptimizedReportSummaryData,
} from './hooks/useOptimizedReportSummaryData';
import { chipPillSx, SEMANTIC_ACCENTS } from './summaryStyles';

export const ReportSummaryPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();

  // Memoize reportId to prevent unnecessary re-fetches if URL params change
  const stableReportId = React.useMemo(() => reportId || '', [reportId]);

  // Get basic report data
  const { reportData, isReportLoading } = useReportData();

  // The fight list ships with the report metadata, well before the (slow)
  // per-fight event aggregation finishes — used to show the fight count in the
  // header immediately instead of flashing "0 Fights" during the summary load.
  // Uses the same validity filter as the aggregation (isUsableFight) so the
  // count never visibly drops when summaryData resolves.
  const reportFightCount = reportData?.fights?.filter(isUsableFight).length;

  // Get aggregated summary data using optimized Redux-based hook
  const {
    reportSummaryData: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
    progress,
  } = useOptimizedReportSummaryData(stableReportId);

  // Generate meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (stableReportId && reportData) {
      return {
        title: `${reportData.title || stableReportId} - Report Summary`,
        description: `Complete analysis summary for ESO report ${stableReportId} including damage breakdown and death analysis across all fights.`,
        url: `${window.location.origin}/#/report/${stableReportId}/summary`,
      };
    }
    return {
      title: 'Report Summary | ESO Toolkit',
      description: 'Comprehensive report analysis with damage breakdown and death patterns.',
      url: window.location.href,
    };
  }, [stableReportId, reportData]);

  // Show the full-page loading view only while the report *metadata* itself is
  // loading — without it there is no header/zone/title to anchor the page. The
  // slow per-fight event aggregation (isSummaryLoading) no longer blocks the
  // whole page: the header renders immediately and each section shows its own
  // skeleton until its data lands (progressive render).
  if (isReportLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <ReportSummaryLoadingView progress={progress ?? undefined} />
      </Box>
    );
  }

  // Show error state
  if (summaryError || !reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <ReportSummaryErrorView
          error={summaryError || 'Failed to load report data'}
          reportId={stableReportId}
        />
      </Box>
    );
  }

  // Show main content
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <DynamicMetaTags {...metaTags} />

      <ReportSummaryHeader
        reportData={reportData}
        summaryData={summaryData ?? undefined}
        reportId={stableReportId}
        fallbackFightCount={reportFightCount}
      />

      {isSummaryLoading && (
        <Box sx={{ mb: 2 }}>
          {progress && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {progress.currentTask}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.current}/{progress.total}
              </Typography>
            </Box>
          )}
          <LinearProgress
            variant={progress ? 'determinate' : 'indeterminate'}
            value={progress ? (progress.current / progress.total) * 100 : undefined}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      {summaryData && Object.keys(summaryData.errors.fightErrors).length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {`Some events couldn't be loaded for ${Object.keys(summaryData.errors.fightErrors).length} fight(s); the summary below is based on the data that loaded.`}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
        {/* Damage Breakdown Section */}
        <Box>
          <Suspense fallback={<LinearProgress sx={{ mb: 2 }} />}>
            <DamageBreakdownSection
              damageBreakdown={summaryData?.damageBreakdown}
              isLoading={isSummaryLoading}
              error={summaryError ?? undefined}
            />
          </Suspense>
        </Box>

        {/* Enhanced Death Analysis Section */}
        <Box>
          <Suspense fallback={<LinearProgress sx={{ mb: 2 }} />}>
            <EnhancedDeathAnalysisSection
              deathAnalysis={summaryData?.deathAnalysis}
              isLoading={isSummaryLoading}
              error={summaryError ?? undefined}
            />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
};

interface ReportSummaryHeaderProps {
  reportData: ReportFragment | null;
  summaryData?: ReportSummaryData;
  reportId: string;
  /** Fight count from report master data, shown until the aggregation lands. */
  fallbackFightCount?: number;
}

const ReportSummaryHeader: React.FC<ReportSummaryHeaderProps> = ({
  reportData,
  summaryData,
  reportId,
  fallbackFightCount,
}) => {
  return (
    <>
      <ReportActionBar
        reportId={reportId}
        title={reportData?.title || 'Report Summary'}
        activePage="summary"
      />

      {/* Summary metadata chips */}
      <Card
        elevation={0}
        sx={(theme) => ({ ...glassCardSurfaceSx(theme.palette.mode === 'dark'), mb: 3 })}
      >
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`${summaryData?.fights.length ?? fallbackFightCount ?? 0} Fights`}
              size="small"
              sx={(theme) => chipPillSx(theme.palette.mode === 'dark', SEMANTIC_ACCENTS.cyan)}
            />
            {reportData?.zone?.name && (
              <Chip
                label={reportData.zone.name}
                size="small"
                sx={(theme) => chipPillSx(theme.palette.mode === 'dark', SEMANTIC_ACCENTS.violet)}
              />
            )}
            {summaryData?.reportInfo.duration && (
              <Chip
                label={formatDuration(summaryData.reportInfo.duration)}
                size="small"
                sx={(theme) => chipPillSx(theme.palette.mode === 'dark', SEMANTIC_ACCENTS.slate)}
              />
            )}
            {summaryData?.deathAnalysis?.totalDeaths !== undefined && (
              <Chip
                label={`${summaryData.deathAnalysis.totalDeaths} Total Deaths`}
                size="small"
                sx={(theme) =>
                  chipPillSx(
                    theme.palette.mode === 'dark',
                    summaryData.deathAnalysis?.totalDeaths === 0
                      ? SEMANTIC_ACCENTS.green
                      : SEMANTIC_ACCENTS.coral,
                  )
                }
              />
            )}
            {summaryData?.reportInfo && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {new Date(summaryData.reportInfo.startTime).toLocaleString()}
                {summaryData.reportInfo.ownerName && ` · ${summaryData.reportInfo.ownerName}`}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </>
  );
};

interface ReportSummaryLoadingViewProps {
  progress?: {
    current: number;
    total: number;
    currentTask: string;
  };
}

const ReportSummaryLoadingView: React.FC<ReportSummaryLoadingViewProps> = ({ progress }) => {
  return (
    <Card elevation={0} sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark')}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Loading Report Summary
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Analyzing all fight data to generate comprehensive report insights. This may take a
          moment...
        </Typography>

        {progress && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {progress.currentTask}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress.current}/{progress.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(progress.current / progress.total) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {!progress && <LinearProgress sx={{ mb: 2 }} />}

        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <BarChartIcon fontSize="small" color="action" aria-hidden />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" color="text.secondary">
                Aggregating damage data across all fights
              </Typography>
            </ListItemText>
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <DangerousIcon fontSize="small" color="action" aria-hidden />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" color="text.secondary">
                Analyzing death patterns and mechanics
              </Typography>
            </ListItemText>
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <InsightsIcon fontSize="small" color="action" aria-hidden />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" color="text.secondary">
                Identifying improvement opportunities
              </Typography>
            </ListItemText>
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
};

interface ReportSummaryErrorViewProps {
  error: string;
  reportId?: string;
}

const ReportSummaryErrorView: React.FC<ReportSummaryErrorViewProps> = ({ error, reportId }) => {
  return (
    <Card
      elevation={0}
      sx={(theme) => glassCardSurfaceSx(theme.palette.mode === 'dark', SUMMARY_ACCENTS.death)}
    >
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom color="error">
          Failed to Load Report Summary
        </Typography>

        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>

        <Typography variant="body1" color="text.secondary">
          We couldn&apos;t generate the report summary for report {reportId}. This could be due to:
        </Typography>

        <Box component="ul" sx={{ mt: 2, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Network connectivity issues
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Invalid or private report
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Insufficient fight data
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Server processing errors
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Please try refreshing the page or contact support if the issue persists.
        </Typography>
      </CardContent>
    </Card>
  );
};

// Helper function to format duration
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
