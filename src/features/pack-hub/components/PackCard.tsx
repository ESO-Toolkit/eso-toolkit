import { ContentCopy, DeleteOutline, EditOutlined, Extension } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React from 'react';

import { formatRelativeDate } from '../../../utils/formatRelativeDate';
import { getAddonManagerDeepLink } from '../../build-hub/api/packs-api';
import { VoteButton } from '../../roster-hub/components/VoteButton';
import type { HubPack } from '../types/pack-hub.types';
import { PACK_TAG_COLORS, PACK_TYPE_ACCENT, PACK_TYPE_LABELS } from '../types/pack-hub.types';

interface PackCardProps {
  pack: HubPack;
  isOwner: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (pack: HubPack) => void;
}

const formatDate = formatRelativeDate;

export const PackCard: React.FC<PackCardProps> = React.memo(
  ({ pack, isOwner, isLoggedIn, onVote, onDelete, onEdit }) => {
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const installTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

    React.useEffect(() => () => clearTimeout(installTimerRef.current), []);

    const tagAccent = pack.tags.map((t) => PACK_TAG_COLORS[t]).find((c): c is string => c != null);
    const accentColor = tagAccent ?? PACK_TYPE_ACCENT[pack.pack_type] ?? '#c4a44a';
    const typeLabel = PACK_TYPE_LABELS[pack.pack_type] ?? pack.pack_type;
    const displayName = pack.is_anonymous ? 'Anonymous' : pack.author_name || '?';
    const addonCount = pack.addons.length;

    const handleCopyLink = (e: React.MouseEvent): void => {
      e.stopPropagation();
      const deepLink = getAddonManagerDeepLink(pack.id);
      void navigator.clipboard.writeText(deepLink).then(
        () => enqueueSnackbar('Deep link copied to clipboard!', { variant: 'success' }),
        () => enqueueSnackbar('Failed to copy link', { variant: 'error' }),
      );
    };

    const handleInstall = (e: React.MouseEvent): void => {
      e.stopPropagation();
      const deepLink = getAddonManagerDeepLink(pack.id);
      window.location.href = deepLink;
      installTimerRef.current = setTimeout(() => {
        void navigator.clipboard.writeText(deepLink).then(() => {
          enqueueSnackbar('Deep link copied — install ESO Addon Manager to use it', {
            variant: 'info',
            autoHideDuration: 4000,
          });
        });
      }, 1500);
    };

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
          WebkitBackdropFilter: 'blur(12px)',
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

        <Box sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
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
            {/* Type badge + addon count */}
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75, alignItems: 'center' }}>
              <Tooltip title={typeLabel}>
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
                    {typeLabel}
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
                  {addonCount} addon{addonCount !== 1 ? 's' : ''}
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
              {pack.title}
            </Typography>

            {/* Description */}
            {pack.description && (
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
                {pack.description}
              </Typography>
            )}

            {/* Tags */}
            {pack.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
                {pack.tags.map((tag) => {
                  const tagColor = PACK_TAG_COLORS[tag] ?? '#94a3b8';
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
                        WebkitBackdropFilter: 'blur(8px)',
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

            {/* Addon preview — first 4 addons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {pack.addons.slice(0, 4).map((addon) => (
                <Chip
                  key={addon.esouiId}
                  label={addon.name}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.06)',
                  }}
                />
              ))}
              {pack.addons.length > 4 && (
                <Chip
                  label={`+${pack.addons.length - 4} more`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    bgcolor: isDark ? `${accentColor}15` : `${accentColor}10`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                />
              )}
            </Box>

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
                WebkitBackdropFilter: 'blur(6px)',
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
                  {formatDate(pack.created_at)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Box>

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
        >
          <VoteButton
            voteCount={pack.vote_count}
            voted={pack.user_voted ?? false}
            disabled={!isLoggedIn}
            onVote={() => onVote(pack.id)}
          />
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title="Install with ESO Addon Manager">
              <IconButton
                size="small"
                onClick={handleInstall}
                aria-label="Install pack"
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.disabled',
                  '&:hover': { color: '#c4a44a' },
                }}
              >
                <Extension sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy deep link">
              <IconButton
                size="small"
                onClick={handleCopyLink}
                aria-label="Copy deep link"
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
              <Tooltip title="Edit pack">
                <IconButton
                  size="small"
                  onClick={() => onEdit(pack)}
                  aria-label="Edit pack"
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
              <Tooltip title="Delete pack">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(pack.id)}
                  aria-label="Delete pack"
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

PackCard.displayName = 'PackCard';
