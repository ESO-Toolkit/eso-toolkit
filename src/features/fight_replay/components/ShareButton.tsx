/**
 * ShareButton Component
 *
 * Share button with URL generation and clipboard functionality.
 *
 * @module ShareButton
 */

import { Share } from '@mui/icons-material';
import { Alert, IconButton, Snackbar, Tooltip } from '@mui/material';
import React, { useCallback, useState } from 'react';

import { getBaseUrl } from '@/utils/envUtils';

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
  const [showShareSnackbar, setShowShareSnackbar] = useState(false);

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
        setShowShareSnackbar(true);
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
          // Try the modern approach first
          await navigator.clipboard.writeText(shareUrl);
          setShowShareSnackbar(true);
        } catch {
          // Last resort - let user manually copy
          textArea.style.position = 'static';
          textArea.style.left = 'auto';
          textArea.style.top = 'auto';
          textArea.select();
          setShowShareSnackbar(true);
        }

        document.body.removeChild(textArea);
      }
    } catch {
      // Show the URL in an alert as a final fallback
      alert('Unable to share. Please copy the current URL manually.');
    }
  }, [reportId, fightId, currentTime, selectedActorIdRef, formatTime, timeRef]);

  // Don't render if we don't have required props
  if (!reportId || !fightId) {
    return null;
  }

  return (
    <>
      <Tooltip title="Share current replay time">
        <IconButton
          onClick={handleShareUrl}
          size="small"
          color="secondary"
          aria-label="Share current replay time"
        >
          <Share />
        </IconButton>
      </Tooltip>

      {/* Share URL Success Snackbar */}
      <Snackbar
        open={showShareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowShareSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowShareSnackbar(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Shareable URL copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};
