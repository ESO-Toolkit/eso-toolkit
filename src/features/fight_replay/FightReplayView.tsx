import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Speed,
  Replay,
  Visibility,
  ExpandLess,
  ExpandMore,
  TextFields,
  Share,
  CenterFocusStrong,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import { CombatArena } from '../../components/LazyCombatArena';
import { FightFragment } from '../../graphql/generated';
import { useDamageEvents } from '../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../hooks/events/useHealingEvents';
import { useCurrentFight } from '../../hooks/useCurrentFight';
import { useActorPositionsAtTime } from '../../hooks/workerTasks/useActorPositionsAtTime';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { RootState } from '../../store/storeWithHistory';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  LogEvent,
  ResourceChangeEvent,
} from '../../types/combatlogEvents';
import { resolveActorName } from '../../utils/resolveActorName';

import { ActorCard } from './components/ActorCard';

// Local utility function for formatting duration
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Local utility function for formatting absolute timestamp
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  // Use milliseconds formatting for better precision
  const timeStr = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = (timestamp % 1000).toString().padStart(3, '0');
  return `${timeStr}.${ms}`;
};

interface FightReplayViewProps {
  fight?: FightFragment;
  fightsLoading: boolean;
  events?: {
    damage: DamageEvent[];
    heal: HealEvent[];
    death: DeathEvent[];
    resource: ResourceChangeEvent[];
  };
  eventsLoading: boolean;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  reportMasterData?: RootState['masterData'];
}

