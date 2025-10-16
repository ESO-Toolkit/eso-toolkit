import { Grid, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useMemo } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

import { AnimationFrameActor3D } from './AnimationFrameActor3D';
import { BossHealthHUD } from './BossHealthHUD';
import { CameraFollower } from './CameraFollower';
import { DynamicMapTexture } from './DynamicMapTexture';
import { MapMarkers } from './MapMarkers';
import { PerformanceMonitorCanvas } from './PerformanceMonitor';

/**
 * Props for the AnimationFrameSceneActors component
 */
interface AnimationFrameSceneActorsProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale: number;
  showNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
}

/**
 * Direct useFrame actors component - each actor uses useFrame independently
 */
const AnimationFrameSceneActors: React.FC<AnimationFrameSceneActorsProps> = ({
  lookup,
  timeRef,
  scale,
  showNames = false,
  scrubbingMode,
  followingActorIdRef,
  onActorClick,
}) => {
  // Get list of actor IDs to render from the lookup structure
  const actorIds = useMemo(() => {
    if (!lookup || !lookup.positionsByTimestamp) return [];

    // Get actor IDs from ALL timestamps, not just the first one
    // This ensures we include NPCs that spawn later in the fight
    const allActorIds = new Set<number>();

    Object.values(lookup.positionsByTimestamp).forEach((timestampActors) => {
      Object.keys(timestampActors).forEach((actorIdStr) => {
        allActorIds.add(Number(actorIdStr));
      });
    });

    const ids = Array.from(allActorIds);

    return ids;
  }, [lookup]);

  // Performance settings based on scrubbing mode
  const shouldRenderEffects = scrubbingMode?.shouldRenderEffects ?? true;
  const effectiveShowNames = showNames && shouldRenderEffects;

  return (
    <>
      {actorIds.map((actorId) => (
        <AnimationFrameActor3D
          key={actorId}
          actorId={actorId}
          lookup={lookup}
          timeRef={timeRef}
          scale={scale}
          showName={effectiveShowNames}
          selectedActorRef={followingActorIdRef}
          onActorClick={onActorClick}
        />
      ))}
    </>
  );
};

/**
 * Manual render loop component to handle prioritized useFrame callbacks
 */
const RenderLoop: React.FC = () => {
  const { gl, scene, camera } = useThree();

  // Manual render at lowest priority (highest number) to ensure all other useFrame callbacks run first
  useFrame(() => {
    gl.render(scene, camera);
  }, 999); // Very low priority to render after all updates

  return null;
};

/**
 * Props for the Arena3DScene component
 */
export interface Arena3DSceneProps {
  timeRef: React.RefObject<number> | { current: number };
  lookup: TimestampPositionLookup | null;
  showActorNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
  mapMarkersString?: string;
  fight: FightFragment;
  initialTarget?: [number, number, number];
}

/**
 * High-frequency 3D scene that updates independently of React state.
 * This component contains all the 3D rendering logic for the Arena3D component,
 * including actors, lighting, map textures, camera controls, and markers.
 */
