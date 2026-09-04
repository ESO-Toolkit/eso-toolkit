import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';
import React, { Suspense, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';

import { useAnimationTimeRef } from '@/hooks/useAnimationTimeRef';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { useScrubbingMode } from '@/hooks/useScrubbingMode';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePerfTier } from '../../../hooks/usePerfTier';
import { usePhaseBasedMap } from '../../../hooks/usePhaseBasedMap';
import { useReplayPrefs, type ReplayQualityPreset } from '../../../hooks/useReplayPrefs';
import { useTimelineMarkers } from '../../../hooks/useTimelineMarkers';
import { BuffEvent } from '../../../types/combatlogEvents';
import {
  TRANSPORT_IDLE_MS,
  TRANSPORT_RESERVED,
  TRANSPORT_MOTION,
  HAIRLINE_H,
} from '../constants/replayDesign';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { useIsMobileReplay } from '../hooks/useIsMobileReplay';
import { useReplayShortcuts, type ReplayShortcutBinding } from '../hooks/useReplayShortcuts';
import { chapterDisplayName } from '../trial_chapters/chapterDisplay';
import {
  nextEntryAfter,
  type TrialTimeline as TrialTimelineModel,
} from '../trial_chapters/trialTimeline';
import type { TrialChapter } from '../trial_chapters/types';
import { MapMarkersState, ShapeKind, ShapeStyle } from '../types/mapMarkers';
import { lockDocumentSelection } from '../utils/documentSelectionLock';
import { QUALITY_LEVEL } from '../utils/qualityGovernor';
import { clampReplayTime } from '../utils/replayTime';

import { ADD_MARKER_AT_CENTER_EVENT } from './arenaEvents';
import { MobileReplayDock } from './mobile/MobileReplayDock';
import { PlaybackControls, PLAYBACK_SPEEDS, type TransportTrial } from './PlaybackControls';
import { ProgressHairline } from './ProgressHairline';
import { ReplayTransitionOverlay } from './ReplayTransitionOverlay';
import type { TrialTimelineSeekTarget } from './TrialTimeline';
import { UpNextCard, type UpNextState } from './UpNextCard';

// Keep React Three Fiber, Drei, Three.js, and the actor/map renderers out of the
// replay shell so controls and the mobile preview can paint while the scene loads.
const Arena3D = React.lazy(() =>
  import('./Arena3D').then((module) => ({ default: module.Arena3D })),
);

// Frame-step increment for the ,/. keys. The raw position sample interval (~4.7ms at 240Hz) is
// imperceptible as a step, so we nudge by a usable 100ms — one React-state sync tick — which lets
// an analyst inch through a moment frame-by-frame. Distinct from the ±1s arrow seek (Item 5).
const FRAME_STEP_MS = 100;

// localStorage flag gating the keyboard-help panel's auto-open to a visitor's FIRST replay visit
// (see the effect below). Versioned like ReplayZoomHint's STORAGE_KEY so a future copy/behavior
// change can invalidate old flags by bumping the suffix. Owned here (not Arena3D) now that the
// persistent "?" affordance lives in the transport's right cluster alongside fullscreen, so the
// button, the panel, and the H key all share one source of truth instead of Arena3D privately
// tracking state a sibling component needs to trigger.
const KEYBOARD_HELP_SEEN_KEY = 'replay.keyboardHelpSeen.v1';

/** Parse the share/deep-link actor id query parameter into the replay's nullable selection type. */
function parseActorIdParam(actorParam: string | null): number | null {
  if (actorParam === null) {
    return null;
  }
  const parsedActorId = Number(actorParam);
  return Number.isFinite(parsedActorId) ? parsedActorId : null;
}

/**
 * Continuous trial-replay wiring. When present (a multi-segment run), the transport
 * gains the trial-wide scrubber + "play whole trial" controls, and playback can
 * auto-advance from one fight into the next without leaving (or exiting) the replay.
 */
export interface TrialReplayNav {
  /** The current run's continuous timeline (already filtered by include-trash). */
  timeline: TrialTimelineModel;
  /** The fight currently loaded. */
  currentFightId: string | undefined;
  /** Whether auto-advance ("play whole trial") is on. */
  continuousEnabled: boolean;
  /** Whether continuous play walks the trash between bosses. */
  includeTrash: boolean;
  /** Whether the run has any trash (to show the trash toggle). */
  hasTrash: boolean;
  /** Display name of the current run. */
  runName: string;
  /** 0-based index of the current run, and the total run count (for multi-trial logs). */
  runIndex: number;
  runCount: number;
  /** e.g. "9 / 12 bosses", or null when the run has no bosses. */
  bossSummary: string | null;
  /** Boss skip targets relative to the active fight (the [ / ] keys + transport buttons). */
  prevBoss: TrialChapter | null;
  nextBoss: TrialChapter | null;
  /** True while the loaded fight's data isn't ready yet (drives the transition overlay). */
  isFightDataLoading: boolean;
  /** Name of the fight being entered, for the transition overlay. */
  enteringLabel: string | null;
  /**
   * Navigate the replay to another fight. `localMs` seeds the arrival playhead (cross-fight
   * scrubs); `replace` controls the history entry — defaults to replace (the continuous flow
   * must not pile up Back steps), while manual chapter jumps pass false so Back steps back.
   */
  onAdvanceToFight: (fightId: string, options?: { localMs?: number; replace?: boolean }) => void;
  /** Toggle auto-advance. */
  onToggleContinuous: () => void;
  /** Toggle whether trash is included in continuous play / the trial scrubber. */
  onToggleIncludeTrash: () => void;
}

interface FightReplay3DProps {
  selectedFight: FightFragment;
  allBuffEvents: BuffEvent[];
  showActorNames?: boolean;
  markersState?: MapMarkersState | null;
  onAddMarker?: (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => void;
  onRemoveMarker?: (markerId: string) => void;
  /** Marker edit mode: plain right-click context menus + draggable markers (no Alt chord). */
  markersEditMode?: boolean;
  /** Toggle marker edit mode — surfaced in the mobile tools sheet inside the immersive overlay. */
  onToggleMarkersEditMode?: () => void;
  /** Drag-to-move commit for a marker (arena-space coordinates). */
  onMarkerMove?: (markerId: string, arenaPoint: { x: number; z: number }) => void;
  /** Active shape draw tool (null when not drawing). */
  drawTool?: ShapeKind | null;
  /** Style applied to freshly drawn shapes. */
  drawStyle?: ShapeStyle;
  /** Commit a finished shape's ARENA points (FightReplay converts to world + persists). */
  onShapeDrawn?: (kind: ShapeKind, arenaPoints: Array<[number, number]>) => void;
  /** Select/disarm a draw tool (surfaced in the mobile Settings sheet). */
  onSelectDrawTool?: (tool: ShapeKind | null) => void;
  /** Change the draw style (mobile Settings sheet). */
  onDrawStyleChange?: (patch: Partial<ShapeStyle>) => void;
  /** Number of drawn shapes (mobile Settings sheet "clear" affordance). */
  shapeCount?: number;
  /** Remove all drawn shapes (mobile Settings sheet). */
  onClearShapes?: () => void;
  /** Opens the marker manage / import / share modal — the mobile drawer's gateway to it (the
      page-level deck that normally hosts it is desktop-only). */
  onOpenMarkersManager?: () => void;
  /** Opens the marker edit dialog (owned by FightReplay) for the given marker. */
  onEditMarker?: (markerId: string) => void;
  /** Marker undo/redo for the mobile tools sheet (Ctrl+Z/Ctrl+Shift+Z have no touch equivalent). */
  canUndoMarkers?: boolean;
  onUndoMarkers?: () => void;
  canRedoMarkers?: boolean;
  onRedoMarkers?: () => void;
  /** Whether to show player paths toolkit */
  showPlayerPaths?: boolean;
  /** Initial selected player IDs for path visualization */
  initialSelectedPlayerIds?: number[];
  /** Continuous trial-replay navigation (omitted when there's no multi-segment run). */
  trialNav?: TrialReplayNav;
}

export const FightReplay3D: React.FC<FightReplay3DProps> = ({
  selectedFight,
  allBuffEvents,
  showActorNames = true,
  markersState,
  onAddMarker,
  onRemoveMarker,
  markersEditMode = false,
  onToggleMarkersEditMode,
  onMarkerMove,
  drawTool = null,
  drawStyle,
  onShapeDrawn,
  onSelectDrawTool,
  onDrawStyleChange,
  shapeCount = 0,
  onClearShapes,
  onOpenMarkersManager,
  onEditMarker,
  canUndoMarkers = false,
  onUndoMarkers,
  canRedoMarkers = false,
  onRedoMarkers,
  showPlayerPaths = false,
  initialSelectedPlayerIds = [],
  trialNav,
}) => {
  // Parse URL parameters for actor initialization
  const [searchParams] = useSearchParams();
  const params = useParams();
  const actorParam = searchParams.get('actorId');
  const selectedActorIdFromUrl = React.useMemo(() => parseActorIdParam(actorParam), [actorParam]);

  // Actor selection and camera following state.
  // null = no actor selected/following, number = following that actor ID.
  //
  // The ref is the synchronous source of truth read every frame by CameraFollower's
  // useFrame loop and by KeyboardCameraControls. `followingActorId` mirrors it as React
  // state purely so UI (the "Following:" chip) can react to changes. The two are always
  // written together via setFollowingActor below — no polling needed.
  const followingActorIdRef = useRef<number | null>(selectedActorIdFromUrl);
  const [followingActorId, setFollowingActorId] = useState<number | null>(selectedActorIdFromUrl);

  // Wrapper around the canvas + the docked control bar. Used as the fullscreen target (Item 3) so one
  // requestFullscreen() takes the whole replay block (3D view, overlays, and the controls) at once.
  const replayContainerRef = useRef<HTMLDivElement>(null);

  // Single mutation point that keeps the ref (read by the render loop) and the state
  // (read by the UI) in lockstep.
  const setFollowingActor = useCallback((actorId: number | null) => {
    followingActorIdRef.current = actorId;
    setFollowingActorId(actorId);
  }, []);

  // The replay shell stays mounted across in-replay route/search-param changes. Keep share/deep
  // links truthful when `?actorId=` changes without a remount (for example browser back/forward or
  // a pasted URL handled client-side) instead of leaving the previous manual actor lock selected.
  useEffect(() => {
    setFollowingActor(selectedActorIdFromUrl);
  }, [selectedActorIdFromUrl, setFollowingActor]);

  // Persisted viewer prefs (localStorage). FightReplay3D owns the speed + path/trail slices;
  // Arena3D owns the names + performance slices (it persists those itself via the same hook).
  // initialPrefs/storedPrefs are a one-time mount snapshot used only to seed the state below.
  const { initialPrefs, storedPrefs, persistPrefs } = useReplayPrefs();

  // Mobile detection — the single seam every mobile-only branch gates on. Desktop = false, so all
  // the mobile paths are dead on desktop and behavior is byte-identical to before.
  const isMobile = useIsMobileReplay();

  // Player path visualization state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(
    new Set(initialSelectedPlayerIds),
  );
  // Seed from the stored pref when present, else the showPlayerPaths prop (the feature default).
  // `?? prop` (not initialPrefs) so an explicit prop still wins when the user has never toggled.
  // On mobile the player list starts CLOSED regardless: it's a wide power-user overlay that would
  // otherwise dominate the narrow immersive view on open (the user can toggle it on from the mobile
  // control cluster). Desktop is unaffected.
  const [showPlayerPathsHUD, setShowPlayerPathsHUD] = useState(
    isMobile ? false : (storedPrefs.showPlayerPaths ?? showPlayerPaths),
  );
  const [showPlayerTrails, setShowPlayerTrails] = useState(
    storedPrefs.showTrails ?? showPlayerPaths,
  );

