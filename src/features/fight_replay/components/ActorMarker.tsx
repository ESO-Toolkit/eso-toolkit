import { Text, Cone } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh } from 'three';

interface ActorMarkerProps {
  position: [number, number, number];
  rotation: number; // Direction in radians
  name: string;
  type: 'player' | 'enemy' | 'boss';
  isSelected?: boolean;
  scale?: number;
}

export const ActorMarker: React.FC<ActorMarkerProps> = ({
  position,
  rotation,
  name,
  type,
  isSelected = false,
  scale = 1,
}) => {
  const meshRef = useRef<Mesh>(null);
  const directionRef = useRef<Mesh>(null);

  // Color based on actor type
  const getColor = (): string => {
    switch (type) {
      case 'player':
        return isSelected ? '#00ff00' : '#4caf50';
      case 'enemy':
        return '#f44336';
      case 'boss':
        return '#9c27b0';
      default:
        return '#9e9e9e';
    }
  };

  // Size based on actor type
  const getSize = (): number => {
    switch (type) {
      case 'boss':
        return 0.8 * scale;
      case 'enemy':
        return 0.5 * scale;
      case 'player':
        return 0.4 * scale;
      default:
        return 0.4 * scale;
    }
  };

  // Animate selection glow
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.sin(time * 4) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const size = getSize();
  const color = getColor();

  return (
    <group position={position}>
      {/* Main actor cylinder */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[size, size, 0.2, 16]} />
        <meshPhongMaterial
          color={color}
          transparent={true}
          opacity={0.8}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Direction indicator */}
      <mesh ref={directionRef} position={[0, 0.15, 0]} rotation={[0, rotation, 0]}>
        <Cone args={[size * 0.3, size * 0.6, 8]} position={[0, 0, size * 0.8]}>
          <meshPhongMaterial color={color} transparent={true} opacity={0.9} />
        </Cone>
      </mesh>

      {/* Actor name label */}
      <Text
        position={[0, size + 0.5, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};
