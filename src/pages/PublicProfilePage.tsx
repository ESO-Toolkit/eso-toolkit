import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraAltIcon,
  Close as CloseIcon,
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
  CircularProgress,
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ClassIcon } from '../components/ClassIcon';
import { useAuth } from '../features/auth/AuthContext';
import { CLASS_COLOR_MAP } from '../features/build-editor/theme/classColorMap';
import { buildHubApi } from '../features/build-hub/api/build-hub-api';
import { ROLE_ACCENT } from '../features/build-hub/types/build-hub.types';
import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';
import {
  TRIAL_ACCENT,
  TRIAL_LABELS,
  TRIAL_SHORT,
} from '../features/roster-hub/components/RosterCard';
import type {
  ProfileBuildSummary,
  ProfileRosterSummary,
  UserProfile,
} from '../features/roster-hub/types/roster-hub.types';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';

const CLASS_LABELS: Record<string, string> = {
  dragonknight: 'DK',
  sorcerer: 'Sorc',
  nightblade: 'NB',
  templar: 'Templar',
  warden: 'Warden',
  necromancer: 'Necro',
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
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Shared card styles ──────────────────────────────────────────────────────

const CARD_RADIUS = '16px';

function useCardSx(accentColor: string, isDarkMode: boolean): object {
  return {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    border: isDarkMode ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
    background: isDarkMode
      ? `linear-gradient(135deg, ${accentColor}14 0%, rgba(56, 189, 248, 0.10) 50%, rgba(0, 225, 255, 0.10) 100%)`
      : `linear-gradient(135deg, ${accentColor}12 0%, rgba(219, 234, 254, 0.45) 50%, rgba(224, 242, 254, 0.45) 100%)`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDarkMode
      ? `0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
      : `0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)`,
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: isDarkMode
        ? `0 0 0 1px ${accentColor}35, 0 16px 40px -8px ${accentColor}50, 0 6px 20px -4px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`
        : `0 0 0 1px ${accentColor}25, 0 16px 40px -8px ${accentColor}35, 0 6px 20px -4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)`,
    },
    '&:hover .delete-btn': { opacity: 1 },
  };
}

/** Glowing feathered accent bar rendered at the top of each card */
const AccentBar: React.FC<{ color: string }> = ({ color }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, transparent 0%, ${color}80 20%, ${color} 50%, ${color}80 80%, transparent 100%)`,
      boxShadow: `0 0 12px ${color}80, 0 0 28px ${color}40`,
      borderRadius: '16px 16px 0 0',
      zIndex: 2,
    }}
    aria-hidden="true"
  />
);

// ─── Build card ──────────────────────────────────────────────────────────────

interface BuildCardProps {
  build: ProfileBuildSummary;
  isDarkMode: boolean;
  onDelete?: (id: string, title: string) => void;
}

