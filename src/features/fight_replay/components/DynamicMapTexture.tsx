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
 * Generate a procedural grid texture used as the floor when a map texture fails to load
 * (e.g. a zone exists in ESO but its mapFile isn't on the CDN yet, or a 404/timeout).
 * Without this the material falls back to a featureless solid-color plane; the grid keeps
 * the floor readable and visually consistent with the arena Grid overlay.
 *
 * Drawing is guarded: in environments without a 2D canvas backend (jsdom under Jest,
 * `getContext('2d')` returns null) we still return a valid — if blank — CanvasTexture so
 * callers can rely on `material.map` being non-null.
 */
export function generateFallbackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (context) {
    const gridSize = 10;
    const cellSize = size / gridSize;

    context.fillStyle = '#3a3a3a';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = '#5a5a5a';
    context.lineWidth = 1;

    for (let i = 0; i <= gridSize; i++) {
      const pos = i * cellSize;
      context.beginPath();
      context.moveTo(pos, 0);
      context.lineTo(pos, size);
      context.stroke();
      context.beginPath();
      context.moveTo(0, pos);
      context.lineTo(size, pos);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

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

  // Create geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);

  // Per-instance procedural fallback (grid) texture, applied when a CDN map texture fails
  // to load. Memoized so it's generated once per mount and disposed in cleanup below.
  const fallbackTexture = useMemo(() => generateFallbackTexture(), []);

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
          // CDN load failed — show the procedural grid floor instead of a blank plane.
          if (materialRef.current && currentMapFileRef.current === currentMapEntry.mapFile) {
            materialRef.current.map = fallbackTexture;
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
          // Initial CDN load failed — show the procedural grid floor instead of a blank
          // plane. Reset the file ref so a later successful load can still replace it.
          if (materialRef.current) {
            materialRef.current.map = fallbackTexture;
            materialRef.current.needsUpdate = true;
          }
          currentMapFileRef.current = null;
        });
    }
  }, [mapTimeline, loadTexture, fallbackTexture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      fallbackTexture.dispose();
      clearMapTextureCache();
    };
  }, [geometry, fallbackTexture]);

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
        transparent
        opacity={0.8}
        color={mapTimeline.entries.length > 0 ? '#ffffff' : '#2a2a2a'}
      />
    </mesh>
  );
};
