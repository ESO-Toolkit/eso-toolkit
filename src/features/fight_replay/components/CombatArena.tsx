import { Box, CircularProgress } from '@mui/material';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useEffect } from 'react';
import { Vector3 } from 'three';

import { ActorMarker } from './ActorMarker';
import { MapTexture } from './MapTexture';

interface Actor {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc';
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
  const orbitControlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const hasInitialized = useRef(false);

  // Initialize camera to boss position once when actors are first available
  useEffect(() => {
    if (!hasInitialized.current && actors.length > 0 && orbitControlsRef.current) {
      const boss = actors.find((actor) => actor.type === 'boss');
      if (boss) {
        const bossPosition = new Vector3(boss.position[0], 0, boss.position[2]);
        const cameraOffset = new Vector3(1, 1.5, 1);
        const cameraPosition = bossPosition.clone().add(cameraOffset);

        // Set initial camera position and target
        orbitControlsRef.current.object.position.copy(cameraPosition);
        orbitControlsRef.current.target.copy(bossPosition);
        orbitControlsRef.current.update();

        hasInitialized.current = true;
      }
    }
  }, [actors]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: [1, 1.5, 1], // Extremely close starting position (was [3, 4, 3])
          fov: 35, // Even narrower field of view for tight zoom (was 45)
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

          {/* Camera controls with dynamic target that moves when panning */}
          <OrbitControls
            ref={orbitControlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.2}
            maxDistance={20} // Increased from 5 to allow more freedom
            maxPolarAngle={Math.PI / 2.2}
            zoomSpeed={1} // Reduced from 2 for more controlled zooming
            panSpeed={1} // Reduced from 2.5 for more consistent panning
            rotateSpeed={1} // Added explicit rotate speed control
            enableDamping={true}
            dampingFactor={0.05} // Reduced from 0.1 for more responsive movement
            screenSpacePanning={true} // Use screen-space panning for more intuitive movement
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
