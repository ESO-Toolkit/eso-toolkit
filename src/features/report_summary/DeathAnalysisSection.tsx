/* eslint-disable import/no-default-export, @typescript-eslint/no-explicit-any */
import { Card, CardContent, Typography, Alert, LinearProgress } from '@mui/material';
import React from 'react';

interface DeathAnalysisSectionProps {
  deathAnalysis?: any;
  isLoading: boolean;
  error?: string;
}

const DeathAnalysisSection: React.FC<DeathAnalysisSectionProps> = ({
  deathAnalysis,
  isLoading,
  error,
}) => {
  if (error) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Death Analysis
          </Typography>
          <Alert severity="error">Error loading death analysis: {error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Death Analysis
          </Typography>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing death patterns across all fights...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Death Analysis
        </Typography>
        <Typography variant="body1">Death analysis feature coming soon...</Typography>
        {deathAnalysis && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Found {deathAnalysis.totalDeaths || 0} total deaths to analyze.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Export memoized component
export default React.memo(DeathAnalysisSection);
export { DeathAnalysisSection };
