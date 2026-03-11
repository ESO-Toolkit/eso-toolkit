import {
  ChatBubbleOutline,
  ContentCopy,
  Download,
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew,
} from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
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
import { TRIAL_ACCENT, TRIAL_LABELS } from './RosterCard';

const IFRAME_TIMEOUT_MS = 12000;

// Short labels for the badge in dialog title
const TRIAL_SHORT: Record<string, string> = {
  AA: 'AA', AS: 'AS', BRP: 'BRP', CR: 'CR', DSR: 'DSR', HOF: 'HoF',
  HRC: 'HRC', KA: 'KA', LC: 'LC', MOL: 'MoL', RG: 'RG', SE: 'SE',
  SO: 'SO', SS: 'SS',
};

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

  // Reset state when roster changes
  React.useEffect(() => {
    if (roster) {
      setIframeLoaded(false);
      setIframeError(false);
      setCommentsOpen(false);
      setCommentCount(0);
    }
  }, [roster]);

  // Iframe load timeout
  React.useEffect(() => {
    if (!roster || iframeLoaded || iframeError) return;
    const timer = setTimeout(() => {
      if (!iframeLoaded) setIframeError(true);
    }, IFRAME_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [roster, iframeLoaded, iframeError]);

  // Embed mode URL — strips header/footer from the iframe
  const embedUrl = roster
    ? `${window.location.origin}/rv?r=${roster.roster_data}&embed=1`
    : '';

  // Full page URL (no embed — shows normal page with header/footer)
  const shareUrl = roster
    ? `${window.location.origin}/rv?r=${roster.roster_data}`
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
      window.open(`/roster-builder?r=${roster.roster_data}`, '_blank', 'noopener,noreferrer');
    }
  };

  const trialShort = TRIAL_SHORT[roster?.trial_id ?? ''] ?? roster?.trial_id ?? '';
  const trialFull = TRIAL_LABELS[roster?.trial_id ?? ''] ?? roster?.trial_id ?? '';
  const accentColor = TRIAL_ACCENT[roster?.trial_id ?? ''] ?? '#3b82f6';

  const authorName = roster?.author_name ?? '';
  const authorHue = authorName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const avatarColor = `hsl(${authorHue}, 55%, 55%)`;

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
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(160deg, ${accentColor}0a 0%, rgba(152,131,227,0.06) 40%, rgba(11,18,32,0.85) 100%)`
              : `linear-gradient(160deg, ${accentColor}06 0%, rgba(152,131,227,0.03) 40%, rgba(248,250,252,0.95) 100%)`,
            border: theme.palette.mode === 'dark'
              ? `1px solid rgba(255,255,255,0.08)`
              : `1px solid rgba(0,0,0,0.08)`,
            boxShadow: theme.palette.mode === 'dark'
              ? `0 0 0 1px ${accentColor}20, 0 24px 60px rgba(0,0,0,0.6)`
              : `0 0 0 1px ${accentColor}15, 0 24px 60px rgba(0,0,0,0.15)`,
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
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}70 20%, ${accentColor} 50%, ${accentColor}70 80%, transparent 100%)`,
          boxShadow: `0 0 8px ${accentColor}70, 0 0 20px ${accentColor}30`,
          zIndex: 10,
        }}
        aria-hidden="true"
      />

      {/* ─── Title bar: trial badge + title + meta + actions ─── */}
      <DialogTitle
        sx={{
          pb: 0.75,
          pt: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'nowrap',
          minHeight: 52,
        }}
      >
        {/* Glowing trial badge */}
        <Tooltip title={trialFull}>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 0.75,
              py: 0.3,
              borderRadius: '5px',
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor}10 100%)`
                : `linear-gradient(90deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
              border: `1px solid ${accentColor}45`,
              boxShadow: `0 0 6px ${accentColor}25`,
              flexShrink: 0,
              cursor: 'default',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: accentColor,
                lineHeight: 1,
                textTransform: 'uppercase',
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
            fontSize: '1rem',
          }}
        >
          {roster?.title ?? ''}
        </Typography>

        {/* Author avatar + name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
              {(authorName || '?')[0].toUpperCase()}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" noWrap>
            {authorName}
          </Typography>
        </Box>

        <Tooltip title="Open full page">
          <IconButton size="small" onClick={handleOpenFullPage} aria-label="Open full page"
            sx={{ color: 'text.disabled', '&:hover': { color: accentColor } }}>
            <OpenInNew fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* ─── Description (if present) ─── */}
      {roster?.description && (
        <Box
          sx={{
            px: 2,
            py: 0.75,
            borderTop: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              fontSize: '0.8rem',
            }}
          >
            {roster.description}
          </Typography>
        </Box>
      )}

      {/* ─── Iframe preview ─── */}
      <Box
        sx={{
          flex: '1 1 0',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? 200 : 250,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {!iframeLoaded && !iframeError && (
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
            <CircularProgress size={28} />
            <Typography variant="caption" color="text.disabled">
              Loading preview…
            </Typography>
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
        {roster && !iframeError && (
          <iframe
            src={embedUrl}
            title={`Preview: ${roster.title}`}
            onLoad={() => setIframeLoaded(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: iframeLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: 'block',
            }}
          />
        )}
      </Box>

      {/* ─── Collapsible comments drawer ─── */}
      {roster && (
        <>
          <Box
            onClick={() => setCommentsOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={commentsOpen}
            aria-label="Toggle comments"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCommentsOpen((prev) => !prev);
              }
            }}
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              borderTop: 1,
              borderColor: 'divider',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ChatBubbleOutline sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
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
                  bgcolor: 'action.selected',
                  color: 'text.secondary',
                  lineHeight: 1,
                }}
              >
                {commentCount}
              </Box>
            )}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', color: 'text.disabled' }}>
              {commentsOpen ? (
                <KeyboardArrowUp fontSize="small" />
              ) : (
                <KeyboardArrowDown fontSize="small" />
              )}
            </Box>
          </Box>
          <Collapse in={commentsOpen} unmountOnExit>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                maxHeight: { xs: 220, md: 280 },
                overflowY: 'auto',
                borderTop: 1,
                borderColor: 'divider',
              }}
              role="region"
              aria-label="Comments"
            >
              <CommentSection
                rosterId={roster.id}
                isLoggedIn={isLoggedIn}
                currentUserId={currentUserId}
                token={token}
                onCountChange={setCommentCount}
              />
            </Box>
          </Collapse>
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
              color: '#22d3ee',
              borderColor: 'rgba(6,182,212,0.45)',
              background: 'rgba(6,182,212,0.06)',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(6,182,212,0.75)',
                background: 'rgba(6,182,212,0.12)',
                boxShadow: '0 0 10px rgba(6,182,212,0.2)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Copy link
          </Button>
        </Tooltip>
        <Button
          size="small"
          startIcon={<Download />}
          onClick={handleLoadIntoBuilder}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            letterSpacing: '0.01em',
            boxShadow: '0 0 18px rgba(6,182,212,0.45), 0 4px 14px rgba(0,0,0,0.45)',
            textShadow: '0 1px 3px rgba(0,0,0,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
              boxShadow: '0 0 26px rgba(6,182,212,0.6), 0 6px 20px rgba(0,0,0,0.5)',
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
