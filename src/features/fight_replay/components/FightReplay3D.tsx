import { Paper } from '@mui/material';
import React, { useCallback, useRef, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';

import { FightFragment } from '../../../graphql/generated';
import { usePhaseBasedMap } from '../../../hooks/usePhaseBasedMap';
import { BuffEvent } from '../../../types/combatlogEvents';

import { Arena3D } from './Arena3D';
import { PlaybackControls } from './PlaybackControls';

import { useAnimationTimeRef } from '@/hooks/useAnimationTimeRef';
import { usePlaybackAnimation } from '@/hooks/usePlaybackAnimation';
import { useScrubbingMode } from '@/hooks/useScrubbingMode';

interface FightReplay3DProps {
  selectedFight: FightFragment;
  allBuffEvents: BuffEvent[];
  showActorNames?: boolean;
}

export const FightReplay3D: React.FC<FightReplay3DProps> = ({
  selectedFight,
  allBuffEvents,
  showActorNames = true,
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

  // Playback state - initialize with URL parameter if available
  const [currentTime, setCurrentTime] = useState(initialTime);
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

  const handleTimeChange = useCallback(
    (time: number) => {
      const clampedTime = Math.max(
        0,
        Math.min(time, selectedFight.endTime - selectedFight.startTime),
      );
      setCurrentTime(clampedTime);
      animationTimeRef.setTime(clampedTime);
    },
    [selectedFight, animationTimeRef],
  );

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleSkipToStart = useCallback(() => {
    setCurrentTime(0);
    animationTimeRef.setTime(0);
  }, [animationTimeRef]);

  const handleSkipToEnd = useCallback(() => {
    setCurrentTime(selectedFight.endTime - selectedFight.startTime);
    animationTimeRef.setTime(selectedFight.endTime - selectedFight.startTime);
  }, [selectedFight, animationTimeRef]);

  const handleSkipBackward10 = useCallback(() => {
    const newTime = Math.max(0, currentTime - 10000);
    setCurrentTime(newTime);
    animationTimeRef.setTime(newTime);
  }, [currentTime, animationTimeRef]);

  const handleSkipForward10 = useCallback(() => {
    const newTime = Math.min(selectedFight.endTime - selectedFight.startTime, currentTime + 10000);
    setCurrentTime(newTime);
    animationTimeRef.setTime(newTime);
  }, [selectedFight, currentTime, animationTimeRef]);

  const handleActorClick = useCallback((actorId: number) => {
    // Set camera to follow the clicked actor
    followingActorIdRef.current = actorId;
  }, []);

  const handleCameraUnlock = useCallback(() => {
    // Stop following any actor
    followingActorIdRef.current = null;
  }, []);

  return (
    <React.Fragment>
      <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
        <Arena3D
          timeRef={animationTimeRef.timeRef}
          showActorNames={showActorNames}
          mapTimeline={mapTimeline}
          scrubbingMode={scrubbingMode}
          followingActorIdRef={followingActorIdRef}
          onCameraUnlock={handleCameraUnlock}
          onActorClick={handleActorClick}
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
