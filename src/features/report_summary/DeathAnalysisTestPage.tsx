import React from 'react';
import { Box, Typography, Button, Alert, LinearProgress } from '@mui/material';
import { useParams } from 'react-router-dom';

import { useOptimizedReportSummaryFetching } from './hooks/useOptimizedReportSummaryFetching';
import { EnhancedDeathAnalysisSection } from './EnhancedDeathAnalysisSection';

/**
 * Test component for the enhanced death analysis
 * 
 * This demonstrates the optimized event fetching with enhanced death analysis
 * showing abilities, actors, and patterns that caused deaths.
 */
export const DeathAnalysisTestPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  
  const {
    reportSummaryData,
    isLoading,
    progress,
    error,
    fetchData,
    fetchMetrics
  } = useOptimizedReportSummaryFetching(reportId || '');

  const handleFetchData = () => {
    if (reportId) {
      fetchData({ 
        reportCode: reportId,
        includeDetailedAnalysis: true 
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Enhanced Death Analysis Test
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Testing the new death analysis system that shows abilities and actors causing deaths.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleFetchData}
          disabled={isLoading || !reportId}
        >
          {isLoading ? 'Fetching Data...' : 'Fetch & Analyze Deaths'}
        </Button>
      </Box>

      {/* Progress Display */}
      {progress && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {progress.currentTask}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(progress.current / progress.total) * 100}
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {progress.current} / {progress.total} tasks completed
          </Typography>
        </Box>
      )}

      {/* Performance Metrics */}
      {fetchMetrics && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Performance:</strong> {fetchMetrics.totalApiCalls} API calls, 
            {' '}{Math.round(fetchMetrics.totalFetchTime)}ms total, 
            {' '}{Math.round(fetchMetrics.eventsPerSecond)} events/sec
          </Typography>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Error:</strong> {error}
          </Typography>
        </Alert>
      )}

      {/* Death Analysis Results */}
      <EnhancedDeathAnalysisSection
        deathAnalysis={reportSummaryData?.deathAnalysis}
        isLoading={isLoading}
        error={error || undefined}
      />

      {/* Debug Information */}
      {reportSummaryData && !isLoading && (
        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          <Typography variant="body2" component="pre" sx={{ 
            fontFamily: 'monospace', 
            fontSize: '0.8rem',
            overflow: 'auto',
            maxHeight: 300
          }}>
            {JSON.stringify({
              totalDeaths: reportSummaryData.deathAnalysis?.totalDeaths,
              mechanicsCount: reportSummaryData.deathAnalysis?.mechanicDeaths?.length,
              playersAffected: reportSummaryData.deathAnalysis?.playerDeaths?.length,
              patternsFound: reportSummaryData.deathAnalysis?.deathPatterns?.length,
              topMechanics: reportSummaryData.deathAnalysis?.mechanicDeaths?.slice(0, 3).map(m => ({
                name: m.mechanicName,
                deaths: m.totalDeaths,
                category: m.category
              })),
              reportInfo: {
                fights: reportSummaryData.fights?.length,
                duration: Math.round((reportSummaryData.reportInfo?.duration || 0) / 1000 / 60)
              }
            }, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};