export const Arena3DScene: React.FC<Arena3DSceneProps> = ({
  timeRef,
  lookup,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onActorClick,
  mapMarkersString,
  fight,
  initialTarget,
}) => {
  // Calculate arena dimensions and camera settings based on fight bounding box
  const arenaDimensions = useMemo(() => {
    // Arena must always be 100x100 centered at (50, 50) to match actor coordinate system
    // Actor positions use convertCoordinatesWithBottomLeft which maps to 0-100 range
    // The map texture must match this coordinate system for proper alignment
    return {
      size: 100,
      centerX: 50,
      centerZ: 50,
    };
  }, []);

  // Calculate dynamic camera settings based on arena dimensions
  const cameraSettings = useMemo(() => {
    // Default fallback values with closer minimum zoom
    const defaults = {
      target:
        initialTarget ||
        ([arenaDimensions.centerX, 0, arenaDimensions.centerZ] as [number, number, number]),
      minDistance: 1,
      maxDistance: 200,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    // Validate that all bounding box values exist
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return defaults;
    }

    // Convert to arena coordinates (divide by 100)
    const arenaMinX = minX / 100;
    const arenaMaxX = maxX / 100;
    const arenaMinZ = -(maxY / 100); // Negate and swap for Z
    const arenaMaxZ = -(minY / 100);

    // Calculate center point of the fight area (only used if initialTarget not provided)
    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    // Calculate the size of the fight area
    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;

    // Set camera distances based on fight area size
    // Minimum: Allow very close zoom for detailed inspection
    const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
    const minDistance = Math.max(1, diagonal * 0.1);

    // Maximum: 3x the diagonal for good overview, capped at reasonable bounds
    const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

    return {
      // Always use initialTarget if provided (calculated from actor positions)
      // Only fall back to fight bounding box center if no initialTarget
      target: initialTarget || ([centerX, 0, centerZ] as [number, number, number]),
      minDistance,
      maxDistance,
    };
  }, [fight.boundingBox, initialTarget, arenaDimensions.centerX, arenaDimensions.centerZ]);

  // Calculate actor scale based on fight area size
  // INVERSE SCALING: Smaller fights = LARGER actors for better visibility
  // Larger fights = SMALLER actors to prevent overlap
  const actorScale = useMemo(() => {
    if (!fight?.boundingBox) {
      return 1;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return 1;
    }

    // Calculate the size of the fight area
    const rangeX = (maxX - minX) / 100;
    const rangeZ = (maxY - minY) / 100;
    const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

    // Full arena diagonal is ~141.42 units
    // Scale actors INVERSELY to fight size:
    // - Small fight (10 unit diagonal) → scale = 2.5x (very visible)
    // - Medium fight (50 unit diagonal) → scale = 1.4x
    // - Large fight (100+ unit diagonal) → scale = 0.7-1.0x (normal size)
    const relativeFightSize = diagonal / 141.42;
    const inverseScale = 1.0 / (relativeFightSize + 0.4); // +0.4 prevents division issues

    // Clamp between 0.7 (huge arenas) and 3.0 (tiny arenas)
    return Math.max(0.7, Math.min(3.0, inverseScale));
  }, [fight.boundingBox]);

  // Debug logging for Scene component

  return (
    <>
      {/* Performance Monitor hooks - only active in development mode */}
      {/* Only the monitoring hooks run inside Canvas, overlay is rendered outside */}
      <PerformanceMonitorCanvas
        fpsUpdateInterval={500}
        memoryUpdateInterval={1000}
        slowFrameThreshold={33}
        maxSlowFrameLogsPerMinute={10}
      />

      {/* Manual render loop - highest priority to render after all updates */}
      <RenderLoop />

      {/* Camera follower system */}
      <CameraFollower lookup={lookup} timeRef={timeRef} followingActorIdRef={followingActorIdRef} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Map Texture - Arena floor background with dynamic phase-based switching */}
      <Suspense
        fallback={
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}
            receiveShadow
          >
            <planeGeometry args={[arenaDimensions.size, arenaDimensions.size]} />
            <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
          </mesh>
        }
      >
        <DynamicMapTexture
          mapTimeline={mapTimeline || { entries: [], totalMaps: 0 }}
          timeRef={timeRef}
          size={arenaDimensions.size}
          position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}
        />
      </Suspense>

      {/* Arena Grid - Dynamically sized based on fight area */}
      <Grid
        args={[arenaDimensions.size, arenaDimensions.size]}
        position={[arenaDimensions.centerX, -0.01, arenaDimensions.centerZ]}
        cellSize={Math.max(5, arenaDimensions.size / 10)}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={arenaDimensions.size / 2}
        sectionThickness={1.5}
        sectionColor="#9d9d9d"
        fadeDistance={arenaDimensions.size * 1.5}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Direct useFrame Actors - Each actor uses useFrame independently */}
      <AnimationFrameSceneActors
        lookup={lookup}
        timeRef={timeRef}
        scale={actorScale}
        showNames={showActorNames}
        mapTimeline={mapTimeline}
        scrubbingMode={scrubbingMode}
        followingActorIdRef={followingActorIdRef}
        onActorClick={onActorClick}
      />

      {/* Boss Health HUD - positioned in corner of 3D scene */}
      <BossHealthHUD lookup={lookup} timeRef={timeRef} />

      {/* Map Markers - Render raid/dungeon markers if provided (M0R or Elms format) */}
      {mapMarkersString && <MapMarkers encodedString={mapMarkersString} fight={fight} scale={1} />}

      {/* Controls - dynamically positioned based on fight area */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={cameraSettings.minDistance}
        maxDistance={cameraSettings.maxDistance}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below ground (slightly above horizon)
        minPolarAngle={0.1} // Prevent camera from going directly overhead
        target={cameraSettings.target as [number, number, number]}
        makeDefault
      />
    </>
  );
};
