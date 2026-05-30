import { Paper } from '@mui/material';
import { invalidate } from '@react-three/fiber';
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

  // Actor selection and camera following state
  // null = no actor selected/following, number = following that actor ID
  const followingActorIdRef = useRef<number | null>(initialSelectedActorId);

  // Player path visualization state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(
    new Set(initialSelectedPlayerIds),
  );
  const [showPlayerPathsHUD, setShowPlayerPathsHUD] = useState(showPlayerPaths);
  const [showPlayerTrails, setShowPlayerTrails] = useState(showPlayerPaths);

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

  // Seek/skip/scrub mutate timeRef directly, which bypasses React. In demand mode
  // (paused) the scene won't redraw on its own, so request a frame after each jump.
  const seekTo = useCallback(
    (time: number) => {
      setCurrentTime(time);
      animationTimeRef.setTime(time);
      invalidate();
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

  const handleActorClick = useCallback((actorId: number) => {
    // Set camera to follow the clicked actor. The ref write bypasses React, so
    // request a frame for the camera to reposition while paused (demand mode).
    followingActorIdRef.current = actorId;
    invalidate();
  }, []);

  const handleCameraUnlock = useCallback(() => {
    // Stop following any actor
    followingActorIdRef.current = null;
    invalidate();
  }, []);

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
    <React.Fragment>
      <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
        <Arena3D
          timeRef={animationTimeRef.timeRef}
          isPlaying={isPlaying}
          showActorNames={showActorNames}
          mapTimeline={mapTimeline}
          scrubbingMode={scrubbingMode}
          followingActorIdRef={followingActorIdRef}
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
      {/* Playback Controls */}
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
      />
    </React.Fragment>
  );
};
