/**
 * ShareButton Component
 *
 * Share button with URL generation and clipboard functionality.
 *
 * @module ShareButton
 */

import { Share } from '@mui/icons-material';
import { Alert, Button, Snackbar, Tooltip } from '@mui/material';
import React, { useCallback, useState } from 'react';

import { getBaseUrl } from '@/utils/envUtils';

import { TRANSPORT_MOTION } from '../constants/replayDesign';

interface ShareButtonProps {
  /** Report ID for URL generation */
  reportId?: string;
  /** Fight ID for URL generation */
  fightId?: string;
  /** Current playback time in milliseconds */
  currentTime: number;
  /** Optional ref to actor ID for URL generation */
  selectedActorIdRef?: React.RefObject<number | null>;
  /** Optional ref to current time for more accurate sharing */
  timeRef?: React.RefObject<number> | { current: number };
}

/**
 * Share Button Component
 *
 * Provides a share button that generates a shareable URL for the current replay state.
 * Features:
 * - Web Share API support (mobile devices)
 * - Clipboard API support with secure context check
 * - Fallback to manual copy for unsupported environments
 * - Success snackbar notification
 * - Only renders if reportId and fightId are provided
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  reportId,
  fightId,
  currentTime,
  selectedActorIdRef,
  timeRef,
}) => {
  const [shareSnackbar, setShareSnackbar] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);

  // Format time for display
  const formatTime = useCallback((timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Share URL handler
  const handleShareUrl = useCallback(async () => {
    if (!reportId || !fightId) return;

    try {
      // Get the base URL from Vite config, fallback to current origin
      const baseUrl = getBaseUrl();

      // Construct the full URL with hash routing
      const replayPath = `/report/${reportId}/fight/${fightId}/replay`;
      const searchParams = new URLSearchParams();

      // Get current time from the timeRef for the most accurate time
      const currentTimeFromRef = timeRef?.current ?? currentTime;
      searchParams.set('time', Math.round(currentTimeFromRef).toString());

      // Add selected actor if available - read from ref
      const selectedActorId = selectedActorIdRef?.current;
      if (selectedActorId !== undefined && selectedActorId !== null) {
        searchParams.set('actorId', selectedActorId.toString());
      }

      // Construct the final shareable URL
      const shareUrl = `${baseUrl}#${replayPath}?${searchParams.toString()}`;

      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: 'ESO Fight Replay',
          text: `Fight replay at ${formatTime(currentTimeFromRef)}`,
          url: shareUrl,
        });
        return; // Success, no need for snackbar
      }

      // Check if clipboard API is available and we're in a secure context
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setShareSnackbar({ severity: 'success', message: 'Shareable URL copied to clipboard!' });
      } else {
        // Fallback for non-secure contexts or unsupported browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          // Use deprecated execCommand as fallback for non-secure contexts
          document.execCommand('copy');
          setShareSnackbar({ severity: 'success', message: 'Shareable URL copied to clipboard!' });
        } catch {
          // Last resort - show the textarea for manual copy
          textArea.style.position = 'static';
          textArea.style.left = 'auto';
          textArea.style.top = 'auto';
          textArea.select();
          setShareSnackbar({ severity: 'success', message: 'Shareable URL copied to clipboard!' });
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      // The user dismissing the native share sheet rejects with AbortError —
      // that is an intentional cancel, not a failure, so stay silent.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setShareSnackbar({
        severity: 'error',
        message: 'Unable to share. Please copy the page URL manually.',
      });
    }
  }, [reportId, fightId, currentTime, selectedActorIdRef, formatTime, timeRef]);

  // Don't render if we don't have required props
  if (!reportId || !fightId) {
    return null;
  }

  return (
    <>
      <Tooltip title="Copy a link to this exact replay moment">
        <Button
          onClick={handleShareUrl}
          variant="outlined"
          aria-label="Share current replay time"
          startIcon={<Share sx={{ fontSize: '1.05rem' }} />}
          disableElevation
          sx={(theme) => ({
            // Match the bold proto's share pill exactly: soft cyan-tinted fill, cyan-glass
            // border, cyan text, 11px radius, 34px tall to line up with the speed chips.
            height: 34,
            borderRadius: '11px',
            px: '13px',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            color: 'primary.main',
            border: '1px solid',
            borderColor: `${theme.palette.primary.main}47`, // ~0.28 alpha
            backgroundColor: `${theme.palette.primary.main}0f`, // ~0.06 alpha
            transition: `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, border-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
            '&:hover': {
              backgroundColor: `${theme.palette.primary.main}1f`,
              borderColor: `${theme.palette.primary.main}80`,
            },
            // Hide the word on very narrow screens; the icon + tooltip + aria-label carry it.
            '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } },
            '& .share-label': { display: { xs: 'none', sm: 'inline' } },
          })}
        >
          <span className="share-label">Share</span>
        </Button>
      </Tooltip>

      {/* Share result Snackbar. Bottom-center (avoids colliding with the global AppBar);
          5s, and announced via the Alert's live region. Success or error. */}
      <Snackbar
        open={shareSnackbar !== null}
        autoHideDuration={5000}
        onClose={() => setShareSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShareSnackbar(null)}
          severity={shareSnackbar?.severity ?? 'success'}
          role="status"
          aria-live="polite"
          sx={{ width: '100%' }}
        >
          {shareSnackbar?.message ?? ''}
        </Alert>
      </Snackbar>
    </>
  );
};
