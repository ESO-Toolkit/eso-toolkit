import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Mesh, Group, Vector3 } from 'three';

import { getRoleColorSolid } from '../../../utils/roleColors';

interface ActorMarkerProps {
  position: [number, number, number];
  rotation: number; // Direction in radians
  name: string;
  type: 'player' | 'enemy' | 'boss' | 'friendly_npc';
  role?: 'dps' | 'tank' | 'healer'; // Optional role for players
  isSelected?: boolean;
  isAlive: boolean;
  isTaunted?: boolean; // Whether the actor is taunted
  scale?: number;
  showName?: boolean; // Whether to show the actor name
}

export const ActorMarker: React.FC<ActorMarkerProps> = ({
  position,
  rotation,
  name,
  type,
  role,
  isSelected = false,
  isAlive,
  isTaunted = false,
  scale = 1,
  showName = true,
}) => {
  const meshRef = useRef<Mesh>(null);
  const directionRef = useRef<Mesh>(null);
  const textGroupRef = useRef<Group>(null);
  const { camera, size: canvasSize } = useThree();

  // State to hold dynamic sizes that update with camera movement
  const [dynamicSize, setDynamicSize] = useState(0.02); // Smaller initial size
  const [dynamicTextSize, setDynamicTextSize] = useState(0.008); // Smaller initial text size

  // Calculate screen-space scaling to keep markers consistent size regardless of zoom
  const getScreenSpaceScale = (): number => {
    const distance = camera.position.distanceTo(new Vector3(...position));
    // Handle both perspective and orthographic cameras
    let scale: number;
    if ('fov' in camera) {
      // Perspective camera
      const fov = camera.fov || 75;
      scale = Math.tan((fov * Math.PI) / 360) * distance * 2;
    } else {
      // Orthographic camera
      scale = distance * 0.5;
    }
    return (scale / canvasSize.height) * 100; // Normalize based on screen height
  };

  // Size based on actor type - now using screen-space scaling
  const getSize = (): number => {
    const screenScale = getScreenSpaceScale();
    const baseSize = screenScale * 0.04; // Increased from 0.01 to 0.04 (4x larger)

    switch (type) {
      case 'boss':
        return baseSize * 3 * scale; // Boss markers larger
      case 'enemy':
        return baseSize * 2 * scale; // Medium size
      case 'player':
        return baseSize * 1.5 * scale; // Smaller for players
      default:
        return baseSize * 1.5 * scale;
    }
  };

  // Calculate text size using screen-space scaling
  const getTextSize = (): number => {
    const screenScale = getScreenSpaceScale();
    return screenScale * 0.16; // Increased from 0.032 to 0.16 (5x larger)
  };

  // Color based on actor type and alive state
  const getColor = (): string => {
    if (!isAlive && type === 'player') {
      return '#666666'; // Gray for dead players
    }

    // Use role colors for living players
    if (type === 'player' && role) {
      const roleColor = getRoleColorSolid(role, true); // Use dark mode colors for 3D
      const finalColor = isSelected ? '#00ff00' : roleColor;
      return finalColor;
    }

    if (type === 'player') {
      // No role available, use fallback
    }

    switch (type) {
      case 'player':
        return isSelected ? '#00ff00' : '#4caf50'; // Fallback green for players without role
      case 'enemy':
        return '#f44336'; // Red for enemies
      case 'boss':
        return '#9c27b0'; // Purple for bosses
      case 'friendly_npc':
        return '#2196f3'; // Blue for friendly NPCs
      default:
        return '#9e9e9e';
    }
  };

  // Animate selection glow and billboard text
  useFrame((state) => {
    // Update sizes based on current camera position
    const newSize = getSize();
    const newTextSize = getTextSize();
    setDynamicSize(newSize);
    setDynamicTextSize(newTextSize);

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

  const size = dynamicSize;
  const color = getColor();
  const textSize = dynamicTextSize;

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
        // Alive actor or non-player - cylinder representation (hockey puck style)
        <>
          <mesh ref={meshRef}>
            <cylinderGeometry args={[size, size, size * 0.2, 16]} />
            <meshPhongMaterial
              color={color}
              emissive={isSelected ? color : '#000000'}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          </mesh>

          {/* Red circle outline for taunted enemies - flat on ground */}
          {isTaunted && (type === 'enemy' || type === 'boss') && (
            <mesh position={[0, -(size * 0.1) - size * 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[size * 1.15, size * 1.2, 32]} />
              <meshBasicMaterial color="#ff0000" wireframe={true} />
            </mesh>
          )}
        </>
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

      {/* Direction indicator - vision cone on ground for alive actors */}
      {isAlive && (
        <mesh
          ref={directionRef}
          position={[0, -0.001, 0]}
          rotation={[-Math.PI / 2, 0, rotation - Math.PI / 2]}
        >
          <ringGeometry args={[0, size * 3, 32, 1, -Math.PI / 6, Math.PI / 3]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.5} side={2} />
        </mesh>
      )}

      {/* Actor name label */}
      {showName && (
        <group ref={textGroupRef} position={[0, size + size * 0.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={textSize}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={textSize * 0.05} // Proportional outline width
            outlineColor={getOutlineColor(color)} // Dynamic outline color for better contrast
            outlineOpacity={1} // Ensure full opacity for the border
            fillOpacity={1} // Ensure the text itself is fully opaque
          >
            {name}
          </Text>
        </group>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -(size * 0.5), 0]}>
          <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};