interface TimelineEvent {
  timestamp: number;
  type: 'damage' | 'heal' | 'death' | 'cast' | 'buff' | 'debuff';
  event: LogEvent;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

// Optimized refresh rate configuration for smooth rendering
const RENDER_FRAME_INTERVAL = 16.67; // 60Hz rendering (16.67ms intervals) - much more reasonable

export const FightReplayView: React.FC<FightReplayViewProps> = ({
  fight,
  fightsLoading,
  events,
  eventsLoading,
  playersById,
  reportMasterData,
}) => {
  const location = useLocation();
  const params = useParams();

  // Get data from hooks (fallback if not provided as props)
  const fightFromHook = useCurrentFight();
  const { damageEvents } = useDamageEvents();
  const { healingEvents } = useHealingEvents();
  const { deathEvents } = useDeathEvents();

  // Use props if provided, otherwise use data from hooks
  const activeFight = fight || fightFromHook;
  const activeEvents = useMemo(() => {
    return (
      events ||
      (damageEvents && healingEvents && deathEvents
        ? {
            damage: damageEvents,
            heal: healingEvents,
            death: deathEvents,
            resource: [], // We could add useResourceEvents if needed for timeline
          }
        : null)
    );
  }, [events, damageEvents, healingEvents, deathEvents]);

  // Parse URL parameters for initial state
  const urlParams = useMemo(() => {
    if (!location?.search) {
      return { actorId: undefined, timestamp: undefined };
    }

    const searchParams = new URLSearchParams(location.search);

    const actorIdStr = searchParams.get('actorId');
    const actorId = actorIdStr ? parseInt(actorIdStr, 10) : undefined;

    const timestampStr = searchParams.get('time');
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : undefined;

    return {
      actorId,
      timestamp,
    };
  }, [location?.search]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(
    urlParams.timestamp || (activeFight ? activeFight.startTime : 0),
  );
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedIndex, setSpeedIndex] = useState(2); // Index for 1x speed
  const [selectedActorId, setSelectedActorId] = useState<number | undefined>(urlParams.actorId);
  const [isActorPanelExpanded, setIsActorPanelExpanded] = useState(false);
  const [showActorNames, setShowActorNames] = useState(true);
  const [showShareSnackbar, setShowShareSnackbar] = useState(false);
  const [hiddenActorIds, setHiddenActorIds] = useState<Set<number>>(new Set());
  const [cameraLockedActorId, setCameraLockedActorId] = useState<number | undefined>();

  // Use refs to avoid recreating animation loop on every currentTimestamp change
  const currentTimestampRef = useRef(currentTimestamp);
  const isPlayingRef = useRef(isPlaying);
  const playbackSpeedRef = useRef(playbackSpeed);

  // Keep refs in sync
  useEffect(() => {
    currentTimestampRef.current = currentTimestamp;
  }, [currentTimestamp]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Update currentTimestamp when activeFight changes to prevent invalid calculations
  useEffect(() => {
    if (activeFight) {
      // If we have a URL timestamp and it's within the fight range, use it
      if (
        urlParams.timestamp &&
        urlParams.timestamp >= activeFight.startTime &&
        urlParams.timestamp <= activeFight.endTime
      ) {
        setCurrentTimestamp(urlParams.timestamp);
      } else {
        // Otherwise, start at the beginning of the fight
        setCurrentTimestamp(activeFight.startTime);
      }
    }
  }, [activeFight, urlParams.timestamp]);

  const [visibleEventTypes, setVisibleEventTypes] = useState({
    damage: true,
    heal: true,
    death: true,
    cast: true,
    buff: true,
    debuff: true,
  });

  // Use standard event hooks that automatically load data into Redux
  // Note: These are now loaded in the parent FightReplay component

  // Combine events into the format expected by useActorPositions
  // Note: Events are now passed as props from parent component
  // Throttle actor position updates to match UI refresh rate (60Hz)
  const throttledCurrentTimestamp = useMemo(() => {
    // Round to nearest ~16.67ms (60Hz) to match UI refresh rate
    return Math.floor(currentTimestamp / RENDER_FRAME_INTERVAL) * RENDER_FRAME_INTERVAL;
  }, [currentTimestamp]);

  // Convert throttled timestamp to fight-relative time for the actor positions hook
  const throttledCurrentTime = useMemo(() => {
    return activeFight ? throttledCurrentTimestamp - activeFight.startTime : 0;
  }, [throttledCurrentTimestamp, activeFight]);

  // Get actor positions timeline
  const { timeline, isActorPositionsLoading } = useActorPositionsTask();

  // Extract actors at the current time from the timeline
  const { actors } = useActorPositionsAtTime({
    timeline,
    currentTime: throttledCurrentTime,
  });

  // Filter actors for 3D display (exclude hidden actors)
  const visibleActors = useMemo(() => {
    return actors.filter((actor) => !hiddenActorIds.has(actor.id));
  }, [actors, hiddenActorIds]);

  // No filtering - display all actors who have positions at the current timestamp
  // The useActorPositionsTask already filters to only include actors with positions

  const timelineEvents = useMemo((): TimelineEvent[] => {
    if (!activeEvents || !activeFight) return [];

    // Helper function to get actor name by ID
    const getActorName = (actorId: number): string => {
      // Check players first
      const player = playersById?.[actorId];
      if (player) {
        return player.name || `Player ${actorId}`;
      }

      // Check actors (NPCs, bosses, etc.) using the proper utility
      const actor = reportMasterData?.actorsById?.[actorId];

      // Debug what data we have
      if (!actor) {
        return `Actor ${actorId}`;
      }

      const resolvedName = resolveActorName(actor, actorId, `Actor ${actorId}`);

      return resolvedName;
    };

    const convertedEvents: TimelineEvent[] = [];

    // Process damage events
    activeEvents.damage?.forEach((event: DamageEvent) => {
      const sourceName = getActorName(event.sourceID);
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'damage',
        event,
        description: `${sourceName}: ${event.amount} damage`,
        severity: event.amount > 10000 ? 'high' : event.amount > 5000 ? 'medium' : 'low',
      });
    });

    // Process heal events
    activeEvents.heal?.forEach((event: HealEvent) => {
      const sourceName = getActorName(event.sourceID);
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'heal',
        event,
        description: `${sourceName}: ${event.amount} healing`,
        severity: event.amount > 10000 ? 'high' : event.amount > 5000 ? 'medium' : 'low',
      });
    });

