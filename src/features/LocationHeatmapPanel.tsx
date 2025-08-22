import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Timeline as TimelineIcon,
  Place as PlaceIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Badge,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../graphql/generated';
import { RootState } from '../store/storeWithHistory';
import { KnownAbilities } from '../types/abilities';
import { EventType, ResourceChangeEvent, BuffEvent } from '../types/combatlogEvents';
import { resolveActorName } from '../utils/resolveActorName';

interface LocationPoint {
  x: number;
  y: number;
  timestamp: number;
  playerId: string;
  playerName: string;
  role: 'tank' | 'dps' | 'healer';
}

interface VoxelData {
  x: number; // Center X coordinate of the voxel
  y: number; // Center Y coordinate of the voxel
  timeSpent: number; // Total time spent in this voxel (in milliseconds)
  players: Set<string>;
  lastTimestamp: Map<string, number>; // Track last timestamp per player for time calculation
  role: 'tank' | 'dps' | 'healer' | 'mixed';
}

interface ELMSMarker {
  x: number;
  y: number;
  role: 'tank' | 'dps' | 'healer';
  description: string;
  tankId?: string; // Add tank ID to determine color
}

interface FightPhase {
  id: number;
  startTime: number;
  endTime: number;
  label: string;
  totalDamage: number;
}

interface LocationHeatmapPanelProps {
  fight: FightFragment;
}

// Constants
const FIGHT_PHASE_GAP_THRESHOLD = 2000; // 2 seconds in milliseconds
const FIGHT_PHASE_TIME_INTERVAL = 1000; // 1 second intervals for damage calculation
const VOXEL_SIZE = 10; // 10x10 unit voxels for better movement visualization
const MIN_TIME_THRESHOLD = 3000; // Minimum time (3 seconds) to show a voxel
const TOP_POSITIONS_PER_TANK = 3; // Number of top positions to track per tank
const DEFAULT_MAP_SIZE = 1000; // Default map bounds when no data is available
const MAP_BOUNDS_PADDING = 100; // Padding around actual data bounds

