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

import { TimelineLegend } from './TimelineLegend';
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
 * - Scrubbing mode indicator (track tint)
 * - Event markers overlaid on the scrub rail
 * - Scrub-time bubble at the thumb
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  displayTime,
  duration,
  isDragging,
  isScrubbingMode,
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
      {/* Time Display — current / total. tabular-nums stops the digits jittering as
          the time ticks (otherwise proportional figures shift width every frame). */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography
          variant="body2"
          sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime(displayTime)}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime(duration)}
        </Typography>
      </Box>

      {/* Slider + event markers share one relatively-positioned rail so the markers
          sit ON the scrub track (chapter-marker model) rather than in a detached
          strip below it. TimelineMarkers stays a separately-memoized child — only
          stable props (markers/duration/onMarkerClick) cross the boundary. */}
      <Box sx={{ position: 'relative', py: 0.5 }}>
        <Slider
          value={displayTime}
          min={0}
          max={duration}
          step={optimizedStep}
          onChange={onSliderChange}
          onChangeCommitted={onSliderChangeEnd}
          onMouseDown={onSliderChangeStart}
          aria-label="Replay timeline"
          getAriaValueText={formatTime}
          valueLabelDisplay="auto"
          valueLabelFormat={formatTime}
          sx={{
            position: 'relative',
            zIndex: 1,
            '& .MuiSlider-thumb': {
              width: isDragging ? 20 : 16,
              height: isDragging ? 20 : 16,
              transition: 'width 0.2s ease, height 0.2s ease',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
              },
            },
            '& .MuiSlider-track': {
              height: isDragging ? 6 : 4,
              transition: 'height 0.2s ease',
              ...(isScrubbingMode && { backgroundColor: 'info.main' }),
            },
            '& .MuiSlider-rail': {
              height: isDragging ? 6 : 4,
              transition: 'height 0.2s ease',
            },
          }}
        />

        {/* Event markers overlaid on the rail. The wrapper sits ABOVE the slider
            (zIndex 2) so each marker can receive its own hover/click — otherwise the
            slider's tall hit area swallows them and click-to-seek/tooltips break. The
            wrapper itself is pointer-events:none so empty gaps between markers fall
            through to the slider (empty-track click still scrubs; the thumb still
            drags); only the individual markers (re-enabled inside the component) are
            interactive. TimelineMarkers stays untouched → its React.memo holds. */}
        {markers && markers.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              // The overlay and TimelineMarkers' own full-width container must NOT
              // capture events (they'd block the slider). Only the individual marker
              // hit-areas (role="button") are interactive, so empty track between
              // markers still reaches the slider underneath.
              pointerEvents: 'none',
              '& [role="button"]': { pointerEvents: 'auto' },
            }}
          >
            <TimelineMarkers markers={markers} duration={duration} onMarkerClick={onMarkerClick} />
          </Box>
        )}
      </Box>

      {/* Legend — explains the marker shape/color vocabulary; only shows present types */}
      {markers && markers.length > 0 && <TimelineLegend markers={markers} />}
    </>
  );
};
