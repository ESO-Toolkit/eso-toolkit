import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Speed,
  Replay,
  Visibility,
  Warning,
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
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { FightFragment } from '../../graphql/generated';
import { DamageEvent, HealEvent, DeathEvent, LogEvent } from '../../types/combatlogEvents';

import { CombatArena } from './components/CombatArena';
import { useActorPositions } from './hooks/useActorPositions';
import { useFightEvents } from './hooks/useFightEvents';

// Local utility function for formatting duration
const formatDuration = (ms: number): string => {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

interface FightReplayViewProps {
  fight?: FightFragment;
  fightsLoading: boolean;
  reportId?: string;
  fightId?: string;
}

interface TimelineEvent {
  timestamp: number;
  type: 'damage' | 'heal' | 'death' | 'cast' | 'buff' | 'debuff';
  event: LogEvent;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8];

export const FightReplayView: React.FC<FightReplayViewProps> = ({
  fight,
  fightsLoading,
  reportId,
  fightId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedIndex, setSpeedIndex] = useState(2); // Index for 1x speed
  const [selectedActorId, setSelectedActorId] = useState<number | undefined>();
  const [visibleEventTypes, setVisibleEventTypes] = useState({
    damage: true,
    heal: true,
    death: true,
    cast: true,
    buff: true,
    debuff: true,
  });

  // Custom hook to fetch fight events
  const { events, loading: eventsLoading, error } = useFightEvents(reportId, fight);

  // Get actor positions for 3D visualization
  const actors = useActorPositions({
    fight,
    events,
    currentTime,
  });

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

  // Filter events based on visibility settings and current time
  const visibleEvents = useMemo(() => {
    if (!fight) return [];

    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= fight.startTime &&
        event.timestamp <= fight.startTime + currentTime,
    );
  }, [timelineEvents, visibleEventTypes, currentTime, fight]);

  // Current events happening now (within a small time window)
  const currentEvents = useMemo(() => {
    if (!fight) return [];

    const currentTimestamp = fight.startTime + currentTime;
    const timeWindow = 1000; // 1 second window

    return timelineEvents.filter(
      (event) =>
        visibleEventTypes[event.type] &&
        event.timestamp >= currentTimestamp - timeWindow &&
        event.timestamp <= currentTimestamp,
    );
  }, [timelineEvents, visibleEventTypes, currentTime, fight]);

  const fightDuration = fight ? fight.endTime - fight.startTime : 0;

  // Playback control
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && currentTime < fightDuration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 100 * playbackSpeed; // 100ms increments
          return next >= fightDuration ? fightDuration : next;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, fightDuration, currentTime]);

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

  if (fightsLoading || eventsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading fight replay data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Warning color="error" sx={{ mr: 1 }} />
        <Typography variant="h6" color="error">
          Error loading fight data: {error}
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
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

        {/* 3D Combat Arena */}
        <Paper sx={{ p: 2, height: 600 }}>
          <Typography variant="h6" gutterBottom>
            3D Arena View
          </Typography>

          <Box sx={{ height: 'calc(100% - 40px)', width: '100%' }}>
            <CombatArena
              actors={actors}
              selectedActorId={selectedActorId}
              onActorClick={handleActorClick}
              arenaSize={25}
            />
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
  );
};
