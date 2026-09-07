import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';

import { useLogger } from '@/contexts/LoggerContext';

import { useCurrentFight } from '../../../hooks/useCurrentFight';
import { usePerfTier } from '../../../hooks/usePerfTier';
import { fightTimeToTimestamp } from '../../../utils/fightTimeUtils';
import { getMapAtTimestamp, MapTimeline } from '../../../utils/mapTimelineUtils';
import { RenderPriority } from '../constants/renderPriorities';
import { setupFloorSharpen, sharpenStrengthForTier } from '../utils/floorSharpen';
import { getMapTextureFallbackUrl, getMapTextureUrl } from '../utils/mapTextureSource';

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
  /**
   * Floor extras (barebones flag `floorEnhancements`): Phong lighting, the
   * unsharp-mask shader, and high anisotropy. False renders an unlit Basic
   * material with plain trilinear sampling.
   */
  enhanced?: boolean;
}

// Map texture cache to avoid reloading the same textures. Bounded (true LRU, 8 entries): a
// trial run touches a handful of distinct maps, so 8 covers revisits while preventing
// unbounded GPU growth across long chapter-hopping sessions. Recency is refreshed on BOTH a
// cache-hit read (`getCachedMapTexture`) and a write (`cacheMapTexture`) by deleting and
// re-inserting the key — a `Map` only reorders on delete+set, not on a plain `set` of an
// existing key — so the least-recently-*used* entry is always the eviction candidate, not
// merely the least-recently-*inserted* one.
const MAX_CACHED_MAP_TEXTURES = 8;
const textureCache = new Map<string, THREE.Texture>();

// Live-reference counts, keyed by mapFile. A texture is "live" while at least one mounted
// DynamicMapTexture instance currently has it bound to its floor material (see
// retainMapTexture/releaseMapTexture, called from the bind/rebind/unmount sites below).
// Eviction consults this so it never disposes a texture out from under a live GPU binding.
const textureRefCounts = new Map<string, number>();

// Textures evicted from the cache while still live (refcount > 0). Eviction drops the cache's
// only handle to them, so releaseMapTexture becomes the sole remaining hook that can dispose
// them — without this registry the "don't dispose a live texture" fix would simply trade an
// early-dispose bug for a permanent leak.
const evictedLiveTextures = new Map<string, THREE.Texture>();

// Exported for DynamicMapTexture.test.ts, which exercises the cache/eviction/refcount
// machinery directly (no live R3F canvas available under jsdom). Not intended for use
// outside the component and its test.
export function retainMapTexture(mapFile: string): void {
  textureRefCounts.set(mapFile, (textureRefCounts.get(mapFile) ?? 0) + 1);
}

export function releaseMapTexture(mapFile: string): void {
  const count = textureRefCounts.get(mapFile);
  if (count === undefined) return;
  if (count <= 1) {
    textureRefCounts.delete(mapFile);
    // Last holder let go. If this key was evicted from the cache WHILE live, the cache can no
    // longer dispose it — this is the only remaining hook, so it is disposed here.
    const orphan = evictedLiveTextures.get(mapFile);
    if (orphan) {
      evictedLiveTextures.delete(mapFile);
      orphan.dispose();
    }
  } else {
    textureRefCounts.set(mapFile, count - 1);
  }
}

// Cache-hit read. Reinserts the key so it becomes most-recently-used — without this a
// frequently-revisited map (the common case: phase transitions bounce between a small set of
// arenas) would still be evicted in pure insertion order, i.e. FIFO wearing an LRU comment.
export function getCachedMapTexture(mapFile: string): THREE.Texture | undefined {
  const cached = textureCache.get(mapFile);
  if (cached === undefined) return undefined;
  textureCache.delete(mapFile);
  textureCache.set(mapFile, cached);
  return cached;
}

