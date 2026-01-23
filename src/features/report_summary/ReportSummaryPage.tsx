import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import React, { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { DynamicMetaTags } from '../../components/DynamicMetaTags';
import { ReportFragment } from '../../graphql/gql/graphql';
import { useReportData } from '../../hooks';
import { ReportSummaryData } from '../../types/reportSummaryTypes';

// Lazy load heavy sections for better performance
const DamageBreakdownSection = React.lazy(() => import('./DamageBreakdownSection'));
const EnhancedDeathAnalysisSection = React.lazy(() => import('./EnhancedDeathAnalysisSection'));
import { useOptimizedReportSummaryData } from './hooks/useOptimizedReportSummaryData';

export const ReportSummaryPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();

  // Memoize reportId to prevent unnecessary re-fetches if URL params change
  const stableReportId = React.useMemo(() => reportId || '', [reportId]);

  // Get basic report data
  const { reportData, isReportLoading } = useReportData();

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
      title: 'Report Summary - ESO Log Aggregator',
      description: 'Comprehensive report analysis with damage breakdown and death patterns.',
      url: window.location.href,
    };
  }, [stableReportId, reportData]);

  // Show loading state
  if (isReportLoading || isSummaryLoading) {
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
      />

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
}

const ReportSummaryHeader: React.FC<ReportSummaryHeaderProps> = ({
  reportData,
  summaryData,
  reportId,
}) => {
  const navigate = useNavigate();

  const handleBackToFights = (): void => {
    navigate(`/report/${reportId}`);
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={handleBackToFights}
            sx={{
              mr: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            aria-label="Back to fight selector"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
              fontWeight: 600,
              flex: 1,
            }}
          >
            Report Summary
          </Typography>
          <Chip
            label={`${summaryData?.fights.length || 0} Fights`}
            color="primary"
            variant="outlined"
          />
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToFights}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Back to Fights
          </Button>
        </Box>

        <Typography variant="h5" color="text.secondary" gutterBottom>
          {reportData?.title}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {reportData?.zone?.name && (
            <Chip label={reportData.zone.name} size="small" color="secondary" />
          )}
          {summaryData?.reportInfo.duration && (
            <Chip label={formatDuration(summaryData.reportInfo.duration)} size="small" />
          )}
          {summaryData?.deathAnalysis.totalDeaths !== undefined && (
            <Chip
              label={`${summaryData.deathAnalysis.totalDeaths} Total Deaths`}
              size="small"
              color={summaryData.deathAnalysis.totalDeaths === 0 ? 'success' : 'warning'}
            />
          )}
        </Box>

        {summaryData?.reportInfo && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Report from {new Date(summaryData.reportInfo.startTime).toLocaleString()}
            {summaryData.reportInfo.ownerName &&
              ` • Uploaded by ${summaryData.reportInfo.ownerName}`}
          </Typography>
        )}
      </CardContent>
    </Card>
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
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
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

        <Typography variant="body2" color="text.secondary">
          📊 Aggregating damage data across all fights
          <br />
          💀 Analyzing death patterns and mechanics
          <br />
          🎯 Identifying improvement opportunities
        </Typography>
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
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h5" gutterBottom color="error">
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
