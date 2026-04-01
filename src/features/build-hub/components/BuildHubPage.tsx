import { Add, Handyman, Refresh, SearchOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../../roster-hub/components/ConfirmDialog';
import { buildHubApi } from '../api/build-hub-api';
import { useBuildHub } from '../hooks/use-build-hub';
import type { HubBuild } from '../types/build-hub.types';

import { BuildCard } from './BuildCard';
import { BuildCardSkeleton } from './BuildCardSkeleton';
import { BuildFilterBar } from './BuildFilterBar';
import { BuildPreviewDialog } from './BuildPreviewDialog';
import { PublishBuildDialog } from './PublishBuildDialog';

const SKELETON_COUNT = 8;

export const BuildHubPage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken, currentUser } = useAuth();
  const token = isLoggedIn ? accessToken : undefined;

  const { filteredBuilds, loading, error, filters, hasMore, setFilter, loadMore, refresh, vote } =
    useBuildHub(token);

  const [previewBuild, setPreviewBuild] = React.useState<HubBuild | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [editBuild, setEditBuild] = React.useState<HubBuild | null>(null);

  const currentUserId = String(currentUser?.id ?? '');

  const handleVote = React.useCallback(
    (buildId: string) => {
      if (!token) {
        enqueueSnackbar('Log in to vote on builds', { variant: 'info' });
        return;
      }
      void vote(buildId, token);
    },
    [token, vote, enqueueSnackbar],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!token || !deleteTarget) return;
    setDeleteLoading(true);
    try {
      await buildHubApi.delete(deleteTarget, token);
      enqueueSnackbar('Build deleted', { variant: 'success' });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete build', {
        variant: 'error',
        autoHideDuration: 8000,
      });
    } finally {
      setDeleteLoading(false);
    }
  }, [token, deleteTarget, enqueueSnackbar, refresh]);

  const isDark = theme.palette.mode === 'dark';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero header */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          px: 2.5,
          py: 2,
          borderRadius: 2,
          background: isDark
            ? 'linear-gradient(135deg, rgba(110,170,240,0.10) 0%, rgba(152,131,227,0.07) 50%, rgba(11,18,32,0.4) 100%)'
            : 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(255,255,255,0.6) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.6) 30%, rgba(167,139,250,0.8) 60%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.4) 30%, rgba(124,58,237,0.5) 60%, transparent 100%)',
            borderRadius: '4px 4px 0 0',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark
                ? 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.12) 100%)'
                : 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.08) 100%)',
              border: isDark ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(37,99,235,0.18)',
            }}
          >
            <Handyman sx={{ fontSize: '1.25rem', color: isDark ? '#60a5fa' : '#2563eb' }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.8)',
                lineHeight: 1.2,
              }}
            >
              Community
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
                background: isDark
                  ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.3,
              }}
            >
              Build Hub
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
          <Tooltip title="Refresh build list">
            <IconButton
              size="small"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh build list"
              sx={{
                minWidth: 32,
                minHeight: 32,
                color: 'text.disabled',
                '&:hover': { color: 'text.secondary' },
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          {isLoggedIn && (
            <Button
              startIcon={<Add />}
              variant="contained"
              size="small"
              component={RouterLink}
              to="/build-editor"
              sx={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(6,182,212,0.45), 0 4px 14px rgba(0,0,0,0.45)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Create Build
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <BuildFilterBar
        filters={filters}
        totalCount={loading ? null : filteredBuilds.length}
        onFilterChange={setFilter}
      />

      {/* Content */}
      <Box sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={refresh}>
            {error}
          </Alert>
        )}

        {/* Loading skeletons */}
        {loading && filteredBuilds.length === 0 && (
          <Grid container spacing={3}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                <BuildCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty state */}
        {!loading && filteredBuilds.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
            <SearchOff sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              {filters.esoClass || filters.role || filters.tag || filters.search
                ? 'No matching builds'
                : 'No builds yet'}
            </Typography>
            <Typography
              variant="body2"
              color="text.disabled"
              mt={0.75}
              sx={{ maxWidth: 360, mx: 'auto' }}
            >
              {filters.esoClass || filters.role || filters.tag || filters.search
                ? 'Try broadening your search or removing some filters.'
                : 'Be the first to publish a build to the Hub!'}
            </Typography>
            {(filters.esoClass || filters.role || filters.tag || filters.search) && (
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2.5 }}
                onClick={() => {
                  setFilter('esoClass', '');
                  setFilter('role', '');
                  setFilter('tag', '');
                  setFilter('search', '');
                }}
              >
                Clear all filters
              </Button>
            )}
          </Box>
        )}

        {/* Cards grid */}
        {filteredBuilds.length > 0 && (
          <ErrorBoundary>
            <Grid container spacing={3}>
              {filteredBuilds.map((build) => (
                <Grid key={build.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                  <BuildCard
                    build={build}
                    isOwner={isLoggedIn && build.author_id === currentUserId}
                    isLoggedIn={isLoggedIn}
                    onVote={handleVote}
                    onPreview={setPreviewBuild}
                    onDelete={setDeleteTarget}
                    onEdit={setEditBuild}
                  />
                </Grid>
              ))}
            </Grid>
          </ErrorBoundary>
        )}

        {/* Load more */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          {loading && filteredBuilds.length > 0 ? null : hasMore && filteredBuilds.length > 0 ? (
            <Button variant="outlined" onClick={loadMore} aria-label="Load more builds">
              Load more
            </Button>
          ) : filteredBuilds.length > 0 ? (
            <Typography variant="caption" color="text.disabled">
              All builds loaded
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Login nudge */}
      {!isLoggedIn && (
        <Alert severity="info" sx={{ mt: 4 }}>
          Log in with your ESO Logs account to vote on builds or publish your own.
        </Alert>
      )}

      {/* Preview dialog */}
      <BuildPreviewDialog
        build={previewBuild}
        isOwner={isLoggedIn && previewBuild?.author_id === currentUserId}
        onClose={() => setPreviewBuild(null)}
        onEdit={(b) => {
          setPreviewBuild(null);
          setEditBuild(b);
        }}
      />

      {/* Edit published build dialog */}
      {editBuild && token && (
        <PublishBuildDialog
          open={editBuild !== null}
          buildData={editBuild.build_data}
          esoClass={editBuild.eso_class}
          role={editBuild.role}
          gameMode={editBuild.game_mode}
          token={token}
          editingBuild={editBuild}
          onClose={() => setEditBuild(null)}
          onPublished={() => {
            setEditBuild(null);
            enqueueSnackbar('Build updated!', { variant: 'success' });
            refresh();
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete build?"
        message="This will permanently remove the build from the Hub. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};
