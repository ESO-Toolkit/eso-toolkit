/**
 * PlaybackControls Component
 *
 * Main playback controls container for fight replay — one unified "control deck"
 * on a single glass surface. For a multi-fight trial run the deck stacks, top to
 * bottom: the trial mini-map strip (whole-run scrubber), the per-fight scrub
 * rail, and the control row (timecode · outcome · speed | transport + boss skip
 * | autoplay · chapters · share · collapse). For a single isolated fight the
 * trial pieces simply don't render and the deck is byte-identical to before.
 *
 * @module PlaybackControls
 */

import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowLeftRounded from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRounded from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import {
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
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
import type { TrialTimeline as TrialTimelineModel } from '../trial_chapters/trialTimeline';
import type { TrialChapter } from '../trial_chapters/types';

import { ChaptersPopoverButton } from './ChaptersPopoverButton';
import { PlaybackButtons } from './PlaybackButtons';
import { ShareButton } from './ShareButton';
import { SpeedSelector } from './SpeedSelector';
import { ContextBadge, LoopChip, TimelineSlider } from './TimelineSlider';
import { TrialTimeline, type TrialTimelineSeekTarget } from './TrialTimeline';

/**
 * The trial-run bundle the deck needs to render the whole-run layer: the
 * mini-map strip, the autoplay toggle, boss skip, and the chapters popover.
 * Present only for multi-segment runs.
 */
export interface TransportTrial {
  /** The run's continuous timeline (already filtered by include-trash). */
  timeline: TrialTimelineModel;
  currentFightId: string | undefined;
  /** Real start time of the loaded fight (anchors the strip when the fight is off-timeline). */
  currentFightStartTime: number;
  /** Commit a trial-wide seek (same-fight = instant; cross-fight = navigate). */
  onSeek: (target: TrialTimelineSeekTarget) => void;
  /** Reports strip drag state (guards the fullscreen idle auto-hide). */
  onDraggingChange?: (dragging: boolean) => void;
  /** Whether auto-advance ("autoplay the whole trial") is on. */
  autoplayEnabled: boolean;
  onToggleAutoplay: () => void;
  includeTrash: boolean;
  onToggleIncludeTrash: () => void;
  hasTrash: boolean;
  /** Run identity for the chapters popover. */
  runName: string;
  runIndex: number;
  runCount: number;
  /** e.g. "9 / 12 bosses", or null when the run has no bosses. */
  bossSummary: string | null;
  /** Boss skip targets relative to the active fight. */
  prevBoss: TrialChapter | null;
  nextBoss: TrialChapter | null;
  /** Navigate to a chapter (popover rows + boss-skip buttons). */
  onSelectChapter: (chapter: TrialChapter) => void;
  /** Popover portal target so the chapters list survives native fullscreen. */
  portalContainer?: () => HTMLElement | null;
}

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
  /** The whole-trial layer (mini-map, autoplay, chapters) for multi-segment runs. */
  trial?: TransportTrial;
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
 * Orchestrates the deck's three rows:
 * - Trial mini-map strip (multi-fight runs only)
 * - Timeline slider with scrubbing support
 * - Control row: timecode/outcome/speed · transport + boss skip · trial toggles/share
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
  trial,
}) => {
  // Mobile "more" disclosure — Speed + Share live in a floating popover so opening them never
  // grows the transport (which would overlap the player panel / boss-health / control cluster).
  const [moreAnchor, setMoreAnchor] = React.useState<HTMLElement | null>(null);
  const moreOpen = Boolean(moreAnchor);
  // Move focus INTO the "more" popover on open so keyboard/screen-reader users land on the first
  // speed option (a bare MUI Popover, unlike a Menu, doesn't auto-focus its content). MUI restores
  // focus to the trigger (moreAnchor) on close by default, so we only manage the open direction.
  const firstSpeedRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (moreOpen) {
      // Defer one frame so the Popover paper has mounted before we focus into it.
      const id = requestAnimationFrame(() => firstSpeedRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [moreOpen]);

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

  // The trial cluster (autoplay, chapters popover with its include-trash switch, boss skip)
  // renders whenever a run exists — NOT gated on the filtered timeline's entry count, or
  // toggling trash off in a small run would unmount the toggle itself. The mini-map strip
  // alone hides when the filtered timeline has nothing to scrub.
  const showTrial = trial != null;
  const showTrialStrip = trial != null && trial.timeline.entries.length > 0;

  // The chapter list handed to the chapters popover. Derived once per timeline (not per render) so
  // it keeps a stable identity across the ~10Hz playback ticks that re-render this transport — a
  // fresh `.map()` array every render would break ChaptersPopoverButton's React.memo on every tick,
  // re-rendering the whole chapter list under the playhead. `trial` itself is memoized upstream.
  const chapterList = React.useMemo(
    () => trial?.timeline.entries.map((e) => e.chapter) ?? [],
    [trial],
  );

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

      {/* The compact transport bar — a thin YouTube-style overlay. Stacked rows inside ONE glass
          surface: (0) the trial mini-map strip for multi-fight runs, (1) the per-fight scrub rail
          FULL-WIDTH so it's always usable, and (2) a short control row beneath them. */}
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
        {/* Row 0: trial mini-map — the whole run as one gapless strip, flush above the fight
            rail so the two playheads share one x-axis and read as one system. */}
        {showTrialStrip && trial && (
          <TrialTimeline
            timeline={trial.timeline}
            currentFightId={trial.currentFightId}
            currentFightStartTime={trial.currentFightStartTime}
            currentLocalMs={displayTime}
            onSeek={trial.onSeek}
            onDraggingChange={trial.onDraggingChange}
            variant="deck"
          />
        )}

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

        {/* Row 2: a short control row — timecode + outcome + speed (left) · transport + boss skip
            (center) · trial toggles + share + collapse (right). Small controls so the whole bar
            stays thin. On very narrow phones the left group (timecode + speed) was wide enough to
            push the centered transport cluster into the speed pill, so tighten the inner gaps and
            shrink the "/ total" readout there to give the centered orb room. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: TRANSPORT_SPACING.sectionGapCompact,
            minHeight: 44,
            '@media (max-width: 430px)': {
              '& .transport-side': { gap: 0.5 },
              '& .transport-total-time': { display: 'none' },
              '& .transport-outcome': { display: 'none' },
            },
          }}
        >
          {/* Left: timecode + outcome + speed */}
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
            {/* Outcome badge — the kill/wipe semantics every other chapter surface uses. */}
            {replayContext?.isKill != null && (
              <Box component="span" className="transport-outcome" sx={{ display: 'inline-flex' }}>
                <ContextBadge tone={replayContext.isKill ? 'success' : 'warning'}>
                  {replayContext.isKill ? 'Kill' : 'Wipe'}
                </ContextBadge>
              </Box>
            )}
            {/* Speed lives inline on desktop; on mobile it moves into the "more" row below. */}
            {!isMobile && (
              <SpeedSelector
                playbackSpeed={playbackSpeed}
                onSpeedChange={onSpeedChange}
                speeds={PLAYBACK_SPEEDS}
              />
            )}
          </Box>

          {/* Center: transport cluster (compact orb) flanked by boss-skip for trial runs. */}
          <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {showTrial && trial && (
              <Tooltip
                title={
                  trial.prevBoss ? `Previous boss: ${trial.prevBoss.name} ( [ )` : 'Previous boss'
                }
              >
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <IconButton
                    aria-label={
                      trial.prevBoss ? `Previous boss: ${trial.prevBoss.name}` : 'Previous boss'
                    }
                    size="small"
                    disabled={!trial.prevBoss}
                    onClick={() => trial.prevBoss && trial.onSelectChapter(trial.prevBoss)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary' },
                      '@media (pointer: coarse)': { display: 'none' },
                    }}
                  >
                    <KeyboardDoubleArrowLeftRounded fontSize="small" />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
            <PlaybackButtons
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              onSkipToStart={onSkipToStart}
              onSkipToEnd={onSkipToEnd}
              onSkipBackward10={onSkipBackward10}
              onSkipForward10={onSkipForward10}
              compact
            />
            {showTrial && trial && (
              <Tooltip
                title={trial.nextBoss ? `Next boss: ${trial.nextBoss.name} ( ] )` : 'Next boss'}
              >
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <IconButton
                    aria-label={trial.nextBoss ? `Next boss: ${trial.nextBoss.name}` : 'Next boss'}
                    size="small"
                    disabled={!trial.nextBoss}
                    onClick={() => trial.nextBoss && trial.onSelectChapter(trial.nextBoss)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary' },
                      '@media (pointer: coarse)': { display: 'none' },
                    }}
                  >
                    <KeyboardDoubleArrowRightRounded fontSize="small" />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* Right: trial toggles + loop + share + collapse chevron */}
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
            {/* A–B loop chip — the only clear-loop affordance (i/o set, U or × clears). */}
            {(loopStart != null || loopEnd != null) && (
              <LoopChip
                loopStart={loopStart}
                loopEnd={loopEnd}
                onClearLoop={onClearLoop}
                formatTime={formatTime}
              />
            )}

            {/* Autoplay — continue into the next fight when this one ends (YouTube semantics:
                a mode, not a play action). Named + switch-shaped so it can't read as a second
                play button. */}
            {showTrial && trial && (
              <Tooltip title="Autoplay — automatically continue into the next fight">
                <FormControlLabel
                  sx={{ m: 0, display: { xs: 'none', sm: 'inline-flex' } }}
                  control={
                    <Switch
                      size="small"
                      checked={trial.autoplayEnabled}
                      onChange={trial.onToggleAutoplay}
                      slotProps={{ input: { 'aria-label': 'Autoplay the whole trial' } }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Autoplay
                    </Typography>
                  }
                />
              </Tooltip>
            )}

            {/* Chapters — the fullscreen-reachable boss list. Gated to fullscreen ONLY: in
                windowed (and mobile-preview) views the page-shell ChapterRail is already on
                screen, so showing the popover too is pure duplication of both chapter-nav AND
                the include-trash toggle. isFullscreen here is fed `isImmersive`
                (= native fullscreen OR mobile pseudo-fullscreen), so the immersive surfaces —
                where the rail is NOT reachable — still get the button. */}
            {showTrial && isFullscreen && trial && (
              <ChaptersPopoverButton
                chapters={chapterList}
                currentFightId={trial.currentFightId}
                onSelectChapter={trial.onSelectChapter}
                runName={trial.runName}
                runIndex={trial.runIndex}
                runCount={trial.runCount}
                bossSummary={trial.bossSummary}
                includeTrash={trial.includeTrash}
                onToggleIncludeTrash={trial.onToggleIncludeTrash}
                hasTrash={trial.hasTrash}
                portalContainer={trial.portalContainer}
              />
            )}

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
            {PLAYBACK_SPEEDS.map((speed, index) => {
              const active = speed === playbackSpeed;
              return (
                <Box
                  key={speed}
                  ref={index === 0 ? firstSpeedRef : undefined}
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
