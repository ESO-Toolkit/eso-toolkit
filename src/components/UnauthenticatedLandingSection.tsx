import { LockOpen as LockOpenIcon } from '@mui/icons-material';
import { Box, Button, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { startPKCEAuth } from '../features/auth/auth';

export const UnauthenticatedLandingSection: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = (): void => {
    startPKCEAuth();
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Button
        variant="contained"
        size="large"
        onClick={handleLogin}
        startIcon={<LockOpenIcon />}
        sx={{
          py: 2,
          px: 6,
          borderRadius: '16px',
          fontSize: '1.2rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 50%, #0ea5e9 100%)',
          color: '#ffffff',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          border:
            theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.2)'
              : '1px solid rgba(30, 41, 59, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textShadow: `
            0 2px 4px rgba(0, 0, 0, 0.7),
            0 4px 8px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(14, 165, 233, 0.6),
            0 0 30px rgba(56, 189, 248, 0.4)
          `,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(30, 41, 59, 0.3), transparent)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background:
              'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            transition: 'left 0.6s ease',
          },
          '&:hover': {
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #00e1ff 100%)',
            transform: 'translateY(-4px)',
            boxShadow:
              '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            borderColor:
              theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(30, 41, 59, 0.25)',
            '&::after': {
              left: '100%',
            },
          },
          '&:active': {
            transform: 'translateY(-2px)',
          },
          [theme.breakpoints.down('sm')]: {
            py: 1.5,
            px: 4,
            fontSize: '1.1rem',
            borderRadius: '12px',
            '&:hover': {
              transform: 'none',
            },
          },
        }}
      >
        Connect to ESO Logs
      </Button>
      <Typography
        variant="body2"
        sx={{
          mt: 2,
          color: theme.palette.text.secondary,
          opacity: 0.8,
        }}
      >
        Connect your ESO Logs account to analyze combat logs
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          color: theme.palette.text.secondary,
          opacity: 0.7,
          fontSize: '0.875rem',
        }}
      >
        Want to learn more about privacy and data security?{' '}
        <Box
          component="span"
          onClick={() => navigate('/login')}
          sx={{
            color: theme.palette.primary.main,
            textDecoration: 'underline',
            cursor: 'pointer',
            '&:hover': {
              color: theme.palette.primary.dark,
            },
          }}
        >
          Visit our login page
        </Box>
      </Typography>
    </Box>
  );
};
