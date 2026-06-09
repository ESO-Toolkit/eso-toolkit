import { Box, Paper } from '@mui/material';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';

import { useAnimationTimeRef } from '@/hooks/useAnimationTimeRef';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { useScrubbingMode } from '@/hooks/useScrubbingMode';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePhaseBasedMap } from '../../../hooks/usePhaseBasedMap';
import { useReplayPrefs } from '../../../hooks/useReplayPrefs';
import { useTimelineMarkers } from '../../../hooks/useTimelineMarkers';
import { BuffEvent } from '../../../types/combatlogEvents';
import { TRANSPORT_IDLE_MS, TRANSPORT_RESERVED, HAIRLINE_H } from '../constants/replayDesign';
import { useIsMobileReplay } from '../hooks/useIsMobileReplay';
import { MapMarkersState } from '../types/mapMarkers';
import { lockDocumentSelection } from '../utils/documentSelectionLock';
import { clampReplayTime } from '../utils/replayTime';

import { Arena3D } from './Arena3D';
import { PlaybackControls, PLAYBACK_SPEEDS } from './PlaybackControls';

// Frame-step increment for the ,/. keys. The raw position sample interval (~4.7ms at 240Hz) is
// imperceptible as a step, so we nudge by a usable 100ms — one React-state sync tick — which lets
// an analyst inch through a moment frame-by-frame. Distinct from the ±1s arrow seek (Item 5).
const FRAME_STEP_MS = 100;

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
  /** Opens the marker edit dialog (owned by FightReplay) for the given marker. */
  onEditMarker?: (markerId: string) => void;
  /** Marker undo for the mobile tools sheet (Ctrl+Z has no touch equivalent). */
  canUndoMarkers?: boolean;
  onUndoMarkers?: () => void;
  /** Whether to show player paths toolkit */
  showPlayerPaths?: boolean;
  /** Initial selected player IDs for path visualization */
  initialSelectedPlayerIds?: number[];
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
  onEditMarker,
  canUndoMarkers = false,
  onUndoMarkers,
  showPlayerPaths = false,
  initialSelectedPlayerIds = [],
}) => {
  // Parse URL parameters for actor initialization
  const [searchParams] = useSearchParams();
  const params = useParams();
  const actorParam = searchParams.get('actorId');

  let initialSelectedActorId: number | null = null;
  if (actorParam !== null) {
    const parsedActorId = Number(actorParam);
    if (!isNaN(parsedActorId)) {
      initialSelectedActorId = parsedActorId;
    }
  }

  // Actor selection and camera following state.
  // null = no actor selected/following, number = following that actor ID.
  //
  // The ref is the synchronous source of truth read every frame by CameraFollower's
  // useFrame loop and by KeyboardCameraControls. `followingActorId` mirrors it as React
  // state purely so UI (the "Following:" chip) can react to changes. The two are always
  // written together via setFollowingActor below — no polling needed.
  const followingActorIdRef = useRef<number | null>(initialSelectedActorId);
  const [followingActorId, setFollowingActorId] = useState<number | null>(initialSelectedActorId);

  // Wrapper around the canvas + the docked control bar. Used as the fullscreen target (Item 3) so one
  // requestFullscreen() takes the whole replay block (3D view, overlays, and the controls) at once.
  const replayContainerRef = useRef<HTMLDivElement>(null);

  // Single mutation point that keeps the ref (read by the render loop) and the state
  // (read by the UI) in lockstep.
  const setFollowingActor = useCallback((actorId: number | null) => {
    followingActorIdRef.current = actorId;
    setFollowingActorId(actorId);
  }, []);

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
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPrefs.playbackSpeed);
  const [isScrubbingMode, setIsScrubbingMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // A–B loop in/out points (ms into the fight), set with i/o. Raw (unordered); the playback hook
  // normalizes lo/hi. Both set + a sane span → playback wraps within [A,B] until the chip clears.
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);

  // Transport bar visibility (cinema model). Master state for the compact bar:
  //  - windowed: stays visible unless the user manually collapses it (C / chevron).
  //  - fullscreen: auto-hides after idle (TRANSPORT_IDLE_MS) behind a progress hairline and
  //    reveals on pointer activity; C still toggles manually.
  // Seeded from the persisted barCollapsed pref so a user who prefers the collapsed cinema state
  // keeps it across reloads.
  const [barVisible, setBarVisible] = useState(!storedPrefs.barCollapsed);

  // High-performance time reference for 3D updates
  const animationTimeRef = useAnimationTimeRef({
    initialTime: currentTime,
    onTimeUpdate: setCurrentTime,
    updateInterval: 500, // Update React state every 500ms
  });

  // Playback animation for smooth time updates
  usePlaybackAnimation({
    timeRef: animationTimeRef.timeRef,
    isPlaying,
    playbackSpeed,
    duration: selectedFight.endTime - selectedFight.startTime,
    onTimeUpdate: setCurrentTime,
    onEnd: () => setIsPlaying(false),
    loopStart,
    loopEnd,
  });

  // Scrubbing mode optimization
  const scrubbingMode = useScrubbingMode({
    isScrubbingMode,
    isDragging,
  });

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleScrubbingModeChange = useCallback((scrubbing: boolean) => {
    setIsScrubbingMode(scrubbing);
  }, []);

  const handleDraggingChange = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      setCurrentTime(time);
      animationTimeRef.setTime(time);
    },
    [animationTimeRef],
  );

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

  const handleSkipBackward10 = useCallback(() => {
    seekTo(Math.max(0, currentTime - 10000));
  }, [currentTime, seekTo]);

  const handleSkipForward10 = useCallback(() => {
    seekTo(Math.min(selectedFight.endTime - selectedFight.startTime, currentTime + 10000));
  }, [selectedFight, currentTime, seekTo]);

  // Fight duration in ms — the upper bound every keyboard seek clamps to.
  const duration = selectedFight.endTime - selectedFight.startTime;

  // Relative seek that always reads the live time from the high-frequency ref (not the ~2Hz
  // currentTime state), so rapid arrow taps compound correctly instead of snapping back to a
  // stale React value. Clamped to [0, duration].
  const seekBy = useCallback(
    (deltaMs: number) => {
      const base = animationTimeRef.timeRef.current ?? currentTime;
      seekTo(Math.max(0, Math.min(duration, base + deltaMs)));
    },
    [animationTimeRef.timeRef, currentTime, duration, seekTo],
  );

  // +/- step through the same discrete speed ladder the on-screen SpeedSelector uses.
  const stepSpeed = useCallback(
    (direction: 1 | -1) => {
      const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
      // If the current speed isn't on the ladder (shouldn't happen), fall back to 1x's slot.
      const currentIdx = idx === -1 ? PLAYBACK_SPEEDS.indexOf(1) : idx;
      const nextIdx = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIdx + direction));
      setPlaybackSpeed(PLAYBACK_SPEEDS[nextIdx]);
    },
    [playbackSpeed],
  );

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
      const now = animationTimeRef.timeRef.current ?? currentTime;
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
    [markers, animationTimeRef.timeRef, currentTime, duration, seekTo],
  );

  // A–B loop: set the in/out point to the LIVE playhead (ref, not the lagged currentTime state).
  const setLoopInPoint = useCallback(() => {
    const t = animationTimeRef.timeRef.current ?? currentTime;
    setLoopStart(Math.max(0, Math.min(duration, t)));
  }, [animationTimeRef.timeRef, currentTime, duration]);

  const setLoopOutPoint = useCallback(() => {
    const t = animationTimeRef.timeRef.current ?? currentTime;
    setLoopEnd(Math.max(0, Math.min(duration, t)));
  }, [animationTimeRef.timeRef, currentTime, duration]);

  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
  }, []);

  const handleActorClick = useCallback(
    (actorId: number) => {
      // Set camera to follow the clicked actor
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
  useEffect(() => {
    persistPrefs(
      isMobile
        ? { playbackSpeed }
        : {
            playbackSpeed,
            showPlayerPaths: showPlayerPathsHUD,
            showTrails: showPlayerTrails,
            barCollapsed: !barVisible,
          },
    );
  }, [persistPrefs, isMobile, playbackSpeed, showPlayerPathsHUD, showPlayerTrails, barVisible]);

  // Manual collapse toggle (C key + the bar's chevron / restore caret). Works in any mode.
  const toggleBar = useCallback(() => setBarVisible((v) => !v), []);

  // Stable toggles for the mobile control cluster (mirror the P / T keyboard shortcuts). Memoized so
  // they don't break Arena3D's React.memo on every render.
  const togglePlayerPathsHUD = useCallback(() => setShowPlayerPathsHUD((prev) => !prev), []);
  const toggleTrails = useCallback(() => setShowPlayerTrails((prev) => !prev), []);

  // Fullscreen cinema auto-hide. Two halves:
  //  1. Reveal on pointer/touch activity over the OUTER container (replayContainerRef — it is
  //     pointer-events:auto; the inner positioning frame is pointer-events:none so a listener
  //     there would never fire). Only meaningful in fullscreen.
  //  2. An idle timer that hides the bar after TRANSPORT_IDLE_MS, re-armed on every reveal, and
  //     guarded so it never hides mid-scrub/drag.
  const idleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isImmersive) return;
    const el = replayContainerRef.current;
    if (!el) return;

    const armIdle = (): void => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        // Never hide while the user is actively scrubbing/dragging the timeline.
        if (isDragging || isScrubbingMode) {
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

    // Passive listeners (never preventDefault) so canvas pinch/OrbitControls are untouched.
    el.addEventListener('pointermove', reveal, { passive: true });
    el.addEventListener('touchstart', reveal, { passive: true });
    el.addEventListener('touchmove', reveal, { passive: true });
    armIdle(); // start the clock on entering fullscreen
    return () => {
      el.removeEventListener('pointermove', reveal);
      el.removeEventListener('touchstart', reveal);
      el.removeEventListener('touchmove', reveal);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [isImmersive, isDragging, isScrubbingMode]);

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
  // the three.js camera handle; H/N live in Arena3D. This handler owns everything that mutates
  // FightReplay3D's playback state.
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      // Don't interfere with text input.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Never shadow OS/browser chords (Ctrl/⌘ + key — e.g. Ctrl+= / Ctrl+- page zoom, Ctrl+F
      // find). Our single-key shortcuts must not fire on a modified press, and we must not
      // preventDefault() those combos. (Shift+arrows for ±10s is intentional and handled below.)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Raw key (preserves symbols/arrows/case); the toggle switch below lowercases letters.
      const { key } = event;

      // Symbol + arrow shortcuts that .toLowerCase() can't normalize.
      switch (key) {
        case ' ': // Space — play/pause. But never hijack Space from a focused button: Space is the
          // native activation key for buttons, so toggling + preventDefault() here would break
          // keyboard activation of Import/Load markers, Share, collapse, fullscreen, etc. Let the
          // button handle its own Space; the canvas/transport background still toggles playback.
          if (event.target instanceof HTMLButtonElement) {
            return;
          }
          handlePlayPause();
          event.preventDefault();
          return;
        case 'ArrowLeft':
          seekBy(event.shiftKey ? -10000 : -1000);
          event.preventDefault();
          return;
        case 'ArrowRight':
          seekBy(event.shiftKey ? 10000 : 1000);
          event.preventDefault();
          return;
        case '+':
        case '=': // unshifted '+' on most layouts
          stepSpeed(1);
          event.preventDefault();
          return;
        case '-':
          stepSpeed(-1);
          event.preventDefault();
          return;
        case '<': // Shift+, → jump to previous key event
          jumpToEvent(-1);
          event.preventDefault();
          return;
        case '>': // Shift+. → jump to next key event
          jumpToEvent(1);
          event.preventDefault();
          return;
        case ',': // frame-step backward (one small visible step)
          frameStep(-1);
          event.preventDefault();
          return;
        case '.': // frame-step forward
          frameStep(1);
          event.preventDefault();
          return;
      }

      switch (key.toLowerCase()) {
        case 'p': // Toggle player paths HUD
          setShowPlayerPathsHUD((prev) => !prev);
          event.preventDefault();
          break;
        case 't': // Toggle player trails
          setShowPlayerTrails((prev) => !prev);
          event.preventDefault();
          break;
        case 'f': // Toggle fullscreen of the replay block
          toggleFullscreen();
          event.preventDefault();
          break;
        case 'i': // Set A–B loop IN point at the current time
          setLoopInPoint();
          event.preventDefault();
          break;
        case 'o': // Set A–B loop OUT point at the current time
          setLoopOutPoint();
          event.preventDefault();
          break;
        case 'c': // Collapse / restore the transport bar (cinema mode)
          toggleBar();
          event.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    toggleFullscreen,
    handlePlayPause,
    seekBy,
    stepSpeed,
    frameStep,
    jumpToEvent,
    setLoopInPoint,
    setLoopOutPoint,
    toggleBar,
  ]);

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
          onEditMarker={onEditMarker}
          canUndoMarkers={canUndoMarkers}
          onUndoMarkers={onUndoMarkers}
          fight={selectedFight}
          selectedPlayerIds={selectedPlayerIds}
          onPlayerSelectionChange={setSelectedPlayerIds}
          showPlayerPathsHUD={showPlayerPathsHUD}
          showPlayerTrails={showPlayerTrails}
          onTogglePlayerPathsHUD={togglePlayerPathsHUD}
          onToggleTrails={toggleTrails}
          // When the bar is hidden in fullscreen, only the hairline occludes the bottom, so the
          // overlay panels can grow nearly full-height; otherwise reserve the full bar band.
          reservedInset={isImmersive && !barVisible ? HAIRLINE_H + 4 : TRANSPORT_RESERVED}
        />
      </Paper>
      {/* Playback controls — docked as a translucent overlay at the bottom of the canvas. The outer
          Box is a positioning frame only (pointer-events:none) so its transparent area never steals
          OrbitControls drags / actor clicks from the canvas beneath; PlaybackControls re-enables
          pointer-events on its own glass surface. Hidden in the mobile inline preview — the teaser has
          no transport; it returns inside the pseudo-fullscreen interactive mode. */}
      {!mobilePreview && (
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
            currentTime={currentTime}
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
            progressPct={
              selectedFight.endTime > selectedFight.startTime
                ? (currentTime / (selectedFight.endTime - selectedFight.startTime)) * 100
                : 0
            }
            overlay
          />
        </Box>
      )}
    </Box>
  );
};
