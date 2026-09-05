import { Block } from '@mui/icons-material';
import { Box, Button, Container, Link, Paper, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { usePageTitle } from '@/hooks/useDocumentTitle';

import { clearStoredTokens } from '../features/auth/auth';
import { useAuth } from '../features/auth/AuthContext';
import { resetBuild } from '../features/build-editor/store/buildEditorSlice';
import { clearSavedBuilds } from '../store/saved_builds';
import {
  beginBuildStorageCleanup,
  clearBuildStorage,
} from '../store/saved_builds/savedBuildStorage';
import { persistor } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';
import { clearUserContext } from '../utils/errorTracking';

/**
 * Banned page - displayed when a user's account has been banned
 */
export const Banned: React.FC = () => {
  const { banReason, setAccessToken } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  usePageTitle('/banned');

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    beginBuildStorageCleanup();
    // Drop both tokens — leaving the long-lived refresh_token behind lets a
    // 401-triggered refresh silently re-mint a session after logout.
    clearStoredTokens();
    clearUserContext();
    setAccessToken('');
    dispatch(clearSavedBuilds());
    dispatch(resetBuild());
    // Purge account-bound persisted state (loadouts/builds) so it can't outlive
    // the session on a shared machine.
    const cleanupResults = await Promise.allSettled([persistor.purge(), clearBuildStorage()]);
    if (cleanupResults.some((result) => result.status === 'rejected')) {
      enqueueSnackbar('Signed out. Local build cleanup will retry automatically.', {
        variant: 'warning',
      });
    }
    setIsLoggingOut(false);
    navigate('/');
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: (theme: Theme) =>
            theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.05)',
          borderLeft: (theme: Theme) => `4px solid ${theme.palette.error.main}`,
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
          {banReason || 'Access denied: this ESO Logs account has been banned from ESO Toolkit.'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 4 }} color="text.secondary">
          If you believe this is an error, please contact the administrator through{' '}
          <Link
            href="https://github.com/ESO-Toolkit/eso-toolkit/discussions"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Discussions
          </Link>
          .
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          size="large"
        >
          {isLoggingOut ? 'Clearing local data...' : 'Return to Home'}
        </Button>
      </Paper>
    </Container>
  );
};
