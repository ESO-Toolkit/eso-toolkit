/**
 * Path processing utilities for multi-player trail rendering
 * 
 * Handles path sampling, smoothing, and optimization for 3D trail visualization
 */

import * as THREE from 'three';

import { 
  ActorPosition, 
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp 
} from '../../../workers/calculations/CalculateActorPositions';

/**
 * Processed path point for rendering
 */
export interface PathPoint {
  position: [number, number, number];
  timestamp: number;
  actorId: number;
  rotation?: number;
}

/**
 * Player path trail data
 */
export interface PlayerPath {
  actorId: number;
  name: string;
  role?: string;
  points: PathPoint[];
  color: string;
  visible: boolean;
}

/**
 * Path sampling configuration
 */
export interface PathSamplingConfig {
  /** Minimum time between path samples (ms) */
  minSampleInterval: number;
  
  /** Minimum distance between path points (world units) */
  minDistance: number;
  
  /** Maximum number of points per path (for performance) */
  maxPoints: number;
  
  /** Smoothing factor (0 = no smoothing, 1 = maximum smoothing) */
  smoothingFactor: number;
  
  /** Whether to include rotation data */
  includeRotation: boolean;
}

/**
 * Default path sampling configuration
 */
export const DEFAULT_PATH_SAMPLING: PathSamplingConfig = {
  minSampleInterval: 100,    // 100ms between samples (10fps)
  minDistance: 0.5,          // 0.5 world units minimum movement
  maxPoints: 1000,           // Maximum 1000 points per trail
  smoothingFactor: 0.2,      // Light smoothing
  includeRotation: true,
};

/**
 * Extract and process player paths from position lookup data
 */
export function extractPlayerPaths(
  lookup: TimestampPositionLookup,
  selectedActorIds: number[],
  config: PathSamplingConfig = DEFAULT_PATH_SAMPLING
): Map<number, PlayerPath> {
  const paths = new Map<number, PlayerPath>();
  
  if (!lookup?.positionsByTimestamp) {
    return paths;
  }

  // Initialize paths for selected actors
  for (const actorId of selectedActorIds) {
    paths.set(actorId, {
      actorId,
      name: `Player ${actorId}`,
      role: undefined,
      points: [],
      color: '#ffffff', // Will be set by color manager
      visible: true,
    });
  }

  // Get sorted timestamps
  const timestamps = Object.keys(lookup.positionsByTimestamp)
    .map(Number)
    .sort((a, b) => a - b);

  let lastSampleTime = 0;
  
  // Sample positions at regular intervals
  for (const timestamp of timestamps) {
    // Skip if too soon since last sample
    if (timestamp - lastSampleTime < config.minSampleInterval) {
      continue;
    }

    const positions = getAllActorPositionsAtTimestamp(lookup, timestamp);
    
    for (const actorData of positions) {
      const path = paths.get(actorData.id);
      if (!path) continue;

      // Update name and role from first valid data
      if (actorData.name && path.name === `Player ${actorData.id}`) {
        path.name = actorData.name;
        path.role = actorData.role;
      }

      const newPoint: PathPoint = {
        position: [...actorData.position] as [number, number, number],
        timestamp,
        actorId: actorData.id,
        rotation: config.includeRotation ? actorData.rotation : undefined,
      };

      // Check minimum distance from last point
      const lastPoint = path.points[path.points.length - 1];
      if (lastPoint) {
        const distance = calculateDistance3D(lastPoint.position, newPoint.position);
        if (distance < config.minDistance) {
          continue; // Skip points that are too close
        }
      }

      path.points.push(newPoint);

      // Enforce maximum points limit
      if (path.points.length > config.maxPoints) {
        path.points.shift(); // Remove oldest point
      }
    }

    lastSampleTime = timestamp;
  }

  // Apply smoothing if enabled
  if (config.smoothingFactor > 0) {
    for (const path of paths.values()) {
      path.points = smoothPath(path.points, config.smoothingFactor);
    }
  }

  return paths;
}

/**
 * Calculate 3D distance between two points
 */
