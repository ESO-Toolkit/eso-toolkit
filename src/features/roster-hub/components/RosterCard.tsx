import { ContentCopy, DeleteOutline, EditOutlined, Extension, MoreVert } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useRef } from 'react';

import discordIcon from '../../../assets/discord-icon.svg';
import { useViewTransitionNavigate } from '../../../hooks/useViewTransitionNavigate';
import { getAddonManagerDeepLink } from '../../build-hub/api/packs-api';
import type { HubRoster } from '../types/roster-hub.types';
import { TAG_COLORS } from '../types/roster-hub.types';

import { VoteButton } from './VoteButton';

interface RosterCardProps {
  roster: HubRoster;
  isOwner: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (roster: HubRoster) => void;
  onPublishDiscord?: (roster: HubRoster) => void;
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
  OAC: 'Oathsworn Citadel',
  RG: 'Rockgrove',
  SE: "Sanity's Edge",
  SO: 'Sanctum Ophidia',
  SS: 'Sunspire',
};

// Short abbreviations for badge display
export const TRIAL_SHORT: Record<string, string> = {
  AA: 'AA',
  AS: 'AS',
  BRP: 'BRP',
  CR: 'CR',
  DSR: 'DSR',
  HOF: 'HoF',
  HRC: 'HRC',
  KA: 'KA',
  LC: 'LC',
  MOL: 'MoL',
  OAC: 'OAC',
  RG: 'RG',
  SE: 'SE',
  SO: 'SO',
  SS: 'SS',
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

export const RosterCard: React.FC<RosterCardProps> = React.memo(
  ({ roster, isOwner, isLoggedIn, onVote, onDelete, onEdit, onPublishDiscord }) => {
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const navigate = useViewTransitionNavigate();
    const cardRef = useRef<HTMLDivElement>(null);
    const isDark = theme.palette.mode === 'dark';

    // ── Overflow menu state ─────────────────────────────────────────────────
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchor);

    const handleGetAddons = (e: React.MouseEvent): void => {
      e.stopPropagation();
      const packId = roster.recommended_addons?.packId ?? 'trial-essentials';
      const deepLink = getAddonManagerDeepLink(packId);
      window.location.href = deepLink;
      setTimeout(() => {
        void navigator.clipboard.writeText(deepLink).then(() => {
          enqueueSnackbar('Deep link copied — install ESO Addon Manager to use it', {
            variant: 'info',
            autoHideDuration: 4000,
          });
        });
      }, 1500);
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>): void => {
      e.stopPropagation();
      setMenuAnchor(e.currentTarget);
    };

    const handleMenuClose = (): void => {
      setMenuAnchor(null);
    };

    const handleCopyLink = (): void => {
      handleMenuClose();
      const url = `${window.location.origin}${import.meta.env.BASE_URL}rv?r=${roster.roster_data}`;
      void navigator.clipboard.writeText(url).then(() => {
        enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
      });
    };

    const handlePublishDiscord = (): void => {
      handleMenuClose();
      onPublishDiscord?.(roster);
    };

    const handleEdit = (): void => {
      handleMenuClose();
      onEdit(roster);
    };

    const handleDelete = (): void => {
      handleMenuClose();
      onDelete(roster.id);
    };

    const trialShort = TRIAL_SHORT[roster.trial_id] ?? roster.trial_id;
    const trialFull = TRIAL_LABELS[roster.trial_id] ?? roster.trial_id;
    const accentColor =
      roster.tags.map((t) => TAG_COLORS[t]).find(Boolean) ?? '#3b82f6';

    const displayName = roster.is_anonymous ? 'Anonymous' : roster.author_name || '?';

    return (
      <Card
        ref={cardRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          position: 'relative',
          background: isDark
            ? `linear-gradient(135deg, ${accentColor}14 0%, rgba(56, 189, 248, 0.10) 50%, rgba(0, 225, 255, 0.10) 100%)`
            : `linear-gradient(135deg, ${accentColor}12 0%, rgba(219, 234, 254, 0.45) 50%, rgba(224, 242, 254, 0.45) 100%)`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isDark ? `1px solid rgba(255,255,255,0.09)` : `1px solid rgba(0,0,0,0.09)`,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: isDark
            ? `0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)`,
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: isDark
              ? `0 0 0 1px ${accentColor}35, 0 16px 40px -8px ${accentColor}50, 0 6px 20px -4px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`
              : `0 0 0 1px ${accentColor}25, 0 16px 40px -8px ${accentColor}35, 0 6px 20px -4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)`,
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
            height: '4px',
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 20%, ${accentColor} 50%, ${accentColor}80 80%, transparent 100%)`,
            boxShadow: `0 0 12px ${accentColor}80, 0 0 28px ${accentColor}40`,
            borderRadius: '4px 4px 0 0',
            zIndex: 2,
          }}
          aria-hidden="true"
        />

        {/* Clickable area — opens preview */}
        <CardActionArea
          onClick={() =>
            navigate(`/rv?r=${encodeURIComponent(roster.roster_data)}`, {
              vtType: 'forward',
              morph: { ref: cardRef, name: 'roster-hero' },
            })
          }
          sx={{ flexGrow: 1, alignItems: 'flex-start' }}
          aria-label={`View ${roster.title}`}
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
                  background: isDark
                    ? `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor}10 100%)`
                    : `linear-gradient(90deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
                  border: `1px solid ${accentColor}45`,
                  boxShadow: `0 0 8px ${accentColor}25`,
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
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc, ${accentColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: `0 0 12px ${accentColor}40`,
                    filter: isDark ? 'brightness(1.2)' : 'none',
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
                {roster.description}
              </Typography>
            )}

            {/* Tags — glassmorphic mini chips */}
            {roster.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
                {roster.tags.map((tag) => {
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
                        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                        border: isDark
                          ? '1px solid rgba(255,255,255,0.12)'
                          : '1px solid rgba(0,0,0,0.10)',
                        color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
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
            <Box sx={{ flexGrow: 1, minHeight: 12 }} />

            {/* Author + date — glassmorphic footer with accent bar */}
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
              {/* Vertical accent bar */}
              <Box
                sx={{
                  width: '3px',
                  flexShrink: 0,
                  background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`,
                  boxShadow: `0 0 6px ${accentColor}30`,
                }}
                aria-hidden="true"
              />

              {/* Name + timestamp stacked */}
              <Box sx={{ minWidth: 0, flex: 1, px: 1.25, py: 0.9 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)',
                    letterSpacing: '-0.005em',
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
                    letterSpacing: '0.01em',
                  }}
                >
                  {formatDate(roster.created_at)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Action row */}
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
            voteCount={roster.vote_count}
            voted={roster.user_voted ?? false}
            disabled={!isLoggedIn}
            onVote={() => onVote(roster.id)}
          />

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title="Get recommended addons in ESO Addon Manager">
              <IconButton
                size="small"
                onClick={handleGetAddons}
                aria-label="Get addons"
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

            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="More actions"
                aria-controls={menuOpen ? 'roster-card-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? 'true' : undefined}
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.disabled',
                  '&:hover': { color: 'text.secondary' },
                }}
              >
                <MoreVert sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Menu
            id="roster-card-menu"
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 200,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  background: isDark ? 'rgba(20,25,40,0.92)' : 'rgba(255,255,255,0.95)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                },
              },
            }}
          >
            <MenuItem onClick={handleCopyLink}>
              <ListItemIcon>
                <ContentCopy sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText>Copy share link</ListItemText>
            </MenuItem>

            {isOwner && onPublishDiscord && (
              <MenuItem onClick={handlePublishDiscord}>
                <ListItemIcon>
                  <img
                    src={discordIcon}
                    alt=""
                    style={{
                      width: 18,
                      height: 18,
                      opacity: isDark ? 0.85 : 0.65,
                    }}
                  />
                </ListItemIcon>
                <ListItemText>Publish to Discord</ListItemText>
              </MenuItem>
            )}

            {isOwner && (
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <EditOutlined sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>Edit details</ListItemText>
              </MenuItem>
            )}

            {isOwner && <Divider />}

            {isOwner && (
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <DeleteOutline sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </CardActions>
      </Card>
    );
  },
);

RosterCard.displayName = 'RosterCard';
