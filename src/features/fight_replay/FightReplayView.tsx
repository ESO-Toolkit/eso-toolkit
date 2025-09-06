import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Speed,
  Replay,
  Visibility,
  VisibilityOff,
  ExpandLess,
  ExpandMore,
  Person,
  SmartToy,
  Shield,
  Groups,
  FavoriteRounded,
  HeartBroken,
  TextFields,
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
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { CombatArena } from '../../components/LazyCombatArena';
import { FightFragment } from '../../graphql/generated';
import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import { RootState } from '../../store/storeWithHistory';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  LogEvent,
  ResourceChangeEvent,
} from '../../types/combatlogEvents';

import { useActorPositions } from './hooks/useActorPositions';

// Local utility function for formatting duration
const formatDuration = (ms: number): string => {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Helper function to get actor type icon
const getActorTypeIcon = (type: string): React.ReactElement => {
  switch (type) {
    case 'player':
      return <Person fontSize="small" />;
    case 'boss':
      return <Shield fontSize="small" />;
    case 'enemy':
      return <SmartToy fontSize="small" />;
    case 'friendly_npc':
      return <Groups fontSize="small" />;
    default:
      return <Person fontSize="small" />;
  }
};

// Helper function to get alive/dead status icon
const getStatusIcon = (isAlive: boolean): React.ReactElement => {
  return isAlive ? (
    <FavoriteRounded fontSize="small" color="success" />
  ) : (
    <HeartBroken fontSize="small" color="error" />
  );
};

interface FightReplayViewProps {
  fight?: FightFragment;
  fightsLoading: boolean;
  events: {
    damage: DamageEvent[];
    heal: HealEvent[];
    death: DeathEvent[];
    resource: ResourceChangeEvent[];
  };
  eventsLoading: boolean;
  playersById?: Record<string | number, PlayerDetailsWithRole>;
  reportMasterData: RootState['masterData'];
}

interface TimelineEvent {
  timestamp: number;
  type: 'damage' | 'heal' | 'death' | 'cast' | 'buff' | 'debuff';
  event: LogEvent;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

// Ultra-high refresh rate configuration for smooth rendering
const RENDER_FRAME_INTERVAL = 4.17; // 240Hz rendering (4.17ms intervals)

export const FightReplayView: React.FC<FightReplayViewProps> = ({
  fight,
  fightsLoading,
  events,
  eventsLoading,
  playersById,
  reportMasterData,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedIndex, setSpeedIndex] = useState(2); // Index for 1x speed
  const [selectedActorId, setSelectedActorId] = useState<number | undefined>();
  const [isActorPanelExpanded, setIsActorPanelExpanded] = useState(false);
  const [hiddenActorIds, setHiddenActorIds] = useState<Set<number>>(new Set());
  const [showActorNames, setShowActorNames] = useState(true);

  // Use refs to avoid recreating animation loop on every currentTime change
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const playbackSpeedRef = useRef(playbackSpeed);

  // Keep refs in sync
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

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
  // Note: Events are now passed as props from parent component  // Throttle actor position updates to 60Hz for better performance (while keeping UI at 240Hz)
  const throttledCurrentTime = useMemo(() => {
    // Round to nearest ~16ms (60Hz) to reduce actor position recalculations
    return Math.floor(currentTime / 16.67) * 16.67;
  }, [currentTime]);

  // Get actor positions for 3D visualization (now throttled to 60Hz)
  const { actors, isLoading: isActorPositionsLoading } = useActorPositions({
    fight,
    events,
    currentTime: throttledCurrentTime,
    playersById,
    actorsById: reportMasterData.actorsById,
  });

  // Filter visible actors for 3D rendering
  const visibleActors = useMemo(() => {
    return actors.filter((actor) => !hiddenActorIds.has(actor.id));
  }, [actors, hiddenActorIds]);

  // Function to toggle actor visibility
  const toggleActorVisibility = useCallback((actorId: number) => {
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

  // Convert events to timeline format
  const timelineEvents = useMemo((): TimelineEvent[] => {
    if (!events || !fight) return [];

    const convertedEvents: TimelineEvent[] = [];

    // Process damage events
    events.damage?.forEach((event: DamageEvent) => {
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'damage',
        event,
        description: `${event.amount} damage`,
        severity: event.amount > 10000 ? 'high' : event.amount > 5000 ? 'medium' : 'low',
      });
    });

    // Process heal events
    events.heal?.forEach((event: HealEvent) => {
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'heal',
        event,
        description: `${event.amount} healing`,
        severity: event.amount > 10000 ? 'high' : event.amount > 5000 ? 'medium' : 'low',
      });
    });

    // Process death events
    events.death?.forEach((event: DeathEvent) => {
      convertedEvents.push({
        timestamp: event.timestamp,
        type: 'death',
        event,
        description: 'Player death',
        severity: 'critical',
      });
    });

    // Sort by timestamp
    return convertedEvents.sort((a, b) => a.timestamp - b.timestamp);
  }, [events, fight]);

  // Filter events based on visibility settings and current time (throttled)
  const visibleEvents = useMemo(() => {
    if (!fight) return [];

    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= fight.startTime &&
        event.timestamp <= fight.startTime + throttledCurrentTime,
    );
  }, [timelineEvents, visibleEventTypes, throttledCurrentTime, fight]);

  const currentTimestamp = !fight ? 1000 : Math.ceil(fight.startTime + throttledCurrentTime);
  const eventStartTimestamp = Math.floor(currentTimestamp - 1000);

  // Current events happening now (within a small time window) - also throttled
  const currentEvents = useMemo(() => {
    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= eventStartTimestamp &&
        event.timestamp <= currentTimestamp,
    );
  }, [timelineEvents, visibleEventTypes, currentTimestamp, eventStartTimestamp]);

  const fightDuration = fight ? fight.endTime - fight.startTime : 0;

  // Playback control - 240Hz rendering with requestAnimationFrame (optimized)
  useEffect(() => {
    let animationFrame: number | null = null;
    let lastTime = performance.now();

    const animate = (currentPerformanceTime: number): void => {
      // Use refs to avoid dependency issues and recreating animation loop
      if (isPlayingRef.current && currentTimeRef.current < fightDuration) {
        const deltaTime = currentPerformanceTime - lastTime;

        // Update at ~240Hz (4.17ms intervals), accounting for playback speed
        if (deltaTime >= RENDER_FRAME_INTERVAL) {
          setCurrentTime((prev) => {
            const next = prev + deltaTime * playbackSpeedRef.current;
            return next >= fightDuration ? fightDuration : next;
          });
          lastTime = currentPerformanceTime;
        }

        animationFrame = requestAnimationFrame(animate);
      }
    };

    // Start animation when playing
    if (isPlaying && currentTimeRef.current < fightDuration) {
      lastTime = performance.now(); // Reset timer when starting
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, fightDuration]); // Include isPlaying to restart loop when play state changes

  // Auto-pause at end
  useEffect(() => {
    if (currentTime >= fightDuration) {
      setIsPlaying(false);
    }
  }, [currentTime, fightDuration]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSpeedChange = useCallback(() => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [speedIndex]);

  const handleTimeChange = useCallback((_: Event, value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;
    setCurrentTime(newTime);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

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
          {fight.name} - Interactive Replay
        </Typography>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          Duration: {formatDuration(fightDuration)} | Boss: {fight.bossPercentage?.toFixed(1)}%
        </Typography>

        <Stack spacing={3}>
          {/* Timeline Controls */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Timeline Controls
            </Typography>

            {/* Time slider */}
            <Box sx={{ px: 2, py: 1 }}>
              <Slider
                value={currentTime}
                min={0}
                max={fightDuration}
                step={100}
                onChange={handleTimeChange}
                valueLabelDisplay="auto"
                valueLabelFormat={(value: number) => formatDuration(value)}
                sx={{ mb: 2 }}
              />

              {/* Progress indicator */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  {formatDuration(currentTime)} / {formatDuration(fightDuration)}
                </Typography>
                <Typography variant="body2">
                  {((currentTime / fightDuration) * 100).toFixed(1)}%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={(currentTime / fightDuration) * 100}
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
                onActorClick={handleActorClick}
                arenaSize={13}
                mapFile={fight?.maps?.[0]?.file || undefined}
                showActorNames={showActorNames}
              />

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
                    Actors ({visibleActors.length}/{actors.length})
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
                      maxHeight: 'calc(100vh - 120px)',
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
                      {actors.map((actor) => {
                        const esoX = Math.round(actor.position[0] * 1000 + 5235);
                        const esoY = Math.round(actor.position[2] * 1000 + 5410);

                        return (
                          <Card
                            key={actor.id}
                            variant="outlined"
                            sx={(theme) => ({
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out',
                              border: actor.id === selectedActorId ? '2px solid' : '1px solid',
                              borderColor:
                                actor.id === selectedActorId
                                  ? theme.palette.primary.main
                                  : theme.palette.divider,
                              backgroundColor:
                                actor.id === selectedActorId
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(56, 189, 248, 0.15)'
                                    : 'rgba(25, 118, 210, 0.08)'
                                  : 'transparent',
                              opacity: hiddenActorIds.has(actor.id) ? 0.6 : 1,
                              '&:hover': {
                                boxShadow:
                                  theme.palette.mode === 'dark'
                                    ? '0 4px 12px rgba(0, 0, 0, 0.25)'
                                    : '0 2px 8px rgba(15, 23, 42, 0.1)',
                                borderColor: theme.palette.primary.main,
                                transform: 'translateY(-1px)',
                                opacity: hiddenActorIds.has(actor.id) ? 0.8 : 1,
                              },
                            })}
                            onClick={() => handleActorClick(actor.id)}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={0.5}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight="medium"
                                  noWrap
                                  sx={{
                                    flex: 1,
                                    mr: 1,
                                    opacity: hiddenActorIds.has(actor.id) ? 0.5 : 1,
                                    textDecoration: hiddenActorIds.has(actor.id)
                                      ? 'line-through'
                                      : 'none',
                                  }}
                                >
                                  {actor.name}
                                </Typography>
                                <Box display="flex" gap={0.5} alignItems="center">
                                  <Tooltip
                                    title={
                                      hiddenActorIds.has(actor.id)
                                        ? 'Show actor in 3D view'
                                        : 'Hide actor from 3D view'
                                    }
                                    placement="top"
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleActorVisibility(actor.id);
                                      }}
                                      sx={{
                                        p: 0.25,
                                        minWidth: 'auto',
                                        color: hiddenActorIds.has(actor.id)
                                          ? 'text.disabled'
                                          : 'text.secondary',
                                        '& .MuiSvgIcon-root': {
                                          fontSize: '1rem',
                                        },
                                        '&:hover': {
                                          color: hiddenActorIds.has(actor.id)
                                            ? 'text.secondary'
                                            : 'primary.main',
                                        },
                                      }}
                                    >
                                      {hiddenActorIds.has(actor.id) ? (
                                        <VisibilityOff />
                                      ) : (
                                        <Visibility />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={`Type: ${actor.type}`}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {getActorTypeIcon(actor.type)}
                                    </Box>
                                  </Tooltip>
                                  <Tooltip title={actor.isAlive ? 'Alive' : 'Dead'}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {getStatusIcon(actor.isAlive)}
                                    </Box>
                                  </Tooltip>
                                </Box>
                              </Box>

                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Typography variant="caption" color="text.secondary">
                                  ({actor.position[0].toFixed(1)}, {actor.position[2].toFixed(1)})
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ESO: ({esoX}, {esoY})
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}

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
                          secondary={`${formatDuration(event.timestamp - fight.startTime)}`}
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
    </Box>
  );
};
