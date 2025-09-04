import { Box, CircularProgress } from '@mui/material';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import { ActorMarker } from './ActorMarker';

interface Actor {
  id: number;
  name: string;
  type: 'player' | 'enemy' | 'boss';
  position: [number, number, number];
  rotation: number;
}

interface CombatArenaProps {
  actors: Actor[];
  selectedActorId?: number;
  arenaSize?: number;
  onActorClick?: (actorId: number) => void;
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
  onActorClick,
}) => {
  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: [20, 15, 20],
          fov: 50,
        }}
        shadows
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

          {/* Arena floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[arenaSize, arenaSize]} />
            <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
          </mesh>

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
                isSelected={actor.id === selectedActorId}
              />
            </group>
          ))}

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 0, 0]}
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
