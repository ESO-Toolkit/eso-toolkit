import {
  ArrowBack as ArrowBackIcon,
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
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClassIcon } from '../components/ClassIcon';
import { useAuth } from '../features/auth/AuthContext';
import { buildHubApi } from '../features/build-hub/api/build-hub-api';
import { BUILD_TAG_COLORS, ROLE_ACCENT } from '../features/build-hub/types/build-hub.types';
import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';
import {
  TRIAL_ACCENT,
  TRIAL_LABELS,
} from '../features/roster-hub/components/RosterCard';
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
  const theme = useTheme();
  const roleColor = ROLE_ACCENT[build.role] ?? '#64748b';
  const classLabel = CLASS_LABELS[build.eso_class] ?? build.eso_class;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
        borderTop: `3px solid ${roleColor}`,
        background: isDarkMode
          ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
          : theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: isDarkMode
          ? '0 8px 30px rgba(0, 0, 0, 0.25)'
          : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: alpha(roleColor, 0.4),
          transform: 'translateY(-2px)',
          boxShadow: isDarkMode
            ? `0 10px 40px rgba(0,0,0,0.3), 0 0 60px ${alpha(roleColor, 0.08)}`
            : '0 8px 24px rgba(15, 23, 42, 0.1)',
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
              top: 8,
              right: 8,
              zIndex: 2,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: theme.palette.error.main,
              bgcolor: isDarkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea onClick={() => navigate(`/build-editor?id=${build.id}`)}>
        <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 0.75,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                lineHeight: 1.3,
                flex: 1,
                mr: 1,
              }}
            >
              {build.title}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0,
              }}
            >
              <ThumbUpIcon sx={{ fontSize: 12, color: theme.palette.text.secondary }} />
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontVariantNumeric: 'tabular-nums' }}
              >
                {build.vote_count}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75, alignItems: 'center' }}>
            <Chip
              icon={<ClassIcon className={build.eso_class} size={14} />}
              label={classLabel}
              size="small"
              sx={{ fontSize: '0.65rem', height: 22, fontWeight: 600 }}
            />
            <Chip
              label={roleLabel}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 22,
                borderColor: alpha(roleColor, 0.5),
                color: roleColor,
                fontWeight: 600,
              }}
            />
          </Box>

          {build.description && (
            <Typography
              variant="caption"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                color: theme.palette.text.secondary,
                lineHeight: 1.4,
                mb: 0.75,
              }}
            >
              {build.description}
            </Typography>
          )}

          {build.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
              {build.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.6rem',
                    height: 18,
                    bgcolor: alpha(BUILD_TAG_COLORS[tag] ?? '#64748b', 0.13),
                    color: BUILD_TAG_COLORS[tag] ?? '#64748b',
                    border: `1px solid ${alpha(BUILD_TAG_COLORS[tag] ?? '#64748b', 0.25)}`,
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ display: 'block', color: isDarkMode ? '#475569' : '#94a3b8', fontSize: '0.65rem' }}
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
  const theme = useTheme();
  const trialColor = TRIAL_ACCENT[roster.trial_id] ?? '#38bdf8';
  const trialLabel = TRIAL_LABELS[roster.trial_id] ?? roster.trial_id;

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
        borderTop: `3px solid ${trialColor}`,
        background: isDarkMode
          ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
          : theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: isDarkMode
          ? '0 8px 30px rgba(0, 0, 0, 0.25)'
          : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: alpha(trialColor, 0.4),
          transform: 'translateY(-2px)',
          boxShadow: isDarkMode
            ? `0 10px 40px rgba(0,0,0,0.3), 0 0 60px ${alpha(trialColor, 0.08)}`
            : '0 8px 24px rgba(15, 23, 42, 0.1)',
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
              top: 8,
              right: 8,
              zIndex: 2,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: theme.palette.error.main,
              bgcolor: isDarkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea onClick={() => navigate(`/roster-builder?id=${roster.id}`)}>
        <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 0.75,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                lineHeight: 1.3,
                flex: 1,
                mr: 1,
              }}
            >
              {roster.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <ThumbUpIcon sx={{ fontSize: 12, color: theme.palette.text.secondary }} />
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontVariantNumeric: 'tabular-nums' }}
              >
                {roster.vote_count}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={trialLabel}
            size="small"
            sx={{
              fontSize: '0.65rem',
              height: 22,
              mb: 0.75,
              fontWeight: 600,
              borderColor: alpha(trialColor, 0.5),
              color: trialColor,
            }}
            variant="outlined"
          />

          {roster.description && (
            <Typography
              variant="caption"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                color: theme.palette.text.secondary,
                lineHeight: 1.4,
                mb: 0.75,
              }}
            >
              {roster.description}
            </Typography>
          )}

          {roster.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
              {roster.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.6rem',
                    height: 18,
                    bgcolor: alpha(TAG_COLORS[tag] ?? '#64748b', 0.13),
                    color: TAG_COLORS[tag] ?? '#64748b',
                    border: `1px solid ${alpha(TAG_COLORS[tag] ?? '#64748b', 0.25)}`,
                  }}
                />
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{ display: 'block', color: isDarkMode ? '#475569' : '#94a3b8', fontSize: '0.65rem' }}
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '14px',
            background: isDarkMode
              ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.95) 100%)'
              : theme.palette.background.paper,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`,
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Bio</DialogTitle>
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
          placeholder="Tell the community a bit about yourself..."
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onSave(value)} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
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
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ icon, label, count }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
      <Box sx={{ color: isDarkMode ? '#38bdf8' : '#3b82f6', display: 'flex' }}>{icon}</Box>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: theme.palette.text.primary, fontFamily: 'Space Grotesk, Inter, system-ui' }}
      >
        {label}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 22,
          fontSize: '0.7rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          bgcolor: isDarkMode ? alpha('#38bdf8', 0.12) : alpha('#3b82f6', 0.1),
          color: isDarkMode ? '#38bdf8' : '#3b82f6',
        }}
      />
    </Box>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, actionLabel, onAction }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        py: 4,
        px: 3,
        textAlign: 'center',
        borderRadius: '14px',
        border: `1px dashed ${theme.palette.divider}`,
        background: isDarkMode ? alpha('#0f172a', 0.3) : alpha('#f8fafc', 0.5),
      }}
    >
      <Box sx={{ color: isDarkMode ? '#334155' : '#cbd5e1', mb: 1 }}>{icon}</Box>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: actionLabel ? 1.5 : 0 }}>
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button size="small" variant="outlined" onClick={onAction} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

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
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: 3,
            mb: 5,
            p: 3,
            borderRadius: '14px',
            border: `1px solid ${theme.palette.divider}`,
            background: isDarkMode
              ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
              : theme.palette.background.paper,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: isDarkMode
              ? '0 8px 30px rgba(0, 0, 0, 0.25)'
              : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
          }}
        >
          <Skeleton variant="circular" width={80} height={80} sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' }, width: '100%' }}>
            <Skeleton variant="text" width={180} height={36} sx={{ mx: { xs: 'auto', sm: 0 } }} />
            <Box sx={{ display: 'flex', gap: 2, mt: 0.75, mb: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Skeleton variant="text" width={70} height={18} />
              <Skeleton variant="text" width={70} height={18} />
            </Box>
            <Skeleton variant="text" width="65%" height={16} sx={{ mx: { xs: 'auto', sm: 0 } }} />
          </Box>
        </Box>
        {/* Builds section skeleton */}
        <Box sx={{ mb: 5 }}>
          <Skeleton variant="text" width={100} height={28} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[0, 1, 2].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px' }} />
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
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px' }} />
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
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Box
          sx={{
            p: 4,
            borderRadius: '14px',
            border: `1px solid ${theme.palette.divider}`,
            background: isDarkMode
              ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
              : theme.palette.background.paper,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: isDarkMode
              ? '0 8px 30px rgba(0, 0, 0, 0.25)'
              : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: isDarkMode
                ? alpha('#334155', 0.3)
                : alpha('#cbd5e1', 0.3),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <PersonIcon sx={{ fontSize: 36, color: isDarkMode ? '#334155' : '#cbd5e1' }} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1, fontFamily: 'Space Grotesk, Inter, system-ui' }}
          >
            Player not found
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            <strong>{username}</strong> hasn&apos;t published any public builds or rosters yet.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Go back
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/build-hub')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Browse Build Hub
            </Button>
          </Stack>
        </Box>
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
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'center', sm: 'flex-start' },
          gap: 3,
          mb: 5,
          p: 3,
          borderRadius: '14px',
          border: `1px solid ${theme.palette.divider}`,
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
            : theme.palette.background.paper,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isDarkMode
            ? '0 8px 30px rgba(0, 0, 0, 0.25)'
            : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)'
              : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: isDarkMode
              ? '2px solid rgba(56,189,248,0.25)'
              : '2px solid rgba(59,130,246,0.25)',
            boxShadow: isDarkMode
              ? '0 0 20px rgba(56,189,248,0.1)'
              : '0 0 20px rgba(59,130,246,0.08)',
          }}
        >
          <PersonIcon sx={{ fontSize: 40, color: isDarkMode ? '#38bdf8' : '#3b82f6' }} />
        </Box>

        {/* Name + bio */}
        <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
              }}
            >
              {profile.username}
            </Typography>
            <Tooltip title="Search on ESO Logs" arrow>
              <Box
                component="a"
                href={`https://www.esologs.com/search?term=${encodeURIComponent(profile.username)}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: theme.palette.text.secondary,
                  textDecoration: 'none',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    color: isDarkMode ? '#38bdf8' : '#3b82f6',
                    bgcolor: isDarkMode ? alpha('#38bdf8', 0.08) : alpha('#3b82f6', 0.06),
                  },
                }}
              >
                ESO Logs
                <OpenInNewIcon sx={{ fontSize: '0.7rem' }} />
              </Box>
            </Tooltip>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 1, mb: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ConstructionIcon sx={{ fontSize: 16, color: isDarkMode ? '#38bdf8' : '#3b82f6' }} />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                <strong
                  style={{
                    color: isDarkMode ? '#38bdf8' : '#3b82f6',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {profile.build_count}
                </strong>{' '}
                build{profile.build_count !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <GroupsIcon sx={{ fontSize: 16, color: isDarkMode ? '#38bdf8' : '#3b82f6' }} />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                <strong
                  style={{
                    color: isDarkMode ? '#38bdf8' : '#3b82f6',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {profile.roster_count}
                </strong>{' '}
                roster{profile.roster_count !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Stack>

          {profile.bio ? (
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, lineHeight: 1.6, maxWidth: 560 }}
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
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setBioDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              flexShrink: 0,
              borderRadius: '8px',
              alignSelf: { xs: 'center', sm: 'flex-start' },
            }}
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
        />
        {hasBuild ? (
          <>
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
            {profile.build_count > profile.builds.length && (
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                onClick={() => navigate(`/build-hub?author=${encodeURIComponent(profile.username)}`)}
              >
                View all {profile.build_count} builds
              </Button>
            )}
          </>
        ) : (
          <EmptyState
            icon={<ConstructionIcon sx={{ fontSize: 40 }} />}
            message="No public builds yet."
            actionLabel={isOwner ? 'Create a build' : undefined}
            onAction={isOwner ? () => navigate('/build-editor') : undefined}
          />
        )}
      </Box>

      {/* ── Rosters ────────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading
          icon={<GroupsIcon />}
          label="Rosters"
          count={profile.roster_count}
        />
        {hasRoster ? (
          <>
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
            {profile.roster_count > profile.rosters.length && (
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                onClick={() => navigate(`/roster-hub?author=${encodeURIComponent(profile.username)}`)}
              >
                View all {profile.roster_count} rosters
              </Button>
            )}
          </>
        ) : (
          <EmptyState
            icon={<GroupsIcon sx={{ fontSize: 40 }} />}
            message="No public rosters yet."
            actionLabel={isOwner ? 'Create a roster' : undefined}
            onAction={isOwner ? () => navigate('/roster-builder') : undefined}
          />
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              background: isDarkMode
                ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.95) 100%)'
                : theme.palette.background.paper,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete {deleteTarget?.type}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
