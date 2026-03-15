import {
  ChatBubbleOutline,
  ContentCopy,
  Fullscreen,
  FullscreenExit,
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Skeleton,
  Slide,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { useSnackbar } from 'notistack';
import React from 'react';

import type { HubRoster } from '../types/roster-hub.types';

import { CommentSection } from './CommentSection';
import { TRIAL_ACCENT, TRIAL_LABELS, TRIAL_SHORT } from './RosterCard';

const IFRAME_TIMEOUT_MS = 12000;

const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface RosterPreviewDialogProps {
  roster: HubRoster | null;
  isLoggedIn: boolean;
  currentUserId: string;
  token?: string;
  onClose: () => void;
}

export const RosterPreviewDialog: React.FC<RosterPreviewDialogProps> = ({
  roster,
  isLoggedIn,
  currentUserId,
  token,
  onClose,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentCount, setCommentCount] = React.useState(0);
  const [commentsFullscreen, setCommentsFullscreen] = React.useState(false);
  const commentsRegionRef = React.useRef<HTMLDivElement>(null);
  const COMMENT_HEIGHT = isMobile ? 220 : 300;

  // Reset state when roster changes
  React.useEffect(() => {
    if (roster) {
      setIframeLoaded(false);
      setIframeError(false);
      setCommentsOpen(false);
      setCommentCount(0);
      setCommentsFullscreen(false);
    }
  }, [roster]);

  // Listen for postMessage from the iframe when roster content is fully rendered
  React.useEffect(() => {
    if (!roster || iframeLoaded || iframeError) return;

    const handleMessage = (event: MessageEvent): void => {
      if (event.origin === window.location.origin && event.data?.type === 'roster-preview-ready') {
        setIframeLoaded(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Timeout fallback in case the message is never received
    const timer = setTimeout(() => {
      if (!iframeLoaded) setIframeError(true);
    }, IFRAME_TIMEOUT_MS);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [roster, iframeLoaded, iframeError]);

  // Embed mode URL — strips header/footer from the iframe
  // BASE_URL includes the sub-path prefix in preview deployments (e.g. /dev-previews/pr-860/)
  const embedUrl = roster
    ? `${window.location.origin}${import.meta.env.BASE_URL}rv?r=${roster.roster_data}&embed=1`
    : '';

  // Full page URL (no embed — shows normal page with header/footer)
  const shareUrl = roster
    ? `${window.location.origin}${import.meta.env.BASE_URL}rv?r=${roster.roster_data}`
    : '';

  const handleOpenFullPage = (): void => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (): void => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
    });
  };

  const handleLoadIntoBuilder = (): void => {
    if (roster) {
      window.open(
        `${import.meta.env.BASE_URL}roster-builder?r=${roster.roster_data}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const trialShort = TRIAL_SHORT[roster?.trial_id ?? ''] ?? roster?.trial_id ?? '';
  const trialFull = TRIAL_LABELS[roster?.trial_id ?? ''] ?? roster?.trial_id ?? '';
  const accentColor = TRIAL_ACCENT[roster?.trial_id ?? ''] ?? '#3b82f6';

  const isDark = theme.palette.mode === 'dark';

  const isAnonymous = roster?.is_anonymous ?? false;
  const authorName = isAnonymous ? 'Anonymous' : (roster?.author_name ?? '');
  const authorHue = authorName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const avatarColor = isAnonymous ? 'hsl(0, 0%, 55%)' : `hsl(${authorHue}, 55%, 55%)`;

  return (
    <Dialog
      open={roster !== null}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      disableEnforceFocus
      TransitionComponent={SlideUpTransition}
      slotProps={{
        paper: {
          sx: {
            height: isMobile ? '100%' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: isDark
              ? `linear-gradient(160deg, ${accentColor}12 0%, rgba(152,131,227,0.07) 35%, rgba(10,15,28,0.97) 100%)`
              : `linear-gradient(160deg, ${accentColor}08 0%, rgba(152,131,227,0.04) 35%, rgba(248,250,252,0.98) 100%)`,
            border: isDark ? `1px solid ${accentColor}25` : `1px solid ${accentColor}18`,
            boxShadow: isDark
              ? `0 0 0 1px ${accentColor}18, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${accentColor}08`
              : `0 0 0 1px ${accentColor}12, 0 32px 80px rgba(0,0,0,0.18)`,
          },
        },
      }}
    >
      {/* ─── Glowing accent bar at top of dialog ─── */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}60 15%, ${accentColor} 50%, ${accentColor}60 85%, transparent 100%)`,
          boxShadow: `0 0 12px ${accentColor}80, 0 0 30px ${accentColor}40, 0 0 60px ${accentColor}15`,
          zIndex: 10,
        }}
        aria-hidden="true"
      />

      {/* ─── Title bar: trial badge + title + meta + actions ─── */}
      <DialogTitle
        sx={{
          pb: 1.5,
          pt: 2.25,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          flexWrap: 'nowrap',
          minHeight: 64,
          background: isDark
            ? `linear-gradient(180deg, ${accentColor}10 0%, transparent 100%)`
            : `linear-gradient(180deg, ${accentColor}07 0%, transparent 100%)`,
          borderBottom: `1px solid ${isDark ? accentColor + '18' : accentColor + '12'}`,
        }}
      >
        {/* Glowing trial badge */}
        <Tooltip title={trialFull}>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.45,
              borderRadius: '6px',
              background: isDark
                ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}18 100%)`
                : `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}10 100%)`,
              border: `1px solid ${accentColor}55`,
              boxShadow: `0 0 10px ${accentColor}35, inset 0 1px 0 rgba(255,255,255,0.12)`,
              flexShrink: 0,
              cursor: 'default',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: accentColor,
                lineHeight: 1,
                textTransform: 'uppercase',
                textShadow: `0 0 8px ${accentColor}80`,
              }}
            >
              {trialShort}
            </Typography>
          </Box>
        </Tooltip>

        {/* Title */}
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1,
            fontSize: '1.05rem',
            letterSpacing: '-0.01em',
          }}
        >
          {roster?.title ?? ''}
        </Typography>

        {/* Author avatar + name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${avatarColor}40, ${avatarColor}18)`,
              border: `1.5px solid ${avatarColor}60`,
              boxShadow: `0 0 8px ${avatarColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Typography
              sx={{ fontSize: '0.58rem', fontWeight: 800, color: avatarColor, lineHeight: 1 }}
            >
              {isAnonymous ? '?' : (authorName || '?')[0].toUpperCase()}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 600,
                lineHeight: 1.1,
                color: isDark ? 'rgba(255,255,255,0.75)' : 'text.primary',
              }}
              noWrap
            >
              {authorName}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.disabled', lineHeight: 1.2 }}>
              Author
            </Typography>
          </Box>
        </Box>

        <Tooltip title="Open full page">
          <IconButton
            size="small"
            onClick={handleOpenFullPage}
            aria-label="Open full page"
            sx={{
              color: 'text.disabled',
              border: `1px solid transparent`,
              '&:hover': {
                color: accentColor,
                borderColor: `${accentColor}30`,
                background: `${accentColor}10`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* ─── Description (if present) ─── */}
      {roster?.description && !commentsFullscreen && (
        <Box
          sx={{
            px: 2.5,
            py: 1,
            flexShrink: 0,
            borderLeft: `3px solid ${accentColor}60`,
            background: isDark ? `${accentColor}08` : `${accentColor}05`,
            borderBottom: `1px solid ${isDark ? accentColor + '14' : accentColor + '0e'}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6,
              fontSize: '0.82rem',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            {roster.description}
          </Typography>
        </Box>
      )}

      {/* ─── Iframe preview ─── */}
      <Box
        sx={{
          flex: commentsFullscreen ? '0 0 0' : '1 1 0',
          position: 'relative',
          overflow: 'hidden',
          minHeight: commentsFullscreen ? 0 : isMobile ? 200 : 250,
          maxHeight: commentsFullscreen ? 0 : 'none',
          opacity: commentsFullscreen ? 0 : 1,
          transition:
            'flex 0.3s ease, min-height 0.3s ease, max-height 0.3s ease, opacity 0.2s ease',
          background: isDark
            ? 'linear-gradient(180deg, rgb(30,36,52) 0%, rgb(24,30,46) 100%)'
            : 'linear-gradient(180deg, rgb(218,222,234) 0%, rgb(210,216,228) 100%)',
          p: commentsFullscreen ? 0 : isMobile ? '6px' : '10px',
          pt: commentsFullscreen ? 0 : isMobile ? '6px' : '8px',
          // Bottom fade into comments/action bar
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: isDark
              ? 'linear-gradient(to bottom, transparent, rgb(24,30,46))'
              : 'linear-gradient(to bottom, transparent, rgb(210,216,228))',
            pointerEvents: 'none',
            zIndex: 2,
          },
        }}
      >
        {!iframeError && (
          <Box
            sx={{
              position: 'absolute',
              inset: isMobile ? 6 : 8,
              right: isMobile ? 6 : 10,
              left: isMobile ? 6 : 10,
              zIndex: 1,
              borderRadius: '8px',
              overflow: 'hidden',
              background: isDark ? 'rgba(20,24,38,0.92)' : 'rgba(240,242,248,0.92)',
              px: { xs: 2, sm: 3 },
              pt: 4,
              pb: 6,
              opacity: iframeLoaded ? 0 : 1,
              pointerEvents: iframeLoaded ? 'none' : 'auto',
              transition: 'opacity 0.4s ease',
            }}
          >
            {/* Title skeleton */}
            <Skeleton variant="text" width="40%" height={48} sx={{ mb: 3, borderRadius: 2 }} />
            {/* 2×2 content grid skeleton */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
            {/* Bottom section skeleton */}
            <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
          </Box>
        )}
        {iframeError && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
              zIndex: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Preview unavailable
            </Typography>
            <Button size="small" onClick={handleOpenFullPage} startIcon={<OpenInNew />}>
              Open in full page
            </Button>
          </Box>
        )}
        {/* PREVIEW label badge */}
        {iframeLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 12,
              zIndex: 3,
              px: 0.75,
              py: 0.3,
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${accentColor}30`,
              boxShadow: `0 0 6px ${accentColor}20`,
            }}
            aria-hidden="true"
          >
            <Typography
              sx={{
                fontSize: '0.55rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: `${accentColor}cc`,
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Preview
            </Typography>
          </Box>
        )}
        {roster && !iframeError && (
          <iframe
            src={embedUrl}
            title={`Preview: ${roster.title}`}
            /* onLoad not used — loaded signal comes via postMessage from RosterViewPage */
            style={{
              position: 'absolute',
              top: isMobile ? 6 : 8,
              left: isMobile ? 6 : 10,
              width: isMobile ? 'calc(100% - 12px)' : 'calc(100% - 20px)',
              height: isMobile ? 'calc(100% - 12px)' : 'calc(100% - 18px)',
              border: 'none',
              borderRadius: '8px',
              opacity: iframeLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
              display: 'block',
            }}
          />
        )}
      </Box>

      {/* ─── Collapsible comments drawer ─── */}
      {roster && (
        <>
          {/* Comments header bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              background: isDark
                ? 'linear-gradient(180deg, rgba(38,44,72,0.97) 0%, rgba(34,40,66,0.95) 100%)'
                : 'linear-gradient(180deg, rgba(220,224,238,0.97) 0%, rgba(224,228,240,0.95) 100%)',
              borderBottom: isDark
                ? '1px solid rgba(100,110,180,0.12)'
                : '1px solid rgba(0,0,0,0.05)',
              flexShrink: 0,
            }}
          >
            {/* Toggle button — click to open/close */}
            <Box
              onClick={() => {
                setCommentsOpen((prev) => !prev);
                if (commentsFullscreen) setCommentsFullscreen(false);
              }}
              role="button"
              tabIndex={0}
              aria-expanded={commentsOpen}
              aria-label="Toggle comments"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCommentsOpen((prev) => !prev);
                  if (commentsFullscreen) setCommentsFullscreen(false);
                }
              }}
              sx={{
                flex: 1,
                px: 2.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
                background: commentsOpen ? `${accentColor}08` : 'transparent',
                '&:hover': {
                  background: `${accentColor}0c`,
                },
              }}
            >
              <ChatBubbleOutline
                sx={{
                  fontSize: 15,
                  color: commentsOpen ? accentColor : 'text.disabled',
                  transition: 'color 0.15s ease',
                }}
              />
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  fontSize: '0.8rem',
                  color: commentsOpen
                    ? isDark
                      ? 'rgba(255,255,255,0.8)'
                      : 'text.primary'
                    : 'text.secondary',
                  transition: 'color 0.15s ease',
                }}
              >
                Comments
              </Typography>
              {commentCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    px: 0.5,
                    borderRadius: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    background: `${accentColor}20`,
                    border: `1px solid ${accentColor}40`,
                    color: accentColor,
                    lineHeight: 1,
                  }}
                >
                  {commentCount}
                </Box>
              )}
              <Box
                sx={{
                  ml: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: commentsOpen ? accentColor : 'text.disabled',
                  transition: 'color 0.15s ease',
                }}
              >
                {commentsOpen ? (
                  <KeyboardArrowUp fontSize="small" />
                ) : (
                  <KeyboardArrowDown fontSize="small" />
                )}
              </Box>
            </Box>

            {/* Fullscreen toggle button */}
            {commentsOpen && (
              <Tooltip title={commentsFullscreen ? 'Exit fullscreen' : 'Fullscreen comments'}>
                <IconButton
                  size="small"
                  onClick={() => setCommentsFullscreen((prev) => !prev)}
                  aria-label={
                    commentsFullscreen ? 'Exit fullscreen comments' : 'Fullscreen comments'
                  }
                  sx={{
                    mr: 1.5,
                    p: 0.5,
                    borderRadius: '8px',
                    color: commentsFullscreen ? accentColor : 'text.disabled',
                    border: commentsFullscreen
                      ? `1px solid ${accentColor}40`
                      : '1px solid transparent',
                    background: commentsFullscreen ? `${accentColor}12` : 'transparent',
                    '&:hover': {
                      color: accentColor,
                      background: `${accentColor}15`,
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  {commentsFullscreen ? (
                    <FullscreenExit sx={{ fontSize: 18 }} />
                  ) : (
                    <Fullscreen sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Comments content region */}
          <Box
            ref={commentsRegionRef}
            role="region"
            aria-label="Comments"
            sx={{
              ...(commentsFullscreen
                ? { flex: '1 1 0', minHeight: 0 }
                : {
                    maxHeight: commentsOpen ? COMMENT_HEIGHT : 0,
                    flex: '0 0 auto',
                  }),
              overflowY: commentsOpen ? 'auto' : 'hidden',
              opacity: commentsOpen ? 1 : 0,
              transition:
                'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, flex 0.28s ease',
              borderTop: commentsFullscreen
                ? 'none'
                : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              background: isDark
                ? 'linear-gradient(180deg, rgba(36,42,68,0.95) 0%, rgba(30,36,60,0.97) 100%)'
                : 'linear-gradient(180deg, rgba(226,230,242,0.98) 0%, rgba(220,224,238,0.98) 100%)',
              borderLeft: isDark
                ? '1px solid rgba(100,110,180,0.15)'
                : '1px solid rgba(0,0,0,0.06)',
              borderRight: isDark
                ? '1px solid rgba(100,110,180,0.15)'
                : '1px solid rgba(0,0,0,0.06)',
              px: 2.5,
            }}
          >
            <Box sx={{ py: 1.5 }}>
              <CommentSection
                rosterId={roster.id}
                isLoggedIn={isLoggedIn}
                currentUserId={currentUserId}
                token={token}
                onCountChange={setCommentCount}
              />
            </Box>
          </Box>
        </>
      )}

      {/* ─── Action bar ─── */}
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit" size="small">
          Close
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Copy share link">
          <Button
            size="small"
            startIcon={<ContentCopy />}
            onClick={handleCopyLink}
            variant="outlined"
            sx={{
              color: accentColor,
              borderColor: `${accentColor}70`,
              background: `${accentColor}0a`,
              fontWeight: 600,
              '&:hover': {
                borderColor: accentColor,
                background: `${accentColor}18`,
                boxShadow: `0 0 10px ${accentColor}30`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            Copy link
          </Button>
        </Tooltip>
        <Button
          size="small"
          startIcon={<OpenInNew />}
          onClick={handleLoadIntoBuilder}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            letterSpacing: '0.01em',
            boxShadow: `0 0 18px ${accentColor}70, 0 4px 14px rgba(0,0,0,0.45)`,
            textShadow: '0 1px 3px rgba(0,0,0,0.35)',
            '&:hover': {
              background: `linear-gradient(135deg, ${accentColor}ee 0%, ${accentColor} 100%)`,
              boxShadow: `0 0 26px ${accentColor}99, 0 6px 20px rgba(0,0,0,0.5)`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Load into Builder
        </Button>
      </DialogActions>
    </Dialog>
  );
};
