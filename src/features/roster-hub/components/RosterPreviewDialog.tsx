import {
  ChatBubbleOutline,
  ContentCopy,
  Download,
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew,
  Person,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
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
import { TRIAL_LABELS } from './RosterCard';

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
          },
        },
      }}
    >
      {/* ─── Title bar: trial badge + title + meta + actions ─── */}
      <DialogTitle
        sx={{
          pb: 0.75,
          pt: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'nowrap',
          minHeight: 48,
        }}
      >
        <Tooltip title={trialFull}>
          <Chip
            label={trialShort}
            size="small"
            color="primary"
            variant="filled"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              flexShrink: 0,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Tooltip>
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1,
          }}
        >
          {roster?.title ?? ''}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Person sx={{ fontSize: 14, color: 'text.disabled' }} aria-hidden="true" />
          <Typography variant="caption" color="text.disabled" noWrap>
            {roster?.author_name}
          </Typography>
        </Box>
        <Tooltip title="Open full page">
          <IconButton size="small" onClick={handleOpenFullPage} aria-label="Open full page">
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
              <Chip
                label={commentCount}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  '& .MuiChip-label': { px: 0.5 },
                  bgcolor: 'action.selected',
                }}
              />
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
          <Button size="small" startIcon={<ContentCopy />} onClick={handleCopyLink} variant="outlined">
            Copy link
          </Button>
        </Tooltip>
        <Button
          size="small"
          startIcon={<Download />}
          onClick={handleLoadIntoBuilder}
          variant="contained"
        >
          Load into Builder
        </Button>
      </DialogActions>
    </Dialog>
  );
};
