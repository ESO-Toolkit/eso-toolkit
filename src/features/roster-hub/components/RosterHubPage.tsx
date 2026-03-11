import { Add, Refresh } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import React from 'react';

import { useAuth } from '../../auth/AuthContext';
import { rosterHubApi } from '../api/roster-hub-api';
import { useRosterHub } from '../hooks/use-roster-hub';
import type { HubRoster } from '../types/roster-hub.types';

import { FilterBar } from './FilterBar';
import { RosterCard } from './RosterCard';

export const RosterHubPage: React.FC = () => {
  const { isLoggedIn, accessToken, currentUser } = useAuth();
  const token = isLoggedIn ? accessToken : undefined;
  const { rosters, loading, error, filters, hasMore, setFilter, loadMore, refresh, vote } =
    useRosterHub(token);

  const handleVote = React.useCallback(
    (rosterId: string) => {
      if (!token) return;
      void vote(rosterId, token);
    },
    [token, vote],
  );

  const handleLoad = React.useCallback((roster: HubRoster) => {
    rosterHubApi.loadRosterIntoBuilder(roster);
  }, []);

  const handleDelete = React.useCallback(
    async (rosterId: string) => {
      if (!token) return;
      if (!window.confirm('Delete this roster from the Hub? This cannot be undone.')) return;
      try {
        await rosterHubApi.delete(rosterId, token);
        refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete');
      }
    },
    [token, refresh],
  );

  const currentUserId = currentUser?.id ?? '';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
          <Typography variant="h4" component="h1" fontWeight={700}>
            Roster Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Browse, vote, and share raid compositions for every ESO trial.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<Refresh />}
            variant="outlined"
            size="small"
            onClick={refresh}
            disabled={loading}
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
      <FilterBar filters={filters} onFilterChange={setFilter} />

      {/* Content */}
      <Box sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={refresh}>
            {error}
          </Alert>
        )}

        {!loading && rosters.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No rosters found
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              {filters.trial || filters.tag
                ? 'Try clearing the filters.'
                : 'Be the first to publish a roster!'}
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          {rosters.map((roster) => (
            <Grid key={roster.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <RosterCard
                roster={roster}
                isOwner={isLoggedIn && roster.author_id === currentUserId}
                isLoggedIn={isLoggedIn}
                onVote={handleVote}
                onLoad={handleLoad}
                onDelete={(id) => void handleDelete(id)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Load more / spinner */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          {loading ? (
            <CircularProgress size={32} />
          ) : hasMore && rosters.length > 0 ? (
            <Button variant="outlined" onClick={loadMore}>
              Load more
            </Button>
          ) : rosters.length > 0 ? (
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
    </Container>
  );
};
