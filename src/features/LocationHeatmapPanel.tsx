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
}

interface LocationHeatmapPanelProps {
  fight: FightFragment;
}

const LocationHeatmapPanel: React.FC<LocationHeatmapPanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const eventPlayers = useSelector((state: RootState) => state.events.players);

  const [selectedPlayer, setSelectedPlayer] = React.useState<string>('all');
  const [showHeatmap, setShowHeatmap] = React.useState<boolean>(true);
  const [showMarkers, setShowMarkers] = React.useState<boolean>(true);

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

  // Extract location data from events
  const locationData = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    const points: LocationPoint[] = [];
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;

    // Filter events for this fight and extract position data
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
          const playerActor = playerActors.find((p) => p.id === targetId);

          if (playerActor) {
            points.push({
              x: resources.x,
              y: resources.y,
              timestamp: event.timestamp,
              playerId: targetId,
              playerName: playerActor.name,
              role: playerActor.role,
            });
          }
        }
      }
    });

    return points;
  }, [events, fight, playerActors]);

  // Filter location data by selected player
  const filteredLocationData = React.useMemo(() => {
    if (selectedPlayer === 'all') return locationData;
    return locationData.filter((point) => point.playerId === selectedPlayer);
  }, [locationData, selectedPlayer]);

  // Create voxelized heatmap (20x20 unit voxels)
  const heatmapVoxels = React.useMemo(() => {
    const VOXEL_SIZE = 20; // 20x20 unit voxels
    const MIN_TIME_THRESHOLD = 15000; // 15 seconds in milliseconds

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

    // Sort location data by timestamp for proper time calculation
    const sortedLocationData = [...filteredLocationData].sort((a, b) => a.timestamp - b.timestamp);

    // Track player positions and calculate time spent in each voxel
    const playerLastPosition = new Map<string, { voxelKey: string; timestamp: number }>();

    sortedLocationData.forEach((point) => {
      const voxelKey = getVoxelKey(point.x, point.y);
      const lastPos = playerLastPosition.get(point.playerId);

      // Initialize voxel if it doesn't exist
      if (!voxelMap.has(voxelKey)) {
        const center = getVoxelCenter(voxelKey);
        voxelMap.set(voxelKey, {
          x: center.x,
          y: center.y,
          timeSpent: 0,
          players: new Set(),
          lastTimestamp: new Map(),
          role: 'mixed',
        });
      }

      const voxel = voxelMap.get(voxelKey);
      if (!voxel) return; // Skip if voxel doesn't exist

      voxel.players.add(point.playerId);

      // Calculate time spent if player was previously in a different voxel
      if (lastPos && lastPos.voxelKey !== voxelKey) {
        const prevVoxel = voxelMap.get(lastPos.voxelKey);
        if (prevVoxel) {
          const timeSpent = point.timestamp - lastPos.timestamp;
          prevVoxel.timeSpent += timeSpent;
        }
      }

      // Update player's last position
      playerLastPosition.set(point.playerId, {
        voxelKey,
        timestamp: point.timestamp,
      });

      voxel.lastTimestamp.set(point.playerId, point.timestamp);
    });

    // Calculate remaining time for players still in voxels at fight end
    if (fight?.endTime) {
      playerLastPosition.forEach((lastPos, playerId) => {
        const voxel = voxelMap.get(lastPos.voxelKey);
        if (voxel) {
          const timeSpent = fight.endTime - lastPos.timestamp;
          voxel.timeSpent += timeSpent;
        }
      });
    }

    // Filter voxels that meet the minimum time threshold and determine dominant role
    const significantVoxels: VoxelData[] = [];
    voxelMap.forEach((voxel) => {
      if (voxel.timeSpent >= MIN_TIME_THRESHOLD) {
        // Determine dominant role in this voxel
        const roleCount = { tank: 0, healer: 0, dps: 0 };
        const playersInVoxel = Array.from(voxel.players);

        playersInVoxel.forEach((playerId) => {
          const playerActor = playerActors.find((p) => p.id === playerId);
          if (playerActor) {
            roleCount[playerActor.role]++;
          }
        });

        // Set voxel role to the most common role, or 'mixed' if tie
        const maxCount = Math.max(roleCount.tank, roleCount.healer, roleCount.dps);
        const dominantRoles = Object.entries(roleCount)
          .filter(([_, count]) => count === maxCount)
          .map(([role]) => role);

        if (dominantRoles.length === 1) {
          voxel.role = dominantRoles[0] as 'tank' | 'healer' | 'dps';
        } else {
          voxel.role = 'mixed';
        }

        significantVoxels.push(voxel);
      }
    });

    return significantVoxels;
  }, [filteredLocationData, fight?.endTime, playerActors]);

  // Generate ELMS markers from significant voxels
  const elmsMarkers = React.useMemo(() => {
    const markers: ELMSMarker[] = [];

    // Group voxels by role and get top positions for each role
    const voxelsByRole = {
      tank: heatmapVoxels
        .filter((v) => v.role === 'tank')
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 3),
      dps: heatmapVoxels
        .filter((v) => v.role === 'dps')
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 5),
      healer: heatmapVoxels
        .filter((v) => v.role === 'healer')
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 2),
    };

    Object.entries(voxelsByRole).forEach(([role, voxels]) => {
      voxels.forEach((voxel, index) => {
        markers.push({
          x: voxel.x,
          y: voxel.y,
          role: role as 'tank' | 'dps' | 'healer',
          description: `${role.toUpperCase()} Position ${index + 1} (${Math.round(voxel.timeSpent / 1000)}s spent)`,
        });
      });
    });

    return markers;
  }, [heatmapVoxels]);

  // Handle player selection change
  const handlePlayerChange = (event: SelectChangeEvent) => {
    setSelectedPlayer(event.target.value);
  };

  // Generate ELMS code
  const generateELMSCode = () => {
    let elmsCode = '// ELMS Markers Generated from Fight Data\n';
    elmsCode += '// Copy this into ELMS addon\n\n';

    elmsMarkers.forEach((marker, index) => {
      const color = marker.role === 'tank' ? 'red' : marker.role === 'healer' ? 'green' : 'blue';
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
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
    }

    const xs = locationData.map((p) => p.x);
    const ys = locationData.map((p) => p.y);

    return {
      minX: Math.min(...xs) - 100,
      maxX: Math.max(...xs) + 100,
      minY: Math.min(...ys) - 100,
      maxY: Math.max(...ys) + 100,
    };
  }, [locationData]);

  if (locationData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Location Heatmap & ELMS Markers
        </Typography>
        <Alert severity="info">
          No position data found in this fight. Position data is only available in certain fight
          types and requires resource change events.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Location Heatmap & ELMS Markers
      </Typography>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Player Filter</InputLabel>
            <Select value={selectedPlayer} label="Player Filter" onChange={handlePlayerChange}>
              <MenuItem value="all">All Players</MenuItem>
              {playerActors.map((player) => (
                <MenuItem key={player.id} value={player.id}>
                  {player.name} ({player.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
            }
            label="Show Heatmap"
          />

          <FormControlLabel
            control={
              <Switch checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
            }
            label="Show ELMS Markers"
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 300 }}>
            <Typography gutterBottom>
              Voxel Analysis: Map divided into 50x50 unit grid cells
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Only showing voxels where players spent ≥30 seconds
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Heatmap Visualization */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Position Heatmap
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
              const color =
                marker.role === 'tank'
                  ? '#f44336'
                  : marker.role === 'healer'
                    ? '#4caf50'
                    : '#2196f3';

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
      </Paper>

      {/* Statistics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Statistics
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Card>
            <CardContent>
              <Typography variant="h6">{locationData.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total Position Points
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6">{heatmapVoxels.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Significant Voxels (≥30s)
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6">{elmsMarkers.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                ELMS Markers
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* ELMS Code Generation */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">ELMS Marker Code</Typography>
          <Button variant="contained" onClick={copyELMSCode} disabled={elmsMarkers.length === 0}>
            Copy to Clipboard
          </Button>
        </Box>

        <Box
          component="pre"
          sx={{
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: 200,
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {generateELMSCode()}
        </Box>
      </Paper>
    </Box>
  );
};

export default LocationHeatmapPanel;