  // Display settings lifted here from Arena3D so the mobile shell's Settings sheet can surface them
  // (name tags, performance mode, the locked-player stats panel) alongside the rest of the controls.
  // Arena3D still consumes + toggles these — they're passed down as controlled props — but the single
  // source of truth lives here, so the bottom dock and the in-canvas/desktop UI stay in lockstep.
  const [namesEnabled, setNamesEnabled] = useState(initialPrefs.showNames);
  const [statsPanelEnabled, setStatsPanelEnabled] = useState(initialPrefs.statsPanelEnabled);
  const toggleNames = useCallback(() => setNamesEnabled((v) => !v), []);
  const toggleStats = useCallback(() => setStatsPanelEnabled((v) => !v), []);

  // Keyboard-help panel — lifted here from Arena3D for the same reason as the display settings
  // above: the persistent "?" trigger now lives in PlaybackControls' transport cluster (a sibling
  // of Arena3D, which still renders the panel itself), so both need one shared source of truth.
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const toggleKeyboardHelp = useCallback(() => setShowKeyboardHelp((v) => !v), []);
  const closeKeyboardHelp = useCallback(() => setShowKeyboardHelp(false), []);

  // Auto-open the keyboard help panel on FIRST VISIT ONLY (500ms after mount, auto-hides at 8s) —
  // gated on a localStorage flag, same read/try-catch/write shape as ReplayZoomHint's dismissal
  // flag. Without this gate the panel popped open on every single mount, including a deep link to
  // follow a specific player, which is actively unhelpful. Returning visitors still have the
  // persistent "?" button in the transport + the H key — this only removes the unsolicited
  // auto-open once the visitor has seen it. Guard localStorage access: Safari private mode throws
  // on getItem/setItem, and a throw here must not break the replay — worst case the hint just
  // reappears (or never persists) instead of crashing the component.
  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(KEYBOARD_HELP_SEEN_KEY) === '1';
    } catch {
      // Storage disabled/blocked — fall through and treat as first visit.
    }

    if (alreadySeen) {
      return;
    }

    const timer = setTimeout(() => {
      setShowKeyboardHelp(true);
    }, 500);

    const hideTimer = setTimeout(() => {
      setShowKeyboardHelp(false);
      try {
        window.localStorage.setItem(KEYBOARD_HELP_SEEN_KEY, '1');
      } catch {
        // Private mode / storage disabled — the auto-open just won't persist; harmless, it will
        // simply reappear next visit rather than staying suppressed.
      }
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Quality preset — one value replaces the old performanceMode +
  // qualityAutoDisabled booleans: 'auto' (governor armed), 'high' (pinned
  // full, the old chip-tap), 'performance' (old manual mode), 'barebones'
  // (minimal-drawing 30fps floor). The derived legacy boolean feeds surfaces
  // that still render a two-state toggle.
  const [qualityPreset, setQualityPreset] = useState<ReplayQualityPreset>(
    initialPrefs.qualityPreset,
  );
  const handleQualityPresetChange = useCallback(
    (p: ReplayQualityPreset) => setQualityPreset(p),
    [],
  );
  // Legacy persisted mirror of the preset (see the persist effect below).
  const performanceMode = qualityPreset === 'performance' || qualityPreset === 'barebones';

  // Adaptive quality governor (the tier below resolution scaling). `autoQualityLevel` is the
  // governor's current effect-drop level (0 = full); the QualityGovernor inside the scene requests
  // changes via handleQualityLevelChange. Any preset other than 'auto' stands the governor down.
  // Weak-device seeding: when the user has never chosen a preset and the mount-time perf tier is
  // 'low', start the governor AT the no-shadows level — the preset stays 'auto' (so the auto chip
  // shows and recovery can climb back on misclassified hardware), but a weak phone skips the janky
  // first seconds the governor would need to measure its way down.
  const perfTier = usePerfTier();
  const [autoQualityLevel, setAutoQualityLevel] = useState(() =>
    storedPrefs.qualityPreset === undefined && perfTier === 'low' ? QUALITY_LEVEL.NO_SHADOWS : 0,
  );
  const handleQualityLevelChange = useCallback((level: number) => setAutoQualityLevel(level), []);
  // A fixed preset pins the level, so clear any level the governor had latched —
  // returning to 'auto' then snaps straight to full quality instead of
  // inheriting a stale reduction.
  useEffect(() => {
    if (qualityPreset !== 'auto') setAutoQualityLevel(0);
  }, [qualityPreset]);

  // Compact contextual badges for the transport bar (encounter · difficulty · outcome).
  // The encounter name is shortened to its trailing word(s) so it complements — rather than
  // duplicates — the full title in the page header above. ESO Logs difficulty codes:
  // 120 = Normal, 121 = Veteran, 122 = Veteran Hard Mode.
  const replayContext = React.useMemo(() => {
    const difficultyTag =
      selectedFight.difficulty === 122
        ? 'HM'
        : selectedFight.difficulty === 121
          ? 'Vet'
          : selectedFight.difficulty === 120
            ? 'Normal'
            : undefined;
    return {
      label: selectedFight.name || undefined,
      difficultyTag,
      isKill: selectedFight.kill,
    };
  }, [selectedFight.name, selectedFight.difficulty, selectedFight.kill]);

  // Map timeline for debug information and phase-aware map changes
  const { mapTimeline } = usePhaseBasedMap({
    fight: selectedFight || null,
    buffEvents: allBuffEvents.length > 0 ? allBuffEvents : null,
  });

  // Parse URL parameters for timestamp initialization
  const time = searchParams.get('time');

  let initialTime = 0;

  if (time !== null) {
    const parsedTime = Number(time);
    if (!isNaN(parsedTime)) {
      initialTime = parsedTime;
    }
  }

  // Clamp the URL-provided time to the valid fight range so a malformed deep link
  // (e.g. ?time=-5000 or ?time=999999999) cannot initialize playback out of bounds.
  const fightDuration = selectedFight.endTime - selectedFight.startTime;
  const clampedInitialTime = clampReplayTime(initialTime, fightDuration);

  // Playback state - initialize with URL parameter if available (clamped to range)
  const [currentTime, setCurrentTime] = useState(clampedInitialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  // Mirror into a ref so the keyboard play/pause handler can read the current value without
  // depending on `isPlaying` (which would re-create the handler — and re-bind the window keydown
  // listener — on every play/pause).
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPrefs.playbackSpeed);
  const [isScrubbingMode, setIsScrubbingMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // RENDER-PHASE pause on fight change (the canonical adjust-state-during-render pattern).
  // This must commit in the SAME render that first carries the new fight: usePlaybackAnimation's
  // effect re-runs on the new duration BEFORE the fight-change reset effect (hook order) and, if
  // isPlaying were still true, would synchronously tick with the OLD fight's playhead — when the
  // outgoing fight is longer than the incoming one that tick lands past the new duration, fires
  // onEnd again, and silently SKIPS the fight that was just entered (or misroutes a chapter
  // click made while playing). Pausing here closes that window for every switch path; the reset
  // effect + pendingAutoplay then seed and resume as designed.
  const [renderedFightId, setRenderedFightId] = useState(selectedFight.id);
  if (renderedFightId !== selectedFight.id) {
    setRenderedFightId(selectedFight.id);
    setIsPlaying(false);
  }

  // A–B loop in/out points (ms into the fight), set with i/o. Raw (unordered); the playback hook
  // normalizes lo/hi. Both set + a sane span → playback wraps within [A,B] until the chip clears.
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  // Mirror the loop bounds into refs so the keyboard play/pause handler can read them without
  // taking them as deps — otherwise that handler (and the window keydown listener it lives in)
  // would re-create every time a loop point is set, churning the listener on a frequent action.
  const loopStartRef = useRef(loopStart);
  loopStartRef.current = loopStart;
  const loopEndRef = useRef(loopEnd);
  loopEndRef.current = loopEnd;

  // Transport bar visibility (cinema model). Master state for the compact bar:
  //  - windowed: stays visible unless the user manually collapses it (C / chevron).
  //  - fullscreen: auto-hides after idle (TRANSPORT_IDLE_MS) behind a progress hairline and
  //    reveals on pointer activity; C still toggles manually.
  // Seeded from the persisted barCollapsed pref so a user who prefers the collapsed cinema state
  // keeps it across reloads.
  const [barVisible, setBarVisible] = useState(!storedPrefs.barCollapsed);

  // Strip drag state from the trial mini-map (separate from the fight rail's isDragging so it
  // can't engage the 3D scrub-degradation path) — guards the fullscreen idle auto-hide so the
  // bar can't unmount mid-drag under a held pointer.
  const [isTrialDragging, setIsTrialDragging] = useState(false);
  const handleTrialDraggingChange = useCallback((dragging: boolean) => {
    setIsTrialDragging(dragging);
  }, []);

  // High-performance time reference for 3D updates
  const animationTimeRef = useAnimationTimeRef({
    initialTime: currentTime,
    onTimeUpdate: setCurrentTime,
    updateInterval: 500, // Update React state every 500ms
  });

  // Latest continuous-nav props in a ref, so the playback-end / advance callbacks can read them
  // without re-creating (which would rebuild the animation loop). Updated every render.
  const trialNavRef = useRef(trialNav);
  trialNavRef.current = trialNav;

  // "Cancel" on the Up-next countdown skips auto-advance for THIS fight boundary only (the
  // persisted autoplay preference stays on). Two halves kept in lockstep: the ref consulted by
  // handlePlaybackEnd and the state gating the countdown card. Both reset on fight change and
  // when the playhead leaves the end-of-fight tail window.
  const skipNextAdvanceRef = useRef(false);
  const [countdownCancelled, setCountdownCancelled] = useState(false);

  // The resolved next timeline entry (computed below with a startTime fallback for fights that
  // aren't ON the filtered timeline — e.g. a deep-linked trash blip below the segment threshold,
  // or trash while includeTrash is off). Mirrored into a ref so handlePlaybackEnd can read it
  // without re-creating (which would rebuild the animation loop).
  const nextEntryRef = useRef<{ chapter: TrialChapter } | null>(null);

  // When playback reaches the end: in continuous mode, advance into the next timeline entry
  // (the reset-on-fight-change effect resumes playback once its data is ready); otherwise stop.
  // Uses the SAME next-entry resolution as the Up-next UI, so a current fight that's excluded
  // from the timeline still flows into the next included segment instead of dead-stopping.
  const handlePlaybackEnd = useCallback(() => {
    const nav = trialNavRef.current;
    if (nav?.continuousEnabled && !skipNextAdvanceRef.current) {
      const nextEntry = nextEntryRef.current;
      if (nextEntry) {
        nav.onAdvanceToFight(nextEntry.chapter.fightId);
        return;
      }
    }
    // Consuming a cancel (or stopping at the run's end) resets BOTH halves of the cancel state
    // in lockstep — leaving countdownCancelled armed here suppressed the next countdown while
    // the cleared skip ref let it auto-advance silently.
    skipNextAdvanceRef.current = false;
    setCountdownCancelled(false);
    setIsPlaying(false);
  }, []);

  // Playback animation for smooth time updates
  usePlaybackAnimation({
    timeRef: animationTimeRef.timeRef,
    isPlaying,
    playbackSpeed,
    duration: selectedFight.endTime - selectedFight.startTime,
    onTimeUpdate: setCurrentTime,
    onEnd: handlePlaybackEnd,
    loopStart,
    loopEnd,
  });

  // Scrubbing mode optimization
  const scrubbingMode = useScrubbingMode({
    isScrubbingMode,
    isDragging,
  });

  const seekTo = useCallback(
    (time: number) => {
      setCurrentTime(time);
      animationTimeRef.setTime(time);
    },
    [animationTimeRef],
  );

  // Playback control handlers. Pressing play while parked at the final frame restarts the
  // fight from the top (the standard player convention) — without this, the loop's first tick
  // immediately re-fired onEnd, which with autoplay on re-advanced past a boundary the user may
  // have just cancelled. With a sane A–B loop armed the restart is SKIPPED: the playback hook's
  // wrap branch never calls onEnd and resumes at the loop in-point — restarting to 0:00 would
  // dump a user looping the final burn back into the whole pre-loop section.
  // Stable across play/pause + loop changes: reads the playing state and loop bounds from refs, so
  // it never re-creates on those frequent interactions (and the window keydown listener that
  // depends on it stops re-binding each time).
  const handlePlayPause = useCallback(() => {
    const wasPlaying = isPlayingRef.current;
    if (!wasPlaying) {
      const dur = selectedFight.endTime - selectedFight.startTime;
      const ls = loopStartRef.current;
      const le = loopEndRef.current;
      const loopArmed = ls != null && le != null && Math.abs(le - ls) >= 100;
      if (!loopArmed && animationTimeRef.timeRef.current >= dur - 250) {
        seekTo(0);
      }
    }
    setIsPlaying(!wasPlaying);
  }, [selectedFight.endTime, selectedFight.startTime, animationTimeRef.timeRef, seekTo]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleScrubbingModeChange = useCallback((scrubbing: boolean) => {
    setIsScrubbingMode(scrubbing);
  }, []);

  const handleDraggingChange = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  // Continuous trial replay: when the loaded fight changes in place (auto-advance, a chapter
  // jump, or a cross-segment scrub), the component stays mounted (so fullscreen persists and the
  // scene rebuilds underneath) — but playback state must reset for the new fight. We also remember
  // to resume playing once the new fight's data is ready when "play whole trial" is on.
  const [pendingAutoplay, setPendingAutoplay] = useState(false);
  // One-shot "start playing on arrival" for explicit play actions (the Play-next card, a
  // cross-fight Replay-run) — these promise playback even when the autoplay preference is off.
  const forceAutoplayRef = useRef(false);
  // Cross-fight trial scrubs promise a specific moment ("Xalvakka · 2:45" in the preview
  // bubble) — the dragged local offset is stashed here, keyed by the target fight, and
  // consumed by the reset effect so the new fight opens AT that moment instead of 0:00.
  // Auto-advance and chapter jumps never set it, so they still start at the top.
  const pendingSeekRef = useRef<{ fightId: string; localMs: number } | null>(null);
  const prevFightIdRef = useRef(selectedFight.id);
  useEffect(() => {
    if (prevFightIdRef.current === selectedFight.id) return;
    prevFightIdRef.current = selectedFight.id;
    const pending = pendingSeekRef.current;
    pendingSeekRef.current = null;
    // Apply the pending offset only when the arriving fight is the one it was promised for
    // (an interleaved chapter click must not inherit a stale offset). With no pending seek,
    // fall back to the URL's ?time= — the component stays mounted across in-replay fight
    // switches, so browser back/forward and pasted deep links change :fightId without a
    // remount and would otherwise land at 0:00 despite the URL promising an offset.
    const fightDur = selectedFight.endTime - selectedFight.startTime;
    let seedMs = 0;
    if (pending && pending.fightId === String(selectedFight.id)) {
      seedMs = Math.max(0, Math.min(pending.localMs, fightDur));
    } else {
      const urlTime = Number(searchParams.get('time'));
      if (!Number.isNaN(urlTime) && urlTime > 0) {
        seedMs = clampReplayTime(urlTime, fightDur);
      }
    }
    setCurrentTime(seedMs);
    animationTimeRef.setTime(seedMs);
    setLoopStart(null);
    setLoopEnd(null);
    setIsPlaying(false);
    setFollowingActor(selectedActorIdFromUrl);
    setSelectedPlayerIds(new Set());
    // A new fight is a fresh scene with its own load — re-measure from full quality. (The user's
    // "force full quality" choice, qualityAutoDisabled, deliberately persists across fights.)
    setAutoQualityLevel(0);
    // A new fight is a new boundary: clear BOTH halves of any Up-next cancel (a stale
    // countdownCancelled would suppress the next fight's countdown — the only Cancel UI —
    // while the cleared skip ref let it auto-advance silently).
    skipNextAdvanceRef.current = false;
    setCountdownCancelled(false);
    setPendingAutoplay(
      forceAutoplayRef.current || (trialNavRef.current?.continuousEnabled ?? false),
    );
    forceAutoplayRef.current = false;
  }, [
    selectedFight.id,
    selectedFight.endTime,
    selectedFight.startTime,
    animationTimeRef,
    setFollowingActor,
    searchParams,
    selectedActorIdFromUrl,
  ]);

  // Resume playback once the freshly-loaded fight is ready (continuous auto-advance).
  const isFightDataLoading = trialNav?.isFightDataLoading ?? false;
  useEffect(() => {
    if (pendingAutoplay && !isFightDataLoading) {
      setIsPlaying(true);
      setPendingAutoplay(false);
    }
  }, [pendingAutoplay, isFightDataLoading]);

  // Seek from the trial scrubber: stay-in-fight seeks are instant; crossing into another segment
  // advances to that fight AND lands at the dragged offset (the reset effect consumes the
  // pending seek), keeping the "one continuous video" promise.
  const handleTrialSeek = useCallback(
    (target: TrialTimelineSeekTarget) => {
      if (target.sameFight) {
        const dur = selectedFight.endTime - selectedFight.startTime;
        seekTo(Math.max(0, Math.min(target.localMs, dur)));
      } else {
        pendingSeekRef.current = { fightId: target.fightId, localMs: target.localMs };
        trialNavRef.current?.onAdvanceToFight(target.fightId, { localMs: target.localMs });
      }
    },
    [seekTo, selectedFight.endTime, selectedFight.startTime],
  );

  // Navigate to a chapter (popover rows, boss-skip buttons, mobile chapter list) — always from
  // its start, and as a history PUSH: manual chapter jumps must let Back return to the previous
  // fight (matching the page rail and the [ ] keys), unlike auto-advance which replaces.
  const handleSelectChapter = useCallback((chapter: TrialChapter) => {
    trialNavRef.current?.onAdvanceToFight(chapter.fightId, { replace: false });
  }, []);

  const handleTimeChange = useCallback(
    (time: number) => {
      const clampedTime = Math.max(
        0,
        Math.min(time, selectedFight.endTime - selectedFight.startTime),
      );
      seekTo(clampedTime);
    },
    [selectedFight, seekTo],
  );

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleSkipToStart = useCallback(() => {
    seekTo(0);
  }, [seekTo]);

  const handleSkipToEnd = useCallback(() => {
    seekTo(selectedFight.endTime - selectedFight.startTime);
  }, [selectedFight, seekTo]);

  // The ±10s buttons read the LIVE playhead from the ref (always initialized at mount), not the
  // 10Hz currentTime state — a currentTime dep gave these a fresh identity on every playback
  // tick, defeating PlaybackButtons' React.memo at exactly the cadence it exists to block.
  const handleSkipBackward10 = useCallback(() => {
    seekTo(Math.max(0, animationTimeRef.timeRef.current - 10000));
  }, [animationTimeRef.timeRef, seekTo]);

  const handleSkipForward10 = useCallback(() => {
    seekTo(
      Math.min(
        selectedFight.endTime - selectedFight.startTime,
        animationTimeRef.timeRef.current + 10000,
      ),
    );
  }, [selectedFight.endTime, selectedFight.startTime, animationTimeRef.timeRef, seekTo]);

  // Fight duration in ms — the upper bound every keyboard seek clamps to.
  const duration = selectedFight.endTime - selectedFight.startTime;

  // Relative seek that always reads the live time from the high-frequency ref (not the ~2Hz
  // currentTime state), so rapid arrow taps compound correctly instead of snapping back to a
  // stale React value. Clamped to [0, duration]. No currentTime dep — that re-created this (and
  // the window keydown listener downstream) at the 10Hz playback tick.
  const seekBy = useCallback(
    (deltaMs: number) => {
      const base = animationTimeRef.timeRef.current;
      seekTo(Math.max(0, Math.min(duration, base + deltaMs)));
    },
    [animationTimeRef.timeRef, duration, seekTo],
  );

  // +/- step through the same discrete speed ladder the on-screen SpeedSelector uses. Uses the
  // functional updater so it has no `playbackSpeed` dep — keeping it (and the keydown listener
  // that depends on it) stable when the user steps the speed.
  const stepSpeed = useCallback((direction: 1 | -1) => {
    setPlaybackSpeed((current) => {
      const idx = PLAYBACK_SPEEDS.indexOf(current);
      // If the current speed isn't on the ladder (shouldn't happen), fall back to 1x's slot.
      const currentIdx = idx === -1 ? PLAYBACK_SPEEDS.indexOf(1) : idx;
      const nextIdx = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIdx + direction));
      return PLAYBACK_SPEEDS[nextIdx];
    });
  }, []);

  // Frame-step (,/.): pause if playing, then nudge by FRAME_STEP_MS so the figures advance one
  // small visible step. Stepping is only meaningful on a still frame, so we always pause first.
  const frameStep = useCallback(
    (direction: 1 | -1) => {
      setIsPlaying(false);
      seekBy(direction * FRAME_STEP_MS);
    },
    [seekBy],
  );

  // Timeline markers (phase/death/cluster), already relative to fight start (0..duration), used
  // to jump to the previous/next key event with </>. Pure redux-selector hook (no dispatch), so
  // calling it here doesn't duplicate the actor-positions task that Arena3D owns.
  const { markers } = useTimelineMarkers();

  // Jump to the previous (-1) or next (+1) event marker relative to the live playhead. Uses a
  // small epsilon so repeated presses don't get stuck on the marker you just landed on.
  const jumpToEvent = useCallback(
    (direction: 1 | -1) => {
      if (markers.length === 0) return;
      const now = animationTimeRef.timeRef.current;
      const EPS = 1; // ms — step just past the current marker so repeats advance
      const sorted = markers.map((m) => m.timestamp).sort((a, b) => a - b);
      let targetTime: number | null = null;
      if (direction === 1) {
        targetTime = sorted.find((t) => t > now + EPS) ?? null;
      } else {
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i] < now - EPS) {
            targetTime = sorted[i];
            break;
          }
        }
      }
      if (targetTime !== null) {
        seekTo(Math.max(0, Math.min(duration, targetTime)));
      }
    },
    [markers, animationTimeRef.timeRef, duration, seekTo],
  );

  // A–B loop: set the in/out point to the LIVE playhead (ref, not the lagged currentTime state).
  const setLoopInPoint = useCallback(() => {
    const t = animationTimeRef.timeRef.current;
    setLoopStart(Math.max(0, Math.min(duration, t)));
  }, [animationTimeRef.timeRef, duration]);

  const setLoopOutPoint = useCallback(() => {
    const t = animationTimeRef.timeRef.current;
    setLoopEnd(Math.max(0, Math.min(duration, t)));
  }, [animationTimeRef.timeRef, duration]);

  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
  }, []);

  // Timestamp of the last actor-lock tap — lets the mobile tap-to-toggle-chrome handler tell
  // "tap selected an actor" apart from "tap on empty arena" (Arena3D's click runs first).
  const actorTapRef = useRef(0);

  const handleActorClick = useCallback(
    (actorId: number) => {
      // Set camera to follow the clicked actor
      actorTapRef.current = performance.now();
      setFollowingActor(actorId);
    },
    [setFollowingActor],
  );

  const handleCameraUnlock = useCallback(() => {
    // Stop following any actor
    setFollowingActor(null);
  }, [setFollowingActor]);

  // Fullscreen the whole replay block (canvas + overlays + the docked control bar, all of which live
  // inside replayContainerRef). Toggled by the button in Arena3D's cluster and the `f` key.
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile "immersive" mode is a CSS PSEUDO-fullscreen (a position:fixed overlay), NOT the native
  // Fullscreen API: iOS Safari cannot requestFullscreen() a non-video element, so the native path
  // silently no-ops on iPhone. We keep this as separate state from isFullscreen because the native
  // `&:fullscreen` CSS pseudo-class and the fullscreenchange listener only ever fire under the real
  // API — on mobile we drive the overlay purely from this boolean.
  const [mobilePseudoFullscreen, setMobilePseudoFullscreen] = useState(false);

  // The single "is the replay filling the screen?" signal everything downstream keys off (fill-height
  // layout, cinema auto-hide, reserved transport inset). On desktop it equals isFullscreen; on mobile
  // it's the pseudo-fullscreen overlay. Unifying them here means the transport, overlays, and
  // auto-hide work inside the mobile overlay for free, with no extra wiring.
  const isImmersive = isFullscreen || mobilePseudoFullscreen;

  // The mobile inline preview = narrow viewport, not yet expanded into the overlay. In this state the
  // transport is hidden (the canvas is a non-interactive teaser); it returns once the user expands.
  const mobilePreview = isMobile && !isImmersive;
  // Mobile immersive = the live pseudo-fullscreen overlay. This drives the dedicated mobile shell
  // (top bar · arena · bottom dock) that replaces the desktop overlay soup on a phone.
  const mobileImmersive = isMobile && isImmersive;

  // Marker editing needs the interactive overlay — the inline mobile preview is a
  // pointer-events:none teaser, so enabling edit mode from the page toolbar would otherwise
  // look broken (holds select page text, drags do nothing). Auto-expand instead.
  useEffect(() => {
    if (markersEditMode && isMobile) {
      setMobilePseudoFullscreen(true);
    }
  }, [markersEditMode, isMobile]);

  const toggleFullscreen = useCallback(() => {
    // Mobile: flip the CSS pseudo-fullscreen overlay (the native API can't fullscreen a div on iOS).
    if (isMobile) {
      setMobilePseudoFullscreen((v) => !v);
      return;
    }
    // Desktop: the native Fullscreen API on the whole replay block (unchanged).
    const el = replayContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, [isMobile]);
  useEffect(() => {
    // Track real fullscreen state (covers Esc / browser-driven exit, not just our button).
    const onChange = (): void =>
      setIsFullscreen(document.fullscreenElement === replayContainerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Persist FightReplay3D's pref slice (speed + path/trail toggles + bar-collapsed) whenever it
  // changes. The hook does a read-merge-write so this never clobbers the names/performance slice
  // Arena3D persists.
  //
  // On mobile we DON'T persist the path/trail/bar toggles: those are seeded for the mobile session
  // (player list forced closed, etc.) and writing them back would clobber the user's desktop prefs.
  // Speed is fine to share across form factors, so it's always persisted.
  // The display-settings slice (names / performance / stats) is form-factor-agnostic — the same
  // toggles desktop exposes — so it's persisted on every form factor (unlike the path/trail/bar
  // toggles, which are session-seeded on mobile and would clobber the user's desktop prefs).
  useEffect(() => {
    // performanceMode is the LEGACY mirror of qualityPreset — written for one
    // release so a rolled-back build still honors the user's choice.
    persistPrefs(
      isMobile
        ? {
            playbackSpeed,
            showNames: namesEnabled,
            qualityPreset,
            performanceMode,
            statsPanelEnabled,
          }
        : {
            playbackSpeed,
            showPlayerPaths: showPlayerPathsHUD,
            showTrails: showPlayerTrails,
            barCollapsed: !barVisible,
            showNames: namesEnabled,
            qualityPreset,
            performanceMode,
            statsPanelEnabled,
          },
    );
  }, [
    persistPrefs,
    isMobile,
    playbackSpeed,
    showPlayerPathsHUD,
    showPlayerTrails,
    barVisible,
    namesEnabled,
    qualityPreset,
    performanceMode,
    statsPanelEnabled,
  ]);

  // Manual collapse toggle (C key + the bar's chevron / restore caret). Works in any mode.
  const toggleBar = useCallback(() => setBarVisible((v) => !v), []);

  // Stable toggles for the mobile control cluster (mirror the P / T keyboard shortcuts). Memoized so
  // they don't break Arena3D's React.memo on every render.
  const togglePlayerPathsHUD = useCallback(() => setShowPlayerPathsHUD((prev) => !prev), []);
  const toggleTrails = useCallback(() => setShowPlayerTrails((prev) => !prev), []);

  // Gesture-free marker placement for the mobile Settings sheet: the in-canvas bridge raycasts the
  // screen center onto the arena floor and opens the icon picker there. Stable so it doesn't break
  // the dock's React.memo on every playback tick.
  const handleAddMarkerAtCenter = useCallback(() => {
    window.dispatchEvent(new CustomEvent(ADD_MARKER_AT_CENTER_EVENT));
  }, []);

  // A mobile bottom sheet is open (Chapters / Settings) — chrome must never auto-hide
  // out from under an open sheet.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Cinema auto-hide.
  //
  // DESKTOP fullscreen: reveal on pointer activity over the OUTER container (replayContainerRef
  // — it is pointer-events:auto; the inner positioning frame is pointer-events:none so a listener
  // there would never fire), plus an idle timer that hides the bar after TRANSPORT_IDLE_MS,
  // re-armed on every reveal, and guarded so it never hides mid-scrub/drag (either rail).
  //
  // MOBILE immersive: the standard video-player model instead — a TAP toggles the chrome (wired
  // below via the container tap handler), and the same idle timer auto-hides it while playing.
  // Pointer-move reveal is NOT attached on mobile: every camera drag would re-reveal and the
  // chrome would never rest.
  const idleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isImmersive) return;
    const el = replayContainerRef.current;
    if (!el) return;

    const armIdle = (): void => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        // Never hide while the user is actively scrubbing/dragging a timeline, while a
        // mobile sheet is open, or (on mobile) while paused — paused chrome is the resting UI.
        if (isDragging || isScrubbingMode || isTrialDragging || mobileSheetOpen) {
          armIdle();
          return;
        }
        if (isMobile && !isPlaying) {
          armIdle();
          return;
        }
        setBarVisible(false);
      }, TRANSPORT_IDLE_MS);
    };

    const reveal = (): void => {
      setBarVisible(true);
      armIdle();
    };

    if (!isMobile) {
      // Passive listeners (never preventDefault) so canvas pinch/OrbitControls are untouched.
      el.addEventListener('pointermove', reveal, { passive: true });
      el.addEventListener('touchstart', reveal, { passive: true });
      el.addEventListener('touchmove', reveal, { passive: true });
    }
    armIdle(); // start the clock on entering fullscreen
    return () => {
      if (!isMobile) {
        el.removeEventListener('pointermove', reveal);
        el.removeEventListener('touchstart', reveal);
        el.removeEventListener('touchmove', reveal);
      }
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [
    isImmersive,
    isMobile,
    isPlaying,
    isDragging,
    isScrubbingMode,
    isTrialDragging,
    mobileSheetOpen,
  ]);

  // Mobile immersive: force the chrome back whenever playback pauses (pause = "I want the
  // controls"), and seed it visible on entering the overlay regardless of the desktop-persisted
  // collapse preference.
  useEffect(() => {
    if (mobileImmersive && !isPlaying) setBarVisible(true);
  }, [mobileImmersive, isPlaying]);

  // Mobile tap-to-toggle: a true tap (≤8px travel) on the EMPTY arena flips the chrome. Taps on
  // controls (dock, top bar, sheets) and taps that locked onto an actor are ignored. The toggle
  // decision runs on the bubbling CLICK (not pointerup): R3F dispatches mesh onClick during the
  // DOM click event, so by the time the click bubbles to the container, an actor hit has already
  // stamped actorTapRef — a pointerup-phase check ran BEFORE the stamp and the guard was dead
  // (every actor-lock tap also flipped the chrome). pointerdown/up only measure travel so a
  // camera drag never counts as a tap.
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const tapTravelOkRef = useRef(false);
  useEffect(() => {
    if (!mobileImmersive) return;
    const el = replayContainerRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent): void => {
      tapStartRef.current = { x: e.clientX, y: e.clientY };
      tapTravelOkRef.current = false;
    };
    const onUp = (e: PointerEvent): void => {
      const start = tapStartRef.current;
      tapStartRef.current = null;
      if (!start) return;
      tapTravelOkRef.current = Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 8;
    };
    const onCancel = (): void => {
      tapStartRef.current = null;
      tapTravelOkRef.current = false;
    };
    const onClick = (e: MouseEvent): void => {
      if (!tapTravelOkRef.current) return;
      tapTravelOkRef.current = false;
      const target = e.target as HTMLElement | null;
      // Only bare-canvas taps toggle; anything interactive handles itself.
      if (!target || target.tagName !== 'CANVAS') return;
      // The canvas's own click handlers (R3F) ran first — a fresh stamp means an actor lock.
      if (performance.now() - actorTapRef.current < 250) return;
      setBarVisible((v) => !v);
    };
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onCancel, { passive: true });
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('click', onClick);
    };
  }, [mobileImmersive]);

  // When the user LEAVES fullscreen (not on mount), restore the bar — exiting into an
  // auto-hidden bar would be disorienting. Tracks the previous fullscreen state so the persisted
  // barCollapsed seed isn't clobbered on the initial render.
  const wasFullscreenRef = useRef(isImmersive);
  useEffect(() => {
    if (wasFullscreenRef.current && !isImmersive) {
      setBarVisible(true);
    }
    wasFullscreenRef.current = isImmersive;
  }, [isImmersive]);

  // Safety net: if the viewport ever stops being "mobile" while the pseudo-fullscreen overlay is open
  // (e.g. an unusual rotation/resize that crosses the breakpoint), tear the overlay down. Without this
  // the mobile-only controls (incl. the Close button) would unmount while the fixed overlay + body
  // lock persist, stranding the user. The hook is orientation-robust so this rarely fires, but it
  // guarantees there's no state where the overlay is up with no way out.
  useEffect(() => {
    if (!isMobile && mobilePseudoFullscreen) {
      setMobilePseudoFullscreen(false);
    }
  }, [isMobile, mobilePseudoFullscreen]);

  // Lock body scroll while the mobile pseudo-fullscreen overlay is open. The overlay is a fixed
  // element over the page; without this the page behind it can still scroll/rubber-band under the
  // touch gestures. Keyed ONLY on mobilePseudoFullscreen, so the effect body never runs on desktop
  // (where it's permanently false) — the native Fullscreen path handles its own scroll containment.
  useEffect(() => {
    if (!mobilePseudoFullscreen) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none'; // kill iOS rubber-band past the overlay
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, [mobilePseudoFullscreen]);

  // Suppress iOS Safari's PAGE pinch-zoom while the immersive overlay is up, so a two-finger pinch
  // dollies the 3D camera (CanvasWheelZoom owns the touch pinch) instead of scaling the whole page.
  // Safari drives page zoom through the non-standard `gesture*` events, which `touch-action: none`
  // and a touchmove preventDefault don't reliably stop — so without this the replay "wouldn't zoom"
  // (the page zoomed under the gesture instead). These events are iOS-only; the listeners are inert
  // elsewhere. Scoped to the pseudo-fullscreen overlay (which fills the screen), so normal page
  // pinch-zoom is untouched everywhere else.
  useEffect(() => {
    if (!mobilePseudoFullscreen) return;
    const prevent = (e: Event): void => e.preventDefault();
    const opts = { passive: false } as const;
    document.addEventListener('gesturestart', prevent, opts);
    document.addEventListener('gesturechange', prevent, opts);
    document.addEventListener('gestureend', prevent, opts);
    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
    };
  }, [mobilePseudoFullscreen]);

  // Document-WIDE selection lock while the overlay is open. iOS Safari's long-press selection
  // hit-test is not confined to the touched element: with the overlay unselectable, WebKit
  // selects the nearest selectable text — i.e. the PAGE BEHIND the overlay (field-reported on
  // iPhone). Scoped CSS can't fix that, so every element goes unselectable for the overlay's
  // lifetime (text inputs stay editable — see documentSelectionLock).
  useEffect(() => {
    if (!mobilePseudoFullscreen) return;
    return lockDocumentSelection();
  }, [mobilePseudoFullscreen]);

  // Keyboard shortcuts: playback transport + player-path toggles. Camera keys (WASD, r reset,
  // g frame-all) live in-canvas (KeyboardCameraControls / CameraResetControls) because they need
  // the three.js camera handle; N/J are still bound inside Arena3D's own keydown listener (it
  // already holds the toggle callbacks as controlled props) even though their on-screen buttons
  // now live in the transport's settings popover. H lives here, alongside its trigger button in
  // the transport's right cluster. This binding set owns everything that mutates FightReplay3D's
  // playback state, registered through the shared `useReplayShortcuts` hook — see its module doc
  // for why the guard (text-entry / defaultPrevented / OS-chord exclusion) now lives there instead
  // of being hand-rolled per listener.
  const shortcutBindings = useMemo<ReplayShortcutBinding[]>(
    () => [
      {
        // Play/pause. Never hijack Space from a focused button: Space is the native activation
        // key for buttons, so toggling + preventDefault() here would break keyboard activation of
        // Import/Load markers, Share, collapse, fullscreen, etc. Returning `false` leaves the
        // button to handle its own Space untouched; the canvas/transport background still toggles
        // playback for every other target.
        keys: [' '],
        onMatch: (event) => {
          if (event.target instanceof HTMLButtonElement) return false;
          handlePlayPause();
        },
      },
      {
        keys: ['ArrowLeft'],
        onMatch: (event) => seekBy(event.shiftKey ? -10000 : -1000),
      },
      {
        keys: ['ArrowRight'],
        onMatch: (event) => seekBy(event.shiftKey ? 10000 : 1000),
      },
      // '=' is the unshifted '+' on most layouts — both drive speed up.
      { keys: ['+', '='], onMatch: () => stepSpeed(1) },
      { keys: ['-'], onMatch: () => stepSpeed(-1) },
      // Shift+, → jump to previous key event.
      { keys: ['<'], onMatch: () => jumpToEvent(-1) },
      // Shift+. → jump to next key event.
      { keys: ['>'], onMatch: () => jumpToEvent(1) },
      // Frame-step backward/forward (one small visible step).
      { keys: [','], onMatch: () => frameStep(-1) },
      { keys: ['.'], onMatch: () => frameStep(1) },
      // Toggle player paths HUD.
      { keys: ['p'], onMatch: () => setShowPlayerPathsHUD((prev) => !prev) },
      // Toggle player trails.
      { keys: ['t'], onMatch: () => setShowPlayerTrails((prev) => !prev) },
      // Toggle fullscreen of the replay block.
      { keys: ['f'], onMatch: () => toggleFullscreen() },
      // Set A–B loop IN point at the current time.
      { keys: ['i'], onMatch: () => setLoopInPoint() },
      // Set A–B loop OUT point at the current time.
      { keys: ['o'], onMatch: () => setLoopOutPoint() },
      // Clear the A–B loop (the keyboard escape from a looping range).
      { keys: ['u'], onMatch: () => clearLoop() },
      // Collapse / restore the transport bar (cinema mode).
      { keys: ['c'], onMatch: () => toggleBar() },
      // Toggle the keyboard-help panel — moved here from Arena3D alongside its trigger button
      // (now in the transport's right cluster) so both share one state.
      { keys: ['h'], onMatch: () => toggleKeyboardHelp() },
    ],
    [
      handlePlayPause,
      seekBy,
      stepSpeed,
      jumpToEvent,
      frameStep,
      toggleFullscreen,
      setLoopInPoint,
      setLoopOutPoint,
      clearLoop,
      toggleBar,
      toggleKeyboardHelp,
    ],
  );
  useReplayShortcuts(shortcutBindings);

  // The next timeline entry after the loaded fight (continuous-play flow target). Falls back to
  // the first entry starting after the current fight when the fight itself isn't on the timeline
  // (e.g. a deep-linked trash blip below the segment threshold).
  const nextEntry = React.useMemo(() => {
    if (!trialNav) return null;
    return nextEntryAfter(trialNav.timeline, trialNav.currentFightId, selectedFight.startTime);
  }, [trialNav, selectedFight.startTime]);
  // Keep the playback-end handler's view of "what comes next" in lockstep (see nextEntryRef).
  nextEntryRef.current = nextEntry;

  const trialNextUpLabel = nextEntry ? chapterDisplayName(nextEntry.chapter) : null;

  // A trial run exists whenever the shell built trialNav (gated on the UNFILTERED run size).
  // Deliberately NOT gated on the filtered timeline's entry count: turning "Include trash" off
  // in a 1-boss run collapses the timeline to one entry, and gating here unmounted the entire
  // trial cluster — including the very toggle the user just clicked, unrecoverable in fullscreen.
  const hasTrialRun = trialNav != null;

  // Popover portal target — the fullscreen element, so the chapters list survives fullscreen.
  const portalContainer = useCallback(() => replayContainerRef.current, []);

  // The whole-trial layer the transport deck renders (mini-map strip, autoplay, boss skip,
  // chapters popover). Memoized: it changes on fight switches / toggle flips, not playback ticks.
  const transportTrial: TransportTrial | undefined = React.useMemo(() => {
    if (!trialNav) return undefined;
    return {
      timeline: trialNav.timeline,
      currentFightId: trialNav.currentFightId,
      currentFightStartTime: selectedFight.startTime,
      onSeek: handleTrialSeek,
      onDraggingChange: handleTrialDraggingChange,
      autoplayEnabled: trialNav.continuousEnabled,
      onToggleAutoplay: trialNav.onToggleContinuous,
      includeTrash: trialNav.includeTrash,
      onToggleIncludeTrash: trialNav.onToggleIncludeTrash,
      hasTrash: trialNav.hasTrash,
      runName: trialNav.runName,
      runIndex: trialNav.runIndex,
      runCount: trialNav.runCount,
      bossSummary: trialNav.bossSummary,
      prevBoss: trialNav.prevBoss,
      nextBoss: trialNav.nextBoss,
      onSelectChapter: handleSelectChapter,
      portalContainer,
    };
  }, [
    trialNav,
    selectedFight.startTime,
    handleTrialSeek,
    handleTrialDraggingChange,
    handleSelectChapter,
    portalContainer,
  ]);

  // ——— End-of-fight affordances (Up next countdown / Play next / Run complete) ———
  // Driven by the ~500ms currentTime state tick; mounts nothing outside the final seconds.
  const playbackEnded = !isPlaying && duration > 0 && currentTime >= duration - 250;
  const loopActive = loopStart != null && loopEnd != null && Math.abs(loopEnd - loopStart) >= 100;
  useEffect(() => {
    // Re-arm BOTH halves of a cancel when the playhead leaves the tail window: the visible
    // countdown state AND the advance-skip ref handlePlaybackEnd consults. Re-arming only the
    // countdown would show "Up next" again while the stale ref silently swallowed the advance.
    // The threshold is in the SAME speed-scaled real-time units as the countdown's show window
    // (which spans 5000×speed of fight time): comparing raw fight time here meant a Cancel
    // pressed early in the countdown at >1.2× speed was instantly reverted — and then advanced.
    const remainingRealMs = (duration - currentTime) / Math.max(0.25, playbackSpeed);
    if (remainingRealMs > 6000 && countdownCancelled) {
      setCountdownCancelled(false);
      skipNextAdvanceRef.current = false;
    }
  }, [currentTime, duration, playbackSpeed, countdownCancelled]);

  const upNextState: UpNextState | null = React.useMemo(() => {
    if (!hasTrialRun || mobilePreview || trialNav?.isFightDataLoading) return null;
    if (playbackEnded) {
      if (!nextEntry) return { kind: 'run-complete' };
      // Parked at the end with a next fight available → offer it. With autoplay ON this state
      // is only reachable when the advance was cancelled/skipped, so the card is the user's
      // way back in — hiding it left a dead end where Play instantly re-advanced instead.
      return { kind: 'play-next', label: chapterDisplayName(nextEntry.chapter) };
    }
    if (
      trialNav?.continuousEnabled &&
      isPlaying &&
      nextEntry &&
      !loopActive &&
      !countdownCancelled
    ) {
      const remainingRealMs = (duration - currentTime) / Math.max(0.25, playbackSpeed);
      if (remainingRealMs <= 5000 && remainingRealMs > 0) {
        return {
          kind: 'countdown',
          label: chapterDisplayName(nextEntry.chapter),
          secondsLeft: Math.max(1, Math.ceil(remainingRealMs / 1000)),
        };
      }
    }
    return null;
  }, [
    hasTrialRun,
    mobilePreview,
    trialNav?.isFightDataLoading,
    trialNav?.continuousEnabled,
    playbackEnded,
    nextEntry,
    isPlaying,
    loopActive,
    countdownCancelled,
    duration,
    currentTime,
    playbackSpeed,
  ]);

  const handleCancelAdvance = useCallback(() => {
    skipNextAdvanceRef.current = true;
    setCountdownCancelled(true);
  }, []);
  const handlePlayNext = useCallback(() => {
    if (!nextEntry) return;
    // An explicit "play" promise: start on arrival even when the autoplay preference is off.
    forceAutoplayRef.current = true;
    // The countdown's "Now" accelerates an in-flight auto-advance (replace, like auto-advance
    // itself); the parked "Play next" card is a manual jump and should push a history entry.
    const accelerating = trialNavRef.current?.continuousEnabled && isPlaying;
    trialNavRef.current?.onAdvanceToFight(nextEntry.chapter.fightId, {
      replace: accelerating ? undefined : false,
    });
  }, [nextEntry, isPlaying]);
  const handleReplayRun = useCallback(() => {
    const first = trialNavRef.current?.timeline.entries[0];
    if (!first) return;
    if (first.chapter.fightId === trialNavRef.current?.currentFightId) {
      seekTo(0);
      setIsPlaying(true);
    } else {
      forceAutoplayRef.current = true;
      trialNavRef.current?.onAdvanceToFight(first.chapter.fightId, { replace: false });
    }
  }, [seekTo]);

  // ——— Transition overlay + screen-reader announcements ———
  // Hysteresis keeps the "Entering" veil from strobing on instant (cached) fight loads, and
  // holds it long enough to read on fast ones.
  const isFightDataLoadingRaw = trialNav?.isFightDataLoading ?? false;
  const transitionVisible = useDelayedFlag(isFightDataLoadingRaw, {
    showDelayMs: 150,
    minVisibleMs: 450,
  });
  // Permanently-mounted polite live region (mounted empty; text injected after mount so SRs
  // reliably announce fight transitions during continuous play).
  const [announcement, setAnnouncement] = useState('');
  const enteringLabelRef = useRef(trialNav?.enteringLabel ?? null);
  enteringLabelRef.current = trialNav?.enteringLabel ?? null;
  useEffect(() => {
    if (isFightDataLoadingRaw && enteringLabelRef.current) {
      setAnnouncement(`Entering ${enteringLabelRef.current}`);
    }
  }, [isFightDataLoadingRaw]);
  useEffect(() => {
    if (pendingAutoplay && !isFightDataLoading) {
      setAnnouncement(`Now playing ${selectedFight.name ?? 'next fight'}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- announce only on the resume edge
  }, [pendingAutoplay, isFightDataLoading]);

  return (
    // Relative wrapper holds the canvas (Paper) and the playback bar as SIBLINGS so the bar can dock
    // as a bottom overlay over the canvas — the controls stay on screen without scrolling down to play,
    // and the canvas keeps its full height. The bar sits OUTSIDE Paper (Paper has overflow:hidden, which
    // would clip the bar's glow). This wrapper is also the fullscreen target (Item 3): one element to
    // requestFullscreen() and both the canvas and the controls come along. mb:3 lives on the wrapper
    // (moved off Paper) so the spacing below the block is unchanged.
    <Box
      ref={replayContainerRef}
      sx={(theme) => ({
        position: 'relative',
        mb: 3,
        // When fullscreen, the container fills the screen and its inner Paper/canvas fill height
        // (Arena3D swaps ARENA_HEIGHT → 100% via the isFullscreen prop). The control bar stays
        // docked at the bottom of the now-taller canvas, so playback works in fullscreen.
        '&:fullscreen': {
          mb: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          '& > .MuiPaper-root': { height: '100%', borderRadius: 0 },
        },
        // MOBILE pseudo-fullscreen: a position:fixed overlay filling the viewport. This is the iOS
        // path — Safari can't requestFullscreen() a div, so we go fixed + body-locked instead. The
        // ancestor chain has no transform/filter, so `fixed` resolves against the viewport (verified).
        // Safe-area insets keep the close button + transport clear of the notch and home indicator
        // (index.html sets viewport-fit=cover). The same inner Paper/canvas fill-height rules apply.
        ...(mobilePseudoFullscreen
          ? {
              mb: 0,
              position: 'fixed',
              inset: 0,
              zIndex: theme.zIndex.modal,
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
              boxSizing: 'border-box',
              // iOS: the overlay is an app surface, not a document — suppress the OS
              // long-press text-selection/callout that hijacks marker gestures.
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              '& > .MuiPaper-root': { height: '100%', borderRadius: 0 },
            }
          : null),
      })}
    >
      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Suspense
          fallback={
            <Box
              sx={{
                minHeight: 'min(78vh, 640px)',
                display: 'grid',
                placeItems: 'center',
                color: 'text.secondary',
              }}
              role="status"
              aria-label="Loading 3D fight replay"
            >
              Loading 3D replay…
            </Box>
          }
        >
          <Arena3D
            timeRef={animationTimeRef.timeRef}
            isFullscreen={isImmersive}
            onToggleFullscreen={toggleFullscreen}
            isMobile={isMobile}
            showActorNames={showActorNames}
            mapTimeline={mapTimeline}
            scrubbingMode={scrubbingMode}
            followingActorIdRef={followingActorIdRef}
            followingActorId={followingActorId}
            onCameraUnlock={handleCameraUnlock}
            onActorClick={handleActorClick}
            markersState={markersState}
            onAddMarker={onAddMarker}
            onRemoveMarker={onRemoveMarker}
            markersEditMode={markersEditMode}
            onToggleMarkersEditMode={onToggleMarkersEditMode}
            onMarkerMove={onMarkerMove}
            drawTool={drawTool}
            drawStyle={drawStyle}
            onShapeDrawn={onShapeDrawn}
            onSelectDrawTool={onSelectDrawTool}
            onEditMarker={onEditMarker}
            canUndoMarkers={canUndoMarkers}
            onUndoMarkers={onUndoMarkers}
            canRedoMarkers={canRedoMarkers}
            onRedoMarkers={onRedoMarkers}
            fight={selectedFight}
            selectedPlayerIds={selectedPlayerIds}
            onPlayerSelectionChange={setSelectedPlayerIds}
            showPlayerPathsHUD={showPlayerPathsHUD}
            showPlayerTrails={showPlayerTrails}
            onTogglePlayerPathsHUD={togglePlayerPathsHUD}
            onToggleTrails={toggleTrails}
            // Controlled display settings (owned here so the mobile Settings sheet shares the state).
            namesEnabled={namesEnabled}
            onToggleNames={toggleNames}
            qualityPreset={qualityPreset}
            onQualityPresetChange={handleQualityPresetChange}
            autoQualityLevel={autoQualityLevel}
            onQualityLevelChange={handleQualityLevelChange}
            isPlayingRef={isPlayingRef}
            statsPanelEnabled={statsPanelEnabled}
            onToggleStats={toggleStats}
            // Keyboard-help panel — the trigger button lives in the transport's right cluster now
            // (a sibling of Arena3D), so the open/close state is lifted here; Arena3D still renders
            // the panel itself (and the H key, see the big keydown handler above).
            showKeyboardHelp={showKeyboardHelp}
            onCloseKeyboardHelp={closeKeyboardHelp}
            // Single pointer-idle "chrome visible" signal (mirrors barVisible — the same clock that
            // fades the transport in fullscreen cinema mode) so the Following chip and the player
            // list fade in lockstep with the bar instead of running their own independent timers
            // that could drift out of sync with it. Only meaningful in fullscreen: outside it
            // barVisible never flips false, so this is always true in the windowed view.
            chromeVisible={barVisible}
            // On mobile immersive the dedicated shell owns the close + all controls, so suppress
            // Arena3D's in-canvas mobile control cluster (its close + tools button).
            hideMobileControls={mobileImmersive}
            // Reserve space at the bottom so overlays (the player sheet, boss health) clear whatever
            // docks there: the mobile dock (~3 rows ≈ 132px), else the desktop transport band
            // (+ the trial mini-map strip, which adds ~24px to the deck for multi-fight runs).
            reservedInset={
              (mobileImmersive && !barVisible) || (isImmersive && !barVisible)
                ? HAIRLINE_H + 4
                : mobileImmersive
                  ? 132
                  : TRANSPORT_RESERVED + (!isMobile && hasTrialRun ? 24 : 0)
            }
          />
        </Suspense>
      </Paper>

      {/* Continuous-play transition — covers the brief reload + collapsed travel gap while the next
          fight loads, keeping fullscreen intact (it renders inside this persistent container).
          Hysteresis (useDelayedFlag) keeps it from strobing on instant cached loads. */}
      <ReplayTransitionOverlay
        visible={transitionVisible}
        label={trialNav?.enteringLabel ?? null}
      />

      {/* Screen-reader narration of continuous play — mounted empty, text injected on fight
          transitions ("Entering X" / "Now playing X") so the announcements actually fire. */}
      <Box component="span" sx={visuallyHidden} role="status" aria-live="polite">
        {announcement}
      </Box>

      {/* End-of-fight affordances: Up-next countdown (with Cancel), Play-next when autoplay is
          off, Run-complete at the end of the run. Sits above the transport, inside the
          persistent container so it survives fullscreen. */}
      {upNextState && (
        <UpNextCard
          state={upNextState}
          onCancel={handleCancelAdvance}
          onPlayNext={handlePlayNext}
          onReplayRun={handleReplayRun}
          bottomInset={
            // Mobile: the dock's real height is its content + env(safe-area-inset-bottom), so
            // the card's inset must carry the same term or the dock paints over Cancel/Now on
            // home-indicator phones.
            mobileImmersive
              ? 'calc(148px + env(safe-area-inset-bottom))'
              : TRANSPORT_RESERVED + (!isMobile && hasTrialRun ? 32 : 8)
          }
        />
      )}

      {/* Playback controls — docked as a translucent overlay at the bottom of the canvas. The outer
          Box is a positioning frame only (pointer-events:none) so its transparent area never steals
          OrbitControls drags / actor clicks from the canvas beneath; PlaybackControls re-enables
          pointer-events on its own glass surface. Hidden in the mobile inline preview — the teaser has
          no transport; it returns inside the pseudo-fullscreen interactive mode. */}
      {/* Mobile shell — TOP BAR: encounter context on the left, close on the right. A slim, solid
          strip so it never competes with the arena; boss health renders just below it (Arena3D). */}
      {mobileImmersive && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 1.25,
            pt: 'calc(env(safe-area-inset-top) + 8px)',
            pb: 1.5,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 100%)',
            // Tap-to-toggle chrome: fades with the dock (opacity only — a transform here would
            // become the containing block for the dock's fixed-position sheets).
            opacity: barVisible ? 1 : 0,
            transition: `opacity ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
            pointerEvents: 'none',
            '& > *': { pointerEvents: barVisible ? 'auto' : 'none' },
          }}
        >
          <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{
                color: '#fff',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                minWidth: 0,
              }}
            >
              {selectedFight.maps?.[0]?.name || selectedFight.name}
            </Typography>
            {replayContext?.difficultyTag && (
              <Box
                component="span"
                sx={(theme) => ({
                  flex: '0 0 auto',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: theme.palette.secondary.light,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.22),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                })}
              >
                {replayContext.difficultyTag}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: '0 0 auto' }}>
            {/* Following an actor (tap-to-lock the camera) — the only way to release it on the shell,
                since the old in-canvas tools cluster is suppressed on mobile. */}
            {followingActorId != null && (
              <Box
                component="button"
                type="button"
                onClick={handleCameraUnlock}
                aria-label="Stop following"
                sx={(theme) => ({
                  appearance: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  height: 44,
                  px: 1.5,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.7),
                  // Solid fill (no backdrop blur) — a blur layer over the animating canvas is a real
                  // iOS compositing cost for a control this small.
                  backgroundColor: 'rgba(8,11,20,0.86)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                })}
              >
                Following ✕
              </Box>
            )}
            <IconButton
              aria-label="Close replay"
              onClick={toggleFullscreen}
              sx={{
                color: '#fff',
                width: 44,
                height: 44,
                backgroundColor: 'rgba(8,11,20,0.86)',
                border: '1px solid rgba(255,255,255,0.14)',
                '&:hover': { backgroundColor: 'rgba(8,11,20,0.95)' },
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Mobile shell — BOTTOM DOCK: scrub rail + play cluster + Players/Chapters/Settings sheets.
          Replaces the desktop transport + the floating trial chip + the tools button entirely.
          Fades with the tap-to-toggle chrome (opacity only — NO transform, the sheets inside are
          position:fixed and a transformed ancestor would become their containing block). */}
      {/* Chrome hidden (auto-hide while playing): two persistent affordances so the user is never
          stranded — the cinema-tap-anywhere reveal isn't discoverable on its own (field-reported as
          "no way to bring the controls back"). A bottom restore handle (carries the progress
          hairline) reveals the dock, and a top-right Close always offers a way out of the overlay. */}
      {mobileImmersive && !barVisible && (
        <>
          <Box
            component="button"
            type="button"
            aria-label="Show playback controls"
            onClick={toggleBar}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 7,
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              p: 0,
              m: 0,
              height: 'calc(28px + env(safe-area-inset-bottom))',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              pt: '4px',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <KeyboardArrowUpRoundedIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.82)' }} />
            <ProgressHairline timeRef={animationTimeRef.timeRef} duration={duration} />
          </Box>
          <IconButton
            aria-label="Close replay"
            onClick={toggleFullscreen}
            sx={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top) + 8px)',
              right: 12,
              zIndex: 7,
              color: '#fff',
              width: 44,
              height: 44,
              backgroundColor: 'rgba(8,11,20,0.86)',
              border: '1px solid rgba(255,255,255,0.14)',
              '&:hover': { backgroundColor: 'rgba(8,11,20,0.95)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </>
      )}
      {mobileImmersive && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 6,
            opacity: barVisible ? 1 : 0,
            transition: `opacity ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
            pointerEvents: barVisible ? 'auto' : 'none',
          }}
        >
          <MobileReplayDock
            duration={selectedFight.endTime - selectedFight.startTime}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onSkipToStart={handleSkipToStart}
            onSkipToEnd={handleSkipToEnd}
            onSkipBackward10={handleSkipBackward10}
            onSkipForward10={handleSkipForward10}
            onPlayingChange={handlePlayingChange}
            onScrubbingModeChange={handleScrubbingModeChange}
            onDraggingChange={handleDraggingChange}
            timeRef={animationTimeRef.timeRef}
            reportId={params.reportId}
            fightId={params.fightId}
            selectedActorIdRef={followingActorIdRef}
            trialNav={trialNav}
            onTrialSeek={handleTrialSeek}
            onChapterSelect={handleSelectChapter}
            currentFightStartTime={selectedFight.startTime}
            trialNextUpLabel={trialNextUpLabel}
            playersOpen={showPlayerPathsHUD}
            onTogglePlayers={togglePlayerPathsHUD}
            showTrails={showPlayerTrails}
            onToggleTrails={toggleTrails}
            namesEnabled={namesEnabled}
            onToggleNames={toggleNames}
            qualityPreset={qualityPreset}
            onQualityPresetChange={handleQualityPresetChange}
            statsPanelEnabled={statsPanelEnabled}
            onToggleStats={toggleStats}
            following={followingActorId != null}
            onSheetOpenChange={setMobileSheetOpen}
            markersEditMode={markersEditMode}
            onToggleMarkersEditMode={onToggleMarkersEditMode}
            onAddMarkerAtCenter={onAddMarker ? handleAddMarkerAtCenter : undefined}
            canUndoMarkers={canUndoMarkers}
            onUndoMarkers={onUndoMarkers}
            canRedoMarkers={canRedoMarkers}
            onRedoMarkers={onRedoMarkers}
            drawTool={drawTool}
            drawStyle={drawStyle}
            onSelectDrawTool={onSelectDrawTool}
            onDrawStyleChange={onDrawStyleChange}
            shapeCount={shapeCount}
            onClearShapes={onClearShapes}
            onOpenMarkersManager={onOpenMarkersManager}
          />
        </Box>
      )}

      {!mobileImmersive && !mobilePreview && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            '& > *': { pointerEvents: 'auto' },
          }}
        >
          <PlaybackControls
            duration={selectedFight.endTime - selectedFight.startTime}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onSkipToStart={handleSkipToStart}
            onSkipToEnd={handleSkipToEnd}
            onSkipBackward10={handleSkipBackward10}
            onSkipForward10={handleSkipForward10}
            onPlayingChange={handlePlayingChange}
            onScrubbingModeChange={handleScrubbingModeChange}
            onDraggingChange={handleDraggingChange}
            timeRef={animationTimeRef.timeRef}
            reportId={params.reportId}
            fightId={params.fightId}
            selectedActorIdRef={followingActorIdRef}
            fightStartTime={selectedFight.startTime}
            replayContext={replayContext}
            loopStart={loopStart}
            loopEnd={loopEnd}
            onClearLoop={clearLoop}
            isFullscreen={isImmersive}
            barVisible={barVisible}
            onToggleCollapse={toggleBar}
            overlay
            isMobile={isMobile}
            trial={transportTrial}
            // Display settings — consolidated into the settings popover in the right cluster
            // (name tags always, player stats only while following someone; mirrors the old
            // floating-button visibility rule). Same state Arena3D consumes as controlled props,
            // so the transport and the in-canvas/keyboard toggles never drift out of sync.
            namesEnabled={namesEnabled}
            onToggleNames={toggleNames}
            qualityPreset={qualityPreset}
            onQualityPresetChange={handleQualityPresetChange}
            statsPanelEnabled={statsPanelEnabled}
            onToggleStats={toggleStats}
            following={followingActorId != null}
            showKeyboardHelp={showKeyboardHelp}
            onToggleKeyboardHelp={toggleKeyboardHelp}
            onToggleFullscreen={toggleFullscreen}
            portalContainer={portalContainer}
          />
        </Box>
      )}
    </Box>
  );
};