const BuildCard: React.FC<BuildCardProps> = ({ build, isDarkMode, onDelete }) => {
  const navigate = useViewTransitionNavigate();
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const classTheme = CLASS_COLOR_MAP[build.eso_class as keyof typeof CLASS_COLOR_MAP];
  const roleColor = classTheme?.accent ?? ROLE_ACCENT[build.role] ?? '#64748b';
  const classLabel = CLASS_LABELS[build.eso_class] ?? build.eso_class;
  const roleLabel = ROLE_LABELS[build.role] ?? build.role;
  const cardSx = useCardSx(roleColor, isDarkMode);

  return (
    <Card ref={cardRef} elevation={0} sx={cardSx}>
      <AccentBar color={roleColor} />
      {onDelete && (
        <Tooltip title="Delete build" arrow>
          <IconButton
            className="delete-btn"
            size="small"
            aria-label="Delete build"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(build.id, build.title);
            }}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 3,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: theme.palette.error.main,
              bgcolor: isDarkMode ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea
        onClick={() =>
          navigate(`/build-editor?id=${build.id}`, {
            vtType: 'forward',
            morph: { ref: cardRef, name: 'build-hero' },
          })
        }
        sx={{ flexGrow: 1, alignItems: 'flex-start' }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            pt: 3,
            px: 2.5,
            pb: '20px !important',
          }}
        >
          {/* Class + Role badges */}
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75 }}>
            <Tooltip title={build.eso_class}>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                  background: isDarkMode ? `${roleColor}22` : `${roleColor}18`,
                  border: `1px solid ${roleColor}45`,
                  boxShadow: `0 0 8px ${roleColor}25`,
                }}
              >
                <ClassIcon className={build.eso_class} size={13} />
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.07em',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc, ${roleColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: `0 0 12px ${roleColor}40`,
                    filter: isDarkMode ? 'brightness(1.2)' : 'none',
                  }}
                >
                  {classLabel}
                </Typography>
              </Box>
            </Tooltip>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                px: 1,
                py: 0.5,
                borderRadius: '6px',
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: isDarkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.45))'
                    : 'linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,0,0,0.40))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: isDarkMode
                    ? '0 0 10px rgba(255,255,255,0.15)'
                    : '0 0 10px rgba(0,0,0,0.08)',
                }}
              >
                {roleLabel}
              </Typography>
            </Box>
          </Box>

          {/* Title — clamped to 2 lines */}
          <Typography
            variant="body1"
            component="h3"
            sx={{
              fontWeight: 800,
              lineHeight: 1.4,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontSize: '1.05rem',
              letterSpacing: '-0.01em',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {build.title}
          </Typography>

          {/* Description — clamped to 2 lines */}
          {build.description && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1.75,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.6,
                fontSize: '0.85rem',
                opacity: 0.75,
              }}
            >
              {build.description}
            </Typography>
          )}

          {/* Tags — glassmorphic mini chips */}
          {build.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
              {build.tags.slice(0, 3).map((tag) => {
                return (
                  <Box
                    key={tag}
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1,
                      py: 0.4,
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: isDarkMode
                        ? '1px solid rgba(255,255,255,0.12)'
                        : '1px solid rgba(0,0,0,0.10)',
                      color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </Box>
                );
              })}
              {build.tags.length > 3 && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.4,
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{build.tags.length - 3}
                </Box>
              )}
            </Box>
          )}

          {/* Spacer pushes footer to bottom */}
          <Box sx={{ flexGrow: 1, minHeight: 12 }} />

          {/* Footer — glassmorphic bar with accent stripe, votes + date */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              mt: 0.5,
              borderRadius: '8px',
              background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Vertical accent bar */}
            <Box
              sx={{
                width: '3px',
                flexShrink: 0,
                background: `linear-gradient(180deg, ${roleColor} 0%, ${roleColor}40 100%)`,
                boxShadow: `0 0 6px ${roleColor}30`,
              }}
              aria-hidden="true"
            />

            {/* Vote count + date */}
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
                px: 1.25,
                py: 0.9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ThumbUpIcon
                  sx={{
                    fontSize: 13,
                    color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  }}
                />
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {build.vote_count}
                </Typography>
              </Box>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: isDarkMode ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)',
                  letterSpacing: '0.01em',
                }}
              >
                {formatDate(build.created_at)}
                {build.updated_at &&
                  build.updated_at !== build.created_at &&
                  ` · updated ${formatDate(build.updated_at)}`}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Roster card ─────────────────────────────────────────────────────────────

interface RosterCardProps {
  roster: ProfileRosterSummary;
  isDarkMode: boolean;
  onDelete?: (id: string, title: string) => void;
}

