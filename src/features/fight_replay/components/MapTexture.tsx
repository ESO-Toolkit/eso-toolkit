import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import { RepeatWrapping } from 'three';

interface MapTextureProps {
  mapFile?: string;
  size: number;
  position?: [number, number, number];
}

// Fallback component for when no map is available
const FallbackMesh: React.FC<Pick<MapTextureProps, 'size' | 'position'>> = ({
  size,
  position = [0, -0.05, 0],
}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
    <planeGeometry args={[size, size]} />
    <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
  </mesh>
);

// Component that loads the texture
const TexturedMesh: React.FC<{ url: string; size: number; position: [number, number, number] }> = ({
  url,
  size,
  position,
}) => {
  const texture = useTexture(url, (loadedTexture) => {
    loadedTexture.wrapS = RepeatWrapping;
    loadedTexture.wrapT = RepeatWrapping;
    loadedTexture.flipY = false;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshPhongMaterial map={texture} transparent opacity={0.9} shininess={10} />
    </mesh>
  );
};

export const MapTexture: React.FC<MapTextureProps> = ({
  mapFile,
  size,
  position = [0, -0.05, 0],
}) => {
  const textureUrl = useMemo(() => {
    if (!mapFile) return null;
    return `https://assets.rpglogs.com/img/eso/maps/${mapFile}.jpg`;
  }, [mapFile]);

  // If no texture URL, use fallback
  if (!textureUrl) {
    return <FallbackMesh size={size} position={position} />;
  }

  // Use Suspense boundary to handle loading/error states
  return <TexturedMesh url={textureUrl} size={size} position={position} />;
};
