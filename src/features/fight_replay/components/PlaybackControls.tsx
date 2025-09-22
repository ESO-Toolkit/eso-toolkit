import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Forward10,
  Replay10,
  Share,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import { getBaseUrl } from '@/utils/envUtils';

import { useOptimizedTimelineScrubbing } from '../../../hooks/useOptimizedTimelineScrubbing';

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onSkipBackward10: () => void;
  onSkipForward10: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onScrubbingModeChange?: (scrubbing: boolean) => void;
  onDraggingChange?: (dragging: boolean) => void;
  timeRef?: React.RefObject<number> | { current: number };
  // Share button props
  reportId?: string;
  fightId?: string;
  selectedActorIdRef?: React.RefObject<number | null>;
  fightStartTime?: number;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onSkipToStart,
  onSkipToEnd,
  onSkipBackward10,
  onSkipForward10,
  onPlayingChange,
  onScrubbingModeChange,
  onDraggingChange,
  timeRef,
  reportId,
  fightId,
  selectedActorIdRef,
  fightStartTime: _fightStartTime,
}) => {
  // Use optimized timeline scrubbing for better performance
  const {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    progressPercent,
    optimizedStep,
  } = useOptimizedTimelineScrubbing({
    duration,
    currentTime,
    onTimeChange,
    isPlaying,
    onPlayingChange,
    timeRef,
  });

  // Share functionality state
  const [showShareSnackbar, setShowShareSnackbar] = useState(false);

  // Notify parent components about scrubbing mode changes
  React.useEffect(() => {
    onScrubbingModeChange?.(isScrubbingMode);
  }, [isScrubbingMode, onScrubbingModeChange]);

  React.useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Time Display */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {formatTime(displayTime)}
          {isScrubbingMode && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                ml: 1,
                color: 'warning.main',
                fontWeight: 'bold',
              }}
            >
              (SCRUBBING)
            </Typography>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatTime(duration)}
        </Typography>
      </Box>

      {/* Timeline Slider */}
      <Slider
        value={displayTime}
        min={0}
        max={duration}
        step={optimizedStep} // Dynamic step size based on duration
        onChange={handleSliderChange}
        onChangeCommitted={handleSliderChangeEnd}
        onMouseDown={handleSliderChangeStart}
        sx={{
          '& .MuiSlider-thumb': {
            width: isDragging ? 20 : 16, // Larger thumb when dragging for better UX
            height: isDragging ? 20 : 16,
            transition: 'width 0.2s ease, height 0.2s ease',
          },
          '& .MuiSlider-track': {
            height: isDragging ? 6 : 4, // Thicker track when dragging
            transition: 'height 0.2s ease',
          },
          '& .MuiSlider-rail': {
            height: isDragging ? 6 : 4,
            transition: 'height 0.2s ease',
          },
          // Visual feedback for scrubbing mode
          ...(isScrubbingMode && {
            '& .MuiSlider-track': {
              backgroundColor: 'warning.main',
            },
          }),
        }}
      />

      {/* Progress indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
          {Math.round(progressPercent)}%
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 2,
            backgroundColor: 'action.disabled',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: 'primary.main',
              transition: isDragging ? 'none' : 'width 0.1s ease',
            }}
          />
        </Box>
      </Box>

      {/* Control Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <IconButton onClick={onSkipToStart} size="small" title="Skip to start">
          <SkipPrevious />
        </IconButton>

        <IconButton onClick={onSkipBackward10} size="small" title="Skip backward 10 seconds">
          <Replay10 />
        </IconButton>

        <IconButton onClick={onPlayPause} size="large" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>

        <IconButton onClick={onSkipForward10} size="small" title="Skip forward 10 seconds">
          <Forward10 />
        </IconButton>

        <IconButton onClick={onSkipToEnd} size="small" title="Skip to end">
          <SkipNext />
        </IconButton>

        {/* Share Button - only show if we have report and fight IDs */}
        {reportId && fightId && (
          <Tooltip title="Share current replay time">
            <IconButton onClick={handleShareUrl} size="small" color="secondary">
              <Share />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Playback Speed Control */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Speed</InputLabel>
          <Select
            value={playbackSpeed}
            label="Speed"
            onChange={(e) => onSpeedChange(e.target.value as number)}
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <MenuItem key={speed} value={speed}>
                {speed}x
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary">
          Playback Speed
        </Typography>
      </Box>

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
    </Box>
  );
};