function calculateDistance3D(
  point1: [number, number, number], 
  point2: [number, number, number]
): number {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Apply smoothing to path points using moving average
 */
function smoothPath(points: PathPoint[], factor: number): PathPoint[] {
  if (points.length < 3 || factor <= 0) {
    return points;
  }

  const smoothed: PathPoint[] = [];
  const windowSize = Math.max(3, Math.floor(5 * factor));
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length, i + halfWindow + 1);
    const windowPoints = points.slice(start, end);

    // Calculate weighted average position
    let x = 0, y = 0, z = 0;
    let totalWeight = 0;

    for (let j = 0; j < windowPoints.length; j++) {
      // Gaussian weight (higher weight for closer points)
      const distance = Math.abs(j - (windowPoints.length / 2));
      const weight = Math.exp(-(distance * distance) / (2 * factor * factor));
      
      x += windowPoints[j].position[0] * weight;
      y += windowPoints[j].position[1] * weight;
      z += windowPoints[j].position[2] * weight;
      totalWeight += weight;
    }

    // Keep original point data but update position
    smoothed.push({
      ...points[i],
      position: [x / totalWeight, y / totalWeight, z / totalWeight],
    });
  }

  return smoothed;
}

/**
 * Get path points up to a specific timestamp (for animated playback)
 */
export function getPathPointsUpToTime(
  path: PlayerPath, 
  currentTime: number
): PathPoint[] {
  return path.points.filter(point => point.timestamp <= currentTime);
}

/**
 * Create THREE.js geometry for path trail
 */
export function createPathGeometry(points: PathPoint[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  if (points.length === 0) {
    return geometry;
  }

  // Create positions array
  const positions = new Float32Array(points.length * 3);
  const timestamps = new Float32Array(points.length);
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    positions[i * 3] = point.position[0];
    positions[i * 3 + 1] = point.position[1];
    positions[i * 3 + 2] = point.position[2];
    timestamps[i] = point.timestamp;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('timestamp', new THREE.BufferAttribute(timestamps, 1));

  return geometry;
}

/**
 * Update existing geometry with new path points (for performance)
 */
export function updatePathGeometry(
  geometry: THREE.BufferGeometry, 
  points: PathPoint[]
): void {
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
  const timestampAttribute = geometry.getAttribute('timestamp') as THREE.BufferAttribute;

  // Ensure arrays are large enough
  if (!positionAttribute || positionAttribute.count < points.length) {
    // Recreate geometry if not large enough
    const newGeometry = createPathGeometry(points);
    geometry.copy(newGeometry);
    newGeometry.dispose();
    return;
  }

  // Update existing attributes
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    positionAttribute.setXYZ(i, point.position[0], point.position[1], point.position[2]);
    timestampAttribute.setX(i, point.timestamp);
  }

  // Set draw range to only render valid points
  geometry.setDrawRange(0, points.length);
  
  positionAttribute.needsUpdate = true;
  timestampAttribute.needsUpdate = true;
}

/**
 * Calculate trail opacity based on point age
 */
export function calculateTrailOpacity(
  pointTimestamp: number,
  currentTime: number,
  fadeTime: number = 5000 // 5 seconds fade
): number {
  const age = currentTime - pointTimestamp;
  if (age < 0) return 0; // Future points
  if (age > fadeTime) return 0; // Too old
  
  // Linear fade from 1.0 to 0.0
  return Math.max(0, 1 - (age / fadeTime));
}

/**
 * Get visible player IDs from lookup data (actors that have position data)
 */
export function getVisiblePlayerIds(lookup: TimestampPositionLookup): number[] {
  if (!lookup?.positionsByTimestamp) {
    return [];
  }

  const playerIds = new Set<number>();
  
  // Sample a few timestamps to find all actors
  const timestamps = Object.keys(lookup.positionsByTimestamp).map(Number);
  const sampleTimestamps = timestamps.filter((_, index) => index % 10 === 0); // Every 10th timestamp
  
  for (const timestamp of sampleTimestamps) {
    const positions = getAllActorPositionsAtTimestamp(lookup, timestamp);
    for (const actor of positions) {
      // Only include actual players (not enemies, bosses, or NPCs)
      if (actor.type === 'player') {
        playerIds.add(actor.id);
      }
    }
  }

  return Array.from(playerIds).sort((a, b) => a - b);
}

/**
 * Get player information (name, role) from lookup data
 */
export function getPlayerInfo(
  lookup: TimestampPositionLookup,
  playerId: number
): { name: string; role?: 'dps' | 'tank' | 'healer' } | null {
  if (!lookup?.positionsByTimestamp) {
    return null;
  }

  // Find the first timestamp where this player appears
  const timestamps = Object.keys(lookup.positionsByTimestamp).map(Number);
  for (const timestamp of timestamps) {
    const positions = lookup.positionsByTimestamp[timestamp];
    const actor = positions?.[playerId];
    if (actor && actor.type === 'player') {
      return {
        name: actor.name,
        role: actor.role,
      };
    }
  }

  return null;
}