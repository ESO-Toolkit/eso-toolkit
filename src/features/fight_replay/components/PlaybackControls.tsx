/**
 * PlaybackControls Component
 *
 * Main playback controls container for fight replay — one unified "control deck"
 * on a single glass surface. For a multi-fight trial run the deck stacks, top to
 * bottom: the trial mini-map strip (whole-run scrubber), the per-fight scrub
 * rail, and the control row. For a single isolated fight the trial pieces simply
 * don't render.
 *
 * The control row is left-aligned like a video player's:
 *
 *   [⏮ boss] ⏮ ⏪ ▶ ⏩ ⏭ [boss ⏭]  0:42 / 3:15  Kill  ·····  1× ↻ ▤ ⤴ ⚙ ⌄ ⛶
 *
 * Everything after the elastic gap is an icon button. Anything that is a set-once
 * preference rather than a per-moment playback action lives behind the gear
 * ({@link ReplayDisplaySettingsMenu}) — autoplay, name tags, player stats, replay
 * quality, keyboard shortcuts — and the A–B loop's three former slots are one
 * trigger ({@link TransportLoopMenu}). See the row's own comment for the layout
 * history this replaced.
 *
 * @module PlaybackControls
 */

import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowLeftRounded from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRounded from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import { Box, Divider, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import React from 'react';

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import type { ReplayQualityPreset } from '../../../hooks/useReplayPrefs';
import { useTimelineMarkers } from '../../../hooks/useTimelineMarkers';
import { TRANSPORT_SPACING, TRANSPORT_MOTION, transportSurface } from '../constants/replayDesign';
import type { TrialTimeline as TrialTimelineModel } from '../trial_chapters/trialTimeline';
import type { TrialChapter } from '../trial_chapters/types';
import { formatDurationMs as formatTime } from '../utils/replayTime';

import { ChaptersPopoverButton } from './ChaptersPopoverButton';
import { LiveScrubRail } from './LiveScrubRail';
import { LiveTrialStrip } from './LiveTrialStrip';
import { PlaybackButtons } from './PlaybackButtons';
import { ProgressHairline } from './ProgressHairline';
import { ReplayDisplaySettingsMenu } from './ReplayDisplaySettingsMenu';
import { ShareButton } from './ShareButton';
import { SpeedSelector } from './SpeedSelector';
import { ContextBadge } from './TimelineSlider';
import { TimeReadout } from './TimeReadout';
import { TransportLoopMenu } from './TransportLoopMenu';
import { type TrialTimelineSeekTarget } from './TrialTimeline';

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
  /** A–B loop in-point (ms into the fight), or null when unset. Drives the rail region. */
  loopStart?: number | null;
  /** A–B loop out-point (ms), or null when unset. */
  loopEnd?: number | null;
  /** Set the in/out point to the live playhead (touch/mouse equivalent of the I/O keys). */
  onSetLoopIn?: () => void;
  onSetLoopOut?: () => void;
  /** Clear both loop points (the loop menu's Clear action; mirrors the U key). */
  onClearLoop?: () => void;
  /** True when the replay block is fullscreen — enables the cinema auto-hide + progress hairline. */
  isFullscreen?: boolean;
  /** Whether the bar is currently shown. When false in fullscreen the bar fades to a hairline. */
  barVisible?: boolean;
  /** Toggle the bar collapsed/shown (the chevron + restore caret; mirrors the C key). */
  onToggleCollapse?: () => void;
  /**
   * Mobile layout: collapses the control row to the essentials (timecode · play cluster · more)
   * and tucks Speed + Share behind a "more" toggle, so the transport stays uncluttered on a phone.
   */
  isMobile?: boolean;
  /** The whole-trial layer (mini-map, autoplay, chapters) for multi-segment runs. */
  trial?: TransportTrial;

  // --- Display settings + always-visible affordances -----------------------------------------
  // Consolidated here from Arena3D's old bottom-right floating button stack (help, name tags,
  // quality menu, fullscreen, locked-stats toggle): five identical dark circles hardcoding their
  // own `bottom` offset, growing every time a control was added. Name tags / quality / stats now
  // live behind one settings popover (ReplayDisplaySettingsMenu, a port of the mobile Settings
  // sheet's "Display" grouping), which has since also absorbed autoplay and the keyboard-help
  // trigger. Fullscreen is the one remaining always-visible affordance from that old stack.
  // All are optional so the component still renders with none of them
  // (e.g. a future caller that doesn't need the desktop chrome) — FightReplay3D always supplies them.
  /** Name-tag toggle (N key) — surfaced in the settings popover. */
  namesEnabled?: boolean;
  onToggleNames?: () => void;
  /** Replay-quality preset (Auto/High/Performance/Barebones) — surfaced in the settings popover. */
  qualityPreset?: ReplayQualityPreset;
  onQualityPresetChange?: (preset: ReplayQualityPreset) => void;
  /** Locked-player stats toggle (J key) — the settings popover only shows this row while `following`. */
  statsPanelEnabled?: boolean;
  onToggleStats?: () => void;
  /** Whether the camera is currently locked onto an actor (gates the stats row, as Arena3D did). */
  following?: boolean;
  /** Keyboard-help panel open state (owned by FightReplay3D) — drives the settings popover's
   *  "Keyboard shortcuts" row visibility (hidden while the panel itself is open, matching the old
   *  persistent-affordance behavior). */
  showKeyboardHelp?: boolean;
  onToggleKeyboardHelp?: () => void;
  /** Fullscreen toggle for the whole replay block (F key) — rendered far-right, as in every video player. */
  onToggleFullscreen?: () => void;
  /** Portal target for the settings popover so it survives native fullscreen (mirrors the trial
   *  chapters popover's `portalContainer`). */
  portalContainer?: () => HTMLElement | null;
}

