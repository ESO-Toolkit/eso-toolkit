import { ContentCopy, Download, OpenInNew } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { rosterHubApi } from '../api/roster-hub-api';
import type { HubRoster } from '../types/roster-hub.types';

import { CommentSection } from './CommentSection';

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
  const [iframeLoaded, setIframeLoaded] = React.useState(false);

  // Reset loading state when roster changes
  React.useEffect(() => {
    if (roster) setIframeLoaded(false);
  }, [roster]);

  const previewUrl = roster
    ? `${window.location.origin}/rv?r=${roster.roster_data}`
    : '';

  const handleOpenFullPage = (): void => {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (): void => {
    void navigator.clipboard.writeText(previewUrl);
  };

  const handleLoadIntoBuilder = (): void => {
    if (roster) rosterHubApi.loadRosterIntoBuilder(roster);
  };

  return (
    <Dialog
      open={roster !== null}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: { height: '90vh', display: 'flex', flexDirection: 'column' },
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
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', px: 0 }}>
        {!iframeLoaded && (
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
        {roster && (
          <Box
            component="iframe"
            src={previewUrl}
            title={`Preview: ${roster.title}`}
            onLoad={() => setIframeLoaded(true)}
            sx={{
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: iframeLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}
      </Box>

      {/* Comments section */}
      {roster && (
        <Box sx={{ px: 2, py: 1.5, maxHeight: 300, overflowY: 'auto', borderTop: 1, borderColor: 'divider' }}>
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
