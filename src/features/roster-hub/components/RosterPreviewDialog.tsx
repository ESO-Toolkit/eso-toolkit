import { ContentCopy, Download, OpenInNew } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
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

  // Reset loading/error state when roster changes
  React.useEffect(() => {
    if (roster) {
      setIframeLoaded(false);
      setIframeError(false);
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

  const previewUrl = roster ? `${window.location.origin}/rv?r=${roster.roster_data}` : '';

  const handleOpenFullPage = (): void => {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (): void => {
    void navigator.clipboard.writeText(previewUrl).then(() => {
      enqueueSnackbar('Link copied to clipboard!', { variant: 'success' });
    });
  };

  const handleLoadIntoBuilder = (): void => {
    if (roster) {
      // Open in new tab to avoid losing the hub browsing state
      window.open(`/roster-builder?r=${roster.roster_data}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={roster !== null}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={SlideUpTransition}
      slotProps={{
        paper: {
          sx: {
            height: isMobile ? '100%' : '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        {roster?.title ?? ''}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <Tooltip title="Open full page">
            <Button size="small" startIcon={<OpenInNew />} onClick={handleOpenFullPage}>
              Full page
            </Button>
          </Tooltip>
        </Box>
      </DialogTitle>

      {/* Iframe preview */}
      <Box
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? 300 : 400,
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
              zIndex: 1,
            }}
          >
            <CircularProgress />
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
            src={previewUrl}
            title={`Preview: ${roster.title}`}
            onLoad={() => setIframeLoaded(true)}
            style={{
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

      {/* Comments section */}
      {roster && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            maxHeight: { xs: 240, md: '30vh' },
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
          />
        </Box>
      )}

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
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
