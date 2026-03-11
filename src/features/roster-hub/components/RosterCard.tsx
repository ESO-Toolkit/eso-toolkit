import { ContentCopy, DeleteOutline } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import type { HubRoster } from '../types/roster-hub.types';
import { TAG_COLORS } from '../types/roster-hub.types';

import { VoteButton } from './VoteButton';

interface RosterCardProps {
  roster: HubRoster;
  isOwner: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onPreview: (roster: HubRoster) => void;
  onDelete: (id: string) => void;
}

// Shared trial label map — single source of truth
export const TRIAL_LABELS: Record<string, string> = {
  AA: 'Aetherian Archive',
  AS: 'Asylum Sanctorium',
  BRP: 'Blackrose Prison',
  CR: 'Cloudrest',
  DSR: 'Dreadsail Reef',
  HOF: 'Hall of Fabrication',
  HRC: 'Hel Ra Citadel',
  KA: "Kyne's Aegis",
  LC: 'Lucent Citadel',
  MOL: 'Maw of Lorkhaj',
  RG: 'Rockgrove',
  SE: "Sanity's Edge",
  SO: 'Sunspire',
  SS: 'Sunken Sanctum',
};

// Short abbreviations for badge display
const TRIAL_SHORT: Record<string, string> = {
  AA: 'AA', AS: 'AS', BRP: 'BRP', CR: 'CR', DSR: 'DSR', HOF: 'HoF',
  HRC: 'HRC', KA: 'KA', LC: 'LC', MOL: 'MoL', RG: 'RG', SE: 'SE',
  SO: 'SO', SS: 'SS',
};

