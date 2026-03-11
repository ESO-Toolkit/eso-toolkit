import { Add, Refresh } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useAuth } from '../../auth/AuthContext';
import { rosterHubApi } from '../api/roster-hub-api';
import { useRosterHub } from '../hooks/use-roster-hub';
import type { HubRoster } from '../types/roster-hub.types';

import { ConfirmDialog } from './ConfirmDialog';
import { FilterBar } from './FilterBar';
import { RosterCard } from './RosterCard';
import { RosterCardSkeleton } from './RosterCardSkeleton';
import { RosterPreviewDialog } from './RosterPreviewDialog';

const SKELETON_COUNT = 8;

export const RosterHubPage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken, currentUser } = useAuth();
  const token = isLoggedIn ? accessToken : undefined;

  const { filteredRosters, loading, error, filters, hasMore, setFilter, loadMore, refresh, vote } =
    useRosterHub(token);

  const [previewRoster, setPreviewRoster] = React.useState<HubRoster | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const currentUserId = String(currentUser?.id ?? '');

  const handleVote = React.useCallback(
    (rosterId: string) => {
      if (!token) {
        enqueueSnackbar('Log in to vote on rosters', { variant: 'info' });
        return;
      }
      void vote(rosterId, token);
    },
    [token, vote, enqueueSnackbar],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!token || !deleteTarget) return;
    setDeleteLoading(true);
    try {
      await rosterHubApi.delete(deleteTarget, token);
      enqueueSnackbar('Roster deleted', { variant: 'success' });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete roster', {
        variant: 'error',
        autoHideDuration: 8000,
      });
    } finally {
      setDeleteLoading(false);
    }
  }, [token, deleteTarget, enqueueSnackbar, refresh]);

  const isDark = theme.palette.mode === 'dark';
  const gradientText = isDark
    ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
    : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={700}
            sx={{
              background: gradientText,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}
          >
            Roster Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Browse, vote, and share raid compositions for every ESO trial. Click any card to preview.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button
            startIcon={<Refresh />}
            variant="outlined"
            size="small"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh roster list"
          >
            Refresh
          </Button>
          {isLoggedIn && (
            <Button
              startIcon={<Add />}
              variant="contained"
              size="small"
              href="/roster-builder"
            >
              Build &amp; Publish
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <FilterBar
        filters={filters}
        totalCount={loading ? null : filteredRosters.length}
        onFilterChange={setFilter}
      />

      {/* Content */}
      <Box sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={refresh}>
            {error}
          </Alert>
        )}

        {/* Initial load skeletons */}
        {loading && filteredRosters.length === 0 && (
          <Grid container spacing={2}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ display: 'flex' }}>
                <RosterCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty state */}
        {!loading && filteredRosters.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No rosters found
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              {filters.trial || filters.tag || filters.search
                ? 'Try adjusting or clearing the filters.'
                : 'Be the first to publish a roster!'}
            </Typography>
            {(filters.trial || filters.tag || filters.search) && (
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => {
                  setFilter('trial', '');
                  setFilter('tag', '');
                  setFilter('search', '');
                }}
              >
                Clear filters
              </Button>
            )}
          </Box>
        )}

        {/* Card grid */}
        {filteredRosters.length > 0 && (
          <ErrorBoundary>
            <Grid container spacing={2}>
              {filteredRosters.map((roster) => (
                <Grid key={roster.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ display: 'flex' }}>
                  <RosterCard
                    roster={roster}
                    isOwner={isLoggedIn && roster.author_id === currentUserId}
                    isLoggedIn={isLoggedIn}
                    onVote={handleVote}
                    onPreview={setPreviewRoster}
                    onDelete={setDeleteTarget}
                  />
                </Grid>
              ))}
            </Grid>
          </ErrorBoundary>
        )}

        {/* Load more / end indicator */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          {loading && filteredRosters.length > 0 ? null : hasMore && filteredRosters.length > 0 ? (
            <Button variant="outlined" onClick={loadMore} aria-label="Load more rosters">
              Load more
            </Button>
          ) : filteredRosters.length > 0 ? (
            <Typography variant="caption" color="text.disabled">
              All rosters loaded
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Not logged in nudge */}
      {!isLoggedIn && (
        <Alert severity="info" sx={{ mt: 4 }}>
          Log in with your ESO Logs account to vote on rosters or publish your own.
        </Alert>
      )}

      {/* Roster preview dialog */}
      <RosterPreviewDialog
        roster={previewRoster}
        isLoggedIn={isLoggedIn}
        currentUserId={currentUserId}
        token={token}
        onClose={() => setPreviewRoster(null)}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete roster?"
        message="This will permanently remove the roster from the Hub. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};
