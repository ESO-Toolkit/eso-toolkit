import { ContentCopy, DeleteOutline, EditOutlined } from '@mui/icons-material';
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

import { VoteButton } from '../../roster-hub/components/VoteButton';
import type { HubBuild } from '../types/build-hub.types';
import { BUILD_TAG_COLORS, ROLE_ACCENT } from '../types/build-hub.types';

interface BuildCardProps {
  build: HubBuild;
  isOwner: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onPreview: (build: HubBuild) => void;
  onDelete: (id: string) => void;
  onEdit: (build: HubBuild) => void;
}

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

export const BuildCard: React.FC<BuildCardProps> = React.memo(
  ({ build, isOwner, isLoggedIn, onVote, onPreview, onDelete, onEdit }) => {
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const handleCopyLink = (e: React.MouseEvent): void => {
      e.stopPropagation();
      const url = `${window.location.origin}${import.meta.env.BASE_URL}bv?b=${encodeURIComponent(build.build_data)}`;
      void navigator.clipboard.writeText(url).then(() => {
        enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
      });
    };

    const classShort = CLASS_LABELS[build.eso_class] ?? build.eso_class;
    const roleLabel = ROLE_LABELS[build.role] ?? build.role;
    const tagAccent = build.tags
      .map((t) => BUILD_TAG_COLORS[t])
      .find((c): c is string => c != null);
    const accentColor = tagAccent ?? ROLE_ACCENT[build.role] ?? '#3b82f6';

    const displayName = build.is_anonymous ? 'Anonymous' : build.author_name || '?';

    return (
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          position: 'relative',
          background: isDark
            ? `linear-gradient(160deg, ${accentColor}12 0%, rgba(152,131,227,0.07) 45%, rgba(11,18,32,0.6) 100%)`
            : `linear-gradient(160deg, ${accentColor}0c 0%, rgba(152,131,227,0.05) 45%, rgba(255,255,255,0.8) 100%)`,
          backdropFilter: 'blur(12px)',
          border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: isDark
              ? `0 0 0 1px ${accentColor}35, 0 16px 40px -8px ${accentColor}50, 0 6px 20px -4px rgba(0,0,0,0.55)`
              : `0 0 0 1px ${accentColor}25, 0 16px 40px -8px ${accentColor}35, 0 6px 20px -4px rgba(0,0,0,0.1)`,
          },
        }}
      >
        {/* Accent bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 20%, ${accentColor} 50%, ${accentColor}80 80%, transparent 100%)`,
            boxShadow: `0 0 12px ${accentColor}80, 0 0 28px ${accentColor}40`,
            borderRadius: '4px 4px 0 0',
            zIndex: 2,
          }}
          aria-hidden="true"
        />

        <CardActionArea
          onClick={() => onPreview(build)}
          sx={{ flexGrow: 1, alignItems: 'flex-start' }}
          aria-label={`Preview ${build.title}`}
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
                    px: 1,
                    py: 0.5,
                    borderRadius: '6px',
                    background: isDark ? `${accentColor}22` : `${accentColor}18`,
                    border: `1px solid ${accentColor}45`,
                    boxShadow: `0 0 8px ${accentColor}25`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                      color: accentColor,
                      lineHeight: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {classShort}
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
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {roleLabel}
                </Typography>
              </Box>
            </Box>

            {/* Title */}
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
              }}
            >
              {build.title}
            </Typography>

            {/* Description */}
            {build.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
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

            {/* Tags */}
            {build.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
                {build.tags.map((tag) => {
                  const tagColor = BUILD_TAG_COLORS[tag] ?? '#94a3b8';
                  return (
                    <Box
                      key={tag}
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        px: 1,
                        py: 0.4,
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backdropFilter: 'blur(8px)',
                        background: isDark ? `${tagColor}25` : `${tagColor}18`,
                        border: `1px solid ${tagColor}50`,
                        color: tagColor,
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

            {/* Spacer */}
            <Box sx={{ flexGrow: 1, minHeight: 12 }} />

            {/* Author footer */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                mt: 0.5,
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                backdropFilter: 'blur(6px)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: '3px',
                  flexShrink: 0,
                  background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`,
                  boxShadow: `0 0 6px ${accentColor}30`,
                }}
                aria-hidden="true"
              />
              <Box sx={{ minWidth: 0, flex: 1, px: 1.25, py: 0.9 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)',
                  }}
                >
                  {formatDate(build.created_at)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Actions */}
        <CardActions
          sx={{
            px: 2.5,
            py: 1,
            borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
            background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.025)',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <VoteButton
            voteCount={build.vote_count}
            voted={build.user_voted ?? false}
            disabled={!isLoggedIn}
            onVote={() => onVote(build.id)}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Copy share link">
              <IconButton
                size="small"
                onClick={handleCopyLink}
                aria-label="Copy share link"
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.disabled',
                  '&:hover': { color: 'text.secondary' },
                }}
              >
                <ContentCopy sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            {isOwner && (
              <Tooltip title="Edit build details">
                <IconButton
                  size="small"
                  onClick={() => onEdit(build)}
                  aria-label="Edit build details"
                  sx={{
                    width: 36,
                    height: 36,
                    color: 'text.disabled',
                    '&:hover': { color: 'text.secondary' },
                  }}
                >
                  <EditOutlined sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
            {isOwner && (
              <Tooltip title="Delete build">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(build.id)}
                  aria-label="Delete build"
                  sx={{ width: 36, height: 36 }}
                >
                  <DeleteOutline sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      </Card>
    );
  },
);

BuildCard.displayName = 'BuildCard';
