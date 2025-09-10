import { Construction } from '@mui/icons-material';
import { Box, Typography, Container, Paper, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

const LogsContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));

const LogsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  borderRadius: theme.spacing(2),
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(3,7,18,0.98) 100%)'
      : 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
  backdropFilter: 'blur(20px)',
  border:
    theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(59, 130, 246, 0.15)',
}));

export const Logs: React.FC = () => {
  return (
    <LogsContainer>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 3,
            textAlign: 'center',
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          📋 Logs
        </Typography>

        <LogsCard elevation={4}>
          <Construction
            sx={{
              fontSize: 64,
              color: 'text.secondary',
              mb: 2,
            }}
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              mb: 2,
              color: 'text.primary',
            }}
          >
            Coming Soon
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 3,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            This logs page is currently under development. We're working on bringing you advanced
            logging features for better analysis and debugging of your ESO game data.
          </Typography>

          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body2">
              <strong>Coming features:</strong> Log viewing, filtering, search, export capabilities,
              and integration with the main log analyzer.
            </Typography>
          </Alert>
        </LogsCard>
      </Container>
    </LogsContainer>
  );
};
