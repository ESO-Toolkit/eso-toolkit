import { Add, Extension, Refresh, SearchOff } from '@mui/icons-material';
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

import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../../roster-hub/components/ConfirmDialog';
import { packHubApi } from '../api/pack-hub-api';
import { usePackHub } from '../hooks/use-pack-hub';
import type { HubPack } from '../types/pack-hub.types';

import { CreatePackDialog } from './CreatePackDialog';
import { PackCard } from './PackCard';
import { PackCardSkeleton } from './PackCardSkeleton';
import { PackFilterBar } from './PackFilterBar';
import { PackPreviewDialog } from './PackPreviewDialog';

const SKELETON_COUNT = 8;

export const PackHubPage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken, currentUser } = useAuth();
  const token = isLoggedIn ? accessToken : undefined;

  const { filteredPacks, loading, error, filters, hasMore, setFilter, loadMore, refresh, vote } =
    usePackHub(token);

  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [editPack, setEditPack] = React.useState<HubPack | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [previewPack, setPreviewPack] = React.useState<HubPack | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const handlePreview = React.useCallback((pack: HubPack) => {
    setPreviewPack(pack);
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = React.useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // Keep preview in sync with live list (votes, refreshes)
  const livePreviewPack = React.useMemo(() => {
    if (!previewPack) return null;
    return filteredPacks.find((p) => p.id === previewPack.id) ?? previewPack;
  }, [previewPack, filteredPacks]);

  const currentUserId = String(currentUser?.id ?? '');

  const handleVote = React.useCallback(
    (packId: string) => {
      if (!token) {
        enqueueSnackbar('Log in to vote on packs', { variant: 'info' });
        return;
      }
      void vote(packId, token);
    },
    [token, vote, enqueueSnackbar],
  );

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!token || !deleteTarget) return;
    setDeleteLoading(true);
    try {
      await packHubApi.delete(deleteTarget, token);
      enqueueSnackbar('Pack deleted', { variant: 'success' });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete pack', {
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
      {/* Page hero header */}
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
            ? 'linear-gradient(135deg, rgba(196,164,74,0.10) 0%, rgba(152,131,227,0.07) 50%, rgba(11,18,32,0.4) 100%)'
            : 'linear-gradient(135deg, rgba(196,164,74,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(255,255,255,0.6) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(196,164,74,0.6) 30%, rgba(212,180,90,0.8) 60%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(196,164,74,0.4) 30%, rgba(212,180,90,0.5) 60%, transparent 100%)',
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
                ? 'linear-gradient(135deg, rgba(196,164,74,0.2) 0%, rgba(212,180,90,0.12) 100%)'
                : 'linear-gradient(135deg, rgba(196,164,74,0.12) 0%, rgba(212,180,90,0.08) 100%)',
              border: isDark
                ? '1px solid rgba(196,164,74,0.25)'
                : '1px solid rgba(196,164,74,0.18)',
              boxShadow: isDark
                ? '0 0 12px rgba(196,164,74,0.15)'
                : '0 0 8px rgba(196,164,74,0.10)',
            }}
          >
            <Extension sx={{ fontSize: '1.25rem', color: '#c4a44a' }} />
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
              Pack Hub
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
          <Tooltip title="Refresh pack list">
            <IconButton
              size="small"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh pack list"
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
              onClick={() => setCreateOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #c4a44a 0%, #d4b45a 100%)',
                color: '#0b1220',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.01em',
                boxShadow: '0 0 18px rgba(196,164,74,0.45), 0 4px 14px rgba(0,0,0,0.45)',
                textShadow: '0 1px 3px rgba(0,0,0,0.15)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #d4b45a 0%, #e4c46a 100%)',
                  boxShadow: '0 0 26px rgba(196,164,74,0.6), 0 6px 20px rgba(0,0,0,0.5)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Create Pack
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <PackFilterBar
        filters={filters}
        totalCount={loading ? null : filteredPacks.length}
        onFilterChange={setFilter}
      />

      {/* Content */}
      <Box sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={refresh}>
            {error}
          </Alert>
        )}

        {loading && filteredPacks.length === 0 && (
          <Grid container spacing={3}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                <PackCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && filteredPacks.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
            <SearchOff sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {filters.packType || filters.tag || filters.search
                ? 'No matching packs'
                : 'No packs yet'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.disabled', mt: 0.75, maxWidth: 360, mx: 'auto' }}
            >
              {filters.packType || filters.tag || filters.search
                ? 'Try broadening your search or removing some filters.'
                : 'Be the first to share an addon pack with the community!'}
            </Typography>
            {(filters.packType || filters.tag || filters.search) && (
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2.5 }}
                onClick={() => {
                  setFilter('packType', '');
                  setFilter('tag', '');
                  setFilter('search', '');
                }}
              >
                Clear all filters
              </Button>
            )}
          </Box>
        )}

        {filteredPacks.length > 0 && (
          <ErrorBoundary>
            <Grid container spacing={3}>
              {filteredPacks.map((pack) => (
                <Grid key={pack.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                  <PackCard
                    pack={pack}
                    isOwner={isLoggedIn && pack.author_id === currentUserId}
                    isLoggedIn={isLoggedIn}
                    onVote={handleVote}
                    onDelete={setDeleteTarget}
                    onEdit={setEditPack}
                    onPreview={handlePreview}
                  />
                </Grid>
              ))}
            </Grid>
          </ErrorBoundary>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          {loading && filteredPacks.length > 0 ? null : hasMore && filteredPacks.length > 0 ? (
            <Button variant="outlined" onClick={loadMore} aria-label="Load more packs">
              Load more
            </Button>
          ) : filteredPacks.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              All packs loaded
            </Typography>
          ) : null}
        </Box>
      </Box>

      {!isLoggedIn && (
        <Alert severity="info" sx={{ mt: 4 }}>
          Log in with your ESO Logs account to vote on packs or create your own.
        </Alert>
      )}

      {/* Create pack dialog */}
      {token && (
        <CreatePackDialog
          open={createOpen}
          token={token}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            enqueueSnackbar('Pack created!', { variant: 'success' });
            refresh();
          }}
        />
      )}

      {/* Edit pack dialog */}
      {editPack && token && (
        <CreatePackDialog
          open={editPack !== null}
          token={token}
          editingPack={editPack}
          onClose={() => setEditPack(null)}
          onCreated={() => {
            setEditPack(null);
            enqueueSnackbar('Pack updated!', { variant: 'success' });
            refresh();
          }}
        />
      )}

      {/* Pack preview dialog */}
      <PackPreviewDialog
        pack={livePreviewPack}
        open={previewOpen && livePreviewPack !== null}
        isLoggedIn={isLoggedIn}
        onClose={handleClosePreview}
        onVote={handleVote}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete pack?"
        message="This will permanently remove the pack from the Hub. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Container>
  );
};
