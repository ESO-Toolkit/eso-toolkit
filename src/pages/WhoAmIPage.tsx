import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { trackEvent, trackPageView } from '@/utils/analytics';
import { addBreadcrumb } from '@/utils/errorTracking';

const fieldFallback = 'N/A';

export const WhoAmIPage: React.FC = () => {
  const { currentUser, userLoading, userError, refetchUser } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(() =>
    currentUser ? new Date() : null,
  );

  React.useEffect(() => {
    trackPageView('/whoami', 'Who Am I');
    addBreadcrumb('WhoAmI page viewed', 'navigation', {
      url: window.location.href,
    });
  }, []);

  React.useEffect(() => {
    if (currentUser) {
      setLastRefreshed(new Date());
    }
  }, [currentUser]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshError(null);
    setRefreshing(true);
    const hadUser = Boolean(currentUser);
    addBreadcrumb('WhoAmI manual refresh triggered', 'auth');
    trackEvent('WhoAmI', 'Manual Refresh Started', undefined, undefined, {
      had_user_before: hadUser,
    });

    try {
      await refetchUser();
      setLastRefreshed(new Date());
      addBreadcrumb('WhoAmI manual refresh completed', 'auth');
      trackEvent('WhoAmI', 'Manual Refresh Completed', undefined, undefined, {
        status: 'success',
        had_user_before: hadUser,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh user data';
      setRefreshError(message);
      addBreadcrumb('WhoAmI manual refresh failed', 'error', {
        message,
      });
      trackEvent('WhoAmI', 'Manual Refresh Completed', undefined, undefined, {
        status: 'error',
        had_user_before: hadUser,
      });
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, refetchUser]);

  const fields = React.useMemo(
    () => [
      { label: 'User ID', value: currentUser?.id ? String(currentUser.id) : fieldFallback },
      { label: 'Name', value: currentUser?.name || fieldFallback },
      { label: 'NA Display Name', value: currentUser?.naDisplayName || fieldFallback },
      { label: 'EU Display Name', value: currentUser?.euDisplayName || fieldFallback },
    ],
    [currentUser],
  );

  const showEmptyState = !userLoading && !currentUser && !userError;
  const buttonLabel = refreshing ? 'Refreshing...' : 'Refresh';

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }} gutterBottom>
              Who am I
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View the ESO Logs account currently tied to your session.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRefresh}
            disabled={refreshing || userLoading}
            startIcon={
              refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />
            }
            data-testid="whoami-refresh-button"
          >
            {buttonLabel}
          </Button>
        </Box>

        {(userLoading || refreshing) && <LinearProgress aria-label="loading user info" />}

        {userError && (
          <Alert severity="error" data-testid="whoami-error-alert">
            {userError}
          </Alert>
        )}

        {refreshError && (
          <Alert severity="warning" onClose={() => setRefreshError(null)}>
            {refreshError}
          </Alert>
        )}

        {showEmptyState && (
          <Alert severity="info" data-testid="whoami-empty-state">
            No user information is available yet. Try refreshing to sync your profile.
          </Alert>
        )}

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2} divider={<Divider flexItem />}>
              {fields.map((field) => (
                <Box
                  key={field.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    {field.label}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {field.value || fieldFallback}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {lastRefreshed && (
              <Box mt={3} display="flex" justifyContent="flex-end">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Last synced ${lastRefreshed.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {currentUser && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Raw user payload
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  p: 2,
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }}
              >
                {JSON.stringify(currentUser, null, 2)}
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

WhoAmIPage.displayName = 'WhoAmIPage';
