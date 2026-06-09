import { Grid, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { Suspense, useMemo, useCallback, useRef, useEffect } from 'react';

import { FightFragment } from '@/graphql/gql/graphql';

import { getMapScaleData } from '../../../types/zoneScaleData';
import { Logger, LogLevel } from '../../../utils/logger';
import { MapTimeline } from '../../../utils/mapTimelineUtils';
import { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { MapMarkersState } from '../types/mapMarkers';
import { LongPressTracker } from '../utils/longPress';
import { DEFAULT_ACTOR_SCALE, computeActorScaleFromMapData } from '../utils/mapScaling';
import { extractPlayerPaths, DEFAULT_PATH_SAMPLING } from '../utils/pathUtils';
import { getPlayerPathColor } from '../utils/playerColors';
import { resolveTouchPolicy } from '../utils/touchPolicy';

import { CameraFollower } from './CameraFollower';
import { CameraResetControls } from './CameraResetControls';
import { CanvasWheelZoom } from './CanvasWheelZoom';
import { DynamicMapTexture } from './DynamicMapTexture';
import { InstancedReplayFigures3D } from './InstancedReplayFigures3D';
import { KeyboardCameraControls } from './KeyboardCameraControls';
import { MapMarkers } from './MapMarkers';
import { MarkerContextMenuPayload } from './Marker3D';
import { PerformanceMonitorCanvas } from './PerformanceMonitor';
import { PlayerPathTrail3D } from './PlayerPathTrail3D';

// Stable empty Map for the optional playerVisibility prop default — a fresh `new Map()` in
// the default would change identity every render and churn child memoization.
const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const EMPTY_COLOR_OVERRIDES: Map<number, string> = new Map();

// Create logger instance for Arena3DScene
const logger = new Logger({
  level: LogLevel.INFO,
  contextPrefix: 'Arena3DScene',
});

/**
 * Props for the AnimationFrameSceneActors component
 */
interface AnimationFrameSceneActorsProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale: number;
  showNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
  playerVisibility?: Map<number, boolean>;
  playerColorOverrides?: Map<number, string>;
  /** When true, player figures stop casting shadows (perf headroom for large fights). */
  performanceMode?: boolean;
}

export interface GroundContextMenuPayload {
  arenaPoint: { x: number; y: number; z: number };
  screenPosition: { left: number; top: number };
}

/**
 * Actor renderer. Each actor is a standing figure (capsule body + role-glyph cap) with a
 * ground anchor ring, facing wedge, and state rings; bosses/enemies stand larger so they
 * read above the player crowd. Name cards float above and can be toggled off (N key).
 */
const AnimationFrameSceneActors: React.FC<AnimationFrameSceneActorsProps> = ({
  lookup,
  timeRef,
  scale,
  showNames = false,
  scrubbingMode,
  followingActorIdRef,
  onActorClick,
  playerVisibility,
  playerColorOverrides,
  performanceMode,
}) => {
  // Performance settings based on scrubbing mode
  const shouldRenderEffects = scrubbingMode?.shouldRenderEffects ?? true;
  const effectiveShowNames = showNames && shouldRenderEffects;

  return (
    <InstancedReplayFigures3D
      lookup={lookup}
      timeRef={timeRef}
      scale={scale}
      showNames={effectiveShowNames}
      selectedActorRef={followingActorIdRef}
      onActorClick={onActorClick}
      playerVisibility={playerVisibility}
      playerColorOverrides={playerColorOverrides}
      performanceMode={performanceMode}
    />
  );
};

/**
 * Number of extra frames to keep rendering after the last detected change. Async work
 * (CDN map textures resolving, material.needsUpdate flushing, OrbitControls damping) can
 * land a frame or two after the triggering event, so we render a short tail rather than
 * exactly one frame, to avoid a stale paint.
 */
const RENDER_TAIL_FRAMES = 4;

interface RenderLoopProps {
  timeRef: React.RefObject<number> | { current: number };
  followingActorIdRef: React.RefObject<number | null>;
  /**
   * Budget ref shared with the parent scene. The parent refills it on every React commit
   * (see Arena3DScene) so that scene mutations driven by state — markers, trails, player
   * visibility, HUD toggles — repaint even while playback is paused. RenderLoop also
   * refills it from per-frame signals (time, camera, follow) below.
   */
  renderBudgetRef: React.RefObject<number>;
}

/**
 * Manual render loop that owns the single `gl.render()` call at the lowest useFrame
 * priority (highest number), so every other useFrame callback runs first.
 *
 * On-demand gating: rather than rendering on every animation frame (which wastes the GPU
 * doing identical work while paused and idle — ~73 redundant renders/sec), the render is
 * gated behind a dirty budget (a ref, never React state — state would re-render the tree
 * every frame and reintroduce the very cost we're removing). The budget is refilled by:
 *   - playback / scrubbing: `timeRef.current` advancing (set every frame while playing, so
 *     the playing path renders every frame exactly as before — no regression by construction)
 *   - camera motion: OrbitControls `'change'` events (drag / zoom)
 *   - actor-follow: a non-null `followingActorIdRef` means the follow camera is lerping
 *   - any React commit of the scene (markers/trails/visibility/HUD) via the parent (see
 *     Arena3DScene)
 * When none of these are active the scene is genuinely static, so we skip the render.
 */
const RenderLoop: React.FC<RenderLoopProps> = ({
  timeRef,
  followingActorIdRef,
  renderBudgetRef,
}) => {
  const { gl, scene, camera, controls } = useThree();

  const lastRenderedTimeRef = useRef<number | null>(null);

  // Refill the budget whenever the user moves the camera via OrbitControls.
  useEffect(() => {
    if (!controls) {
      return;
    }
    const markDirty = (): void => {
      renderBudgetRef.current = RENDER_TAIL_FRAMES;
    };
    // OrbitControls extends EventDispatcher and emits 'change' on every camera mutation.
    const orbit = controls as unknown as {
      addEventListener: (type: string, cb: () => void) => void;
      removeEventListener: (type: string, cb: () => void) => void;
    };
    orbit.addEventListener('change', markDirty);
    return () => orbit.removeEventListener('change', markDirty);
  }, [controls, renderBudgetRef]);

  // Manual render at lowest priority (highest number) to ensure all other useFrame
  // callbacks (camera, actors, map, HUD) run first.
  useFrame(() => {
    const currentTime = timeRef.current;

    // Time advanced (playback or scrub) → the scene changed; refill the budget.
    if (lastRenderedTimeRef.current !== currentTime) {
      renderBudgetRef.current = RENDER_TAIL_FRAMES;
    }

    // Keep rendering whenever an actor is followed/selected. Load-bearing for TWO reasons,
    // do not remove as "redundant":
    //  1. the follow camera lerps toward its target every frame while active;
    //  2. the same ref drives InstancedReplayFigures3D selection, so an actor's
    //     selection ring update (driven off this ref, not off timeRef) only paints while
    //     paused because this refill keeps the budget topped up.
    //     Deselecting routes through React state (FightReplay3D.setFollowingActor → commit),
    //     which the commit-refill effect covers.
    if (followingActorIdRef.current !== null) {
      renderBudgetRef.current = RENDER_TAIL_FRAMES;
    }

    if (renderBudgetRef.current > 0) {
      renderBudgetRef.current -= 1;
      lastRenderedTimeRef.current = currentTime;
      gl.render(scene, camera);
    }
  }, 999); // Very low priority to render after all updates

  return null;
};

/**
 * Props for the Arena3DScene component
 */
export interface Arena3DSceneProps {
  timeRef: React.RefObject<number> | { current: number };
  lookup: TimestampPositionLookup | null;
  showActorNames?: boolean;
  mapTimeline?: MapTimeline;
  scrubbingMode?: {
    renderQuality: 'high' | 'medium' | 'low';
    shouldUpdatePositions: boolean;
    shouldRenderEffects: boolean;
    frameSkipRate: number;
  };
  followingActorIdRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
  markersState?: MapMarkersState | null;
  onGroundContextMenu?: (payload: GroundContextMenuPayload) => void;
  onMarkerContextMenu?: (payload: MarkerContextMenuPayload) => void;
  /** Marker edit mode: plain right-click context menus + draggable markers (no Alt chord). */
  markersEditMode?: boolean;
  /** Drag-to-move commit for a marker (arena-space coordinates). */
  onMarkerMove?: (markerId: string, arenaPoint: { x: number; z: number }) => void;
  fight: FightFragment;
  initialTarget?: [number, number, number];
  /**
   * The fitted initial camera POSITION (bbox-fit at fight start, computed by Arena3D). Threaded
   * down so the `r` reset key (CameraResetControls) can return to the exact view the user
   * started at, not a generic constant.
   */
  initialPosition?: [number, number, number];
  /** Clears the React "Following:" chip when an in-canvas action (reset/frame-all) unfollows. */
  onUnfollow?: () => void;
  /** Selected player IDs for path visualization */
  selectedPlayerIds?: Set<number>;
  /** Whether to show player trail paths */
  showPlayerTrails?: boolean;
  /**
   * Per-player visibility of the 3D actor models. Owned by Arena3D (so the DOM PlayerListPanel
   * overlay and these in-canvas actors share one source of truth) and passed down here.
   */
  playerVisibility?: Map<number, boolean>;
  /**
   * Per-player body-color overrides (actorId → hex). Owned by Arena3D alongside playerVisibility
   * so the DOM player panel and the in-canvas figures share one source of truth.
   */
  playerColorOverrides?: Map<number, string>;
  /** When true, player figures stop casting shadows (perf headroom for large fights). */
  performanceMode?: boolean;
  /**
   * True when the replay is a mobile device inside the pseudo-fullscreen overlay. Drives the touch
   * gesture policy: OrbitControls pan is disabled so two fingers are exclusively pinch-zoom
   * (CanvasWheelZoom), leaving one-finger rotate clean. Desktop passes false (pan stays on).
   */
  mobileImmersive?: boolean;
}

/**
 * High-frequency 3D scene that updates independently of React state.
 * This component contains all the 3D rendering logic for the Arena3D component,
 * including actors, lighting, map textures, camera controls, and markers.
 */
export const Arena3DScene: React.FC<Arena3DSceneProps> = ({
  timeRef,
  lookup,
  showActorNames = false,
  mapTimeline,
  scrubbingMode,
  followingActorIdRef,
  onActorClick,
  markersState,
  onGroundContextMenu,
  onMarkerContextMenu,
  markersEditMode = false,
  onMarkerMove,
  fight,
  initialTarget,
  initialPosition,
  onUnfollow,
  selectedPlayerIds = new Set(),
  showPlayerTrails = false,
  playerVisibility = EMPTY_VISIBILITY,
  playerColorOverrides = EMPTY_COLOR_OVERRIDES,
  performanceMode = false,
  mobileImmersive = false,
}) => {
  // Touch-gesture policy for OrbitControls. `mobileImmersive` already folds in (mobile && immersive),
  // so the second arg is true; the helper returns enablePan=false there to free two fingers for
  // CanvasWheelZoom's pinch, and enablePan=true everywhere else (desktop). See touchPolicy.ts.
  const touchPolicy = resolveTouchPolicy(mobileImmersive, true);

  // Shared render budget for the on-demand RenderLoop. Refilled on every React commit of
  // this scene (effect below, intentionally no deps) so state-driven mutations — markers,
  // trails, player visibility, HUD toggles, prop changes — always repaint, even while
  // playback is paused. RenderLoop also tops it up from per-frame signals (time / camera /
  // follow). A ref, never state: a state flag would re-render every frame.
  const renderBudgetRef = useRef(RENDER_TAIL_FRAMES);
  useEffect(() => {
    renderBudgetRef.current = RENDER_TAIL_FRAMES;
  });

  // Lets scene children that mutate visible three.js state from an ASYNC callback (outside
  // any React commit, time change, camera move, or follow) tell the RenderLoop to repaint —
  // otherwise that mutation would be invisible while paused until the next unrelated dirty
  // event. The canonical case is DynamicMapTexture swapping material.map when a CDN texture
  // resolves/fails. Children receive this as an opaque markDirty(); they don't know about the
  // budget. Stable identity so it never churns child memoization.
  const markSceneDirty = useCallback(() => {
    renderBudgetRef.current = RENDER_TAIL_FRAMES;
  }, []);

  // Touch path for placing markers: press-and-hold on the ground (edit mode only) opens the
  // same add-marker menu desktop gets from right-click. The arena point is captured at
  // pointer-down; any movement past the slop (drag/rotate/pinch) cancels the press.
  const groundPressPointRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const onGroundContextMenuRef = useRef(onGroundContextMenu);
  onGroundContextMenuRef.current = onGroundContextMenu;
  const groundLongPressRef = useRef<LongPressTracker | null>(null);
  if (groundLongPressRef.current === null) {
    groundLongPressRef.current = new LongPressTracker((start) => {
      const arenaPoint = groundPressPointRef.current;
      if (!arenaPoint) {
        return;
      }
      onGroundContextMenuRef.current?.({
        arenaPoint,
        screenPosition: { left: start.clientX, top: start.clientY },
      });
    });
  }
  const groundLongPress = groundLongPressRef.current;
  useEffect(() => {
    return () => groundLongPress.cancel();
  }, [groundLongPress]);

  // Player visibility is now owned by Arena3D and passed in as a prop, so the DOM
  // PlayerListPanel overlay (which renders the toggle controls) and these in-canvas actors
  // share one source of truth.

  // Calculate arena dimensions and camera settings based on fight bounding box
  const arenaDimensions = useMemo(() => {
    // Arena must always be 100x100 centered at (50, 50) to match actor coordinate system
    // Actor positions use convertCoordinatesWithBottomLeft which maps to 0-100 range
    // The map texture must match this coordinate system for proper alignment
    return {
      size: 100,
      centerX: 50,
      centerZ: 50,
    };
  }, []);

  // Calculate dynamic camera settings based on arena dimensions
  const cameraSettings = useMemo(() => {
    // Default fallback values with closer minimum zoom for detailed actor inspection
    const defaults = {
      target:
        initialTarget ||
        ([arenaDimensions.centerX, 0, arenaDimensions.centerZ] as [number, number, number]),
      minDistance: 0.5, // Allow very close zoom
      maxDistance: 200,
    };

    if (!fight?.boundingBox) {
      return defaults;
    }

    const { minX, maxX, minY, maxY } = fight.boundingBox;

    // Validate that all bounding box values exist
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return defaults;
    }

    // Convert to arena coordinates (divide by 100)
    const arenaMinX = minX / 100;
    const arenaMaxX = maxX / 100;
    const arenaMinZ = -(maxY / 100); // Negate and swap for Z
    const arenaMaxZ = -(minY / 100);

    // Calculate center point of the fight area (only used if initialTarget not provided)
    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerZ = (arenaMinZ + arenaMaxZ) / 2;

    // Calculate the size of the fight area
    const rangeX = arenaMaxX - arenaMinX;
    const rangeZ = arenaMaxZ - arenaMinZ;

    // Set camera distances based on fight area size
    // Minimum: Allow very close zoom for detailed inspection of actors
    // With adaptable actor scale (0.8-1.1x), users need to zoom in closer
    const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
    const minDistance = Math.max(0.5, diagonal * 0.05); // Reduced from 1 and 0.1

    // Maximum: 3x the diagonal for good overview, capped at reasonable bounds
    const maxDistance = Math.min(500, Math.max(50, diagonal * 3));

    return {
      // Always use initialTarget if provided (calculated from actor positions)
      // Only fall back to fight bounding box center if no initialTarget
      target: initialTarget || ([centerX, 0, centerZ] as [number, number, number]),
      minDistance,
      maxDistance,
    };
  }, [fight.boundingBox, initialTarget, arenaDimensions.centerX, arenaDimensions.centerZ]);

  // Calculate actor scale based on map dimensions so actors keep a consistent real-world footprint
  const actorScale = useMemo(() => {
    const zoneId = fight.gameZone?.id;
    const mapId = fight.maps?.[0]?.id;

    if (!zoneId || !mapId) {
      logger.warn('Missing zoneId or mapId for map-based actor scaling', { zoneId, mapId });
      return DEFAULT_ACTOR_SCALE;
    }

    const mapData = getMapScaleData(zoneId, mapId);
    if (!mapData) {
      logger.warn('No map scale data found for map-based actor scaling', { zoneId, mapId });
      return DEFAULT_ACTOR_SCALE;
    }

    const mapScale = computeActorScaleFromMapData(mapData);
    if (mapScale) {
      logger.info('Actor scale calculation (map-based)', {
        fightId: fight.id,
        mapName: mapData.name,
        zoneId,
        mapId,
        actorScale: mapScale.toFixed(3),
      });

      return mapScale;
    }

    logger.warn('Map data produced invalid actor scale, falling back to default', {
      fightId: fight.id,
      mapName: mapData.name,
    });

    // Fallback: use fight bounding box if available, otherwise default constant
    const boundingBox = fight.boundingBox;
    if (boundingBox) {
      const { minX, maxX, minY, maxY } = boundingBox;
      const hasBounds = [minX, maxX, minY, maxY].every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      );

      if (hasBounds) {
        const rangeX = ((maxX as number) - (minX as number)) / 100;
        const rangeZ = ((maxY as number) - (minY as number)) / 100;
        const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);

        if (diagonal > 0) {
          const relativeFightSize = Math.min(1, diagonal / 141.42);
          const fallbackScale = 0.5 + relativeFightSize * 0.3; // Keep within visibility bounds

          logger.warn('Using bounding-box fallback for actor scale', {
            fightId: fight.id,
            diagonal: diagonal.toFixed(2),
            fallbackScale: fallbackScale.toFixed(3),
          });

          return fallbackScale;
        }
      }
    }

    logger.warn('Unable to derive actor scale, using default constant', {
      fightId: fight.id,
      defaultScale: DEFAULT_ACTOR_SCALE,
    });

    return DEFAULT_ACTOR_SCALE;
  }, [fight.boundingBox, fight.gameZone?.id, fight.id, fight.maps]);

  // Process player paths for visualization
  const playerPaths = useMemo(() => {
    if (!lookup || !showPlayerTrails) {
      return new Map();
    }

    // Extract paths for selected players
    const paths = extractPlayerPaths(lookup, Array.from(selectedPlayerIds), DEFAULT_PATH_SAMPLING);

    // Assign colors to each path
    paths.forEach((path) => {
      path.color = getPlayerPathColor(path.actorId);
    });

    return paths;
  }, [lookup, selectedPlayerIds, showPlayerTrails]);

  // Debug logging for Scene component

  return (
    <>
      {/* Performance Monitor hooks - only active in development mode */}
      {/* Only the monitoring hooks run inside Canvas, overlay is rendered outside */}
      <PerformanceMonitorCanvas
        fpsUpdateInterval={500}
        memoryUpdateInterval={1000}
        slowFrameThreshold={33}
        maxSlowFrameLogsPerMinute={10}
      />
      {/* Manual render loop - lowest priority to render after all updates, gated on-demand */}
      <RenderLoop
        timeRef={timeRef}
        followingActorIdRef={followingActorIdRef}
        renderBudgetRef={renderBudgetRef}
      />
      {/* Camera follower system */}
      <CameraFollower lookup={lookup} timeRef={timeRef} followingActorIdRef={followingActorIdRef} />
      {/* In-canvas camera keys: r = reset to fitted initial view, g = frame all actors. Lives in
          the Canvas because it needs the camera + controls (the DOM keydown has no handle). */}
      {initialPosition && initialTarget && (
        <CameraResetControls
          initialCameraPosition={initialPosition}
          initialCameraTarget={initialTarget}
          followingActorIdRef={followingActorIdRef}
          onUnfollow={onUnfollow}
          lookup={lookup}
          timeRef={timeRef}
        />
      )}
      {/* Keyboard camera controls (WASD) - disabled when following an actor */}
      <KeyboardCameraControls enabled={!followingActorIdRef.current} />
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Map Texture - Arena floor background with dynamic phase-based switching */}
      <Suspense
        fallback={
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}
            receiveShadow
          >
            <planeGeometry args={[arenaDimensions.size, arenaDimensions.size]} />
            <meshPhongMaterial color="#2a2a2a" transparent opacity={0.8} />
          </mesh>
        }
      >
        <DynamicMapTexture
          mapTimeline={mapTimeline || { entries: [], totalMaps: 0 }}
          timeRef={timeRef}
          size={arenaDimensions.size}
          position={[arenaDimensions.centerX, -0.02, arenaDimensions.centerZ]}
          onTextureChange={markSceneDirty}
        />
      </Suspense>
      {/* Arena Grid - Dynamically sized based on fight area */}
      <Grid
        args={[arenaDimensions.size, arenaDimensions.size]}
        position={[arenaDimensions.centerX, -0.01, arenaDimensions.centerZ]}
        cellSize={Math.max(5, arenaDimensions.size / 10)}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={arenaDimensions.size / 2}
        sectionThickness={1.5}
        sectionColor="#9d9d9d"
        fadeDistance={arenaDimensions.size * 1.5}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
      {/* Direct useFrame Actors - Each actor uses useFrame independently */}
      <AnimationFrameSceneActors
        lookup={lookup}
        timeRef={timeRef}
        scale={actorScale}
        showNames={showActorNames}
        mapTimeline={mapTimeline}
        scrubbingMode={scrubbingMode}
        followingActorIdRef={followingActorIdRef}
        onActorClick={onActorClick}
        playerVisibility={playerVisibility}
        playerColorOverrides={playerColorOverrides}
        performanceMode={performanceMode}
      />
      {/* Boss health + player list are now DOM overlays rendered by Arena3D as siblings of
          the <Canvas> (crisp text, real scroll region, native MUI styling) — not in-canvas
          textured planes. Only world-anchored labels (actor names) remain in the scene. */}
      {/* Map Markers - Render raid/dungeon markers if provided (M0R or Elms format) */}
      {markersState && (
        <MapMarkers
          markersState={markersState}
          fight={fight}
          onMarkerContextMenu={onMarkerContextMenu}
          editable={markersEditMode}
          onMarkerMove={onMarkerMove}
          markDirty={markSceneDirty}
        />
      )}
      {/* Player Path Trails - Animated trails for selected players */}
      {showPlayerTrails && (
        <PlayerPathTrail3D
          paths={playerPaths}
          timeRef={timeRef}
          lookup={lookup}
          fadeTime={15000} // 15 second fade
          lineWidth={3}
          visible={showPlayerTrails}
        />
      )}
      {/* Interaction plane for the add-marker context menu: Alt+Right-Click (always), plain
          Right-Click in marker edit mode, and press-and-hold on touch in edit mode. */}
      <mesh
        position={[arenaDimensions.centerX, -0.019, arenaDimensions.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event) => {
          if (
            event.button === 2 &&
            (event.nativeEvent.altKey || markersEditMode) &&
            onGroundContextMenu
          ) {
            event.stopPropagation();
            event.nativeEvent.preventDefault();

            onGroundContextMenu({
              arenaPoint: { x: event.point.x, y: event.point.y, z: event.point.z },
              screenPosition: {
                left: event.nativeEvent.clientX,
                top: event.nativeEvent.clientY,
              },
            });
            return;
          }

          // Touch path: arm a long-press at the touched ground point. Camera rotate cancels it
          // via the movement slop, so holding still is the only way it fires.
          if (
            event.button === 0 &&
            event.nativeEvent.pointerType !== 'mouse' &&
            markersEditMode &&
            onGroundContextMenu
          ) {
            groundPressPointRef.current = {
              x: event.point.x,
              y: event.point.y,
              z: event.point.z,
            };
            groundLongPress.begin({
              pointerId: event.pointerId,
              clientX: event.nativeEvent.clientX,
              clientY: event.nativeEvent.clientY,
            });
          }
        }}
        onPointerMove={(event) => {
          groundLongPress.move({
            pointerId: event.pointerId,
            clientX: event.nativeEvent.clientX,
            clientY: event.nativeEvent.clientY,
          });
        }}
        onPointerUp={(event) => {
          groundLongPress.end({
            pointerId: event.pointerId,
            clientX: event.nativeEvent.clientX,
            clientY: event.nativeEvent.clientY,
          });
        }}
        onPointerCancel={() => groundLongPress.cancel()}
        onPointerLeave={() => groundLongPress.cancel()}
      >
        <planeGeometry args={[arenaDimensions.size, arenaDimensions.size]} />
        <meshBasicMaterial visible={false} transparent opacity={0} />
      </mesh>
      {/* Controls - dynamically positioned based on fight area. Zoom is handled by CanvasWheelZoom
          (cooperative wheel: plain wheel scrolls the page through the canvas, Ctrl/⌘+wheel or
          fullscreen zooms) instead of OrbitControls' built-in wheel zoom, which preventDefault()s
          every wheel event and traps page scroll over the canvas. enableZoom=false also governs the
          touch pinch, which CanvasWheelZoom re-implements minimally so mobile pinch is preserved.
          enablePan is gated by the touch policy: off on mobile-immersive so the two-finger gesture is
          pinch-only (no OrbitControls pan colliding with CanvasWheelZoom on the same touchmove). */}
      <OrbitControls
        enablePan={touchPolicy.enablePan}
        enableZoom={false}
        enableRotate={touchPolicy.enableRotate}
        minDistance={cameraSettings.minDistance}
        maxDistance={cameraSettings.maxDistance}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below ground (slightly above horizon)
        minPolarAngle={0.1} // Prevent camera from going directly overhead
        target={cameraSettings.target as [number, number, number]}
        makeDefault
      />
      <CanvasWheelZoom />
    </>
  );
};