// Trial accent colors — gives each trial its visual identity
export const TRIAL_ACCENT: Record<string, string> = {
  AA: '#f59e0b',  // amber
  AS: '#6366f1',  // indigo
  BRP: '#ef4444', // red
  CR: '#22c55e',  // green
  DSR: '#a855f7', // purple
  HOF: '#f97316', // orange
  HRC: '#eab308', // yellow
  KA: '#06b6d4',  // cyan
  LC: '#8b5cf6',  // violet
  MOL: '#ec4899', // pink
  RG: '#14b8a6',  // teal
  SE: '#ef4444',  // red
  SO: '#3b82f6',  // blue
  SS: '#0ea5e9',  // sky
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

// Deterministic avatar color from author name (matches CommentSection)
function getAvatarHue(name: string): number {
  return name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

export const RosterCard: React.FC<RosterCardProps> = React.memo(
  ({ roster, isOwner, isLoggedIn, onVote, onPreview, onDelete }) => {
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const handleCopyLink = (e: React.MouseEvent): void => {
      e.stopPropagation();
      const url = `${window.location.origin}/rv?r=${roster.roster_data}`;
      void navigator.clipboard.writeText(url).then(() => {
        enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
      });
    };

    const trialShort = TRIAL_SHORT[roster.trial_id] ?? roster.trial_id;
    const trialFull = TRIAL_LABELS[roster.trial_id] ?? roster.trial_id;
    const accentColor = TRIAL_ACCENT[roster.trial_id] ?? '#3b82f6';

    const authorHue = getAvatarHue(roster.author_name || '?');
    const avatarColor = `hsl(${authorHue}, 55%, 55%)`;
    const initial = (roster.author_name || '?')[0].toUpperCase();

    return (
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          position: 'relative',
          background: isDark
            ? `linear-gradient(135deg, ${accentColor}0a 0%, rgba(152,131,227,0.06) 50%, rgba(11,18,32,0.5) 100%)`
            : `linear-gradient(135deg, ${accentColor}08 0%, rgba(152,131,227,0.04) 50%, rgba(255,255,255,0.7) 100%)`,
          border: isDark
            ? `1px solid rgba(255,255,255,0.07)`
            : `1px solid rgba(0,0,0,0.08)`,
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isDark
              ? `0 0 0 1px ${accentColor}30, 0 12px 32px -6px ${accentColor}45, 0 4px 16px -4px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${accentColor}20, 0 12px 32px -6px ${accentColor}30, 0 4px 16px -4px rgba(0,0,0,0.12)`,
          },
        }}
      >
        {/* Glowing accent bar — feathered gradient like PlayerCard top DPS */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}70 20%, ${accentColor} 50%, ${accentColor}70 80%, transparent 100%)`,
            boxShadow: `0 0 8px ${accentColor}70, 0 0 20px ${accentColor}30`,
            borderRadius: '4px 4px 0 0',
            zIndex: 2,
          }}
          aria-hidden="true"
        />

        {/* Clickable area — opens preview */}
        <CardActionArea
          onClick={() => onPreview(roster)}
          sx={{ flexGrow: 1, alignItems: 'flex-start' }}
          aria-label={`Preview ${roster.title}`}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              pt: 2.5, // extra top padding clears the accent bar
              pb: '12px !important',
            }}
          >
            {/* Trial badge */}
            <Tooltip title={trialFull} placement="top">
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  mb: 1,
                  px: 0.75,
                  py: 0.3,
                  borderRadius: '5px',
                  background: isDark
                    ? `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor}10 100%)`
                    : `linear-gradient(90deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
                  border: `1px solid ${accentColor}45`,
                  boxShadow: `0 0 6px ${accentColor}25`,
                  alignSelf: 'flex-start',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: isDark ? accentColor : accentColor,
                    lineHeight: 1,
                    textTransform: 'uppercase',
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
                fontWeight: 700,
                lineHeight: 1.35,
                mb: 0.75,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                fontSize: '0.95rem',
              }}
            >
              {roster.title}
            </Typography>

            {/* Description — clamped to 2 lines */}
            {roster.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                  fontSize: '0.8rem',
                  opacity: 0.85,
                }}
              >
                {roster.description}
              </Typography>
            )}

            {/* Tags — glassmorphic mini chips */}
            {roster.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {roster.tags.map((tag) => {
                  const tagColor = TAG_COLORS[tag] ?? '#888';
                  return (
                    <Box
                      key={tag}
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 0.75,
                        py: 0.2,
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        background: isDark ? `${tagColor}20` : `${tagColor}14`,
                        border: `1px solid ${tagColor}40`,
                        color: isDark ? tagColor : tagColor,
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tag}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Spacer pushes author to bottom */}
            <Box sx={{ flexGrow: 1, minHeight: 8 }} />

            {/* Author + date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {/* Colored avatar based on author name hash */}
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: `${avatarColor}25`,
                  border: `1px solid ${avatarColor}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Typography sx={{ fontSize: '0.48rem', fontWeight: 800, color: avatarColor, lineHeight: 1 }}>
                  {initial}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.72rem' }}>
                {roster.author_name} · {formatDate(roster.created_at)}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Action row */}
        <CardActions
          sx={{
            px: 1.5,
            py: 0.75,
            borderTop: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.07)',
            background: isDark
              ? 'rgba(0,0,0,0.2)'
              : 'rgba(0,0,0,0.02)',
            justifyContent: 'space-between',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <VoteButton
            voteCount={roster.vote_count}
            voted={roster.user_voted ?? false}
            disabled={!isLoggedIn}
            onVote={() => onVote(roster.id)}
          />

          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Tooltip title="Copy share link">
              <IconButton
                size="small"
                onClick={handleCopyLink}
                aria-label="Copy share link"
                sx={{
                  minWidth: 32,
                  minHeight: 32,
                  color: 'text.disabled',
                  '&:hover': { color: 'text.secondary' },
                }}
              >
                <ContentCopy sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            {isOwner && (
              <Tooltip title="Delete roster">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(roster.id)}
                  aria-label="Delete roster"
                  sx={{ minWidth: 32, minHeight: 32 }}
                >
                  <DeleteOutline sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      </Card>
    );
  },
);

RosterCard.displayName = 'RosterCard';
