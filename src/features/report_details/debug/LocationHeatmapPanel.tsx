import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { selectLocationHeatmapData } from '../../../store/crossSliceSelectors';
import { KnownAbilities } from '../../../types/abilities';
import { LogEvent, ResourceChangeEvent, BuffEvent } from '../../../types/combatlogEvents';
import { resolveActorName } from '../../../utils/resolveActorName';

import LocationHeatmapPanelView from './LocationHeatmapPanelView';

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
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { events, actorsById, eventPlayers } = useSelector(selectLocationHeatmapData);

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
  const fightPhases = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    const phases: FightPhase[] = [];
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const GAP_THRESHOLD = FIGHT_PHASE_GAP_THRESHOLD;
    const TIME_INTERVAL = FIGHT_PHASE_TIME_INTERVAL;

    // Get all player IDs for friendly damage tracking
    const playerIds = new Set(playerActors.map((player) => player.id));

    // Calculate damage over time in 1-second intervals
    const damageTimeline: Array<{ timestamp: number; damage: number }> = [];

    for (let timestamp = fightStart; timestamp <= fightEnd; timestamp += TIME_INTERVAL) {
      const intervalStart = timestamp;
      const intervalEnd = timestamp + TIME_INTERVAL;

      // Sum damage from friendly sources (players) in this interval
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
          const damageEvent = event as { amount?: number };
          return sum + (Number(damageEvent.amount) || 0);
        }, 0);

      damageTimeline.push({ timestamp, damage: intervalDamage });
    }

    // Identify active damage phases separated by gaps
    let phaseCounter = 1;
    let currentPhaseStart: number | null = null;
    let gapStart: number | null = null;

    for (let i = 0; i < damageTimeline.length; i++) {
      const { timestamp, damage } = damageTimeline[i];

      if (damage > 0) {
        if (gapStart !== null) {
          const gapDuration = timestamp - gapStart;

          if (gapDuration >= GAP_THRESHOLD && currentPhaseStart !== null) {
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
            currentPhaseStart = timestamp;
          }
          gapStart = null;
        } else if (currentPhaseStart === null) {
          currentPhaseStart = timestamp;
        }
      } else {
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
    events.forEach((event: LogEvent) => {
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
        const duration = nextPoint ? nextPoint.timestamp - currentPoint.timestamp : 1000;

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
        const duration = nextPoint ? nextPoint.timestamp - currentPoint.timestamp : 1000;

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

  // Event handlers
  const handlePlayerChange = React.useCallback((event: SelectChangeEvent) => {
    setSelectedPlayer(event.target.value);
  }, []);

  const handlePhaseChange = React.useCallback((event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedPhase(value === 'all' ? 'all' : Number(value));
  }, []);

  const handleShowHeatmapChange = React.useCallback((checked: boolean) => {
    setShowHeatmap(checked);
  }, []);

  const handleShowMarkersChange = React.useCallback((checked: boolean) => {
    setShowMarkers(checked);
  }, []);

  const handlePhaseClick = React.useCallback((phaseId: number) => {
    setSelectedPhase(phaseId);
  }, []);

  const handleViewAllPhases = React.useCallback(() => {
    setSelectedPhase('all');
  }, []);

  // Generate ELMS code
  const generateELMSCode = React.useCallback(() => {
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
  }, [elmsMarkers]);

  // Copy ELMS code to clipboard
  const copyELMSCode = React.useCallback(() => {
    const code = generateELMSCode();
    navigator.clipboard.writeText(code).then(() => {
      console.log('ELMS code copied to clipboard');
    });
  }, [generateELMSCode]);

  return (
    <LocationHeatmapPanelView
      locationData={locationData}
      playerActors={playerActors}
      fightPhases={fightPhases}
      filteredLocationData={filteredLocationData}
      heatmapVoxels={heatmapVoxels}
      elmsMarkers={elmsMarkers}
      mapBounds={mapBounds}
      selectedPlayer={selectedPlayer}
      showHeatmap={showHeatmap}
      showMarkers={showMarkers}
      selectedPhase={selectedPhase}
      onPlayerChange={handlePlayerChange}
      onPhaseChange={handlePhaseChange}
      onShowHeatmapChange={handleShowHeatmapChange}
      onShowMarkersChange={handleShowMarkersChange}
      onPhaseClick={handlePhaseClick}
      onViewAllPhases={handleViewAllPhases}
      onCopyELMSCode={copyELMSCode}
      generateELMSCode={generateELMSCode}
    />
  );
};

export default LocationHeatmapPanel;