export function cacheMapTexture(mapFile: string, texture: THREE.Texture): void {
  // A write counts as a use too: drop any existing entry first so re-caching the same
  // mapFile (e.g. the tier-refresh path in loadTexture) also moves it to most-recently-used
  // instead of leaving it pinned at its original insertion position.
  textureCache.delete(mapFile);
  textureCache.set(mapFile, texture);
  while (textureCache.size > MAX_CACHED_MAP_TEXTURES) {
    const oldest = textureCache.keys().next();
    if (oldest.done) break;
    const evictedKey = oldest.value;
    const evicted = textureCache.get(evictedKey);
    textureCache.delete(evictedKey);
    if ((textureRefCounts.get(evictedKey) ?? 0) > 0) {
      // Still bound to a mounted floor's material.map: disposing here would free the GPU
      // texture out from under a live binding, and three.js would silently re-upload it on
      // its next initTexture pass — a wasted re-upload plus an orphaned GPU texture the
      // cache can no longer track. Drop the cache's ownership but hand the texture to
      // evictedLiveTextures so the final releaseMapTexture still disposes it — dropping it on
      // the floor here would leak the GPU texture for the page's lifetime.
      if (evicted) {
        evictedLiveTextures.set(evictedKey, evicted);
      }
      continue;
    }
    evicted?.dispose();
  }
}

// In-flight loads, shared across instances: the mount effect AND the useFrame updater can both
// request the same mapFile in one tick (or two arenas during a transition). Without dedupe each
// fires its own CDN fetch + GPU upload, and the loser applies a superseded texture.
const inflightLoads = new Map<string, Promise<THREE.Texture>>();

