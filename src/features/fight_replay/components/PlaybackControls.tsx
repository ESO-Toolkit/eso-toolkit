/**
 * PlaybackControls Component
 *
 * Main playback controls container for fight replay.
 * Orchestrates timeline, buttons, speed, and share sub-components.
 *
 * @module PlaybackControls
 */

import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import { Box, Divider, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import React from 'react';

import { useOptimizedTimelineScrubbing } from '../../../hooks/useOptimizedTimelineScrubbing';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useTimelineMarkers } from '../../../hooks/useTimelineMarkers';
import {
  TRANSPORT_SPACING,
  TRANSPORT_MOTION,
  transportSurface,
  transportHairline,
} from '../constants/replayDesign';

import { PlaybackButtons } from './PlaybackButtons';
import { ShareButton } from './ShareButton';
import { SpeedSelector } from './SpeedSelector';
import { TimelineSlider } from './TimelineSlider';

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
  /** Contextual badges shown in the transport (encounter/difficulty/outcome). */
  replayContext?: {
    label?: string;
    difficultyTag?: string;
    isKill?: boolean | null;
  };
  /**
   * When true the bar is docked as a translucent overlay over the bottom of the 3D canvas (always
   * on screen, no scroll-to-play) rather than sitting in document flow below it. Uses the blurred,
   * flush-bottom surface variant and slightly tighter vertical padding to minimize occlusion of
   * bottom-edge actors.
   */
  overlay?: boolean;
  /** A–B loop in-point (ms into the fight), or null when unset. Drives the rail region + chip. */
  loopStart?: number | null;
  /** A–B loop out-point (ms), or null when unset. */
  loopEnd?: number | null;
  /** Clear both loop points (the loop chip's delete action). */
  onClearLoop?: () => void;
  /** True when the replay block is fullscreen — enables the cinema auto-hide + progress hairline. */
  isFullscreen?: boolean;
  /** Whether the bar is currently shown. When false in fullscreen the bar fades to a hairline. */
  barVisible?: boolean;
  /** Toggle the bar collapsed/shown (the chevron + restore caret; mirrors the C key). */
  onToggleCollapse?: () => void;
  /** Fraction elapsed (0–100) for the progress hairline shown while the bar is hidden. */
  progressPct?: number;
  /**
   * Mobile layout: collapses the control row to the essentials (timecode · play cluster · more)
   * and tucks Speed + Share behind a "more" toggle, so the transport stays uncluttered on a phone.
   */
  isMobile?: boolean;
}

/**
 * The discrete playback speeds the transport steps through. Exported so the +/- keyboard
 * shortcuts (FightReplay3D) step through the SAME ladder the on-screen SpeedSelector uses.
 */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