const RosterCard: React.FC<RosterCardProps> = ({ roster, isDarkMode, onDelete }) => {
  const navigate = useViewTransitionNavigate();
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const trialColor = TRIAL_ACCENT[roster.trial_id] ?? '#38bdf8';
  const trialShort = TRIAL_SHORT[roster.trial_id] ?? roster.trial_id;
  const trialFull = TRIAL_LABELS[roster.trial_id] ?? roster.trial_id;
  const cardSx = useCardSx(trialColor, isDarkMode);

  return (
    <Card ref={cardRef} elevation={0} sx={cardSx}>
      <AccentBar color={trialColor} />
      {onDelete && (
        <Tooltip title="Delete roster" arrow>
          <IconButton
            className="delete-btn"
            size="small"
            aria-label="Delete roster"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(roster.id, roster.title);
            }}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 3,
              opacity: 0,
              transition: 'opacity 0.15s',
              color: theme.palette.error.main,
              bgcolor: isDarkMode ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.12) },
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea
        onClick={() =>
          navigate(`/roster-builder?id=${roster.id}`, {
            vtType: 'forward',
            morph: { ref: cardRef, name: 'roster-hero' },
          })
        }
        sx={{ flexGrow: 1, alignItems: 'flex-start' }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            pt: 3,
            px: 2.5,
            pb: '20px !important',
          }}
        >
          {/* Trial badge */}
          <Tooltip title={trialFull} placement="top">
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                mb: 1.75,
                px: 1,
                py: 0.5,
                borderRadius: '6px',
                background: isDarkMode
                  ? `linear-gradient(90deg, ${trialColor}22 0%, ${trialColor}10 100%)`
                  : `linear-gradient(90deg, ${trialColor}18 0%, ${trialColor}08 100%)`,
                border: `1px solid ${trialColor}45`,
                boxShadow: `0 0 8px ${trialColor}25`,
                alignSelf: 'flex-start',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  background: `linear-gradient(135deg, ${trialColor}, ${trialColor}cc, ${trialColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: `0 0 12px ${trialColor}40`,
                  filter: isDarkMode ? 'brightness(1.2)' : 'none',
                }}
              >
                {trialShort}
              </Typography>
            </Box>
          </Tooltip>

          {/* Title — clamped to 2 lines */}
          <Typography
            variant="body1"
            component="h3"
            sx={{
              fontWeight: 800,
              lineHeight: 1.4,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontSize: '1.05rem',
              letterSpacing: '-0.01em',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {roster.title}
          </Typography>

          {/* Description — clamped to 2 lines */}
          {roster.description && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1.75,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.6,
                fontSize: '0.85rem',
                opacity: 0.75,
              }}
            >
              {roster.description}
            </Typography>
          )}

          {/* Tags — glassmorphic mini chips */}
          {roster.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
              {roster.tags.slice(0, 3).map((tag) => {
                return (
                  <Box
                    key={tag}
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1,
                      py: 0.4,
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: isDarkMode
                        ? '1px solid rgba(255,255,255,0.12)'
                        : '1px solid rgba(0,0,0,0.10)',
                      color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </Box>
                );
              })}
              {roster.tags.length > 3 && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.4,
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{roster.tags.length - 3}
                </Box>
              )}
            </Box>
          )}

          {/* Spacer pushes footer to bottom */}
          <Box sx={{ flexGrow: 1, minHeight: 12 }} />

          {/* Footer — glassmorphic bar with accent stripe, votes + date */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              mt: 0.5,
              borderRadius: '8px',
              background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: isDarkMode
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Vertical accent bar */}
            <Box
              sx={{
                width: '3px',
                flexShrink: 0,
                background: `linear-gradient(180deg, ${trialColor} 0%, ${trialColor}40 100%)`,
                boxShadow: `0 0 6px ${trialColor}30`,
              }}
              aria-hidden="true"
            />

            {/* Vote count + date */}
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
                px: 1.25,
                py: 0.9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ThumbUpIcon
                  sx={{
                    fontSize: 13,
                    color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                  }}
                />
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {roster.vote_count}
                </Typography>
              </Box>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: isDarkMode ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)',
                  letterSpacing: '0.01em',
                }}
              >
                {formatDate(roster.created_at)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Bio edit dialog ─────────────────────────────────────────────────────────

interface BioDialogProps {
  open: boolean;
  current: string;
  saving: boolean;
  onSave: (bio: string) => void;
  onClose: () => void;
}

const DIALOG_PAPER_SX = (isDarkMode: boolean, divider: string): object => ({
  borderRadius: CARD_RADIUS,
  background: isDarkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${divider}`,
  boxShadow: isDarkMode ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(0,0,0,0.12)',
});

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
      slotProps={{ paper: { sx: DIALOG_PAPER_SX(isDarkMode, theme.palette.divider) } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Space Grotesk, Inter, system-ui' }}>
        Edit Bio
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          maxRows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          helperText={`${value.length}/200`}
          placeholder="Tell the community a bit about yourself..."
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(value)}
          variant="contained"
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 3 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Section heading ─────────────────────────────────────────────────────────

interface SectionHeadingProps {
  icon: React.ReactNode;
  label: string;
  count: number;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ icon, label, count }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '11px',
          background: isDarkMode
            ? `linear-gradient(135deg, ${accent}30 0%, ${accent}18 100%)`
            : `linear-gradient(135deg, ${accent}22 0%, ${accent}10 100%)`,
          border: `1px solid ${accent}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          boxShadow: `0 0 10px ${accent}35, inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: theme.palette.text.primary,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          letterSpacing: '-0.01em',
          fontSize: '1.15rem',
        }}
      >
        {label}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 24,
          minWidth: 30,
          fontSize: '0.75rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          background: isDarkMode
            ? `linear-gradient(90deg, ${accent}22, ${accent}10)`
            : `linear-gradient(90deg, ${accent}18, ${accent}08)`,
          color: accent,
          border: `1px solid ${accent}45`,
          boxShadow: `0 0 6px ${accent}20`,
        }}
      />
      <Box
        sx={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(to right, ${accent}35, transparent 80%)`,
          ml: 0.5,
        }}
      />
    </Box>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────

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
        py: 5,
        px: 3,
        textAlign: 'center',
        borderRadius: CARD_RADIUS,
        border: isDarkMode ? '1px dashed rgba(255,255,255,0.09)' : '1px dashed rgba(0,0,0,0.09)',
        background: isDarkMode
          ? 'linear-gradient(160deg, rgba(152,131,227,0.04) 0%, rgba(11,18,32,0.4) 100%)'
          : 'linear-gradient(160deg, rgba(152,131,227,0.03) 0%, rgba(255,255,255,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ color: theme.palette.text.disabled, mb: 1.5 }}>{icon}</Box>
      <Typography
        variant="body2"
        sx={{ color: theme.palette.text.secondary, mb: actionLabel ? 2 : 0 }}
      >
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button
          size="small"
          variant="outlined"
          onClick={onAction}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 3 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useViewTransitionNavigate();
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const MAX_AVATAR_MB = 2;

  const handleAvatarSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !accessToken) return;

      // Reset input so the same file can be re-selected
      e.target.value = '';

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        enqueueSnackbar('Only JPEG, PNG, and WebP images are allowed.', { variant: 'error' });
        return;
      }
      if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
        enqueueSnackbar(`Avatar must be under ${MAX_AVATAR_MB} MB.`, { variant: 'error' });
        return;
      }

      // Read as data-URL for base64 upload
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setAvatarUploading(true);
      try {
        const res = await rosterHubApi.uploadAvatar(dataUrl, accessToken);
        setProfile((prev) =>
          prev
            ? { ...prev, avatar_url: res.avatar_url, avatar_thumb_url: res.avatar_thumb_url }
            : prev,
        );
        enqueueSnackbar('Avatar updated!', { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(err instanceof Error ? err.message : 'Failed to upload avatar', {
          variant: 'error',
        });
      } finally {
        setAvatarUploading(false);
      }
    },
    [accessToken, enqueueSnackbar],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (!accessToken) return;
    setAvatarUploading(true);
    try {
      await rosterHubApi.deleteAvatar(accessToken);
      setProfile((prev) => (prev ? { ...prev, avatar_url: null, avatar_thumb_url: null } : prev));
      enqueueSnackbar('Avatar removed.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to remove avatar', {
        variant: 'error',
      });
    } finally {
      setAvatarUploading(false);
    }
  }, [accessToken, enqueueSnackbar]);

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

  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: '20px', mb: 5 }} />
        <Skeleton variant="text" width={120} height={28} sx={{ mb: 3 }} />
        <Grid container spacing={2.5}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: CARD_RADIUS }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // ── 404 ────────────────────────────────────────────────────────────────────

  if (notFound || !profile) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 8, sm: 12 }, textAlign: 'center' }}>
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: isDarkMode ? alpha('#334155', 0.2) : alpha('#cbd5e1', 0.25),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <PersonIcon sx={{ fontSize: 44, color: theme.palette.text.disabled }} />
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 1,
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Player not found
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 4 }}>
          <strong>{username}</strong> hasn&apos;t published any public builds or rosters yet.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
          >
            Go back
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/build-hub', { vtType: 'back' })}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
          >
            Browse Build Hub
          </Button>
        </Stack>
      </Container>
    );
  }

  const hasBuild = profile.builds.length > 0;
  const hasRoster = profile.rosters.length > 0;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 }, position: 'relative' }}>
      {/* Ambient background orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          background: isDarkMode
            ? `radial-gradient(ellipse at center, ${accent}0a 0%, rgba(152,131,227,0.04) 40%, transparent 70%)`
            : `radial-gradient(ellipse at center, ${accent}08 0%, rgba(152,131,227,0.03) 40%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* ── Profile header — horizontal banner card ──────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          mb: 5,
          borderRadius: '20px',
          overflow: 'hidden',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
          background: isDarkMode
            ? `linear-gradient(135deg, ${accent}0c 0%, rgba(152,131,227,0.06) 40%, rgba(11,18,32,0.7) 100%)`
            : `linear-gradient(135deg, ${accent}08 0%, rgba(152,131,227,0.04) 40%, rgba(255,255,255,0.85) 100%)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: isDarkMode
            ? `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
        }}
      >
        {/* Top accent bar */}
        <Box
          sx={{
            height: '3px',
            background: `linear-gradient(90deg, transparent, ${accent}80 30%, ${accent} 50%, ${accent}80 70%, transparent)`,
            boxShadow: `0 0 16px ${accent}50, 0 0 32px ${accent}20`,
          }}
          aria-hidden="true"
        />

        {/* Card inner content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: { xs: 2, sm: 3.5 },
            p: { xs: 3, sm: 3.5 },
          }}
        >
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box
              sx={{
                width: { xs: 80, sm: 88 },
                height: { xs: 80, sm: 88 },
                borderRadius: '50%',
                background: isDarkMode
                  ? `linear-gradient(135deg, ${accent}30 0%, rgba(152,131,227,0.12) 50%, ${accent}18 100%)`
                  : `linear-gradient(135deg, ${accent}22 0%, rgba(152,131,227,0.08) 50%, ${accent}10 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${accent}45`,
                boxShadow: isDarkMode
                  ? `0 0 32px ${accent}20, inset 0 0 16px ${accent}08`
                  : `0 0 24px ${accent}14, inset 0 0 12px ${accent}06`,
                overflow: 'hidden',
                cursor: isOwner ? 'pointer' : 'default',
                '&:hover .avatar-overlay': isOwner ? { opacity: 1 } : {},
              }}
              onClick={
                isOwner && !avatarUploading ? () => avatarInputRef.current?.click() : undefined
              }
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.username}'s avatar`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <PersonIcon sx={{ fontSize: 42, color: accent }} />
              )}

              {/* Upload overlay (own profile only) */}
              {isOwner && (
                <Box
                  className="avatar-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {avatarUploading ? (
                    <CircularProgress size={28} sx={{ color: '#fff' }} />
                  ) : (
                    <CameraAltIcon sx={{ color: '#fff', fontSize: 28 }} />
                  )}
                </Box>
              )}
            </Box>

            {/* Hidden file input */}
            {isOwner && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleAvatarSelect}
              />
            )}

            {/* Remove avatar button */}
            {isOwner && profile?.avatar_url && !avatarUploading && (
              <Tooltip title="Remove avatar">
                <IconButton
                  size="small"
                  onClick={handleRemoveAvatar}
                  aria-label="Remove avatar"
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    bgcolor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
                    border: `1px solid ${accent}40`,
                    width: 24,
                    height: 24,
                    '&:hover': { bgcolor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,1)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14, color: accent }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Outer glow ring */}
            <Box
              sx={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: isDarkMode ? `1.5px solid ${accent}15` : `1.5px solid ${accent}10`,
                boxShadow: `0 0 20px ${accent}0a`,
                pointerEvents: 'none',
              }}
            />
          </Box>

          {/* Info column — fills remaining space */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', sm: 'flex-start' },
              textAlign: { xs: 'center', sm: 'left' },
              gap: 0.5,
            }}
          >
            {/* Username row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  color: theme.palette.text.primary,
                  fontSize: { xs: '1.5rem', sm: '1.65rem' },
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {profile.username}
              </Typography>
              <Tooltip title="Search on ESO Logs" arrow>
                <Box
                  component={'a' as const}
                  href={`https://www.esologs.com/search?term=${encodeURIComponent(profile.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: theme.palette.text.disabled,
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                    '&:hover': { color: accent },
                  }}
                >
                  esologs.com
                  <OpenInNewIcon sx={{ fontSize: '0.65rem' }} />
                </Box>
              </Tooltip>
            </Box>

            {/* Bio */}
            {profile.bio ? (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  lineHeight: 1.65,
                  maxWidth: 520,
                  fontSize: '0.85rem',
                  mt: 0.25,
                }}
              >
                {profile.bio}
              </Typography>
            ) : isOwner ? (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.disabled,
                  fontStyle: 'italic',
                  fontSize: '0.82rem',
                }}
              >
                Add a bio to tell the community about yourself.
              </Typography>
            ) : null}

            {/* Stats row + edit button — inline on desktop */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mt: 1.5,
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {/* Inline stat pills */}
              {[
                {
                  icon: <ConstructionIcon sx={{ fontSize: 15 }} />,
                  value: profile.build_count,
                  label: profile.build_count === 1 ? 'Build' : 'Builds',
                },
                {
                  icon: <GroupsIcon sx={{ fontSize: 15 }} />,
                  value: profile.roster_count,
                  label: profile.roster_count === 1 ? 'Roster' : 'Rosters',
                },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '10px',
                    background: isDarkMode
                      ? `linear-gradient(135deg, ${accent}14 0%, rgba(11,18,32,0.4) 100%)`
                      : `linear-gradient(135deg, ${accent}0c 0%, rgba(255,255,255,0.6) 100%)`,
                    border: isDarkMode ? `1px solid ${accent}28` : `1px solid ${accent}1a`,
                    boxShadow: isDarkMode ? `0 0 12px ${accent}0a` : 'none',
                  }}
                >
                  <Box sx={{ color: accent, display: 'flex', opacity: 0.8 }}>{stat.icon}</Box>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: accent,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}

              {/* Divider dot */}
              {isOwner && (
                <Box
                  sx={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                  }}
                />
              )}

              {/* Edit bio button */}
              {isOwner && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={() => setBioDialogOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '10px',
                    px: 2,
                    py: 0.5,
                    fontSize: '0.78rem',
                    color: theme.palette.text.secondary,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: `${accent}80`,
                      color: accent,
                      background: `${accent}0a`,
                      boxShadow: `0 0 12px ${accent}18`,
                    },
                  }}
                >
                  {profile.bio ? 'Edit bio' : 'Add bio'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Builds ─────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 6 }}>
        <SectionHeading
          icon={<ConstructionIcon sx={{ fontSize: 20 }} />}
          label="Builds"
          count={profile.build_count}
        />
        {hasBuild ? (
          <>
            <Grid container spacing={2.5}>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '10px',
                    px: 3,
                    borderColor: `${accent}35`,
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: `${accent}80`, boxShadow: `0 0 16px ${accent}20` },
                  }}
                  onClick={() =>
                    navigate(`/build-hub?author=${encodeURIComponent(profile.username)}`, {
                      vtType: 'forward',
                    })
                  }
                >
                  View all {profile.build_count} builds
                </Button>
              </Box>
            )}
          </>
        ) : (
          <EmptyState
            icon={<ConstructionIcon sx={{ fontSize: 40 }} />}
            message="No public builds yet."
            actionLabel={isOwner ? 'Create a build' : undefined}
            onAction={isOwner ? () => navigate('/build-editor', { vtType: 'forward' }) : undefined}
          />
        )}
      </Box>

      {/* ── Rosters ────────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading
          icon={<GroupsIcon sx={{ fontSize: 20 }} />}
          label="Rosters"
          count={profile.roster_count}
        />
        {hasRoster ? (
          <>
            <Grid container spacing={2.5}>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '10px',
                    px: 3,
                    borderColor: `${accent}35`,
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: `${accent}80`, boxShadow: `0 0 16px ${accent}20` },
                  }}
                  onClick={() =>
                    navigate(`/roster-hub?author=${encodeURIComponent(profile.username)}`, {
                      vtType: 'forward',
                    })
                  }
                >
                  View all {profile.roster_count} rosters
                </Button>
              </Box>
            )}
          </>
        ) : (
          <EmptyState
            icon={<GroupsIcon sx={{ fontSize: 40 }} />}
            message="No public rosters yet."
            actionLabel={isOwner ? 'Create a roster' : undefined}
            onAction={
              isOwner ? () => navigate('/roster-builder', { vtType: 'forward' }) : undefined
            }
          />
        )}
      </Box>

      {/* ── Bio edit dialog ────────────────────────────────────────────── */}
      <BioDialog
        open={bioDialogOpen}
        current={profile.bio}
        saving={bioSaving}
        onSave={handleSaveBio}
        onClose={() => setBioDialogOpen(false)}
      />

      {/* ── Delete confirmation dialog ─────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: DIALOG_PAPER_SX(isDarkMode, theme.palette.divider) } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Space Grotesk, Inter, system-ui' }}>
          Delete {deleteTarget?.type}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