    // Process death events
    activeEvents.death?.forEach((event: DeathEvent) => {
      const targetName = getActorName(event.targetID);
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'death',
        event,
        description: `${targetName} died`,
        severity: 'critical',
      });
    });

    // Sort by timestamp
    return convertedEvents.sort((a, b) => a.timestamp - b.timestamp);
  }, [activeEvents, activeFight, playersById, reportMasterData]);

  // Filter events based on visibility settings and current timestamp (throttled)
  const visibleEvents = useMemo(() => {
    if (!activeFight) return [];

    // Helper function to check if an event involves any hidden actors
    const isEventFromHiddenActor = (event: LogEvent): boolean => {
      const sourceId = 'sourceID' in event ? event.sourceID : null;
      const targetId = 'targetID' in event ? event.targetID : null;

      return (
        (sourceId !== null && hiddenActorIds.has(sourceId)) ||
        (targetId !== null && hiddenActorIds.has(targetId))
      );
    };

    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= activeFight.startTime &&
        event.timestamp <= throttledCurrentTimestamp &&
        !isEventFromHiddenActor(event.event),
    );
  }, [timelineEvents, visibleEventTypes, throttledCurrentTimestamp, activeFight, hiddenActorIds]);

  const eventStartTimestamp = Math.floor(throttledCurrentTimestamp - 5000); // Show events from previous 5 seconds

  // Current events happening in the last 5 seconds - also throttled
  const currentEvents = useMemo(() => {
    // Helper function to check if an actor is involved in an event (as source or target)
    const isActorInvolved = (event: LogEvent, actorId: number): boolean => {
      return (
        ('sourceID' in event && event.sourceID === actorId) ||
        ('targetID' in event && event.targetID === actorId)
      );
    };

    // Helper function to check if an event involves any hidden actors
    const isEventFromHiddenActor = (event: LogEvent): boolean => {
      const sourceId = 'sourceID' in event ? event.sourceID : null;
      const targetId = 'targetID' in event ? event.targetID : null;

      return (
        (sourceId !== null && hiddenActorIds.has(sourceId)) ||
        (targetId !== null && hiddenActorIds.has(targetId))
      );
    };

    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= eventStartTimestamp &&
        event.timestamp <= currentTimestamp &&
        !isEventFromHiddenActor(event.event) &&
        // Show events where the selected actor is either the source OR target
        (selectedActorId === undefined || isActorInvolved(event.event, selectedActorId)),
    );
  }, [
    timelineEvents,
    visibleEventTypes,
    currentTimestamp,
    eventStartTimestamp,
    selectedActorId,
    hiddenActorIds,
  ]);

  const fightDuration = activeFight ? activeFight.endTime - activeFight.startTime : 0;
  const fightEndTimestamp = activeFight ? activeFight.endTime : 0; // Absolute timestamp for fight end

  // Playback control - 60Hz rendering with requestAnimationFrame (optimized)
  useEffect(() => {
    let animationFrame: number | null = null;
    let lastTime = performance.now();

    const animate = (currentPerformanceTime: number): void => {
      // Use refs to avoid dependency issues and recreating animation loop
      if (isPlayingRef.current && currentTimestampRef.current < fightEndTimestamp) {
        const deltaTime = currentPerformanceTime - lastTime;

        // Update at ~60Hz (16.67ms intervals), accounting for playback speed
        if (deltaTime >= RENDER_FRAME_INTERVAL) {
          setCurrentTimestamp((prev) => {
            const next = prev + deltaTime * playbackSpeedRef.current;
            return next >= fightEndTimestamp ? fightEndTimestamp : next;
          });
          lastTime = currentPerformanceTime;
        }

        animationFrame = requestAnimationFrame(animate);
      }
    };

    // Start animation when playing
    if (isPlaying && currentTimestampRef.current < fightEndTimestamp) {
      lastTime = performance.now(); // Reset timer when starting
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, fightEndTimestamp]); // Include isPlaying to restart loop when play state changes

  // Auto-pause at end
  useEffect(() => {
    if (currentTimestamp >= fightEndTimestamp) {
      setIsPlaying(false);
    }
  }, [currentTimestamp, fightEndTimestamp]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSpeedChange = useCallback(() => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [speedIndex]);

  const handleTimeChange = useCallback(
    (_: Event, value: number | number[]) => {
      const newTime = Array.isArray(value) ? value[0] : value;
      // Slider uses fight-relative time for UI, convert to absolute timestamp for internal state
      const newTimestamp = activeFight ? activeFight.startTime + newTime : newTime;
      setCurrentTimestamp(newTimestamp);
    },
    [activeFight],
  );

  const handleRestart = useCallback(() => {
    // Reset to fight start using absolute timestamp
    const startTimestamp = activeFight ? activeFight.startTime : 0;
    setCurrentTimestamp(startTimestamp);
    setIsPlaying(false);
  }, [activeFight]);

  const toggleEventType = useCallback((eventType: keyof typeof visibleEventTypes) => {
    setVisibleEventTypes((prev) => ({
      ...prev,
      [eventType]: !prev[eventType],
    }));
  }, []);

  const handleActorClick = useCallback(
    (actorId: number) => {
      setSelectedActorId(actorId === selectedActorId ? undefined : actorId);
    },
    [selectedActorId],
  );

  const handleToggleActorVisibility = useCallback((actorId: number) => {
    setHiddenActorIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actorId)) {
        newSet.delete(actorId);
      } else {
        newSet.add(actorId);
      }
      return newSet;
    });
  }, []);

  const handleToggleCameraLock = useCallback((actorId: number) => {
    setCameraLockedActorId((prev) => (prev === actorId ? undefined : actorId));
  }, []);

  const handleShareUrl = useCallback(async () => {
    if (!activeFight || !params.reportId || !params.fightId) return;

    // Build the shareable URL using React Router params with hash routing and /replay slug
    const baseUrl = `${window.location.origin}/#/report/${params.reportId}/fight/${params.fightId}/replay`;
    const searchParams = new URLSearchParams(location.search);

    // Add/update the time and actor parameters using absolute timestamps
    if (selectedActorId !== undefined) {
      searchParams.set('actorId', selectedActorId.toString());
    } else {
      searchParams.delete('actorId');
    }

    // Store absolute timestamp in URL for deep linking
    if (currentTimestamp >= 0) {
      searchParams.set('time', Math.round(currentTimestamp).toString());
    } else {
      searchParams.delete('time');
    }

    // Build the final URL
    const shareUrl = `${baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    try {
      // Try to use the Web Share API if available
      if (navigator.share) {
        const fightTime = activeFight ? currentTimestamp - activeFight.startTime : 0;
        await navigator.share({
          title: 'ESO Fight Replay',
          text: `Fight replay at ${formatDuration(fightTime)}`,
          url: shareUrl,
        });
        return; // Success, no need for snackbar
      }

      // Check if clipboard API is available and we're in a secure context
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareSnackbar(true);
      } else {
        // Fallback for non-secure contexts or unsupported browsers
        // Create a temporary input element and use the legacy approach
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          // Try the modern approach first
          await navigator.clipboard.writeText(shareUrl);
          setShowShareSnackbar(true);
        } catch {
          // Last resort - let user manually copy
          textArea.style.position = 'static';
          textArea.style.left = 'auto';
          textArea.style.top = 'auto';
          textArea.select();
          setShowShareSnackbar(true);
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      // Show the URL in an alert as a final fallback
      alert(`Please copy this URL manually: ${shareUrl}`);
    }
  }, [
    activeFight,
    params.reportId,
    params.fightId,
    selectedActorId,
    currentTimestamp,
    location.search,
  ]);

  const getEventColor = (event: TimelineEvent): string => {
    switch (event.type) {
      case 'damage':
        return '#f44336';
      case 'heal':
        return '#4caf50';
      case 'death':
        return '#9c27b0';
      case 'cast':
        return '#2196f3';
      case 'buff':
        return '#ff9800';
      case 'debuff':
        return '#795548';
      default:
        return '#9e9e9e';
    }
  };

  if (fightsLoading || eventsLoading || isActorPositionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading fight replay data...
        </Typography>
      </Box>
    );
  }

  if (!fight) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography variant="h6">No fight selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          p: 3,
        }}
      >
        {/* Header */}
        <Typography variant="h4" gutterBottom data-testid="fight-replay-title">
          {activeFight?.name} - Interactive Replay
        </Typography>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          Duration: {activeFight ? formatDuration(fightDuration) : 'Loading...'} | Boss:{' '}
          {activeFight?.bossPercentage?.toFixed(1) ?? '0.0'}%
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Fight Time: {activeFight ? formatTimestamp(activeFight.startTime) : 'Loading...'} -{' '}
          {activeFight ? formatTimestamp(activeFight.endTime) : 'Loading...'}
        </Typography>

        <Stack spacing={3}>
          {/* Timeline Controls */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Timeline Controls
            </Typography>

            {/* Time slider - uses fight-relative time for UI but maintains absolute timestamps internally */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Time: {activeFight ? formatTimestamp(currentTimestamp) : 'Loading...'}{' '}
                (Absolute)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Fight Progress:{' '}
                {activeFight && fightDuration > 0
                  ? formatDuration(Math.max(0, currentTimestamp - activeFight.startTime))
                  : '0:00'}{' '}
                / {activeFight ? formatDuration(fightDuration) : '0:00'}
              </Typography>
              <Slider
                value={
                  activeFight && fightDuration > 0
                    ? Math.max(0, currentTimestamp - activeFight.startTime)
                    : 0
                }
                min={0}
                max={Math.max(1, fightDuration)} // Prevent max=0 which breaks slider
                step={100}
                onChange={handleTimeChange}
                valueLabelDisplay="auto"
                valueLabelFormat={(value: number) => formatDuration(value)}
                sx={{ mb: 2 }}
                disabled={!activeFight || fightDuration <= 0}
              />

              {/* Progress indicator - shows fight progress while maintaining absolute timestamps */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  Progress:{' '}
                  {activeFight && fightDuration > 0
                    ? formatDuration(Math.max(0, currentTimestamp - activeFight.startTime))
                    : '0:00'}{' '}
                  / {activeFight ? formatDuration(fightDuration) : '0:00'}
                </Typography>
                <Typography variant="body2">
                  {activeFight && fightDuration > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          ((currentTimestamp - activeFight.startTime) / fightDuration) * 100,
                        ),
                      ).toFixed(1)
                    : '0.0'}
                  % Complete
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={
                  activeFight && fightDuration > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          ((currentTimestamp - activeFight.startTime) / fightDuration) * 100,
                        ),
                      )
                    : 0
                }
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Control buttons */}
            <Box display="flex" justifyContent="center" alignItems="center" gap={1} mt={2}>
              <Tooltip title="Restart">
                <IconButton onClick={handleRestart}>
                  <Replay />
                </IconButton>
              </Tooltip>

              <Tooltip title="Previous event">
                <IconButton>
                  <SkipPrevious />
                </IconButton>
              </Tooltip>

              <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
                <IconButton onClick={handlePlayPause} color="primary" size="large">
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Next event">
                <IconButton>
                  <SkipNext />
                </IconButton>
              </Tooltip>

              <Tooltip title={`Speed: ${playbackSpeed}x`}>
                <IconButton onClick={handleSpeedChange}>
                  <Speed />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {playbackSpeed}x
                  </Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="Share current time URL">
                <IconButton onClick={handleShareUrl} color="secondary">
                  <Share />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* 3D Combat Arena with Floating Actor Cards */}
          <Paper sx={{ p: 2, height: 600, position: 'relative' }}>
            <Typography variant="h6" gutterBottom>
              3D Arena View
            </Typography>

            <Box sx={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              <CombatArena
                actors={visibleActors}
                selectedActorId={selectedActorId}
                cameraLockedActorId={cameraLockedActorId}
                onActorClick={handleActorClick}
                arenaSize={13}
                mapFile={fight?.maps?.[0]?.file || undefined}
                showActorNames={showActorNames}
              />

              {/* Camera Lock Indicator */}
              {cameraLockedActorId && (
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.95)'
                        : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: theme.palette.primary.main,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(56, 189, 248, 0.1)'
                        : '0 2px 8px rgba(0, 0, 0, 0.15)',
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  })}
                >
                  <CenterFocusStrong color="primary" fontSize="small" />
                  <Typography variant="caption" color="primary.main" fontWeight="medium">
                    Camera Locked: {actors.find(a => a.id === cameraLockedActorId)?.name || 'Unknown'}
                  </Typography>
                </Box>
              )}

              {/* Floating Actor Cards Overlay */}
              <Box
                sx={(theme) => ({
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: 280,
                  height: isActorPanelExpanded ? 'auto' : '48px',
                  maxHeight: isActorPanelExpanded ? 'calc(100% - 16px)' : '48px',
                  overflow: 'hidden',
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.95)'
                      : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(56, 189, 248, 0.2)'
                      : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.08)'
                      : '0 4px 20px rgba(0, 0, 0, 0.15)',
                  zIndex: 10,
                  transition: 'height 0.3s ease-in-out, max-height 0.3s ease-in-out',
                })}
              >
                {/* Header with collapse/expand button */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    pb: isActorPanelExpanded ? 1 : 1.5,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsActorPanelExpanded(!isActorPanelExpanded)}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{ color: 'text.primary', userSelect: 'none' }}
                  >
                    Actors ({actors.length})
                  </Typography>
                  <IconButton
                    size="small"
                    sx={{ p: 0.5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActorPanelExpanded(!isActorPanelExpanded);
                    }}
                  >
                    {isActorPanelExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                {/* Collapsible content */}
                {isActorPanelExpanded && (
                  <Box
                    sx={(theme) => ({
                      px: 1.5,
                      pb: 1.5,
                      maxHeight: 'calc(560px - 100px)', // Match 3D view height (600px) minus header/padding
                      overflowY: 'auto',
                      // Custom scrollbar styling
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(15, 23, 42, 0.5)'
                            : 'rgba(188, 217, 255, 0.2)',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'rgba(15, 23, 42, 0.25)',
                        borderRadius: '4px',
                        '&:hover': {
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(56, 189, 248, 0.5)'
                              : 'rgba(15, 23, 42, 0.4)',
                        },
                      },
                    })}
                  >
                    {/* Actor Names Toggle */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Show Names
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setShowActorNames(!showActorNames)}
                        sx={{
                          color: showActorNames ? 'primary.main' : 'text.disabled',
                        }}
                      >
                        <TextFields fontSize="small" />
                      </IconButton>
                    </Box>

                    <Stack spacing={1}>
                      {actors.map((actor) => (
                        <ActorCard
                          key={actor.id}
                          actor={actor}
                          isSelected={actor.id === selectedActorId}
                          isHidden={hiddenActorIds.has(actor.id)}
                          isCameraLocked={cameraLockedActorId === actor.id}
                          onActorClick={handleActorClick}
                          onToggleVisibility={handleToggleActorVisibility}
                          onToggleCameraLock={handleToggleCameraLock}
                        />
                      ))}

                      {actors.length === 0 && (
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              No actors found at current time
                            </Typography>
                          </CardContent>
                        </Card>
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Event Filters and Current Events */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Event Filters
                </Typography>

                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(visibleEventTypes).map(([type, visible]) => (
                    <Chip
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                      color={visible ? 'primary' : 'default'}
                      variant={visible ? 'filled' : 'outlined'}
                      onClick={() => toggleEventType(type as keyof typeof visibleEventTypes)}
                      icon={<Visibility />}
                      sx={{
                        '& .MuiChip-icon': {
                          color: visible ? 'inherit' : 'text.disabled',
                        },
                      }}
                    />
                  ))}
                </Box>

                {/* Selected Actor Info */}
                {selectedActorId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Actor
                    </Typography>
                    {(() => {
                      const selectedActor = actors.find((a) => a.id === selectedActorId);
                      if (selectedActor) {
                        return (
                          <Box>
                            <Typography variant="body2">
                              <strong>Name:</strong> {selectedActor.name}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Type:</strong> {selectedActor.type}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Position:</strong> ({selectedActor.position[0].toFixed(1)},{' '}
                              {selectedActor.position[2].toFixed(1)})
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong> {selectedActor.isAlive ? 'Alive' : 'Dead'}
                            </Typography>
                          </Box>
                        );
                      }
                      return <Typography variant="body2">Actor not found</Typography>;
                    })()}
                  </Box>
                )}
              </Paper>
            </Box>

            <Box sx={{ flex: 2 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Current Events
                </Typography>

                {currentEvents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No events at current time
                  </Typography>
                ) : (
                  <List dense>
                    {currentEvents.slice(-10).map((event, index) => (
                      <ListItem key={`${event.timestamp}-${index}`} divider>
                        <Chip
                          size="small"
                          label={event.type}
                          sx={{
                            backgroundColor: getEventColor(event),
                            color: 'white',
                            mr: 1,
                            minWidth: 60,
                          }}
                        />
                        <ListItemText
                          primary={event.description}
                          secondary={`${formatDuration(event.timestamp - (activeFight?.startTime || 0))}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Box>
          </Stack>

          {/* Fight Statistics */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Fight Statistics (Up to Current Time)
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Card variant="outlined" sx={{ minWidth: 150 }}>
                <CardContent>
                  <Typography variant="h6" color="error">
                    {visibleEvents.filter((e) => e.type === 'damage').length}
                  </Typography>
                  <Typography variant="body2">Damage Events</Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ minWidth: 150 }}>
                <CardContent>
                  <Typography variant="h6" color="success.main">
                    {visibleEvents.filter((e) => e.type === 'heal').length}
                  </Typography>
                  <Typography variant="body2">Heal Events</Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ minWidth: 150 }}>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {visibleEvents.filter((e) => e.type === 'cast').length}
                  </Typography>
                  <Typography variant="body2">Cast Events</Typography>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ minWidth: 150 }}>
                <CardContent>
                  <Typography variant="h6" color="secondary">
                    {visibleEvents.filter((e) => e.type === 'death').length}
                  </Typography>
                  <Typography variant="body2">Deaths</Typography>
                </CardContent>
              </Card>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      {/* Share URL Success Snackbar */}
      <Snackbar
        open={showShareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowShareSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowShareSnackbar(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Shareable URL copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};
