import { Box, Paper } from '@mui/material';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';

import { useAnimationTimeRef } from '@/hooks/useAnimationTimeRef';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { useScrubbingMode } from '@/hooks/useScrubbingMode';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePhaseBasedMap } from '../../../hooks/usePhaseBasedMap';
import { BuffEvent } from '../../../types/combatlogEvents';
import { MapMarkersState } from '../types/mapMarkers';
import { clampReplayTime } from '../utils/replayTime';

import { Arena3D } from './Arena3D';
import { PlaybackControls } from './PlaybackControls';

interface FightReplay3DProps {
  selectedFight: FightFragment;
  allBuffEvents: BuffEvent[];
  showActorNames?: boolean;
  markersState?: MapMarkersState | null;
  onAddMarker?: (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => void;
  onRemoveMarker?: (markerId: string) => void;
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

  // Player path visualization state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(
    new Set(initialSelectedPlayerIds),
  );
  const [showPlayerPathsHUD, setShowPlayerPathsHUD] = useState(showPlayerPaths);
  const [showPlayerTrails, setShowPlayerTrails] = useState(showPlayerPaths);

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isScrubbingMode, setIsScrubbingMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  // Keyboard shortcuts for player path features
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      // Don't interfere with text input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'p': // Toggle player paths HUD
          setShowPlayerPathsHUD((prev) => !prev);
          event.preventDefault();
          break;
        case 't': // Toggle player trails
          setShowPlayerTrails((prev) => !prev);
          event.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    // Relative wrapper holds the canvas (Paper) and the playback bar as SIBLINGS so the bar can dock
    // as a bottom overlay over the canvas — the controls stay on screen without scrolling down to play,
    // and the canvas keeps its full height. The bar sits OUTSIDE Paper (Paper has overflow:hidden, which
    // would clip the bar's glow). This wrapper is also the fullscreen target (Item 3): one element to
    // requestFullscreen() and both the canvas and the controls come along. mb:3 lives on the wrapper
    // (moved off Paper) so the spacing below the block is unchanged.
    <Box ref={replayContainerRef} sx={{ position: 'relative', mb: 3 }}>
      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <Arena3D
          timeRef={animationTimeRef.timeRef}
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
          fight={selectedFight}
          selectedPlayerIds={selectedPlayerIds}
          onPlayerSelectionChange={setSelectedPlayerIds}
          showPlayerPathsHUD={showPlayerPathsHUD}
          showPlayerTrails={showPlayerTrails}
        />
      </Paper>
      {/* Playback controls — docked as a translucent overlay at the bottom of the canvas. The outer
          Box is a positioning frame only (pointer-events:none) so its transparent area never steals
          OrbitControls drags / actor clicks from the canvas beneath; PlaybackControls re-enables
          pointer-events on its own glass surface. */}
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
          overlay
        />
      </Box>
    </Box>
  );
};
