import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

import { useLogger } from '@/contexts/LoggerContext';

import { useCurrentFight } from '../../../hooks/useCurrentFight';
import { fightTimeToTimestamp } from '../../../utils/fightTimeUtils';
import { getMapAtTimestamp, MapTimeline } from '../../../utils/mapTimelineUtils';
import { RenderPriority } from '../constants/renderPriorities';

interface DynamicMapTextureProps {
  mapTimeline: MapTimeline;
  timeRef?: React.RefObject<number> | { current: number };
  size: number;
  position: [number, number, number];
}

// Map texture cache to avoid reloading the same textures
const textureCache = new Map<string, THREE.Texture>();

// Cleanup function for texture cache
export const clearMapTextureCache = (): void => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
};

/**
 * Component that dynamically updates map texture based on timeline using useFrame
 * This provides high-performance map switching without React render cycles
 */
export const DynamicMapTexture: React.FC<DynamicMapTextureProps> = ({
  mapTimeline,
  timeRef,
  size,
  position,
}) => {
  const logger = useLogger();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial>(null);
  const currentMapFileRef = useRef<string | null>(null);

  const { fight } = useCurrentFight();

  // Create default material
  const defaultMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#2a2a2a',
        transparent: true,
        opacity: 0.8,
      }),
    [],
  );

  // Create geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);

  // Load texture with caching
  const loadTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();

    return (mapFile: string): Promise<THREE.Texture> => {
      // Check cache first
      const cached = textureCache.get(mapFile);
      if (cached) {
        return Promise.resolve(cached);
      }

      return new Promise((resolve, reject) => {
        loader.load(
          `https://assets.rpglogs.com/img/eso/maps/${mapFile}.jpg`,
          (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.flipY = false;

            // Cache the texture
            textureCache.set(mapFile, texture);
            resolve(texture);
          },
          undefined,
          (error) => {
            logger.warn(`Failed to load map texture: ${mapFile}`, error);
            reject(error);
          },
        );
      });
    };
  }, [logger]);

  // High-frequency map updates via useFrame
  // Use priority 2 for map updates (lower priority than camera and actor updates)
  useFrame(() => {
    if (!materialRef.current || !fight || mapTimeline.entries.length === 0) {
      return;
    }

    const currentTime = timeRef ? timeRef.current : 0;
    const timestamp = fightTimeToTimestamp(currentTime, fight);
    const currentMapEntry = getMapAtTimestamp(mapTimeline, timestamp);

    if (!currentMapEntry?.mapFile) {
      return;
    }

    // Only update if map has actually changed
    if (currentMapFileRef.current !== currentMapEntry.mapFile) {
      currentMapFileRef.current = currentMapEntry.mapFile;

      // Load new texture asynchronously
      loadTexture(currentMapEntry.mapFile)
        .then((texture) => {
          if (materialRef.current && currentMapFileRef.current === currentMapEntry.mapFile) {
            materialRef.current.map = texture;
            materialRef.current.needsUpdate = true;
          }
        })
        .catch(() => {
          // Fallback to default material on error
          if (materialRef.current) {
            materialRef.current.map = null;
            materialRef.current.needsUpdate = true;
          }
        });
    }
  }, RenderPriority.EFFECTS);

  // Initialize with first map if available
  useEffect(() => {
    if (mapTimeline.entries.length > 0 && mapTimeline.entries[0].mapFile) {
      const firstMapFile = mapTimeline.entries[0].mapFile;

      loadTexture(firstMapFile)
        .then((texture) => {
          if (materialRef.current) {
            materialRef.current.map = texture;
            materialRef.current.needsUpdate = true;
            currentMapFileRef.current = firstMapFile;
          }
        })
        .catch((_error) => {
          // Use default material if loading fails
          currentMapFileRef.current = null;
        });
    }
  }, [mapTimeline, loadTexture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      defaultMaterial.dispose();
      geometry.dispose();
    };
  }, [defaultMaterial, geometry]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      scale={[-1, 1, 1]}
      receiveShadow
    >
      <meshPhongMaterial
        ref={materialRef}
        {...defaultMaterial}
        transparent
        opacity={0.8}
        color={mapTimeline.entries.length > 0 ? '#ffffff' : '#2a2a2a'}
      />
    </mesh>
  );
};
