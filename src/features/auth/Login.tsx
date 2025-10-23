import LockOpenIcon from '@mui/icons-material/LockOpen';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Container,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import React from 'react';

import { startPKCEAuth } from './auth';
import { useAuth } from './AuthContext';

export const Login: React.FC = () => {
  const theme = useTheme();
  const { isBanned, banReason, userError } = useAuth();
  const banMessage = banReason || userError;

  const handleLogin = (): boolean => {
    startPKCEAuth();
    return false;
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '70vh',
          justifyContent: 'center',
        }}
      >
        {/* Main Login Card */}
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {isBanned && banMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {banMessage}
              </Alert>
            )}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {/* Logo/Icon */}
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: theme.shadows[4],
                }}
              >
                <LockOpenIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>

              {/* Title */}
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                data-testid="login-title"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                ESO Log Aggregator
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Connect with ESO Logs to analyze your combat data
              </Typography>

              {/* Login Button */}
              <Button
                variant="contained"
                size="large"
                onClick={handleLogin}
                startIcon={<LockOpenIcon />}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  boxShadow: theme.shadows[4],
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${alpha(theme.palette.primary.dark, 0.8)})`,
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[8],
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Connect to ESO Logs
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Privacy Disclaimer */}
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            mt: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Alert
              severity="info"
              icon={<SecurityIcon />}
              sx={{
                border: 'none',
                backgroundColor: 'transparent',
                '& .MuiAlert-icon': {
                  color: theme.palette.success.main,
                },
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Privacy & Data Security
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                Your privacy is our priority. This application:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2">
                  <strong>Does not collect or store</strong> any personal data on our servers
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Stores all data locally</strong> in your browser&apos;s local storage
                </Typography>
              </Box>
            </Alert>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <StorageIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1 }} />
            All data is stored locally on your device
          </Typography>
          <Typography variant="caption" color="text.secondary">
            You can clear your data at any time through your browser settings
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};
