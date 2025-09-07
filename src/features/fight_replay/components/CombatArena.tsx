import { Box, CircularProgress } from '@mui/material';
import { Grid, Environment } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Vector3 } from 'three';

import { ActorMarker } from './ActorMarker';
import { CustomCameraControls } from './CustomCameraControls';
import { MapTexture } from './MapTexture';

interface Actor {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc' | 'pet';
  role?: 'dps' | 'tank' | 'healer'; // Optional role for players
  position: [number, number, number];
  rotation: number;
  isAlive: boolean;
  isTaunted?: boolean; // Whether the actor is taunted
}

interface CombatArenaProps {
  actors: Actor[];
  selectedActorId?: number;
  arenaSize?: number;
  mapFile?: string;
  onActorClick?: (actorId: number) => void;
  showActorNames?: boolean;
}

const LoadingFallback = (): React.JSX.Element => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="100%"
    width="100%"
    sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
  >
    <CircularProgress />
  </Box>
);

export const CombatArena: React.FC<CombatArenaProps> = ({
  actors,
  selectedActorId,
  arenaSize = 30,
  mapFile,
  onActorClick,
  showActorNames = true,
}) => {
  const [cameraTarget, setCameraTarget] = useState<Vector3>(new Vector3(0, 0, 0));
  const hasInitialized = useRef(false);

  // Initialize camera to boss position once when actors are first available
  useEffect(() => {
    if (!hasInitialized.current && actors.length > 0) {
      // Check if actors have valid positions (not default [0,0,0])
      const hasValidPositions = actors.some((actor) => 
        actor.position[0] !== 0 || actor.position[2] !== 0,
      );
      
      if (!hasValidPositions) {
        // Actors don't have real positions yet, wait for worker to finish
        return;
      }
      
      // Find the best target for initial camera positioning
      const boss = actors.find((actor) => actor.type === 'boss');
      const firstEnemy = actors.find((actor) => actor.type === 'enemy');
      const firstActor = actors[0];

      // Prioritize boss, then any enemy, then first actor, then center
      const targetActor = boss || firstEnemy || firstActor;

      if (targetActor) {
        const targetPosition = new Vector3(targetActor.position[0], 0, targetActor.position[2]);
        setCameraTarget(targetPosition);
        hasInitialized.current = true;

        // Debug logging for camera initialization
        if (window.location.search.includes('debug=camera')) {
          // eslint-disable-next-line no-console
          console.log('Camera initialized to:', {
            actorType: targetActor.type,
            actorName: targetActor.name,
            position: targetActor.position,
            targetPosition: targetPosition,
          });
        }
      } else {
        // Fallback to center if no actors found
        setCameraTarget(new Vector3(0, 0, 0));
        hasInitialized.current = true;
      }
    }
  }, [actors]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: [3, 6, 3], // Better elevated position for overview (was [1, 1.5, 1])
          fov: 45, // Wider field of view for better overview (was 35)
        }}
        shadows
        frameloop="always"
        performance={{ min: 0.5 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[0, 10, 0]} intensity={0.3} />

          {/* Environment */}
          <Environment preset="warehouse" />

          {/* Arena floor with map texture - wrapped in Suspense for loading */}
          <Suspense
            fallback={
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[arenaSize, arenaSize]} />
                <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
              </mesh>
            }
          >
            <MapTexture mapFile={mapFile} size={arenaSize} />
          </Suspense>

          {/* Grid */}
          <Grid
            args={[arenaSize, arenaSize]}
            cellSize={2}
            cellThickness={0.5}
            cellColor="#ffffff"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#4a9eff"
            fadeDistance={50}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />

          {/* Render actors */}
          {actors.map((actor) => (
            <group
              key={actor.id}
              onClick={(e) => {
                e.stopPropagation();
                onActorClick?.(actor.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
              }}
            >
              <ActorMarker
                position={actor.position}
                rotation={actor.rotation}
                name={actor.name}
                type={actor.type}
                role={actor.role}
                isSelected={actor.id === selectedActorId}
                isAlive={actor.isAlive}
                isTaunted={actor.isTaunted}
                showName={showActorNames}
              />
            </group>
          ))}

          {/* Custom camera controls with orbit and pan functionality */}
          <CustomCameraControls
            target={cameraTarget}
            minDistance={0.2}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2.2}
            onTargetChange={setCameraTarget}
          />
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      <Suspense fallback={<LoadingFallback />}>
        <></>
      </Suspense>
    </Box>
  );
};
