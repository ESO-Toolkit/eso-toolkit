import {
  Construction as ConstructionIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Groups as GroupsIcon,
  OpenInNew as OpenInNewIcon,
  Person as PersonIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { buildHubApi } from '../features/build-hub/api/build-hub-api';
import { BUILD_TAG_COLORS, ROLE_ACCENT } from '../features/build-hub/types/build-hub.types';
import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';
import type {
  ProfileBuildSummary,
  ProfileRosterSummary,
  UserProfile,
} from '../features/roster-hub/types/roster-hub.types';
import { TAG_COLORS } from '../features/roster-hub/types/roster-hub.types';

const CLASS_LABELS: Record<string, string> = {
  dragonknight: 'Dragonknight',
  sorcerer: 'Sorcerer',
  nightblade: 'Nightblade',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necromancer',
  arcanist: 'Arcanist',
};

const ROLE_LABELS: Record<string, string> = {
  tank: 'Tank',
  healer: 'Healer',
  'magicka-dps': 'Mag DPS',
  'stamina-dps': 'Stam DPS',
  'hybrid-dps': 'Hybrid',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// ─── Build card ───────────────────────────────────────────────────────────────

interface BuildCardProps {
  build: ProfileBuildSummary;
  isDarkMode: boolean;
  onDelete?: (id: string, title: string) => void;
}

const BuildCard: React.FC<BuildCardProps> = ({ build, isDarkMode, onDelete }) => {
  const navigate = useNavigate();
  const roleColor = ROLE_ACCENT[build.role] ?? '#64748b';
  const classLabel = CLASS_LABELS[build.eso_class] ?? build.eso_class;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: roleColor + '55',
          transform: 'translateY(-1px)',
        },
        '&:hover .delete-btn': { opacity: 1 },
      }}
    >
      {onDelete && (
        <Tooltip title="Delete build" arrow>
          <IconButton
            className="delete-btn"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(build.id, build.title);
            }}
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              zIndex: 2,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: '#ef4444',
              bgcolor: isDarkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea onClick={() => navigate(`/build-editor?id=${build.id}`)}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 0.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: isDarkMode ? '#f1f5f9' : '#0f172a',
                lineHeight: 1.3,
                flex: 1,
                mr: 1,
              }}
            >
              {build.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <ThumbUpIcon sx={{ fontSize: 12, color: isDarkMode ? '#64748b' : '#94a3b8' }} />
              <Typography variant="caption" sx={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                {build.vote_count}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
            <Chip
              label={classLabel}
              size="small"
              sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }}
            />
            <Chip
              label={roleLabel}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                borderColor: roleColor + '88',
                color: roleColor,
              }}
            />
          </Box>

          {build.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {build.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.6rem',
                    height: 18,
                    bgcolor: (BUILD_TAG_COLORS[tag] ?? '#64748b') + '22',
                    color: BUILD_TAG_COLORS[tag] ?? '#64748b',
                    border: `1px solid ${BUILD_TAG_COLORS[tag] ?? '#64748b'}44`,
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.75, color: isDarkMode ? '#475569' : '#94a3b8' }}
          >
            {formatDate(build.created_at)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Roster card ──────────────────────────────────────────────────────────────

interface RosterCardProps {
  roster: ProfileRosterSummary;
  isDarkMode: boolean;
  onDelete?: (id: string, title: string) => void;
}

const RosterCard: React.FC<RosterCardProps> = ({ roster, isDarkMode, onDelete }) => {
  const navigate = useNavigate();

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: 'rgba(56,189,248,0.3)',
          transform: 'translateY(-1px)',
        },
        '&:hover .delete-btn': { opacity: 1 },
      }}
    >
      {onDelete && (
        <Tooltip title="Delete roster" arrow>
          <IconButton
            className="delete-btn"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(roster.id, roster.title);
            }}
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              zIndex: 2,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: '#ef4444',
              bgcolor: isDarkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea onClick={() => navigate(`/roster-builder?id=${roster.id}`)}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 0.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: isDarkMode ? '#f1f5f9' : '#0f172a',
                lineHeight: 1.3,
                flex: 1,
                mr: 1,
              }}
            >
              {roster.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <ThumbUpIcon sx={{ fontSize: 12, color: isDarkMode ? '#64748b' : '#94a3b8' }} />
              <Typography variant="caption" sx={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                {roster.vote_count}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={roster.trial_id}
            size="small"
            sx={{ fontSize: '0.65rem', height: 20, mb: 0.75 }}
          />

          {roster.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {roster.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.6rem',
                    height: 18,
                    bgcolor: (TAG_COLORS[tag] ?? '#64748b') + '22',
                    color: TAG_COLORS[tag] ?? '#64748b',
                    border: `1px solid ${TAG_COLORS[tag] ?? '#64748b'}44`,
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.75, color: isDarkMode ? '#475569' : '#94a3b8' }}
          >
            {formatDate(roster.created_at)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Bio edit dialog ──────────────────────────────────────────────────────────

interface BioDialogProps {
  open: boolean;
  current: string;
  saving: boolean;
  onSave: (bio: string) => void;
  onClose: () => void;
}

const BioDialog: React.FC<BioDialogProps> = ({ open, current, saving, onSave, onClose }) => {
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Bio</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          maxRows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputProps={{ maxLength: 200 }}
          helperText={`${value.length}/200`}
          placeholder="Tell the community a bit about yourself…"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onSave(value)} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Section heading ──────────────────────────────────────────────────────────

interface SectionHeadingProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  isDarkMode: boolean;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ icon, label, count, isDarkMode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Box sx={{ color: isDarkMode ? '#38bdf8' : '#3b82f6' }}>{icon}</Box>
    <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#0f172a' }}>
      {label}
    </Typography>
    <Chip
      label={count}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.7rem',
        bgcolor: isDarkMode ? 'rgba(56,189,248,0.12)' : 'rgba(59,130,246,0.1)',
        color: isDarkMode ? '#38bdf8' : '#3b82f6',
      }}
    />
  </Box>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { isLoggedIn, accessToken, currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: 'build' | 'roster';
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isOwner =
    isLoggedIn &&
    !!currentUser &&
    !!username &&
    currentUser.name.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    setNotFound(false);
    setProfile(null);

    // Abort the request if the component unmounts or username changes
    const controller = new AbortController();

    rosterHubApi
      .getUserProfile(username)
      .then((res) => {
        if (!controller.signal.aborted) setProfile(res.profile);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return;
        if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [username]);

  // Update document title when profile loads
  useEffect(() => {
    if (profile) {
      document.title = `${profile.username} — ESO Toolkit`;
    }
    return () => {
      document.title = 'ESO Toolkit';
    };
  }, [profile]);

  const handleSaveBio = useCallback(
    async (bio: string) => {
      if (!accessToken) return;
      setBioSaving(true);
      try {
        await rosterHubApi.updateBio(bio, accessToken);
        setProfile((prev) => (prev ? { ...prev, bio } : prev));
        setBioDialogOpen(false);
        enqueueSnackbar('Bio updated', { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to save bio', {
          variant: 'error',
        });
      } finally {
        setBioSaving(false);
      }
    },
    [accessToken, enqueueSnackbar],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || !accessToken) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'build') {
        await buildHubApi.delete(deleteTarget.id, accessToken);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                builds: prev.builds.filter((b) => b.id !== deleteTarget.id),
                build_count: prev.build_count - 1,
              }
            : prev,
        );
      } else {
        await rosterHubApi.delete(deleteTarget.id, accessToken);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                rosters: prev.rosters.filter((r) => r.id !== deleteTarget.id),
                roster_count: prev.roster_count - 1,
              }
            : prev,
        );
      }
      enqueueSnackbar(`${deleteTarget.type === 'build' ? 'Build' : 'Roster'} deleted`, {
        variant: 'success',
      });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete', {
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, accessToken, enqueueSnackbar]);


  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Profile header skeleton */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 3,
            mb: 5,
            p: 3,
            borderRadius: 3,
            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.7)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Skeleton variant="circular" width={72} height={72} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width={180} height={36} />
            <Box sx={{ display: 'flex', gap: 2, mt: 0.75, mb: 1.5 }}>
              <Skeleton variant="text" width={70} height={18} />
              <Skeleton variant="text" width={70} height={18} />
            </Box>
            <Skeleton variant="text" width="65%" height={16} />
          </Box>
        </Box>
        {/* Builds section skeleton */}
        <Box sx={{ mb: 5 }}>
          <Skeleton variant="text" width={100} height={28} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[0, 1, 2].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
        {/* Rosters section skeleton */}
        <Box>
          <Skeleton variant="text" width={110} height={28} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[0, 1, 2].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────

  if (notFound || !profile) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <PersonIcon sx={{ fontSize: 56, color: isDarkMode ? '#334155' : '#cbd5e1', mb: 2 }} />
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#0f172a', mb: 1 }}
        >
          Player not found
        </Typography>
        <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
          <strong>{username}</strong> hasn&apos;t published any public builds or rosters yet.
        </Typography>
      </Container>
    );
  }

  const hasBuild = profile.builds.length > 0;
  const hasRoster = profile.rosters.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ── Profile header ─────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 3,
          mb: 5,
          p: 3,
          borderRadius: 3,
          border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          background: isDarkMode ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Avatar placeholder */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)'
              : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: isDarkMode
              ? '2px solid rgba(56,189,248,0.2)'
              : '2px solid rgba(59,130,246,0.2)',
          }}
        >
          <PersonIcon sx={{ fontSize: 36, color: isDarkMode ? '#38bdf8' : '#3b82f6' }} />
        </Box>

        {/* Name + bio */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {profile.username}
            </Typography>
            <Tooltip title="View on ESO Logs">
              <a
                href={`https://www.esologs.com/search?term=${encodeURIComponent(profile.username)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#64748b' : '#94a3b8',
                  textDecoration: 'none',
                }}
              >
                ESO Logs
                <OpenInNewIcon sx={{ fontSize: '0.7rem' }} />
              </a>
            </Tooltip>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 0.75, mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
              <strong style={{ color: isDarkMode ? '#38bdf8' : '#3b82f6' }}>
                {profile.build_count}
              </strong>{' '}
              build{profile.build_count !== 1 ? 's' : ''}
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
              <strong style={{ color: isDarkMode ? '#38bdf8' : '#3b82f6' }}>
                {profile.roster_count}
              </strong>{' '}
              roster{profile.roster_count !== 1 ? 's' : ''}
            </Typography>
          </Stack>

          {profile.bio ? (
            <Typography
              variant="body2"
              sx={{ color: isDarkMode ? '#94a3b8' : '#475569', lineHeight: 1.6 }}
            >
              {profile.bio}
            </Typography>
          ) : isOwner ? (
            <Typography
              variant="body2"
              sx={{ color: isDarkMode ? '#475569' : '#94a3b8', fontStyle: 'italic' }}
            >
              Add a bio to tell the community about yourself.
            </Typography>
          ) : null}
        </Box>

        {/* Edit bio button (owner only) */}
        {isOwner && (
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setBioDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            {profile.bio ? 'Edit bio' : 'Add bio'}
          </Button>
        )}
      </Box>

      {/* ── Builds ─────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeading
          icon={<ConstructionIcon />}
          label="Builds"
          count={profile.build_count}
          isDarkMode={isDarkMode}
        />
        {hasBuild ? (
          <Grid container spacing={2}>
            {profile.builds.map((build) => (
              <Grid key={build.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <BuildCard
                  build={build}
                  isDarkMode={isDarkMode}
                  onDelete={
                    isOwner
                      ? (id, title) => setDeleteTarget({ id, title, type: 'build' })
                      : undefined
                  }
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: isDarkMode ? '#475569' : '#94a3b8', py: 2 }}>
            No public builds yet.
          </Typography>
        )}
        {profile.build_count > profile.builds.length && (
          <Button
            size="small"
            sx={{ mt: 2, textTransform: 'none' }}
            onClick={() => navigate(`/build-hub?author=${encodeURIComponent(profile.username)}`)}
          >
            View all {profile.build_count} builds →
          </Button>
        )}
      </Box>

      {/* ── Rosters ────────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading
          icon={<GroupsIcon />}
          label="Rosters"
          count={profile.roster_count}
          isDarkMode={isDarkMode}
        />
        {hasRoster ? (
          <Grid container spacing={2}>
            {profile.rosters.map((roster) => (
              <Grid key={roster.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <RosterCard
                  roster={roster}
                  isDarkMode={isDarkMode}
                  onDelete={
                    isOwner
                      ? (id, title) => setDeleteTarget({ id, title, type: 'roster' })
                      : undefined
                  }
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: isDarkMode ? '#475569' : '#94a3b8', py: 2 }}>
            No public rosters yet.
          </Typography>
        )}
        {profile.roster_count > profile.rosters.length && (
          <Button
            size="small"
            sx={{ mt: 2, textTransform: 'none' }}
            onClick={() => navigate(`/roster-hub?author=${encodeURIComponent(profile.username)}`)}
          >
            View all {profile.roster_count} rosters →
          </Button>
        )}
      </Box>

      {/* ── Bio edit dialog ─────────────────────────────────────────────── */}
      <BioDialog
        open={bioDialogOpen}
        current={profile.bio}
        saving={bioSaving}
        onSave={handleSaveBio}
        onClose={() => setBioDialogOpen(false)}
      />

      {/* ── Delete confirmation dialog ────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete {deleteTarget?.type}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
