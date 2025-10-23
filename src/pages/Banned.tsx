import { Block } from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { LOCAL_STORAGE_ACCESS_TOKEN_KEY } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';

/**
 * Banned page - displayed when a user's account has been banned
 */
export const Banned: React.FC = () => {
  const { banReason, setAccessToken } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY);
    setAccessToken('');
    navigate('/');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.05)',
          borderLeft: (theme) => `4px solid ${theme.palette.error.main}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Block
            sx={{
              fontSize: 80,
              color: 'error.main',
            }}
          />
        </Box>

        <Typography variant="h4" component="h1" gutterBottom color="error">
          Account Banned
        </Typography>

        <Typography variant="body1" sx={{ mt: 2, mb: 3 }} color="text.secondary">
          {banReason ||
            'Access denied: this ESO Logs account has been banned from ESO Log Aggregator.'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 4 }} color="text.secondary">
          If you believe this is an error, please contact the administrator.
        </Typography>

        <Button variant="contained" color="primary" onClick={handleLogout} size="large">
          Return to Home
        </Button>
      </Paper>
    </Container>
  );
};
