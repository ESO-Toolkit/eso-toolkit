/**
 * TimelineSlider Component
 *
 * Timeline slider control for scrubbing through fight replay.
 * Provides visual feedback during dragging and scrubbing mode.
 *
 * @module TimelineSlider
 */

import { Box, Slider, Typography } from '@mui/material';
import React, { useCallback } from 'react';

import { TimelineAnnotation } from '../../../types/timelineAnnotations';

import { TimelineMarkers } from './TimelineMarkers';
interface TimelineSliderProps {
  /** Current playback time in milliseconds */
  displayTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Whether user is currently dragging the slider */
  isDragging: boolean;
  /** Whether in scrubbing mode (rapid time changes) */
  isScrubbingMode: boolean;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Optimized step size for the slider */
  optimizedStep: number;
  /** Callback when slider value changes */
  onSliderChange: (event: Event, value: number | number[]) => void;
  /** Callback when slider change completes */
  onSliderChangeEnd: (event: Event | React.SyntheticEvent, value: number | number[]) => void;
  /** Callback when slider drag starts */
  onSliderChangeStart: (event: React.MouseEvent | React.TouchEvent) => void;
  /** Optional timeline markers to display */
  markers?: TimelineAnnotation[];
  /** Callback when a marker is clicked */
  onMarkerClick?: (timestamp: number) => void;
}

/**
 * Timeline Slider Component
 *
 * Provides an interactive timeline slider for navigating through fight replay.
 * Features:
 * - Dynamic step size based on duration
 * - Visual feedback when dragging (larger thumb, thicker track)
 * - Scrubbing mode indicator with warning color
 * - Progress bar with percentage display
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  displayTime,
  duration,
  isDragging,
  isScrubbingMode,
  progressPercent,
  optimizedStep,
  onSliderChange,
  onSliderChangeEnd,
  onSliderChangeStart,
  markers,
  onMarkerClick,
}) => {
  // Format time for display
  const formatTime = useCallback((timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <>
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
        step={optimizedStep}
        onChange={onSliderChange}
        onChangeCommitted={onSliderChangeEnd}
        onMouseDown={onSliderChangeStart}
        sx={{
          '& .MuiSlider-thumb': {
            width: isDragging ? 20 : 16,
            height: isDragging ? 20 : 16,
            transition: 'width 0.2s ease, height 0.2s ease',
          },
          '& .MuiSlider-track': {
            height: isDragging ? 6 : 4,
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

      {/* Timeline Markers */}
      {markers && markers.length > 0 && (
        <TimelineMarkers markers={markers} duration={duration} onMarkerClick={onMarkerClick} />
      )}

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
    </>
  );
};
