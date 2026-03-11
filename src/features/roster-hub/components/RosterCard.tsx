import { ContentCopy, DeleteOutline } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Typography,
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
  CR: "Cloudrest",
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

// Trial accent colors — gives each trial a distinctive top border on cards
const TRIAL_ACCENT: Record<string, string> = {
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
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const RosterCard: React.FC<RosterCardProps> = React.memo(
  ({ roster, isOwner, isLoggedIn, onVote, onPreview, onDelete }) => {
    const { enqueueSnackbar } = useSnackbar();

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

    return (
      <Card
        variant="outlined"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          borderTop: `3px solid ${accentColor}`,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
          '&:hover': {
            boxShadow: `0 8px 25px -5px ${accentColor}33, 0 4px 10px -6px ${accentColor}22`,
            borderColor: 'divider',
            borderTopColor: accentColor,
            transform: 'translateY(-3px)',
          },
          '&:focus-within': {
            borderColor: 'divider',
            borderTopColor: accentColor,
          },
        }}
      >
        {/* Clickable area — opens preview */}
        <CardActionArea
          onClick={() => onPreview(roster)}
          sx={{
            flexGrow: 1,
            alignItems: 'flex-start',
          }}
          aria-label={`Preview ${roster.title}`}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              pb: '12px !important',
            }}
          >
            {/* Trial badge row */}
            <Tooltip title={trialFull} placement="top">
              <Box component="span" sx={{ display: 'inline-flex', mb: 1 }}>
                <Chip
                  label={trialShort}
                  size="small"
                  color="primary"
                  variant="filled"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
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
                }}
              >
                {roster.description}
              </Typography>
            )}

            {/* Tags */}
            {roster.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {roster.tags.map((tag) => {
                  const tagColor = TAG_COLORS[tag];
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        '& .MuiChip-label': { px: 0.75 },
                        ...(tagColor
                          ? {
                              borderColor: `${tagColor}50`,
                              color: tagColor,
                              fontWeight: 600,
                            }
                          : {}),
                      }}
                    />
                  );
                })}
              </Box>
            )}

            {/* Spacer pushes author to bottom */}
            <Box sx={{ flexGrow: 1, minHeight: 8 }} />

            {/* Author + date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'action.selected',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled', lineHeight: 1 }}>
                  {(roster.author_name || '?')[0].toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.disabled" noWrap>
                {roster.author_name} · {formatDate(roster.created_at)}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Divider + action row */}
        <CardActions
          sx={{
            px: 1.5,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
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
                sx={{ minWidth: 36, minHeight: 36 }}
              >
                <ContentCopy sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {isOwner && (
              <Tooltip title="Delete roster">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(roster.id)}
                  aria-label="Delete roster"
                  sx={{ minWidth: 36, minHeight: 36 }}
                >
                  <DeleteOutline sx={{ fontSize: 16 }} />
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
