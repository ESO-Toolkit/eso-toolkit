/**
 * TimelineSlider Component
 *
 * Timeline slider control for scrubbing through fight replay.
 * Provides visual feedback during dragging and scrubbing mode.
 *
 * @module TimelineSlider
 */

import { Box, Slider, Typography } from '@mui/material';
import React, { useCallback, useRef } from 'react';

import { TimelineAnnotation } from '../../../types/timelineAnnotations';
import { TRANSPORT_MOTION } from '../constants/replayDesign';

import { TimelineMarkers } from './TimelineMarkers';
import { TimelineScrubPreview } from './TimelineScrubPreview';
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
  /**
   * Optional contextual badges shown opposite the timecode (encounter/difficulty + outcome).
   * The percent-elapsed badge is derived locally from displayTime, not passed in.
   */
  replayContext?: {
    /** Encounter / map name (compact). */
    label?: string;
    /** Difficulty tag, e.g. "HM" / "Vet". */
    difficultyTag?: string;
    /** Whether the pull was a kill (true), a wipe (false), or unknown (undefined). */
    isKill?: boolean | null;
  };
}

/** Small pill badge for the transport's contextual read-outs (encounter, outcome, %). */
const ContextBadge: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
}> = ({ children, tone = 'default' }) => {
  const toneColor =
    tone === 'success' ? 'success.main' : tone === 'warning' ? 'warning.main' : 'text.secondary';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.375,
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontSize: '0.72rem',
        fontWeight: 600,
        lineHeight: 1,
        color: toneColor,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
};

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
  replayContext,
}) => {
  // The rail wrapper that the hover skim-preview tracks the cursor over. A ref (not a
  // handler prop) so the preview attaches its high-frequency pointermove listener without
  // re-rendering this component or the memoized TimelineMarkers child.
  const railRef = useRef<HTMLDivElement>(null);

  // Format time for display
  const formatTime = useCallback((timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <>
      {/* Time Display — the current time is the hero: a large Space-Grotesk anchor with the
          total time as a quiet trailing reference (VOD/esports convention). tabular-nums
          stops the digits jittering as the time ticks (proportional figures shift width
          every frame). The scrubbing state recolors the current time to the info hue so the
          "you are dragging" cue is non-text (replaces the old plaintext "(SCRUBBING)"). */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            component="span"
            sx={(theme) => ({
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: { xs: '1.6rem', sm: '1.9rem' },
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '0.01em',
              fontVariantNumeric: 'tabular-nums',
              color: isScrubbingMode || isDragging ? 'info.main' : 'text.primary',
              // Cyan text-glow gives the hero timecode the luminous "designed" quality from
              // the bold proto (only in dark mode — it would muddy the light theme).
              textShadow:
                theme.palette.mode === 'dark' ? `0 0 22px ${theme.palette.primary.main}73` : 'none',
              transition: `color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
            })}
          >
            {formatTime(displayTime)}
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
          >
            / {formatTime(duration)}
          </Typography>
        </Box>

        {/* Context badges (encounter · difficulty · outcome · % elapsed) — the proto's
            top-right cluster. Percent is derived live from the playhead. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {replayContext?.label && (
            <ContextBadge>
              {replayContext.label}
              {replayContext.difficultyTag && (
                <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                  {' '}
                  · {replayContext.difficultyTag}
                </Box>
              )}
            </ContextBadge>
          )}
          {replayContext?.isKill != null && (
            <ContextBadge tone={replayContext.isKill ? 'success' : 'warning'}>
              {replayContext.isKill ? 'Kill' : 'Wipe'}
            </ContextBadge>
          )}
          {duration > 0 && (
            <ContextBadge>
              <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round((displayTime / duration) * 100)}%
              </Box>
            </ContextBadge>
          )}
        </Box>
      </Box>

      {/* Slider + event markers share one relatively-positioned rail so the markers
          sit ON the scrub track (chapter-marker model) rather than in a detached
          strip below it. TimelineMarkers stays a separately-memoized child — only
          stable props (markers/duration/onMarkerClick) cross the boundary. */}
      <Box ref={railRef} sx={{ position: 'relative', py: 0.5 }}>
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
          sx={(theme) => ({
            position: 'relative',
            zIndex: 1,
            color: 'primary.main',
            py: 1,
            '& .MuiSlider-thumb': {
              width: isDragging ? 18 : 16,
              height: isDragging ? 18 : 16,
              backgroundColor: '#fff',
              // White playhead with an always-on cyan halo ring + glow (the bold proto's
              // thumb), widening while dragging.
              border: 'none',
              boxShadow: `0 0 0 ${isDragging ? 6 : 5}px ${theme.palette.primary.main}40, 0 2px 6px rgba(0,0,0,0.5)`,
              transition: `width ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, height ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, box-shadow ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 8px ${theme.palette.primary.main}40, 0 2px 6px rgba(0,0,0,0.5)`,
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '3px',
              },
            },
            '& .MuiSlider-track': {
              height: isDragging ? 7 : 6,
              border: 'none',
              transition: `height ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
              // Progress fill: the brand cyan gradient with a glow when playing; a flat info
              // hue while scrubbing so the "dragging" state is unmistakable (non-text cue).
              backgroundImage: isScrubbingMode
                ? 'none'
                : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: isScrubbingMode ? 'none' : `0 0 14px ${theme.palette.primary.main}99`,
              ...(isScrubbingMode && { backgroundColor: 'info.main' }),
            },
            '& .MuiSlider-rail': {
              height: isDragging ? 7 : 6,
              opacity: 1,
              // Recessed "data track" — a subtle inset so the rail reads as a carved channel
              // the glowing fill sits inside, not a flat line.
              backgroundColor: theme.palette.mode === 'dark' ? '#0a1020' : theme.palette.divider,
              backgroundImage:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #0a1020, #13203b)'
                  : 'none',
              boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 2px rgba(0,0,0,0.6)' : 'none',
              borderRadius: 3,
              transition: `height ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
            },
            // The scrub-time bubble at the thumb — refined to match the surface bubble style.
            '& .MuiSlider-valueLabel': {
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              borderRadius: 8,
              boxShadow: theme.shadows[3],
            },
          })}
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

        {/* Hover skim-preview — a SIBLING of TimelineMarkers (never an ancestor) so its
            per-pointermove state churn can't re-render the memoized marker list. It tracks
            the cursor over railRef and shows the hovered time + nearest event. */}
        {duration > 0 && (
          <TimelineScrubPreview railRef={railRef} duration={duration} markers={markers} />
        )}
      </Box>
      {/* NOTE: the marker legend now lives in the control row's bottom-left (PlaybackControls),
          stacked above the speed chips — matching the bold proto's layout. */}
    </>
  );
};