const LocationHeatmapPanel: React.FC<LocationHeatmapPanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const eventPlayers = useSelector((state: RootState) => state.events.players);

  const [selectedPlayer, setSelectedPlayer] = React.useState<string>('all');
  const [showHeatmap, setShowHeatmap] = React.useState<boolean>(true);
  const [showMarkers, setShowMarkers] = React.useState<boolean>(true);
  const [selectedPhase, setSelectedPhase] = React.useState<number | 'all'>('all');

  // Get player actors and determine roles based on combat performance
  const playerActors = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // First pass: collect healing done and taunt applications for all players
    const healingByPlayer: Record<string, number> = {};
    const tauntsByPlayer: Record<string, number> = {};

    events.forEach((event) => {
      if (event.timestamp < fightStart || event.timestamp > fightEnd) {
        return;
      }

      // Track healing done
      if (event.type === 'heal' && event.sourceID != null) {
        const playerId = String(event.sourceID);
        const amount = Number(event.amount) || 0;
        healingByPlayer[playerId] = (healingByPlayer[playerId] || 0) + amount;
      }

      // Track taunt applications (look for taunt debuffs applied to targets)
      if (event.type === 'applydebuff' && event.sourceID != null) {
        const buffEvent = event as BuffEvent;
        const isTaunt = buffEvent.abilityGameID === KnownAbilities.TAUNT;

        if (isTaunt) {
          const playerId = String(event.sourceID);
          tauntsByPlayer[playerId] = (tauntsByPlayer[playerId] || 0) + 1;
        }
      }
    });

    // Get all player actors
    const allPlayers = Object.values(actorsById)
      .filter((actor) => actor.type === 'Player' && actor.id != null)
      .map((actor) => ({
        id: String(actor.id),
        name: String(resolveActorName(actor)),
        healing: healingByPlayer[String(actor.id)] || 0,
        taunts: tauntsByPlayer[String(actor.id)] || 0,
        actor,
        player: eventPlayers[String(actor.id)],
      }));

    // Determine roles based on performance
    const playersByHealing = [...allPlayers].sort((a, b) => b.healing - a.healing);
    const healers = new Set<string>();
    const tanks = new Set<string>();

    // Top 2 healers by healing done
    playersByHealing.slice(0, 2).forEach((player) => {
      if (player.healing > 0) {
        healers.add(player.id);
      }
    });

    // From remaining players, select up to 2 tanks based on taunt applications
    const nonHealers = allPlayers.filter((p) => !healers.has(p.id));
    const playersByTaunts = nonHealers.sort((a, b) => b.taunts - a.taunts);
    playersByTaunts.slice(0, 2).forEach((player) => {
      if (player.taunts > 0) {
        tanks.add(player.id);
      }
    });

    // Assign roles
    return allPlayers.map((player) => ({
      ...player,
      role: healers.has(player.id)
        ? ('healer' as const)
        : tanks.has(player.id)
          ? ('tank' as const)
          : ('dps' as const),
    }));
  }, [actorsById, eventPlayers, events, fight?.startTime, fight?.endTime]);

  // Calculate fight phases based on damage gaps
  // Phases represent active combat periods where friendly damage is being dealt
  // Phases are separated by gaps of 2+ seconds where no friendly damage occurs
  const fightPhases = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    const phases: FightPhase[] = [];
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const GAP_THRESHOLD = FIGHT_PHASE_GAP_THRESHOLD; // 2 seconds in milliseconds
    const TIME_INTERVAL = FIGHT_PHASE_TIME_INTERVAL; // 1 second intervals for damage calculation

    // Get all player IDs for friendly damage tracking
    const playerIds = new Set(playerActors.map((player) => player.id));

    // Calculate damage over time in 1-second intervals
    // This tracks total damage output from all friendly (player) sources
    const damageTimeline: Array<{ timestamp: number; damage: number }> = [];

    for (let timestamp = fightStart; timestamp <= fightEnd; timestamp += TIME_INTERVAL) {
      const intervalStart = timestamp;
      const intervalEnd = timestamp + TIME_INTERVAL;

      // Sum damage from friendly sources (players) in this interval
      // Only counts damage events where sourceID corresponds to a Player actor
      const intervalDamage = events
        .filter((event) => {
          return (
            event.type === 'damage' &&
            event.timestamp >= intervalStart &&
            event.timestamp < intervalEnd &&
            event.sourceID != null &&
            playerIds.has(String(event.sourceID))
          );
        })
        .reduce((sum, event) => {
          // Type assertion since we know this is a damage event
          const damageEvent = event as { amount?: number };
          return sum + (Number(damageEvent.amount) || 0);
        }, 0);

      damageTimeline.push({ timestamp, damage: intervalDamage });
    }

    // Identify active damage phases separated by gaps of 2+ seconds with zero damage
    let phaseCounter = 1;
    let currentPhaseStart: number | null = null;
    let gapStart: number | null = null;

    for (let i = 0; i < damageTimeline.length; i++) {
      const { timestamp, damage } = damageTimeline[i];

      if (damage > 0) {
        // We have damage - either continue existing phase or start new one
        if (gapStart !== null) {
          const gapDuration = timestamp - gapStart;

          if (gapDuration >= GAP_THRESHOLD && currentPhaseStart !== null) {
            // End the previous phase at the start of the gap
            const phaseEndTime = gapStart;

            // Calculate damage for the completed phase
            let phaseDamage = 0;
            for (const point of damageTimeline) {
              if (point.timestamp >= currentPhaseStart && point.timestamp < phaseEndTime) {
                phaseDamage += point.damage;
              }
            }

            phases.push({
              id: phaseCounter,
              startTime: currentPhaseStart,
              endTime: phaseEndTime,
              label: `Phase ${phaseCounter}`,
              totalDamage: phaseDamage,
            });

            phaseCounter++;
            currentPhaseStart = timestamp; // Start new phase when damage resumes
          }
          gapStart = null;
        } else if (currentPhaseStart === null) {
          // First damage event - start the first phase
          currentPhaseStart = timestamp;
        }
      } else {
        // No damage - start tracking a potential gap
        if (currentPhaseStart !== null && gapStart === null) {
          gapStart = timestamp;
        }
      }
    }

    // Add the final phase if we were in one
    if (currentPhaseStart !== null) {
      let finalPhaseDamage = 0;
      const phaseEndTime = gapStart !== null ? gapStart : fightEnd;

      for (const point of damageTimeline) {
        if (point.timestamp >= currentPhaseStart && point.timestamp <= phaseEndTime) {
          finalPhaseDamage += point.damage;
        }
      }

      phases.push({
        id: phaseCounter,
        startTime: currentPhaseStart,
        endTime: phaseEndTime,
        label: `Phase ${phaseCounter}`,
        totalDamage: finalPhaseDamage,
      });
    }

    return phases;
  }, [events, fight?.startTime, fight?.endTime, playerActors]);

  // Extract location data from resource change events - focusing on tanks only
  const locationData = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime || playerActors.length === 0) return [];

    const points: LocationPoint[] = [];
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Get only tank players
    const tankActors = playerActors.filter((player) => player.role === 'tank');

    // Filter events for this fight and extract position data for tanks only
    events.forEach((event: EventType) => {
      if (event.timestamp < fightStart || event.timestamp > fightEnd) {
        return;
      }

      // Look for resource change events which contain position data
      if (event.type === 'resourcechange') {
        const resourceEvent = event as ResourceChangeEvent;
        const resources = resourceEvent.targetResources;

        if (resources && resources.x !== undefined && resources.y !== undefined) {
          const targetId = String(resourceEvent.targetID || resourceEvent.target || '');
          const tankActor = tankActors.find((p) => p.id === targetId);

          // Only track tanks
          if (tankActor) {
            points.push({
              x: resources.x,
              y: resources.y,
              timestamp: event.timestamp,
              playerId: targetId,
              playerName: tankActor.name,
              role: tankActor.role,
            });
          }
        }
      }
    });

    // Sort points by timestamp for movement tracking
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [events, fight, playerActors]);

  // Filter location data by selected player and phase
  const filteredLocationData = React.useMemo(() => {
    let filtered = locationData;

    // Filter by player
    if (selectedPlayer !== 'all') {
      filtered = filtered.filter((point) => point.playerId === selectedPlayer);
    }

    // Filter by phase
    if (selectedPhase !== 'all') {
      const phase = fightPhases.find((p) => p.id === selectedPhase);
      if (phase) {
        filtered = filtered.filter(
          (point) => point.timestamp >= phase.startTime && point.timestamp <= phase.endTime
        );
      }
    }

    return filtered;
  }, [locationData, selectedPlayer, selectedPhase, fightPhases]);

  // Create voxelized heatmap for tank movement tracking
  const heatmapVoxels = React.useMemo(() => {
    const voxelMap = new Map<string, VoxelData>();

    // Helper function to get voxel key from coordinates
    const getVoxelKey = (x: number, y: number) => {
      const voxelX = Math.floor(x / VOXEL_SIZE) * VOXEL_SIZE;
      const voxelY = Math.floor(y / VOXEL_SIZE) * VOXEL_SIZE;
      return `${voxelX},${voxelY}`;
    };

    // Helper function to get voxel center coordinates
    const getVoxelCenter = (voxelKey: string) => {
      const [voxelX, voxelY] = voxelKey.split(',').map(Number);
      return { x: voxelX + VOXEL_SIZE / 2, y: voxelY + VOXEL_SIZE / 2 };
    };

    // Sort location data by timestamp for proper movement tracking
    const sortedLocationData = [...filteredLocationData].sort((a, b) => a.timestamp - b.timestamp);

    // Track tank movement - calculate time spent in each voxel
    const tankMovementTracker = new Map<string, Map<string, number>>();

    // Group points by player for time calculation
    const playerPoints = new Map<string, LocationPoint[]>();
    sortedLocationData.forEach((point) => {
      if (!playerPoints.has(point.playerId)) {
        playerPoints.set(point.playerId, []);
      }
      const playerPointList = playerPoints.get(point.playerId);
      if (playerPointList) {
        playerPointList.push(point);
      }
    });

    // Calculate time spent per voxel per player
    playerPoints.forEach((points, playerId) => {
      if (!tankMovementTracker.has(playerId)) {
        tankMovementTracker.set(playerId, new Map());
      }

      const playerTracker = tankMovementTracker.get(playerId);
      if (!playerTracker) return;

      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const nextPoint = points[i + 1];
        const voxelKey = getVoxelKey(currentPoint.x, currentPoint.y);

        // Calculate duration this player spent in this voxel
        // Time until next position update, or default duration for last point
        const duration = nextPoint ? nextPoint.timestamp - currentPoint.timestamp : 1000; // 1 second default for last position

        // Add time to player's voxel tracker
        const currentTime = playerTracker.get(voxelKey) || 0;
        playerTracker.set(voxelKey, currentTime + duration);

        // Initialize or update voxel in main map
        if (!voxelMap.has(voxelKey)) {
          const center = getVoxelCenter(voxelKey);
          voxelMap.set(voxelKey, {
            x: center.x,
            y: center.y,
            timeSpent: 0,
            players: new Set(),
            lastTimestamp: new Map(),
            role: 'tank',
          });
        }

        const voxel = voxelMap.get(voxelKey);
        if (voxel) {
          voxel.players.add(playerId);
        }
      }
    });

    // Calculate total time spent per voxel across all tanks
    voxelMap.forEach((voxel, voxelKey) => {
      voxel.timeSpent = Array.from(voxel.players).reduce((total, playerId) => {
        const playerMovements = tankMovementTracker.get(playerId);
        return total + (playerMovements?.get(voxelKey) || 0);
      }, 0);
    });

    // Filter voxels that meet the minimum time threshold
    const significantVoxels: VoxelData[] = [];
    voxelMap.forEach((voxel) => {
      if (voxel.timeSpent >= MIN_TIME_THRESHOLD) {
        significantVoxels.push(voxel);
      }
    });

    return significantVoxels;
  }, [filteredLocationData]);

  // Generate ELMS markers from significant voxels
  // Generate ELMS markers from tank-specific movement data
  const elmsMarkers = React.useMemo(() => {
    const markers: ELMSMarker[] = [];

    // Get all tanks that have position data
    const tanksWithData = new Set(locationData.map((point) => point.playerId));
    const tankActors = playerActors.filter(
      (player) => player.role === 'tank' && tanksWithData.has(player.id)
    );

    // Track time spent per tank per voxel
    const tankMovementData = new Map<
      string,
      Map<string, { timeSpent: number; voxel: VoxelData }>
    >();

    // Initialize tracking for each tank
    tankActors.forEach((tank) => {
      tankMovementData.set(tank.id, new Map());
    });

    // Calculate time spent per tank per voxel from the sorted location data
    const playerPoints = new Map<string, LocationPoint[]>();
    locationData.forEach((point) => {
      if (!playerPoints.has(point.playerId)) {
        playerPoints.set(point.playerId, []);
      }
      const playerPointList = playerPoints.get(point.playerId);
      if (playerPointList) {
        playerPointList.push(point);
      }
    });

    // Calculate time spent for each tank in each voxel
    playerPoints.forEach((points, playerId) => {
      const tankData = tankMovementData.get(playerId);
      if (!tankData) return;

      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const nextPoint = points[i + 1];

        // Find the voxel this position belongs to
        const voxelX = Math.floor(currentPoint.x / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
        const voxelY = Math.floor(currentPoint.y / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
        const voxelKey = `${voxelX},${voxelY}`;

        // Find matching voxel from heatmapVoxels
        const matchingVoxel = heatmapVoxels.find((v) => v.x === voxelX && v.y === voxelY);
        if (!matchingVoxel) continue;

        // Calculate duration spent in this position
        const duration = nextPoint ? nextPoint.timestamp - currentPoint.timestamp : 1000; // 1 second default for last position

        const existing = tankData.get(voxelKey);
        if (existing) {
          existing.timeSpent += duration;
        } else {
          tankData.set(voxelKey, { timeSpent: duration, voxel: matchingVoxel });
        }
      }
    });

    // Generate top markers for each tank based on time spent
    tankActors.forEach((tank) => {
      const tankData = tankMovementData.get(tank.id);
      if (tankData) {
        const topVoxels = Array.from(tankData.values())
          .sort((a, b) => b.timeSpent - a.timeSpent)
          .slice(0, TOP_POSITIONS_PER_TANK);

        topVoxels.forEach((voxelData, index) => {
          const timeInSeconds = Math.round(voxelData.timeSpent / 1000);
          markers.push({
            x: voxelData.voxel.x,
            y: voxelData.voxel.y,
            role: 'tank',
            description: `${tank.name} Position ${index + 1} (${timeInSeconds}s)`,
            tankId: tank.id,
          });
        });
      }
    });

    return markers;
  }, [heatmapVoxels, locationData, playerActors]);

  // Handle player selection change
  const handlePlayerChange = (event: SelectChangeEvent) => {
    setSelectedPlayer(event.target.value);
  };

  // Handle phase selection change
  const handlePhaseChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedPhase(value === 'all' ? 'all' : Number(value));
  };

  // Generate ELMS code
  const generateELMSCode = () => {
    let elmsCode = '// ELMS Markers Generated from Fight Data\n';
    elmsCode += '// Copy this into ELMS addon\n';
    elmsCode += '// Red markers = First Tank, Orange markers = Second Tank\n\n';

    // Get unique tank IDs to assign consistent colors
    const uniqueTankIds = Array.from(
      new Set(elmsMarkers.map((marker) => marker.tankId).filter(Boolean))
    );

    elmsMarkers.forEach((marker, index) => {
      let color = 'red'; // default color

      if (marker.role === 'tank' && marker.tankId) {
        const tankIndex = uniqueTankIds.indexOf(marker.tankId);
        color = tankIndex === 0 ? 'red' : tankIndex === 1 ? 'orange' : 'red';
      } else if (marker.role === 'healer') {
        color = 'green';
      } else if (marker.role === 'dps') {
        color = 'blue';
      }

      elmsCode += `-- ${marker.description}\n`;
      elmsCode += `/script ELMS.AddMarker(${marker.x}, ${marker.y}, "${marker.description}", "${color}")\n\n`;
    });

    return elmsCode;
  };

  // Copy ELMS code to clipboard
  const copyELMSCode = () => {
    const code = generateELMSCode();
    navigator.clipboard.writeText(code).then(() => {
      // Could show a toast notification here
      console.log('ELMS code copied to clipboard');
    });
  };

  // Calculate map bounds
  const mapBounds = React.useMemo(() => {
    if (locationData.length === 0) {
      return { minX: 0, maxX: DEFAULT_MAP_SIZE, minY: 0, maxY: DEFAULT_MAP_SIZE };
    }

    const xs = locationData.map((p) => p.x);
    const ys = locationData.map((p) => p.y);

    return {
      minX: Math.min(...xs) - MAP_BOUNDS_PADDING,
      maxX: Math.max(...xs) + MAP_BOUNDS_PADDING,
      minY: Math.min(...ys) - MAP_BOUNDS_PADDING,
      maxY: Math.max(...ys) + MAP_BOUNDS_PADDING,
    };
  }, [locationData]);

  if (locationData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Tank Movement Tracker & ELMS Markers
        </Typography>
        <Alert severity="info">
          No tank position data found in this fight. Position data is extracted from resource change
          events and requires tanks to be present in the encounter.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Icon */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <PlaceIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Tank Movement Tracker & ELMS Markers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track tank movement patterns through position updates based on time spent in each area
          </Typography>
        </Box>
      </Stack>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Controls & Filters
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 200, flexGrow: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Tank Filter</InputLabel>
                <Select value={selectedPlayer} label="Tank Filter" onChange={handlePlayerChange}>
                  <MenuItem value="all">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GroupIcon fontSize="small" />
                      <span>All Tanks</span>
                    </Stack>
                  </MenuItem>
                  {playerActors
                    .filter((player) => player.role === 'tank')
                    .map((player, index) => {
                      const tankColor = index === 0 ? 'error' : 'warning'; // First tank red, second tank orange
                      const tankColorName = index === 0 ? 'RED' : 'ORANGE';

                      return (
                        <MenuItem key={player.id} value={player.id}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ width: '100%' }}
                          >
                            <Box sx={{ flexGrow: 1 }}>{player.name}</Box>
                            <Chip label={`${tankColorName} TANK`} size="small" color={tankColor} />
                          </Stack>
                        </MenuItem>
                      );
                    })}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 200, flexGrow: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Fight Phase</InputLabel>
                <Select
                  value={selectedPhase === 'all' ? 'all' : String(selectedPhase)}
                  label="Fight Phase"
                  onChange={handlePhaseChange}
                >
                  <MenuItem value="all">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TimelineIcon fontSize="small" />
                      <span>All Phases</span>
                    </Stack>
                  </MenuItem>
                  {fightPhases.map((phase) => (
                    <MenuItem key={phase.id} value={String(phase.id)}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                        <Box sx={{ flexGrow: 1 }}>{phase.label}</Box>
                        <Chip
                          label={`${Math.round((phase.endTime - phase.startTime) / 1000)}s`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 160 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {showHeatmap ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                    <span>Heatmap</span>
                  </Stack>
                }
              />
            </Box>

            <Box sx={{ minWidth: 160 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {showMarkers ? (
                      <VisibilityIcon fontSize="small" />
                    ) : (
                      <VisibilityOffIcon fontSize="small" />
                    )}
                    <span>ELMS Markers</span>
                  </Stack>
                }
              />
            </Box>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 300 }}>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <AssessmentIcon fontSize="small" />
                Voxel Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Map divided into 50x50 unit grid cells, showing only voxels where players spent ≥30
                seconds
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 300 }}>
            <Stack spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <TimelineIcon fontSize="small" />
                Phase Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fightPhases.length} active combat phase{fightPhases.length !== 1 ? 's' : ''}{' '}
                separated by 2+ second damage gaps
              </Typography>
              {selectedPhase !== 'all' && (
                <Chip
                  label={`Viewing: ${fightPhases.find((p) => p.id === selectedPhase)?.label}`}
                  color="primary"
                  size="small"
                />
              )}
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* Heatmap Visualization */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaceIcon />
            Position Heatmap
            {selectedPhase !== 'all' && (
              <Chip
                label={fightPhases.find((p) => p.id === selectedPhase)?.label || 'Unknown Phase'}
                color="primary"
                size="small"
              />
            )}
          </Typography>

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 400,
              border: '1px solid #ccc',
              background:
                'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              overflow: 'hidden',
            }}
          >
            {/* Coordinate system labels */}
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: 5,
                left: 5,
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 4px',
                borderRadius: 1,
              }}
            >
              ({mapBounds.minX}, {mapBounds.maxY})
            </Typography>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 5,
                right: 5,
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 4px',
                borderRadius: 1,
              }}
            >
              ({mapBounds.maxX}, {mapBounds.minY})
            </Typography>

            {/* Heatmap voxels */}
            {showHeatmap &&
              heatmapVoxels.map((voxel, index) => {
                const normalizedX =
                  ((voxel.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * 100;
                const normalizedY =
                  ((mapBounds.maxY - voxel.y) / (mapBounds.maxY - mapBounds.minY)) * 100;

                // Voxel size is fixed at 50x50 units, scale appropriately for display
                const voxelDisplaySize = Math.max(
                  (50 / (mapBounds.maxX - mapBounds.minX)) * 400, // 400px is approximate map width
                  20 // Minimum size for visibility (increased from 8 for larger voxels)
                );

                // Color intensity based on time spent (normalize to 30s-300s range)
                const timeSeconds = voxel.timeSpent / 1000;
                const intensity = Math.min(Math.max((timeSeconds - 30) / 270, 0.2), 1);

                // Color based on role
                let baseColor = 'rgba(255, 99, 71'; // Default red
                if (voxel.role === 'tank') baseColor = 'rgba(244, 67, 54';
                else if (voxel.role === 'healer') baseColor = 'rgba(76, 175, 80';
                else if (voxel.role === 'dps') baseColor = 'rgba(33, 150, 243';
                else baseColor = 'rgba(156, 39, 176'; // Purple for mixed

                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      left: `${normalizedX}%`,
                      top: `${normalizedY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: voxelDisplaySize,
                      height: voxelDisplaySize,
                      backgroundColor: `${baseColor}, ${intensity})`,
                      border: `1px solid ${baseColor}, 0.8)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: 'white',
                      textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                    }}
                    title={`${Math.round(timeSeconds)}s spent in this area (${voxel.players.size} players)`}
                  >
                    {Math.round(timeSeconds)}s
                  </Box>
                );
              })}

            {/* ELMS Markers */}
            {showMarkers &&
              elmsMarkers.map((marker, index) => {
                const normalizedX =
                  ((marker.x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * 100;
                const normalizedY =
                  ((mapBounds.maxY - marker.y) / (mapBounds.maxY - mapBounds.minY)) * 100;

                // Determine tank color based on tank ID
                let color = '#2196f3'; // default blue for DPS
                if (marker.role === 'tank' && marker.tankId) {
                  // Get unique tank IDs to assign consistent colors
                  const uniqueTankIds = Array.from(
                    new Set(elmsMarkers.map((m) => m.tankId).filter(Boolean))
                  );
                  const tankIndex = uniqueTankIds.indexOf(marker.tankId);
                  color = tankIndex === 0 ? '#f44336' : tankIndex === 1 ? '#ff9800' : '#f44336'; // Red for first tank, orange for second tank
                } else if (marker.role === 'healer') {
                  color = '#4caf50'; // green for healers
                } else if (marker.role === 'tank') {
                  color = '#f44336'; // fallback red for tanks without ID
                }

                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      left: `${normalizedX}%`,
                      top: `${normalizedY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 20,
                      height: 20,
                      backgroundColor: color,
                      border: '2px solid white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                    title={marker.description}
                  >
                    {marker.role === 'tank' ? 'T' : marker.role === 'healer' ? 'H' : 'D'}
                  </Box>
                );
              })}
          </Box>
        </Stack>
      </Paper>

      {/* Statistics */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          Tank Movement Statistics
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Tooltip title="Total number of tank position updates from resource change events" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {locationData.length.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tank Position Updates
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip
            title="Voxels where tanks spent 3 or more seconds showing tank movement patterns"
            arrow
          >
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {heatmapVoxels.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Movement Hotspots
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip title="Generated movement markers for frequently visited tank positions" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {elmsMarkers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Movement Markers
                </Typography>
                {(() => {
                  const uniqueTankIds = Array.from(
                    new Set(elmsMarkers.map((m) => m.tankId).filter(Boolean))
                  );
                  if (uniqueTankIds.length > 1) {
                    const redMarkers = elmsMarkers.filter((m) => {
                      if (!m.tankId) return false;
                      return uniqueTankIds.indexOf(m.tankId) === 0;
                    }).length;
                    const orangeMarkers = elmsMarkers.filter((m) => {
                      if (!m.tankId) return false;
                      return uniqueTankIds.indexOf(m.tankId) === 1;
                    }).length;

                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        {redMarkers > 0 && (
                          <Chip
                            label={`${redMarkers} Red`}
                            size="small"
                            sx={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.75rem' }}
                          />
                        )}
                        {orangeMarkers > 0 && (
                          <Chip
                            label={`${orangeMarkers} Orange`}
                            size="small"
                            sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip title="Active combat phases detected in the fight" arrow>
            <Card sx={{ minWidth: 160, flexGrow: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {fightPhases.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Combat Phases
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>

          {selectedPhase !== 'all' && (
            <Tooltip title="Duration of the currently selected phase" arrow>
              <Card
                sx={{
                  minWidth: 160,
                  flexGrow: 1,
                  border: '2px solid',
                  borderColor: 'primary.main',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {(() => {
                      const phase = fightPhases.find((p) => p.id === selectedPhase);
                      return phase ? Math.round((phase.endTime - phase.startTime) / 1000) : 0;
                    })()}
                    s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phase Duration
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {/* Individual Tank Movement Breakdown */}
      {(() => {
        const tanksWithData = playerActors.filter(
          (player) =>
            player.role === 'tank' && locationData.some((point) => point.playerId === player.id)
        );

        if (tanksWithData.length > 0) {
          return (
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
              <Typography
                variant="h6"
                sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <GroupIcon />
                Individual Tank Movement Analysis
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tanksWithData.map((tank, index) => {
                  const tankPositions = locationData.filter((point) => point.playerId === tank.id);
                  const tankVoxels = heatmapVoxels.filter((voxel) => voxel.players.has(tank.id));
                  const topVoxels = tankVoxels
                    .sort((a, b) => b.timeSpent - a.timeSpent)
                    .slice(0, TOP_POSITIONS_PER_TANK);

                  // Assign different colors for different tanks
                  const tankColor = index === 0 ? 'error' : 'warning'; // First tank red, second tank orange
                  const tankColorName = index === 0 ? 'RED' : 'ORANGE';

                  return (
                    <Card key={tank.id} variant="outlined" sx={{ p: 2 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Chip label={`${tankColorName} TANK`} size="small" color={tankColor} />
                        {tank.name}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {tankPositions.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Position Updates
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {tankVoxels.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Unique Areas
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {Math.min(TOP_POSITIONS_PER_TANK, topVoxels.length)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Top Positions
                          </Typography>
                        </Box>
                      </Box>

                      {topVoxels.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Most Time-Intensive Positions:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {topVoxels.map((voxel, index) => {
                              const timeInSeconds = Math.round(voxel.timeSpent / 1000);
                              return (
                                <Chip
                                  key={`${voxel.x}-${voxel.y}`}
                                  label={`#${index + 1}: ${timeInSeconds}s`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Box>
            </Paper>
          );
        }
        return null;
      })()}

      {/* Fight Phase Details */}
      {fightPhases.length > 1 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Active Combat Phase Analysis
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each phase represents a period of active combat. Phases are separated by gaps of 2+
            seconds where no friendly damage is dealt.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {fightPhases.map((phase, index) => (
              <Box
                key={phase.id}
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: selectedPhase === phase.id ? '#f5f5f5' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f9f9f9' },
                }}
                onClick={() => setSelectedPhase(phase.id)}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {phase.label} - Active Combat
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round((phase.endTime - phase.startTime) / 1000)}s active
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                  <Typography variant="body2">
                    Start: {new Date(phase.startTime).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">
                    End: {new Date(phase.endTime).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">
                    Total Damage: {phase.totalDamage.toLocaleString()}
                  </Typography>
                </Box>

                {index < fightPhases.length - 1 &&
                  (() => {
                    const nextPhase = fightPhases[index + 1];
                    const gapDuration = Math.round((nextPhase.startTime - phase.endTime) / 1000);
                    return (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {gapDuration}s gap until next phase begins
                      </Typography>
                    );
                  })()}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedPhase('all')}
              disabled={selectedPhase === 'all'}
              startIcon={<TimelineIcon />}
            >
              View All Phases
            </Button>
            <Typography variant="body2" color="text.secondary">
              Click on a phase above to view its heatmap data individually
            </Typography>
          </Box>
        </Paper>
      )}

      {/* ELMS Code Generation */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlaceIcon />
              ELMS Marker Code
              <Badge badgeContent={elmsMarkers.length} color="primary">
                <Chip label="Markers" size="small" variant="outlined" />
              </Badge>
            </Typography>
            <Tooltip title="Copy generated ELMS code to clipboard" arrow>
              <Button
                variant="contained"
                onClick={copyELMSCode}
                disabled={elmsMarkers.length === 0}
                startIcon={<AssessmentIcon />}
                sx={{ borderRadius: 2 }}
              >
                Copy to Clipboard
              </Button>
            </Tooltip>
          </Box>

          <Box
            component="pre"
            sx={{
              backgroundColor: 'grey.100',
              border: '1px solid',
              borderColor: 'grey.300',
              p: 2,
              borderRadius: 2,
              overflow: 'auto',
              maxHeight: 300,
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: 1.4,
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            {generateELMSCode()}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LocationHeatmapPanel;
