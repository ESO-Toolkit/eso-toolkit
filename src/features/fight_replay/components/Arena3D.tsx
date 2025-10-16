import { LockOpen } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Canvas } from '@react-three/fiber';
import React, { useMemo, useState, useEffect } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useActorPositionsTask } from '../../../hooks/workerTasks/useActorPositionsTask';
import { Logger, LogLevel } from '../../../utils/logger';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';

import { Arena3DScene } from './Arena3DScene';
import { PerformanceMonitorExternal } from './PerformanceMonitor/PerformanceMonitorExternal';
import { ReplayErrorBoundary } from './ReplayErrorBoundary';

// Create logger instance for Arena3D
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'Arena3D',
});

interface Arena3DProps {
  timeRef: React.RefObject<number> | { current: number };
  showActorNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  onCameraUnlock?: () => void;
  onActorClick?: (actorId: number) => void;
  /** Optional encoded map markers string to render markers in the arena (M0R or Elms format) */
  mapMarkersString?: string;
  /** Fight data for zone/map information (required for map markers coordinate transformation) */
  fight: FightFragment;
}

export const Arena3D: React.FC<Arena3DProps> = ({
  timeRef,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onCameraUnlock,
  onActorClick,
  mapMarkersString,
  fight,
}) => {
  const { lookup, isActorPositionsLoading } = useActorPositionsTask();

  // Calculate arena dimensions based on fight bounding box
  const arenaDimensions = useMemo(() => {
    const defaults = {
      size: 100,
      centerX: 50,
      centerZ: 50,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return defaults;
    }

    // Convert to arena coordinates (divide by 100)
    // Note: X is flipped in convertCoordinatesWithBottomLeft (100 - x/100)
    const arenaMinX = 100 - maxX / 100;
    const arenaMaxX = 100 - minX / 100;
    const arenaMinZ = minY / 100;
    const arenaMaxZ = maxY / 100;

    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;
    const maxRange = Math.max(rangeX, rangeZ);

    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    // Add 20% padding
    const size = maxRange * 1.2;

    return { size, centerX, centerZ };
  }, [fight.boundingBox]);

  // Calculate dynamic camera settings based on fight bounding box (same as in Scene)
  const cameraSettings = useMemo(() => {
    const defaults = {
      target: [50, 0, 50] as [number, number, number],
      minDistance: 5,
      maxDistance: 200,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return defaults;
    }

    const arenaMinX = minX / 100;
    const arenaMaxX = maxX / 100;
    const arenaMinZ = -(maxY / 100);
    const arenaMaxZ = -(minY / 100);

    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;
    const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
    const minDistance = Math.max(5, diagonal * 0.3);
    const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

    return {
      target: [centerX, 0, centerZ] as [number, number, number],
      minDistance,
      maxDistance,
    };
  }, [fight.boundingBox]);

  // State to track the currently followed actor ID for UI updates
  const [followingActorId, setFollowingActorId] = useState<number | null>(
    followingActorIdRef.current,
  );

  // Update state when ref changes (this will be triggered by actor clicks)
  useEffect(() => {
    const checkRefChanges = (): void => {
      if (followingActorIdRef.current !== followingActorId) {
        setFollowingActorId(followingActorIdRef.current);
      }
    };

    // Check periodically for ref changes
    const interval = setInterval(checkRefChanges, 100);
    return () => clearInterval(interval);
  }, [followingActorIdRef, followingActorId]);

  // Get the name of the actor being followed
  const followingActorName = useMemo(() => {
    if (!lookup || !followingActorId || !timeRef) return null;

    // Get the current time and actor position
    const currentTime = timeRef.current;
    const actorPosition = getActorPositionAtClosestTimestamp(lookup, followingActorId, currentTime);

    if (actorPosition) {
      return actorPosition.name || `Actor ${followingActorId}`;
    }
    return `Actor ${followingActorId}`;
  }, [lookup, followingActorId, timeRef]);

  const handleUnlockCamera = (): void => {
    followingActorIdRef.current = null;
    setFollowingActorId(null);
    onCameraUnlock?.();
  };

  // Calculate initial camera target and position based on actor bounding box at fight start
  // MUST be before any early returns to comply with React Hooks rules
  const { initialCameraTarget, initialCameraPosition } = useMemo(() => {
    // Calculate actor scale based on fight size (same logic as Arena3DScene)
    let actorScale = 1;
    if (fight?.boundingBox) {
      const { minX, maxX, minY, maxY } = fight.boundingBox;
      if (minX !== undefined && maxX !== undefined && minY !== undefined && maxY !== undefined) {
        const rangeX = (maxX - minX) / 100;
        const rangeZ = (maxY - minY) / 100;
        const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
        const relativeFightSize = diagonal / 141.42;
        actorScale = Math.max(0.3, Math.min(1.0, relativeFightSize * 0.5));
      }
    }

    // Use arena dimensions center as fallback
    const defaultTarget: [number, number, number] = [
      arenaDimensions.centerX,
      0,
      arenaDimensions.centerZ,
    ];

    if (!lookup?.positionsByTimestamp || !fight) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get the earliest timestamp
    const timestamps = Object.keys(lookup.positionsByTimestamp)
      .map(Number)
      .sort((a, b) => a - b);
    if (timestamps.length === 0) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    const startTime = timestamps[0];
    const actorsAtStart = lookup.positionsByTimestamp[startTime];

    if (!actorsAtStart) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Get all actor positions at fight start
    const actors = Object.values(actorsAtStart);
    if (actors.length === 0) {
      const viewDistance = Math.max(30, cameraSettings.minDistance * 2.5) * actorScale;
      const [targetX, targetY, targetZ] = defaultTarget;
      const defaultPosition: [number, number, number] = [
        targetX - viewDistance * 0.6,
        targetY + viewDistance * 0.5,
        targetZ + viewDistance * 0.6,
      ];
      return { initialCameraTarget: defaultTarget, initialCameraPosition: defaultPosition };
    }

    // Calculate bounding box of all actors at fight start
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    actors.forEach((actor) => {
      const [x, y, z] = actor.position;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });

    // Calculate the center of the bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const target: [number, number, number] = [centerX, centerY, centerZ];

    // Calculate the dimensions of the bounding box
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;

    // Calculate the diagonal distance of the bounding box in the XZ plane
    const boundingBoxDiagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

    // Calculate camera distance to fit all actors in view
    // Use the bounding box diagonal to determine appropriate distance
    // Camera FOV is 30 degrees, so we need to account for that
    const fov = 30; // degrees
    const fovRadians = (fov * Math.PI) / 180;

    // Calculate distance needed to fit the bounding box in view
    // Use a tighter framing - only 5% padding and account for viewing angle
    // Since camera is at an angle, we need less distance than straight-on view
    // Apply actor scale to make camera proportionally closer for smaller fights
    const requiredDistance =
      (boundingBoxDiagonal / 2 / Math.tan(fovRadians / 2)) * 0.7 * actorScale;

    // Ensure distance is within reasonable bounds
    const viewDistance = Math.max(
      cameraSettings.minDistance,
      Math.min(requiredDistance, cameraSettings.maxDistance * 0.5),
    );

    // Position camera: southwest of target, elevated for good viewing angle
    const cameraOffset = [-viewDistance * 0.6, viewDistance * 0.5, viewDistance * 0.6];
    const position: [number, number, number] = [
      centerX + cameraOffset[0],
      centerY + cameraOffset[1],
      centerZ + cameraOffset[2],
    ];

    return { initialCameraTarget: target, initialCameraPosition: position };
  }, [lookup, fight, arenaDimensions.centerX, arenaDimensions.centerZ, cameraSettings]);

  // Don't render until data is loaded
  if (isActorPositionsLoading || !lookup) {
    return (
      <div
        style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#white',
        }}
      >
        Loading 3D Arena...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px', position: 'relative' }}>
      <ReplayErrorBoundary checkWebGL={true}>
        <Canvas
          key={`canvas-${fight.id}`} // Stable key prevents unnecessary recreation
          camera={{
            position: initialCameraPosition,
            fov: 30,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            // Prevent context loss during Strict Mode remounts
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            antialias: true,
            // Fail if context cannot be created
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            // Handle WebGL context loss and restoration
            const canvas = gl.domElement;

            canvas.addEventListener('webglcontextlost', (event) => {
              event.preventDefault();
              logger.warn('WebGL context lost, preventing default to allow restoration');
            });

            canvas.addEventListener('webglcontextrestored', () => {
              logger.info('WebGL context restored successfully');
            });
          }}
          shadows
          style={{ background: '#1a1a1a' }}
        >
          <Arena3DScene
            timeRef={timeRef}
            lookup={lookup}
            showActorNames={showActorNames}
            mapTimeline={mapTimeline}
            scrubbingMode={scrubbingMode}
            followingActorIdRef={followingActorIdRef}
            onActorClick={onActorClick}
            mapMarkersString={mapMarkersString}
            fight={fight}
            initialTarget={initialCameraTarget}
          />
        </Canvas>
      </ReplayErrorBoundary>

      {/* Performance Monitor Overlay - rendered outside Canvas for proper screen-space positioning */}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitorExternal />}

      {/* Camera Unlock Button - Show when following an actor */}
      {followingActorId && followingActorName && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 1,
            padding: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'white' }}>
            Following: {followingActorName}
          </Typography>
          <Tooltip title="Unlock camera from actor">
            <IconButton
              size="small"
              onClick={handleUnlockCamera}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <LockOpen fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </div>
  );
};
