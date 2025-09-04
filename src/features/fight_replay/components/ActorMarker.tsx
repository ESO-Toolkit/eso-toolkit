import { Text, Cone } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh, Group } from 'three';

import { getRoleColorSolid } from '../../../utils/roleColors';

interface ActorMarkerProps {
  position: [number, number, number];
  rotation: number; // Direction in radians
  name: string;
  type: 'player' | 'enemy' | 'boss';
  role?: 'dps' | 'tank' | 'healer'; // Optional role for players
  isSelected?: boolean;
  isAlive: boolean;
  scale?: number;
}

export const ActorMarker: React.FC<ActorMarkerProps> = ({
  position,
  rotation,
  name,
  type,
  role,
  isSelected = false,
  isAlive,
  scale = 1,
}) => {
  const meshRef = useRef<Mesh>(null);
  const directionRef = useRef<Mesh>(null);
  const textGroupRef = useRef<Group>(null);
  const { camera } = useThree();

  // Color based on actor type and alive state
  const getColor = (): string => {
    if (!isAlive && type === 'player') {
      return '#666666'; // Gray for dead players
    }

    // Use role colors for living players
    if (type === 'player' && role) {
      const roleColor = getRoleColorSolid(role, true); // Use dark mode colors for 3D
      return isSelected ? '#00ff00' : roleColor;
    }

    switch (type) {
      case 'player':
        return isSelected ? '#00ff00' : '#4caf50'; // Fallback green for players without role
      case 'enemy':
        return '#f44336';
      case 'boss':
        return '#9c27b0';
      default:
        return '#9e9e9e';
    }
  };

  // Size based on actor type - optimized for 10-unit arena, reduced to 2/3 size
  const getSize = (): number => {
    switch (type) {
      case 'boss':
        return 0.3 * scale * (2 / 3); // Further reduced to 2/3 size
      case 'enemy':
        return 0.2 * scale * (2 / 3); // Further reduced to 2/3 size
      case 'player':
        return 0.15 * scale * (2 / 3); // Further reduced to 2/3 size
      default:
        return 0.15 * scale * (2 / 3);
    }
  };

  // Animate selection glow and billboard text
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * 4) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }

    // Make text always face the camera
    if (textGroupRef.current && camera) {
      textGroupRef.current.lookAt(camera.position);
    }
  });

  const size = getSize();
  const color = getColor();

  // Choose outline color based on text color brightness for better contrast
  const getOutlineColor = (textColor: string): string => {
    // For dark colors (like dead player gray #666666), use white outline
    // For bright colors, use black outline
    if (textColor === '#666666') return '#ffffff'; // White outline for dead players
    return '#000000'; // Black outline for everything else
  };

  return (
    <group position={position}>
      {/* Main actor representation */}
      {!isAlive && type === 'player' ? (
        // Dead player - skull representation
        <mesh ref={meshRef}>
          {/* Skull base (sphere) */}
          <sphereGeometry args={[size * 0.8, 8, 6]} />
          <meshPhongMaterial
            color={color}
            transparent={true}
            opacity={0.9}
            emissive={isSelected ? color : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        </mesh>
      ) : (
        // Alive actor or non-player - cylinder representation
        <mesh ref={meshRef}>
          <cylinderGeometry args={[size, size, 0.1, 16]} />
          <meshPhongMaterial
            color={color}
            transparent={true}
            opacity={0.8}
            emissive={isSelected ? color : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        </mesh>
      )}

      {/* Skull features for dead players */}
      {!isAlive && type === 'player' && (
        <>
          {/* Eye sockets */}
          <mesh position={[-size * 0.3, size * 0.2, size * 0.5]}>
            <sphereGeometry args={[size * 0.15, 4, 4]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          <mesh position={[size * 0.3, size * 0.2, size * 0.5]}>
            <sphereGeometry args={[size * 0.15, 4, 4]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          {/* Nose cavity */}
          <mesh position={[0, 0, size * 0.6]}>
            <coneGeometry args={[size * 0.1, size * 0.3, 3]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
        </>
      )}

      {/* Direction indicator - only for alive actors */}
      {isAlive && (
        <mesh ref={directionRef} position={[0, 0.08, 0]} rotation={[0, rotation, 0]}>
          <Cone args={[size * 0.3, size * 0.6, 8]} position={[0, 0, size * 0.8]}>
            <meshPhongMaterial color={color} transparent={true} opacity={0.9} />
          </Cone>
        </mesh>
      )}

      {/* Actor name label */}
      <group ref={textGroupRef} position={[0, size + 0.3, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.12} // Reduced from 0.3
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01} // Thicker black border for better visibility
          outlineColor={getOutlineColor(color)} // Dynamic outline color for better contrast
          outlineOpacity={1} // Ensure full opacity for the border
          fillOpacity={1} // Ensure the text itself is fully opaque
        >
          {name}
        </Text>
      </group>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};