/** m:ss for the compact timecode read-out. */
const formatTime = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * PlaybackControls Component
 *
 * Main playback controls container that orchestrates:
 * - Timeline slider with scrubbing support
 * - Playback buttons (play/pause, skip)
 * - Speed selector
 * - Share button (optional, when reportId/fightId provided)
 */
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
  replayContext,
  overlay = false,
  loopStart = null,
  loopEnd = null,
  onClearLoop,
  isFullscreen = false,
  barVisible = true,
  onToggleCollapse,
  progressPct = 0,
  isMobile = false,
}) => {
  // Mobile "more" disclosure — Speed + Share live in a floating popover so opening them never
  // grows the transport (which would overlap the player panel / boss-health / control cluster).
  const [moreAnchor, setMoreAnchor] = React.useState<HTMLElement | null>(null);
  const moreOpen = Boolean(moreAnchor);

  // Use optimized timeline scrubbing for better performance
  const {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    optimizedStep,
  } = useOptimizedTimelineScrubbing({
    duration,
    currentTime,
    onTimeChange,
    isPlaying,
    onPlayingChange,
    timeRef,
  });

  // Get timeline markers (phase transitions, death events)
  const { markers } = useTimelineMarkers();

  // On mobile the dense death/custom pins make the thin rail unreadable. Keep only the structural
  // beats — phase transitions + clustered bursts — so the rail stays clean (deaths remain reachable
  // via clusters and the chapter rail). Desktop shows everything.
  const railMarkers = React.useMemo(
    () => (isMobile ? markers.filter((m) => m.type === 'phase' || m.type === 'cluster') : markers),
    [isMobile, markers],
  );

  // Handle marker click (jump to timestamp)
  const handleMarkerClick = React.useCallback(
    (timestamp: number) => {
      onTimeChange(timestamp);
    },
    [onTimeChange],
  );

  // Notify parent components about scrubbing mode changes
  React.useEffect(() => {
    onScrubbingModeChange?.(isScrubbingMode);
  }, [isScrubbingMode, onScrubbingModeChange]);

  React.useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

  const prefersReducedMotion = usePrefersReducedMotion();

  // The bar is "hidden" only in fullscreen cinema mode when barVisible is false; windowed always
  // shows (collapse is opt-in via the chevron/C, which also flips barVisible). When hidden we fade
  // + drop the bar and paint a thin progress hairline so the playhead stays legible.
  const hidden = isFullscreen && !barVisible;
  // Reduced motion: skip the translate (keep the opacity swap, which the theme zeroes globally).
  const hideTransform = hidden && !prefersReducedMotion ? 'translateY(8px)' : 'none';

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Progress hairline — only while the fullscreen bar is hidden, so position stays legible. */}
      {hidden && <Box sx={(t) => transportHairline(t, progressPct)} aria-hidden />}
      {/* Restore caret sitting on the hairline — a REAL focusable button so keyboard/AT users can
          bring the bar back without depending on pointer-move reveal. */}
      {hidden && onToggleCollapse && (
        <Tooltip title="Show controls (C)">
          <IconButton
            aria-label="Show controls"
            size="small"
            onClick={onToggleCollapse}
            sx={{
              position: 'absolute',
              bottom: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.85)',
              backgroundColor: 'rgba(0,0,0,0.55)',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.75)' },
              zIndex: 1,
            }}
          >
            <KeyboardArrowUp fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* The compact transport bar — a thin YouTube-style overlay. TWO stacked rows inside the
          glass surface: (1) the scrub rail FULL-WIDTH across the top so it's always usable, and
          (2) a short control row beneath it. This is the fix for the broken single-row layout
          where the rail collapsed to 0px fighting the controls for horizontal space. */}
      <Box
        sx={(t) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          px: TRANSPORT_SPACING.padX,
          pt: 0.75,
          pb: TRANSPORT_SPACING.padBottomCompact,
          boxSizing: 'border-box',
          // Cinema auto-hide: fade + drop the bar (and disable its pointer events) when hidden.
          opacity: hidden ? 0 : 1,
          transform: hideTransform,
          pointerEvents: hidden ? 'none' : 'auto',
          transition: `opacity ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, transform ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
          // Docked "control deck" surface (compact variant — lighter blur + bottom scrim).
          ...transportSurface(t, overlay, true),
        })}
      >
        {/* Row 1: scrub rail — full width, the primary control. density="compact" = rail only. */}
        <TimelineSlider
          displayTime={displayTime}
          duration={duration}
          isDragging={isDragging}
          isScrubbingMode={isScrubbingMode}
          optimizedStep={optimizedStep}
          onSliderChange={handleSliderChange}
          onSliderChangeEnd={handleSliderChangeEnd}
          onSliderChangeStart={handleSliderChangeStart}
          markers={railMarkers}
          onMarkerClick={handleMarkerClick}
          replayContext={replayContext}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onClearLoop={onClearLoop}
          density="compact"
        />

        {/* Row 2: a short control row — timecode + speed (left) · transport (center) ·
            share + collapse (right). Small controls so the whole bar stays thin. On very narrow
            phones the left group (timecode + speed) was wide enough to push the centered transport
            cluster into the speed pill, so tighten the inner gaps and shrink the "/ total" readout
            there to give the centered orb room. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: TRANSPORT_SPACING.sectionGapCompact,
            minHeight: 44,
            '@media (max-width: 430px)': {
              '& .transport-side': { gap: 0.5 },
              '& .transport-total-time': { display: 'none' },
            },
          }}
        >
          {/* Left: timecode + speed */}
          <Box
            className="transport-side"
            sx={{ flex: '1 1 0', display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                flexShrink: 0,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontVariantNumeric: 'tabular-nums',
                color: isScrubbingMode || isDragging ? 'info.main' : 'text.primary',
              }}
            >
              <Box component="span" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {formatTime(displayTime)}
              </Box>
              <Box
                component="span"
                className="transport-total-time"
                sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}
              >
                / {formatTime(duration)}
              </Box>
            </Box>
            {/* Speed lives inline on desktop; on mobile it moves into the "more" row below. */}
            {!isMobile && (
              <SpeedSelector
                playbackSpeed={playbackSpeed}
                onSpeedChange={onSpeedChange}
                speeds={PLAYBACK_SPEEDS}
              />
            )}
          </Box>

          {/* Center: transport cluster (compact orb) */}
          <Box sx={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <PlaybackButtons
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSkipToStart={onSkipToStart}
              onSkipToEnd={onSkipToEnd}
              onSkipBackward10={onSkipBackward10}
              onSkipForward10={onSkipForward10}
              compact
            />
          </Box>

          {/* Right: share + collapse chevron */}
          <Box
            className="transport-side"
            sx={{
              flex: '1 1 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.5,
              minWidth: 0,
            }}
          >
            {/* Desktop keeps Share inline; mobile folds Speed + Share into a "more" row. */}
            {isMobile ? (
              <Tooltip title="Speed & share">
                <IconButton
                  aria-label="Speed and share options"
                  aria-expanded={moreOpen}
                  size="small"
                  onClick={(e) => setMoreAnchor(e.currentTarget)}
                  sx={{
                    color: moreOpen ? 'primary.main' : 'text.secondary',
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  <MoreHorizRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <ShareButton
                reportId={reportId}
                fightId={fightId}
                currentTime={currentTime}
                selectedActorIdRef={selectedActorIdRef}
                timeRef={timeRef}
              />
            )}
            {onToggleCollapse && (
              <Tooltip title="Collapse controls (C)">
                <IconButton
                  aria-label="Collapse controls"
                  size="small"
                  onClick={onToggleCollapse}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  <KeyboardArrowDown fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Mobile "more" popover — Speed (chips) + Share. Floats above the button (portal), so the
          docked transport keeps a fixed height and never overlaps the panels above it. */}
      {isMobile && (
        <Popover
          open={moreOpen}
          anchorEl={moreAnchor}
          onClose={() => setMoreAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          slotProps={{ paper: { sx: { p: 1.25, maxWidth: 260 } } }}
        >
          <Typography variant="overline" sx={{ color: 'text.secondary', px: 0.5 }}>
            Speed
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {PLAYBACK_SPEEDS.map((speed) => {
              const active = speed === playbackSpeed;
              return (
                <Box
                  key={speed}
                  component="button"
                  type="button"
                  onClick={() => onSpeedChange(speed)}
                  aria-pressed={active}
                  sx={(t) => ({
                    appearance: 'none',
                    font: 'inherit',
                    cursor: 'pointer',
                    px: 1,
                    py: 0.5,
                    minWidth: 44,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    backgroundColor: active ? 'action.selected' : 'transparent',
                    color: active ? 'primary.main' : 'text.primary',
                    fontWeight: active ? 700 : 500,
                    fontVariantNumeric: 'tabular-nums',
                    '&:hover': { borderColor: t.palette.primary.main },
                  })}
                >
                  {speed}×
                </Box>
              );
            })}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShareButton
              reportId={reportId}
              fightId={fightId}
              currentTime={currentTime}
              selectedActorIdRef={selectedActorIdRef}
              timeRef={timeRef}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Share view
            </Typography>
          </Box>
        </Popover>
      )}
    </Box>
  );
};