// Cleanup function for texture cache. Intended for explicit full teardown (app shutdown / test
// isolation) when nothing should still be mounted — so, unlike eviction, this unconditionally
// disposes everything and resets the refcounts too rather than trying to preserve live bindings.
export const clearMapTextureCache = (): void => {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
  evictedLiveTextures.forEach((texture) => texture.dispose());
  evictedLiveTextures.clear();
  textureRefCounts.clear();
  inflightLoads.clear();
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
 * Deliberate floor texture for a fight that ESO Logs ships NO map for — every trash pull
 * (`encounterID === 0`: dungeon/trial trash, Cyrodiil/PvP) has an empty `fight.maps`, so the floor
 * would otherwise be a bare dark plane that reads as broken ("the map is gone, just a grid"). This is
 * NOT the load-error grid (that's `generateFallbackTexture`, a harsh white-on-grey grid for the rarer
 * "a map exists but failed to fetch" case). Here there is no geography to depict, so we render an
 * intentional, calm tactical surface: a soft slate radial vignette in the scene's grid palette
 * (cell #3f4654 / section #566173), letting the arena `<Grid>` overlay read as the spatial reference
 * on top. Crucially it makes NO geographic claim, so actors sit at correct relative positions with
 * zero misregistration risk — the honest choice over deriving a zone map (which could land actors on
 * the wrong spot, and on a huge zone like Cyrodiil would shrink the fight to an unreadable speck).
 *
 * Same jsdom guard as `generateFallbackTexture`: returns a valid CanvasTexture even with no 2D context.
 */
export function generateMaplessFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (context) {
    // Soft radial vignette: a touch lighter slate in the centre easing to a deep slate at the edges,
    // so the plane reads as a lit tactical surface rather than a flat void. Tuned dark enough that the
    // grid lines and the figures' contact shadows still pop.
    const grad = context.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.05,
      size / 2,
      size / 2,
      size * 0.62,
    );
    grad.addColorStop(0, '#2c333f');
    grad.addColorStop(0.7, '#222834');
    grad.addColorStop(1, '#1a1f29');
    context.fillStyle = grad;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
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
  material: THREE.MeshPhongMaterial | THREE.MeshBasicMaterial | null,
  texture: THREE.Texture,
  onTextureChange?: () => void,
): void {
  if (!material) {
    return;
  }
  if (material.map === texture) {
    return; // Already bound: rebinding + needsUpdate would force a needless program re-evaluation.
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
  enhanced = true,
}) => {
  const logger = useLogger();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial | THREE.MeshBasicMaterial>(null);
  const currentMapFileRef = useRef<string | null>(null);
  // Tracks which cached mapFile (if any) THIS instance currently holds a live reference to —
  // i.e. what retainMapTexture/releaseMapTexture was last called with. Distinct from
  // currentMapFileRef (which mapFile the floor WANTS to show, updated the instant a phase
  // change is observed): this one only moves once a load actually resolves and binds,
  // because retain/release must bracket the texture's real GPU lifetime, not the intent.
  const boundMapFileRef = useRef<string | null>(null);

  // Retain `mapFile`'s cache entry before binding it to the floor material, releasing whatever
  // this instance held previously. Keeps textureRefCounts accurate so cacheMapTexture's eviction
  // never disposes a texture this component still has bound.
  const bindCachedTexture = useCallback(
    (mapFile: string, texture: THREE.Texture): void => {
      if (boundMapFileRef.current !== mapFile) {
        if (boundMapFileRef.current) {
          releaseMapTexture(boundMapFileRef.current);
        }
        retainMapTexture(mapFile);
        boundMapFileRef.current = mapFile;
      }
      applyFloorTexture(materialRef.current, texture, onTextureChange);
    },
    [onTextureChange],
  );

  // Bind a non-cached texture (procedural grid / slate — never stored in textureCache) and
  // release any cached entry this instance was previously holding, since the floor no longer
  // displays it.
  const bindUncachedTexture = useCallback(
    (texture: THREE.Texture): void => {
      if (boundMapFileRef.current) {
        releaseMapTexture(boundMapFileRef.current);
        boundMapFileRef.current = null;
      }
      applyFloorTexture(materialRef.current, texture, onTextureChange);
    },
    [onTextureChange],
  );

  // Material identity flips with `enhanced` (Phong <-> Basic below). Reset the
  // map cache so the useFrame rebinds the current map texture to the NEW
  // material — without this the swapped-in material renders map-less until the
  // next phase change. onTextureChange nudges the on-demand render.
  useEffect(() => {
    currentMapFileRef.current = null;
    onTextureChange?.();
  }, [enhanced, onTextureChange]);

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
    // Barebones (enhanced=false): plain trilinear only — grazing-angle crispness
    // is a luxury the minimal floor gives up.
    const tierCap = !enhanced ? 1 : perfTier === 'low' ? 4 : 16;
    return Math.min(hw, tierCap);
  }, [gl, perfTier, enhanced]);

  // Texture-space sharpen for the foreshortened floor map, scaled by perf tier (low tier = off).
  // Injected into the material's fragment shader (floorSharpen util) so it runs inside the scene's
  // on-demand gl.render — no per-frame cost, no post-processing pass. Re-applied when the tier
  // changes; setupFloorSharpen only recompiles once, then just updates the live strength uniform.
  const sharpenStrength = enhanced ? sharpenStrengthForTier(perfTier) : 0;
  useEffect(() => {
    // Barebones renders the Basic material — no sharpen injection at all (the
    // strength-0 path also covers the Phong material when the tier is low).
    if (!enhanced) return;
    setupFloorSharpen(materialRef.current as THREE.MeshPhongMaterial | null, sharpenStrength);
    // The shader recompile/uniform change happens outside any render trigger, so nudge the
    // on-demand RenderLoop to repaint (mirrors the texture-swap contract).
    onTextureChange?.();
  }, [enhanced, sharpenStrength, onTextureChange]);

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

  // Per-instance mapless floor texture, applied when the fight has NO map at all (empty timeline —
  // trash pulls / Cyrodiil / PvP). Distinct from the error-grid above: a calm slate surface, not a
  // failure state. Memoized once per mount, disposed in cleanup.
  const maplessTexture = useMemo(() => {
    const tex = generateMaplessFloorTexture();
    tex.anisotropy = maxAnisotropy;
    return tex;
  }, [maxAnisotropy]);

  // Load texture with caching
  const loadTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    // Textures are data images, never read back (no readPixels/toDataURL anywhere in the
    // feature) — but pin anonymous CORS explicitly so a hostile/compromised mapFile host
    // fails closed instead of tainting anything downstream.
    loader.setCrossOrigin('anonymous');

    // Texture sampling/colour config applied IDENTICALLY to whichever source loads. flipY=false and
    // sRGB are NOT cosmetic: flipY=false is half of the actor/marker coordinate-alignment contract (a
    // flipped map silently registers actors on the wrong region), and sRGB is the correct-gamma fix.
    // The fallback path MUST apply the same config, or a recovered map would be flipped/dark.
    const configureTexture = (texture: THREE.Texture): void => {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      // Keep the default mipmap chain (LinearMipmapLinearFilter + generateMipmaps): a foreshortened
      // floor needs mip sampling to avoid shimmer/aliasing when viewed from a distance. The previous
      // LinearFilter override disabled mips and was the aliasing source. magFilter stays Linear for
      // smooth up-close sampling.
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = maxAnisotropy;
      // sRGB so the JPG renders with correct gamma under R3F's default ACES tone-mapping + sRGB
      // output. Untagged textures are sampled as linear → dark + desaturated. Every actor texture sets
      // this; the map never did — the single biggest floor-quality bug.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
    };

    const loadFrom = (url: string): Promise<THREE.Texture> =>
      new Promise((resolve, reject) => {
        loader.load(
          url,
          (texture) => resolve(texture),
          undefined,
          (error) => reject(error),
        );
      });

    return (mapFile: string): Promise<THREE.Texture> => {
      // Check cache first — getCachedMapTexture also refreshes recency (moves the entry to
      // most-recently-used) so a hot, repeatedly-revisited map survives eviction. A tier change
      // rebuilds this memo (maxAnisotropy dep), so refresh the cached texture's sampling instead
      // of serving a stale tier's anisotropy forever.
      const cached = getCachedMapTexture(mapFile);
      if (cached) {
        if (cached.anisotropy !== maxAnisotropy) {
          cached.anisotropy = maxAnisotropy;
          cached.needsUpdate = true;
        }
        return Promise.resolve(cached);
      }

      // Join an in-flight load for the same file instead of double-fetching.
      const inflight = inflightLoads.get(mapFile);
      if (inflight) {
        return inflight;
      }

      // URL resolution validates the mapFile and can throw: convert to a rejection so callers'
      // .catch (grid fallback) handles it instead of throwing synchronously out of useFrame.
      let primaryUrl: string;
      let fallbackUrl: string;
      try {
        primaryUrl = getMapTextureUrl(mapFile);
        fallbackUrl = getMapTextureFallbackUrl(mapFile);
      } catch (error) {
        return Promise.reject(error);
      }

      // Hi-res tiles only EXIST once deployed (gitignored → absent from a build with no
      // VITE_HIRES_MAP_BASE: dev-previews, or prod before R2 is provisioned). When the primary url is a
      // self-hosted tile that 404s, fall back to the always-available RPGLogs CDN so the floor shows the
      // original map instead of going blank. Only reject if BOTH fail. A failed attempt is never cached.
      const load =
        primaryUrl === fallbackUrl
          ? loadFrom(primaryUrl)
          : loadFrom(primaryUrl).catch((error) => {
              logger.warn(
                `Hi-res map tile failed for ${mapFile}; falling back to the RPGLogs CDN`,
                error,
              );
              return loadFrom(fallbackUrl);
            });

      const shared = load
        .then((texture) => {
          configureTexture(texture);
          cacheMapTexture(mapFile, texture);
          return texture;
        })
        .catch((error) => {
          logger.warn(`Failed to load map texture: ${mapFile}`, error);
          throw error;
        })
        .finally(() => {
          if (inflightLoads.get(mapFile) === shared) {
            inflightLoads.delete(mapFile);
          }
        });
      inflightLoads.set(mapFile, shared);
      return shared;
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

    const nextMapFile = currentMapEntry?.mapFile;
    if (!nextMapFile) {
      return;
    }

    // Only update if map has actually changed
    if (currentMapFileRef.current !== nextMapFile) {
      currentMapFileRef.current = nextMapFile;

      // Load new texture asynchronously. Guard on the map file still being current (the
      // user may have scrubbed to a different phase before the fetch resolved).
      loadTexture(nextMapFile)
        .then((texture) => {
          if (currentMapFileRef.current === nextMapFile) {
            bindCachedTexture(nextMapFile, texture);
          }
        })
        .catch(() => {
          // CDN load failed — show the procedural grid floor instead of a blank plane.
          if (currentMapFileRef.current === nextMapFile) {
            bindUncachedTexture(fallbackTexture);
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
          // Stale guard (mirrors the useFrame path): a scrub during the fetch may have moved
          // the floor on already — never paint an arrival this load no longer owns. The shared
          // cached texture is left alone (not disposed) for its rightful owner.
          if (currentMapFileRef.current === null || currentMapFileRef.current === firstMapFile) {
            if (materialRef.current) {
              currentMapFileRef.current = firstMapFile;
            }
            bindCachedTexture(firstMapFile, texture);
          }
        })
        .catch((_error) => {
          // Initial CDN load failed — show the procedural grid floor instead of a blank
          // plane. Reset the file ref so a later successful load can still replace it.
          bindUncachedTexture(fallbackTexture);
          currentMapFileRef.current = null;
        });
    }
  }, [
    mapTimeline,
    loadTexture,
    fallbackTexture,
    onTextureChange,
    bindCachedTexture,
    bindUncachedTexture,
  ]);

  // Mapless fight (empty timeline): bind the deliberate slate floor instead of leaving a bare dark
  // plane. Runs in an effect (NOT useFrame — the useFrame map updater early-returns on an empty
  // timeline, so it never paints anything here). Guarded so the boss/real-map path is untouched: only
  // fires when there are zero timeline entries. `applyFloorTexture` fires onTextureChange so the swap
  // paints under the on-demand gate even while paused. Effects run AFTER the commit that mounts the
  // mesh, so materialRef.current is populated by the time this runs on a real render (the jsdom-only
  // null case is handled by applyFloorTexture's null-guard, not by any re-run).
  useEffect(() => {
    if (mapTimeline.entries.length === 0) {
      currentMapFileRef.current = null;
      bindUncachedTexture(maplessTexture);
    }
    // `enhanced` is a dep because the material IDENTITY flips with it — the
    // slate must rebind to the freshly-mounted material.
  }, [mapTimeline, maplessTexture, onTextureChange, enhanced, bindUncachedTexture]);

  // Release this instance's live reference on unmount so cacheMapTexture's eviction is free to
  // dispose the entry once nothing else holds it. Mount-once (no deps): must run exactly once
  // per real unmount, not on every mapFile change (rebinds already release the PREVIOUS mapFile
  // via bindCachedTexture/bindUncachedTexture as they happen).
  useEffect(() => {
    return () => {
      if (boundMapFileRef.current) {
        releaseMapTexture(boundMapFileRef.current);
        boundMapFileRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount: dispose only the per-instance resources this component created.
  // Do NOT clear the module-global textureCache here — it is shared across all live
  // DynamicMapTexture instances, so disposing it on one unmount is a use-after-dispose
  // (blank/garbled floor) for every other instance and defeats the cross-mount cache.
  // clearMapTextureCache remains available for explicit app-level teardown.
  // Split per-memo (not one effect keyed on all three) so an anisotropy/tier change — which rebuilds
  // the fallback + mapless textures (dep: maxAnisotropy) but not the geometry (dep: size) — no longer
  // disposes the still-mounted floor geometry out from under the live mesh. Each dispose fires only
  // when its own resource is replaced or on unmount.
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      fallbackTexture.dispose();
    };
  }, [fallbackTexture]);

  useEffect(() => {
    return () => {
      maplessTexture.dispose();
    };
  }, [maplessTexture]);

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
      {/* Opaque, white in BOTH material variants: the sRGB map texture must not be multiplied
          down by a tinted base colour (see the brightness/legibility notes in git history).
          Barebones (enhanced=false) swaps Phong -> Basic: unlit, so the biggest screen-space
          surface skips per-fragment lighting entirely. The identity change re-runs the map
          rebind effect above. */}
      {enhanced ? (
        <meshPhongMaterial ref={materialRef} color="#ffffff" />
      ) : (
        <meshBasicMaterial ref={materialRef} color="#ffffff" />
      )}
    </mesh>
  );
};
