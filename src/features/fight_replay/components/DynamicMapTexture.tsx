import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

import { useLogger } from '@/contexts/LoggerContext';

import { useCurrentFight } from '../../../hooks/useCurrentFight';
import { usePerfTier } from '../../../hooks/usePerfTier';
import { fightTimeToTimestamp } from '../../../utils/fightTimeUtils';
import { getMapAtTimestamp, MapTimeline } from '../../../utils/mapTimelineUtils';
import { RenderPriority } from '../constants/renderPriorities';
import { setupFloorSharpen, sharpenStrengthForTier } from '../utils/floorSharpen';
import { getMapTextureUrl } from '../utils/mapTextureSource';

interface DynamicMapTextureProps {
  mapTimeline: MapTimeline;
  timeRef?: React.RefObject<number> | { current: number };
  size: number;
  position: [number, number, number];
  /**
   * Called whenever the floor material's texture is swapped from an async load callback
   * (CDN success or failure → procedural fallback). The scene's on-demand RenderLoop gates
   * `gl.render` behind a dirty budget; these swaps happen outside any React commit / time
   * change / camera move, so without this signal the new floor would not paint while paused
   * until the next unrelated dirty event. Optional — absence simply means no on-demand gate.
   */
  onTextureChange?: () => void;
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
  // Color-manage the fallback too so it matches the sRGB-tagged CDN maps and the actor textures
  // (every actor texture sets this). Without it the grid renders darker/desaturated under R3F's
  // default ACES + sRGB-output pipeline — the same washed-out bug the real map had.
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Swap the floor material's texture and signal the on-demand RenderLoop to repaint.
 *
 * Centralizes the contract every async load callback (CDN success or failure→fallback)
 * must honor: a no-op if the material has unmounted, otherwise bind the texture, flag the
 * material for a GPU re-upload, and fire `onTextureChange` — because these swaps happen in
 * promise callbacks outside any React commit / time change / camera move, so without that
 * signal the new floor would not paint while playback is paused. Extracted (and exported)
 * so the contract is unit-testable without a live R3F canvas, which jsdom can't provide.
 */
export function applyFloorTexture(
  material: THREE.MeshPhongMaterial | null,
  texture: THREE.Texture,
  onTextureChange?: () => void,
): void {
  if (!material) {
    return;
  }
  material.map = texture;
  material.needsUpdate = true;
  onTextureChange?.();
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
  onTextureChange,
}) => {
  const logger = useLogger();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial>(null);
  const currentMapFileRef = useRef<string | null>(null);

  const { fight } = useCurrentFight();

  // Max hardware anisotropy for crisp floor sampling at grazing camera angles. The floor plane is
  // heavily foreshortened at the oblique replay view (OrbitControls allows down to minPolarAngle
  // 0.1), where plain trilinear filtering smears high-frequency map detail toward the horizon.
  // Capped per perf tier so low-end GPUs don't pay the full 16× sample cost. A renderer capability,
  // read once. (Actor textures already set anisotropy; the map never did — that was the smear bug.)
  const { gl } = useThree();
  const perfTier = usePerfTier();
  const maxAnisotropy = useMemo(() => {
    const hw = gl.capabilities.getMaxAnisotropy();
    const tierCap = perfTier === 'low' ? 4 : 16;
    return Math.min(hw, tierCap);
  }, [gl, perfTier]);

  // Texture-space sharpen for the foreshortened floor map, scaled by perf tier (low tier = off).
  // Injected into the material's fragment shader (floorSharpen util) so it runs inside the scene's
  // on-demand gl.render — no per-frame cost, no post-processing pass. Re-applied when the tier
  // changes; setupFloorSharpen only recompiles once, then just updates the live strength uniform.
  const sharpenStrength = sharpenStrengthForTier(perfTier);
  useEffect(() => {
    setupFloorSharpen(materialRef.current, sharpenStrength);
    // The shader recompile/uniform change happens outside any render trigger, so nudge the
    // on-demand RenderLoop to repaint (mirrors the texture-swap contract).
    onTextureChange?.();
  }, [sharpenStrength, onTextureChange]);

  // Create geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);

  // Per-instance procedural fallback (grid) texture, applied when a CDN map texture fails
  // to load. Memoized so it's generated once per mount and disposed in cleanup below.
  // Anisotropy is applied here (not in the generator, which has no renderer handle) so the grid
  // matches the real map's grazing-angle sampling — consistency only paints on a CDN failure.
  const fallbackTexture = useMemo(() => {
    const tex = generateFallbackTexture();
    tex.anisotropy = maxAnisotropy;
    return tex;
  }, [maxAnisotropy]);

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
          getMapTextureUrl(mapFile),
          (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            // Keep the default mipmap chain (LinearMipmapLinearFilter + generateMipmaps): a
            // foreshortened floor needs mip sampling to avoid shimmer/aliasing when viewed from
            // a distance. The previous LinearFilter override disabled mips and was the aliasing
            // source. magFilter stays Linear for smooth up-close sampling.
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = maxAnisotropy;
            // sRGB so the JPG renders with correct gamma under R3F's default ACES tone-mapping +
            // sRGB output. Untagged textures are sampled as linear → dark + desaturated. Every
            // actor texture sets this; the map never did — the single biggest floor-quality bug.
            texture.colorSpace = THREE.SRGBColorSpace;
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
  }, [logger, maxAnisotropy]);

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

      // Load new texture asynchronously. Guard on the map file still being current (the
      // user may have scrubbed to a different phase before the fetch resolved).
      loadTexture(currentMapEntry.mapFile)
        .then((texture) => {
          if (currentMapFileRef.current === currentMapEntry.mapFile) {
            applyFloorTexture(materialRef.current, texture, onTextureChange);
          }
        })
        .catch(() => {
          // CDN load failed — show the procedural grid floor instead of a blank plane.
          if (currentMapFileRef.current === currentMapEntry.mapFile) {
            applyFloorTexture(materialRef.current, fallbackTexture, onTextureChange);
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
            currentMapFileRef.current = firstMapFile;
          }
          applyFloorTexture(materialRef.current, texture, onTextureChange);
        })
        .catch((_error) => {
          // Initial CDN load failed — show the procedural grid floor instead of a blank
          // plane. Reset the file ref so a later successful load can still replace it.
          applyFloorTexture(materialRef.current, fallbackTexture, onTextureChange);
          currentMapFileRef.current = null;
        });
    }
  }, [mapTimeline, loadTexture, fallbackTexture, onTextureChange]);

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
      // COORDINATE CONTRACT: this X-mirror (-1) cancels the X-flip in
      // convertCoordinatesWithBottomLeft (`x3D = 100 - x/100`, src/utils/coordinateUtils.ts) so the
      // map image aligns with actor/marker positions. The two flips are load-bearing as a PAIR:
      // changing either one alone silently mirrors the map relative to the actors with no error.
      // Pinned by mapCoordinateAlignment.test.ts — keep them in sync.
      scale={[-1, 1, 1]}
      receiveShadow
    >
      <meshPhongMaterial
        ref={materialRef}
        // Opaque: at 0.8 over the dark #1a1a1a canvas background the map blended toward black,
        // muting every pixel. Brightness/legibility are controlled via the sRGB texture + renderer
        // exposure now, not via alpha. Opaque also drops the transparency-sort cost.
        color={mapTimeline.entries.length > 0 ? '#ffffff' : '#2a2a2a'}
      />
    </mesh>
  );
};
