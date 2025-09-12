import { LockOpen } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { OrbitControls, Grid } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useMemo, useState, useEffect } from 'react';

import { useActorPositionsTask } from '../../../hooks/workerTasks/useActorPositionsTask';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';

import { AnimationFrameActor3D } from './AnimationFrameActor3D';
import { BossHealthHUD } from './BossHealthHUD';
import { CameraFollower, DEFAULT_CAMERA_POSITION } from './CameraFollower';
import { DynamicMapTexture } from './DynamicMapTexture';

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
}

// Direct useFrame actors component - each actor uses useFrame independently
const AnimationFrameSceneActors: React.FC<{
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
}> = ({
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

// Manual render loop component to handle prioritized useFrame callbacks
const RenderLoop: React.FC = () => {
  const { gl, scene, camera } = useThree();

  // Manual render at lowest priority (highest number) to ensure all other useFrame callbacks run first
  useFrame(() => {
    gl.render(scene, camera);
  }, 999); // Very low priority to render after all updates

  return null;
};

// High-frequency 3D scene that updates independently of React state
const Scene: React.FC<{
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
}> = ({
  timeRef,
  lookup,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onActorClick,
}) => {
  return (
    <>
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
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, -0.02, 50]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
          </mesh>
        }
      >
        <DynamicMapTexture
          mapTimeline={mapTimeline || { entries: [], totalMaps: 0 }}
          timeRef={timeRef}
          size={100}
          position={[50, -0.02, 50]}
        />
      </Suspense>

      {/* Arena Grid - 10x10 grid covering 100x100 units total
          Grid positioned so 0-100 coordinates are visible */}
      <Grid
        args={[100, 100]}
        position={[50, -0.01, 50]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={50}
        sectionThickness={1.5}
        sectionColor="#9d9d9d"
        fadeDistance={150}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Direct useFrame Actors - Each actor uses useFrame independently */}
      <AnimationFrameSceneActors
        lookup={lookup}
        timeRef={timeRef}
        scale={1}
        showNames={showActorNames}
        mapTimeline={mapTimeline}
        scrubbingMode={scrubbingMode}
        followingActorIdRef={followingActorIdRef}
        onActorClick={onActorClick}
      />

      {/* Boss Health HUD - positioned in corner of 3D scene */}
      <BossHealthHUD lookup={lookup} timeRef={timeRef} />

      {/* Controls - look at center of 0-100 coordinate space */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below ground (slightly above horizon)
        minPolarAngle={0.1} // Prevent camera from going directly overhead
        target={[50, 0, 50]}
        makeDefault
      />
    </>
  );
};

export const Arena3D: React.FC<Arena3DProps> = ({
  timeRef,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onCameraUnlock,
  onActorClick,
}) => {
  const { lookup, isActorPositionsLoading } = useActorPositionsTask();

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
      <Canvas
        camera={{
          position: DEFAULT_CAMERA_POSITION.toArray(),
          fov: 30,
          near: 0.1,
          far: 1000,
        }}
        shadows
        style={{ background: '#1a1a1a' }}
      >
        <Scene
          timeRef={timeRef}
          lookup={lookup}
          showActorNames={showActorNames}
          mapTimeline={mapTimeline}
          scrubbingMode={scrubbingMode}
          followingActorIdRef={followingActorIdRef}
          onActorClick={onActorClick}
        />
      </Canvas>

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