/**
 * The discrete playback speeds the transport steps through. Exported so the +/- keyboard
 * shortcuts (FightReplay3D) step through the SAME ladder the on-screen SpeedSelector uses.
 */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

/**
 * PlaybackControls Component
 *
 * Orchestrates the deck's three rows:
 * - Trial mini-map strip (multi-fight runs only)
 * - Timeline slider with scrubbing support
 * - Control row: transport + boss skip + timecode/outcome · gap · options cluster
 */
const PlaybackControlsComponent: React.FC<PlaybackControlsProps> = ({
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
  onSetLoopIn,
  onSetLoopOut,
  onClearLoop,
  isFullscreen = false,
  barVisible = true,
  onToggleCollapse,
  isMobile = false,
  trial,
  namesEnabled,
  onToggleNames,
  qualityPreset,
  onQualityPresetChange,
  statsPanelEnabled,
  onToggleStats,
  following = false,
  showKeyboardHelp = false,
  onToggleKeyboardHelp,
  onToggleFullscreen,
  portalContainer,
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
      {/* Progress hairline — only while the fullscreen bar is hidden, so position stays legible.
          rAF-driven (reads timeRef directly) so it never re-renders this transport per tick. */}
      {hidden && <ProgressHairline timeRef={timeRef} duration={duration} />}
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
          <LiveTrialStrip
            timeRef={timeRef}
            timeline={trial.timeline}
            currentFightId={trial.currentFightId}
            currentFightStartTime={trial.currentFightStartTime}
            onSeek={trial.onSeek}
            onDraggingChange={trial.onDraggingChange}
            variant="deck"
          />
        )}

        {/* Row 1: scrub rail — full width, the primary control. density="compact" = rail only.
            LiveScrubRail owns the high-frequency playhead subscription so only it (not this whole
            transport) re-renders as playback advances. */}
        <LiveScrubRail
          timeRef={timeRef}
          duration={duration}
          isPlaying={isPlaying}
          onTimeChange={onTimeChange}
          onPlayingChange={onPlayingChange}
          onScrubbingModeChange={onScrubbingModeChange}
          onDraggingChange={onDraggingChange}
          markers={railMarkers}
          onMarkerClick={handleMarkerClick}
          replayContext={replayContext}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onClearLoop={onClearLoop}
          density="compact"
        />

        {/* Row 2: the control row. Left-aligned, in the grammar every shipping video player uses —
            transport first, then the timecode it drives; a single elastic gap; then the options
            cluster hard against the right edge.

            This replaced a three-column layout (timecode+speed | centred transport | everything
            else) whose outer columns were `flex: 1 1 0`, so the centred cluster's position was a
            function of how wide the left text happened to be. That needed a 430px media query to
            stop the timecode shoving the play button into the speed pill, and it still drifted
            sideways whenever the outcome badge or loop chip appeared mid-fight. One elastic
            spacer instead of two competing ones makes the whole row positionally stable.

            The options cluster is now uniformly icon buttons. It previously mixed four control
            grammars in one strip — a pill chip, two outlined text buttons ("A"/"B"), a labelled
            Switch, and icon buttons — up to ten slots on a trial run. Autoplay and help moved into
            the settings popover, and the loop's three slots collapsed into TransportLoopMenu. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: TRANSPORT_SPACING.sectionGapCompact,
            minHeight: 44,
            '@media (max-width: 430px)': {
              '& .transport-total-time': { display: 'none' },
              '& .transport-outcome': { display: 'none' },
            },
          }}
        >
          {/* Left: transport cluster (boss skip flanking the play controls) then the timecode. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
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
                    aria-keyshortcuts="["
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
                    aria-keyshortcuts="]"
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

            {/* Timecode sits immediately after the transport it describes. */}
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                flexShrink: 0,
                ml: 1,
                fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
                fontVariantNumeric: 'tabular-nums',
                color: 'text.primary',
              }}
            >
              {/* Live timecode — rAF-driven from timeRef, so it stays smooth without re-rendering
                  the transport every tick. */}
              <TimeReadout
                timeRef={timeRef}
                format={formatTime}
                sx={{ fontSize: '0.9rem', fontWeight: 600 }}
              />
              <Box
                component="span"
                className="transport-total-time"
                sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 500 }}
              >
                / {formatTime(duration)}
              </Box>
            </Box>

            {/* Outcome badge — the kill/wipe semantics every other chapter surface uses. */}
            {replayContext?.isKill != null && (
              <Box
                component="span"
                className="transport-outcome"
                sx={{ display: 'inline-flex', ml: 1 }}
              >
                <ContextBadge tone={replayContext.isKill ? 'success' : 'warning'}>
                  {replayContext.isKill ? 'Kill' : 'Wipe'}
                </ContextBadge>
              </Box>
            )}
          </Box>

          {/* One elastic gap — the only flexible element in the row, so nothing else can be
              pushed around by a neighbour's text width. */}
          <Box sx={{ flex: '1 1 0', minWidth: 8 }} />

          {/* Right: the options cluster — speed, loop, chapters, share, settings, fullscreen. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.25,
              flexShrink: 0,
            }}
          >
            {/* Speed lives inline on desktop; on mobile it moves into the "more" popover. */}
            {!isMobile && (
              <SpeedSelector
                playbackSpeed={playbackSpeed}
                onSpeedChange={onSpeedChange}
                speeds={PLAYBACK_SPEEDS}
              />
            )}

            {/* A–B loop — one trigger for set-A / set-B / clear (was a chip plus two outlined
                text buttons). Tints when a loop is active; the rail paints the region itself. */}
            {(onSetLoopIn || onSetLoopOut || onClearLoop) && (
              <TransportLoopMenu
                loopStart={loopStart}
                loopEnd={loopEnd}
                onSetLoopIn={onSetLoopIn}
                onSetLoopOut={onSetLoopOut}
                onClearLoop={onClearLoop}
                formatTime={formatTime}
                portalContainer={portalContainer}
              />
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

            {/* Desktop keeps Share inline; mobile folds Speed + Share into a "more" popover. */}
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
                selectedActorIdRef={selectedActorIdRef}
                timeRef={timeRef}
                iconOnly
              />
            )}

            {/* Settings — autoplay, name tags, player stats, replay quality, keyboard shortcuts.
                Desktop-only: the mobile Settings sheet already covers this ground. Autoplay is
                passed only for trial runs, which is what makes its section appear. */}
            {!isMobile && namesEnabled != null && onToggleNames && onQualityPresetChange && (
              <ReplayDisplaySettingsMenu
                namesEnabled={namesEnabled}
                onToggleNames={onToggleNames}
                autoplayEnabled={trial ? trial.autoplayEnabled : undefined}
                onToggleAutoplay={trial ? trial.onToggleAutoplay : undefined}
                onToggleKeyboardHelp={onToggleKeyboardHelp}
                showKeyboardHelp={showKeyboardHelp}
                qualityPreset={qualityPreset ?? 'auto'}
                onQualityPresetChange={onQualityPresetChange}
                showStatsRow={following}
                statsPanelEnabled={!!statsPanelEnabled}
                onToggleStats={onToggleStats ?? (() => {})}
                portalContainer={portalContainer}
              />
            )}

            {/* Collapse — fullscreen only. `hidden` (the state this produces) is itself gated on
                isFullscreen, so in a windowed replay this button used to render and then do
                nothing visible when clicked. */}
            {isFullscreen && onToggleCollapse && (
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

            {/* Fullscreen — far-right, as in every video player. Desktop-only: mobile expands via
                the preview's "Tap to explore" and exits via the mobile shell's Close. */}
            {!isMobile && onToggleFullscreen && (
              <Tooltip title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
                <IconButton
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  aria-pressed={isFullscreen}
                  size="small"
                  onClick={onToggleFullscreen}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  {isFullscreen ? (
                    <FullscreenExitIcon fontSize="small" />
                  ) : (
                    <FullscreenIcon fontSize="small" />
                  )}
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

/**
 * Memoized so the transport bar (trial mini-map, event markers, control row, buttons) does NOT
 * re-render as playback advances. The live playhead is owned by LiveScrubRail + TimeReadout +
 * ProgressHairline (each reads `timeRef` on its own rAF), so none of PlaybackControls' props change
 * per tick — the parent (FightReplay3D) only re-renders on coarse state (≤4Hz, end-of-fight gates),
 * and the memo holds across it. This is the core of the low-power fps fix.
 */
export const PlaybackControls = React.memo(PlaybackControlsComponent);
