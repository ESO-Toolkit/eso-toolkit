import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  ActorPosition,
  TimestampPositionLookup,
  getActorPositionsByIdAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import {
  GLYPH_SYMBOLS,
  GlyphSymbol,
  getActorGlyphSymbol,
  getGlyphTextureForSymbol,
} from '../utils/actorGlyphTexture';
import {
  getReplayActorAccentColor,
  getReplayActorCoreColor,
  getReplayActorShellColor,
} from '../utils/actorVisualState';
import { enablePerInstanceOpacity } from '../utils/instanceOpacity';

import { BatchedActorNames3D } from './BatchedActorNames3D';

/**
 * Instanced port of the standing-figure actor marker (`FigureReplayActors3D`).
 *
 * The figure design is unchanged — body capsule + role-glyph cap + ground anchor ring + facing
 * wedge + state rings + name card. What changes is the rendering architecture: instead of one
 * React component + useFrame + geometry set per actor (≈6 draw calls per visible actor), each
 * layer is a single InstancedMesh shared across all actors (≈one draw call per layer), driven by
 * per-instance matrices and colors. Live-measured this collapses ~6×N draw calls to a fixed
 * handful (see .scratch/ACTOR-MARKER-PERF-RECOMMENDATION.md).
 *
 * Two figure-specific complications vs the old instanced puck:
 *  1. Per-instance OPACITY. The figure dims rings/vision/body by state (dead/threat). InstanceColor
 *     is RGB-only, so transparent layers use a custom `instanceOpacity` attribute (see
 *     utils/instanceOpacity). Opaque layers (body/cap when alive) don't need it but share the
 *     attribute via the dead-fade path.
 *  2. The role GLYPH is a baked texture, and one InstancedMesh has one texture. Glyphs are grouped
 *     by symbol (≤8 groups: tank/healer/dps/dot/boss/enemy/npc/pet), one InstancedMesh per symbol,
 *     each carrying only the actors with that glyph. Dead is conveyed by dimming, so the per-group
 *     texture is stable and groups never rebuild.
 *
 * Name cards remain per-actor billboards here (Phase 2 replaces them with a batched text layer).
 */
interface InstancedReplayFigures3DProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  showNames?: boolean;
  selectedActorRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
  playerVisibility?: Map<number, boolean>;
}

const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const GROUND_LEVEL = 0.05;
const SELECTION_COLOR = '#38bdf8';
const TAUNT_COLOR = '#f87171';
const HIDDEN_Y = -10000;
const HIDDEN_SCALE = 0.0001;
const MAX_ACTOR_HOVER_DISTANCE = 1000;

// Threat (boss/enemy) figures stand large; players stay short/slim so the crowd doesn't wall off
// the view — identical constants to FigureReplayActors3D.
const THREAT_SCALE = 1.55;
const PLAYER_SCALE = 0.82;

function getActorIdsFromLookup(lookup: TimestampPositionLookup | null): number[] {
  if (!lookup?.positionsByTimestamp) return [];
  if (lookup.actorIds?.length) return lookup.actorIds;
  const ids = new Set<number>();
  Object.values(lookup.positionsByTimestamp).forEach((actors) => {
    Object.keys(actors).forEach((id) => ids.add(Number(id)));
  });
  return Array.from(ids).sort((a, b) => a - b);
}

// Flat ground wedge pointing in the actor's facing (+Z local), matching FigureReplayActors3D.
function createVisionCone(scale: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const radius = 0.18 * scale;
  const length = 0.7 * scale;
  const half = radius * 0.55;
  const tip = radius * 0.9;
  const vertices = new Float32Array([
    -half,
    0,
    tip,
    half,
    0,
    tip,
    radius * 0.8,
    0,
    length,
    -half,
    0,
    tip,
    radius * 0.8,
    0,
    length,
    -radius * 0.8,
    0,
    length,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

/** The opaque/standard layers (body, cap) and the flat basic layers (rings, vision, glyph). */
interface FigureGeometries {
  body: THREE.CapsuleGeometry;
  cap: THREE.CylinderGeometry;
  glyph: THREE.PlaneGeometry;
  vision: THREE.BufferGeometry;
  anchorRing: THREE.RingGeometry;
  selectionRing: THREE.RingGeometry;
  tauntRing: THREE.RingGeometry;
}

function createFigureGeometries(scale: number, bodyHeight: number): FigureGeometries {
  const r = 0.18 * scale;
  return {
    body: new THREE.CapsuleGeometry(0.11 * scale, bodyHeight * 0.5, 6, 12),
    cap: new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.04 * scale, 16),
    glyph: new THREE.PlaneGeometry(0.22 * scale, 0.22 * scale),
    vision: createVisionCone(scale),
    anchorRing: new THREE.RingGeometry(r * 0.8, r * 1.2, 40),
    selectionRing: new THREE.RingGeometry(r * 1.6, r * 2.0, 48),
    tauntRing: new THREE.RingGeometry(r * 1.1, r * 1.4, 40),
  };
}

interface InstanceCache {
  coreColor: string;
  accentColor: string;
  shellColor: string;
  bodyOpacity: number;
  capOpacity: number;
  glyphOpacity: number;
  ringOpacity: number;
  visionOpacity: number;
  glyphSymbol: GlyphSymbol;
  dead: boolean;
  taunted: boolean;
  selected: boolean;
  visible: boolean;
}

interface FrameCache {
  lookup: TimestampPositionLookup | null;
  time: number;
  selectedActorId: number | null;
  playerVisibility: Map<number, boolean> | undefined;
  actorIds: readonly number[];
}

function isThreatActor(actor: ActorPosition): boolean {
  return actor.type === 'boss' || actor.type === 'enemy';
}

export const InstancedReplayFigures3D: React.FC<InstancedReplayFigures3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  showNames = false,
  selectedActorRef,
  onActorClick,
  playerVisibility = EMPTY_VISIBILITY,
}) => {
  const bodyHeight = 0.55 * scale;
  const capY = bodyHeight + 0.02 * scale;
  const glyphY = capY + 0.03 * scale;

  const actorIds = useMemo(() => getActorIdsFromLookup(lookup), [lookup]);
  const instanceCount = actorIds.length;

  // Stable index → glyph-group membership. An actor's symbol is fixed (role/type don't change
  // mid-fight), so we can assign each actor to one glyph group once and only toggle visibility.
  const glyphSymbolByIndex = useRef<GlyphSymbol[]>([]);

  // Mesh refs.
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const visionRef = useRef<THREE.InstancedMesh>(null);
  const anchorRingRef = useRef<THREE.InstancedMesh>(null);
  const selectionRingRef = useRef<THREE.InstancedMesh>(null);
  const tauntRingRef = useRef<THREE.InstancedMesh>(null);
  // One glyph InstancedMesh per symbol; each sized to the full instanceCount and indexed by the
  // same actor index (non-members are hidden) so instanceId → actorId stays uniform across layers.
  const glyphRefs = useRef<Map<GlyphSymbol, THREE.InstancedMesh>>(new Map());

  // Per-instance opacity attribute arrays (filled in once meshes mount, in the layout effect).
  const opacityArrays = useRef<{
    body?: Float32Array;
    cap?: Float32Array;
    vision?: Float32Array;
    anchorRing?: Float32Array;
    glyph: Map<GlyphSymbol, Float32Array>;
  }>({ glyph: new Map() });

  const cacheRef = useRef<Array<InstanceCache | null>>([]);
  const frameCacheRef = useRef<FrameCache | null>(null);
  const tempObject = useRef(new THREE.Object3D());
  const tempColor = useRef(new THREE.Color());

  const geometries = useMemo(() => createFigureGeometries(scale, bodyHeight), [scale, bodyHeight]);

  const materials = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, transparent: true }),
      cap: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, transparent: true }),
      vision: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      anchorRing: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      selectionRing: new THREE.MeshBasicMaterial({
        color: SELECTION_COLOR,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      tauntRing: new THREE.MeshBasicMaterial({
        color: TAUNT_COLOR,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );

  // Per-symbol glyph materials (one texture each). Built once; transparent + per-instance opacity.
  const glyphMaterials = useMemo(() => {
    const map = new Map<GlyphSymbol, THREE.MeshBasicMaterial>();
    GLYPH_SYMBOLS.forEach((symbol) => {
      map.set(
        symbol,
        new THREE.MeshBasicMaterial({
          map: getGlyphTextureForSymbol(symbol),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
    });
    return map;
  }, []);

  useLayoutEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      glyphMaterials.forEach((m) => m.dispose());
    };
  }, [geometries, materials, glyphMaterials]);

  // Assign glyph-group membership per actor index, once per lookup.
  useLayoutEffect(() => {
    const positions = lookup ? lookup.positionsByTimestamp : null;
    // Find any sample of each actor to read its (fixed) type/role → symbol.
    const sampleByActor: Record<number, ActorPosition> = {};
    if (positions) {
      for (const ts of Object.keys(positions)) {
        const atTs = positions[Number(ts)];
        for (const id of actorIds) {
          if (sampleByActor[id] === undefined && atTs[id]) {
            sampleByActor[id] = atTs[id];
          }
        }
      }
    }
    glyphSymbolByIndex.current = actorIds.map((id) =>
      getActorGlyphSymbol(sampleByActor[id] ?? null),
    );
  }, [actorIds, lookup]);

  // Wire instanced meshes: dynamic usage, frustum off (matrices move off-screen to hide), render
  // order, and per-instance opacity attributes.
  useLayoutEffect(() => {
    const o = opacityArrays.current;
    const setup = (
      mesh: THREE.InstancedMesh | null,
      renderOrder: number,
      withOpacity: boolean,
    ): Float32Array | undefined => {
      if (!mesh) return undefined;
      mesh.frustumCulled = false;
      mesh.renderOrder = renderOrder;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (mesh.instanceColor) mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      if (withOpacity) {
        return enablePerInstanceOpacity(
          mesh.geometry,
          mesh.material as THREE.Material,
          instanceCount,
        );
      }
      return undefined;
    };

    o.anchorRing = setup(anchorRingRef.current, 10, true);
    o.vision = setup(visionRef.current, 11, true);
    o.body = setup(bodyRef.current, 12, true);
    o.cap = setup(capRef.current, 13, true);
    setup(selectionRingRef.current, 14, false);
    setup(tauntRingRef.current, 15, false);
    glyphRefs.current.forEach((mesh, symbol) => {
      const arr = setup(mesh, 16, true);
      if (arr) o.glyph.set(symbol, arr);
    });

    frameCacheRef.current = null; // force a rebuild on next frame
  }, [instanceCount, geometries, materials, glyphMaterials]);

  const hideInstance = useCallback((mesh: THREE.InstancedMesh | null, index: number): void => {
    if (!mesh) return;
    const obj = tempObject.current;
    obj.position.set(0, HIDDEN_Y, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(HIDDEN_SCALE);
    obj.updateMatrix();
    mesh.setMatrixAt(index, obj.matrix);
  }, []);

  useFrame(() => {
    const currentTime = timeRef ? timeRef.current : 0;
    const selectedActorId = selectedActorRef.current;
    const prevFrame = frameCacheRef.current;

    if (
      prevFrame &&
      prevFrame.lookup === lookup &&
      prevFrame.time === currentTime &&
      prevFrame.selectedActorId === selectedActorId &&
      prevFrame.playerVisibility === playerVisibility &&
      prevFrame.actorIds === actorIds
    ) {
      return;
    }
    frameCacheRef.current = {
      lookup,
      time: currentTime,
      selectedActorId,
      playerVisibility,
      actorIds,
    };

    if (!lookup || instanceCount === 0) {
      return;
    }

    const positionsById = getActorPositionsByIdAtClosestTimestamp(lookup, currentTime);
    const obj = tempObject.current;
    const col = tempColor.current;
    const o = opacityArrays.current;

    let colorDirty = false;
    let opacityDirty = false;

    for (let index = 0; index < instanceCount; index++) {
      const actorId = actorIds[index];
      const actor = positionsById?.[actorId] || null;
      const isVisible = !!actor && (playerVisibility.get(actorId) ?? true);
      const groupSymbol = glyphSymbolByIndex.current[index];

      if (!actor || !isVisible) {
        if (cacheRef.current[index]?.visible !== false) {
          hideInstance(bodyRef.current, index);
          hideInstance(capRef.current, index);
          hideInstance(visionRef.current, index);
          hideInstance(anchorRingRef.current, index);
          hideInstance(selectionRingRef.current, index);
          hideInstance(tauntRingRef.current, index);
          glyphRefs.current.forEach((mesh) => hideInstance(mesh, index));
          cacheRef.current[index] = {
            ...(cacheRef.current[index] as InstanceCache),
            visible: false,
          } as InstanceCache;
        }
        continue;
      }

      const [x, y, z] = actor.position;
      const groupScale = isThreatActor(actor) ? THREAT_SCALE : PLAYER_SCALE;
      const dead = actor.isDead;
      const isThreat = isThreatActor(actor);
      const selected = selectedActorId === actorId;
      const taunted = actor.isTaunted || false;

      const accentColor = getReplayActorAccentColor(actor);
      const coreColor = getReplayActorCoreColor(actor);
      const shellColor = getReplayActorShellColor(actor);

      const bodyOpacity = dead ? 0.4 : 1;
      const capOpacity = dead ? 0.4 : 1;
      const glyphOpacity = dead ? 0.45 : 1;
      const ringOpacity = dead ? 0.35 : isThreat ? 0.95 : 0.7;
      const visionOpacity = dead ? 0.12 : 0.42;

      // ---- Matrices ----
      // Body: at group scale, dead squashes y to 0.3. Positioned at bodyHeight*0.6 like the figure.
      obj.position.set(x, y + GROUND_LEVEL + bodyHeight * 0.6 * groupScale, z);
      obj.rotation.set(0, actor.rotation, 0);
      obj.scale.set(groupScale, groupScale * (dead ? 0.3 : 1), groupScale);
      obj.updateMatrix();
      bodyRef.current?.setMatrixAt(index, obj.matrix);

      // Cap rides at capY * groupScale.
      obj.position.set(x, y + GROUND_LEVEL + capY * groupScale, z);
      obj.rotation.set(0, actor.rotation, 0);
      obj.scale.setScalar(groupScale);
      obj.updateMatrix();
      capRef.current?.setMatrixAt(index, obj.matrix);

      // Glyph plane lies flat above the cap, faces up (rotation -PI/2 X).
      obj.position.set(x, y + GROUND_LEVEL + glyphY * groupScale, z);
      obj.rotation.set(-Math.PI / 2, 0, 0);
      obj.scale.setScalar(groupScale);
      obj.updateMatrix();
      glyphRefs.current.forEach((mesh, symbol) => {
        if (symbol === groupSymbol) {
          mesh.setMatrixAt(index, obj.matrix);
        } else {
          hideInstance(mesh, index);
        }
      });

      // Anchor ring flat on ground.
      obj.position.set(x, y + GROUND_LEVEL + 0.006, z);
      obj.rotation.set(-Math.PI / 2, 0, 0);
      obj.scale.setScalar(groupScale);
      obj.updateMatrix();
      anchorRingRef.current?.setMatrixAt(index, obj.matrix);

      // Vision wedge flat on ground, in facing direction.
      obj.position.set(x, y + GROUND_LEVEL + 0.012, z);
      obj.rotation.set(0, actor.rotation, 0);
      obj.scale.setScalar(groupScale);
      obj.updateMatrix();
      visionRef.current?.setMatrixAt(index, obj.matrix);

      // Selection / taunt rings: shown only when active.
      if (selected) {
        obj.position.set(x, y + GROUND_LEVEL + 0.016, z);
        obj.rotation.set(-Math.PI / 2, 0, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        selectionRingRef.current?.setMatrixAt(index, obj.matrix);
      } else {
        hideInstance(selectionRingRef.current, index);
      }
      if (taunted) {
        obj.position.set(x, y + GROUND_LEVEL + 0.022, z);
        obj.rotation.set(-Math.PI / 2, 0, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        tauntRingRef.current?.setMatrixAt(index, obj.matrix);
      } else {
        hideInstance(tauntRingRef.current, index);
      }

      // ---- Colors + opacity (only write when changed) ----
      const prev = cacheRef.current[index];
      const changed =
        !prev ||
        !prev.visible ||
        prev.coreColor !== coreColor ||
        prev.accentColor !== accentColor ||
        prev.shellColor !== shellColor ||
        prev.bodyOpacity !== bodyOpacity ||
        prev.ringOpacity !== ringOpacity ||
        prev.visionOpacity !== visionOpacity ||
        prev.glyphOpacity !== glyphOpacity;

      if (changed) {
        bodyRef.current?.setColorAt(index, col.set(coreColor));
        capRef.current?.setColorAt(index, col.set(accentColor));
        anchorRingRef.current?.setColorAt(index, col.set(shellColor));
        visionRef.current?.setColorAt(index, col.set(accentColor));
        colorDirty = true;

        if (o.body) o.body[index] = bodyOpacity;
        if (o.cap) o.cap[index] = capOpacity;
        if (o.anchorRing) o.anchorRing[index] = ringOpacity;
        if (o.vision) o.vision[index] = visionOpacity;
        const glyphArr = o.glyph.get(groupSymbol);
        if (glyphArr) glyphArr[index] = glyphOpacity;
        opacityDirty = true;
      }

      cacheRef.current[index] = {
        coreColor,
        accentColor,
        shellColor,
        bodyOpacity,
        capOpacity,
        glyphOpacity,
        ringOpacity,
        visionOpacity,
        glyphSymbol: groupSymbol,
        dead,
        taunted,
        selected,
        visible: true,
      };
    }

    // Flush matrices every frame (positions change constantly during playback).
    [
      bodyRef.current,
      capRef.current,
      visionRef.current,
      anchorRingRef.current,
      selectionRingRef.current,
      tauntRingRef.current,
    ].forEach((m) => {
      if (m) m.instanceMatrix.needsUpdate = true;
    });
    glyphRefs.current.forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
    });

    if (colorDirty) {
      [bodyRef.current, capRef.current, anchorRingRef.current, visionRef.current].forEach((m) => {
        if (m?.instanceColor) m.instanceColor.needsUpdate = true;
      });
    }
    if (opacityDirty) {
      const flag = (mesh: THREE.InstancedMesh | null): void => {
        const attr = mesh?.geometry.getAttribute('instanceOpacity') as
          | THREE.InstancedBufferAttribute
          | undefined;
        if (attr) attr.needsUpdate = true;
      };
      flag(bodyRef.current);
      flag(capRef.current);
      flag(anchorRingRef.current);
      flag(visionRef.current);
      glyphRefs.current.forEach((m) => flag(m));
    }
  }, RenderPriority.ACTORS);

  // ---- Interaction (instanceId → actorId) ----
  const getActorIdFromEvent = useCallback(
    (event: { instanceId?: number }): number | null => {
      const id = event.instanceId;
      if (typeof id !== 'number' || id < 0 || id >= actorIds.length) return null;
      if (cacheRef.current[id]?.visible === false) return null;
      return actorIds[id];
    },
    [actorIds],
  );
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const actorId = getActorIdFromEvent(event);
      if (actorId === null) return;
      event.stopPropagation();
      onActorClick?.(actorId);
    },
    [getActorIdFromEvent, onActorClick],
  );
  const handleOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.distance > MAX_ACTOR_HOVER_DISTANCE || getActorIdFromEvent(event) === null) return;
      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    [getActorIdFromEvent],
  );
  const handleOut = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = 'auto';
  }, []);

  if (instanceCount === 0) {
    return null;
  }

  return (
    <>
      <instancedMesh
        ref={anchorRingRef}
        args={[geometries.anchorRing, materials.anchorRing, instanceCount]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      />
      <instancedMesh ref={visionRef} args={[geometries.vision, materials.vision, instanceCount]} />
      <instancedMesh
        ref={bodyRef}
        args={[geometries.body, materials.body, instanceCount]}
        castShadow
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      />
      <instancedMesh
        ref={capRef}
        args={[geometries.cap, materials.cap, instanceCount]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      />
      <instancedMesh
        ref={selectionRingRef}
        args={[geometries.selectionRing, materials.selectionRing, instanceCount]}
      />
      <instancedMesh
        ref={tauntRingRef}
        args={[geometries.tauntRing, materials.tauntRing, instanceCount]}
      />
      {GLYPH_SYMBOLS.map((symbol) => (
        <instancedMesh
          key={symbol}
          ref={(mesh) => {
            if (mesh) glyphRefs.current.set(symbol, mesh);
            else glyphRefs.current.delete(symbol);
          }}
          args={[geometries.glyph, glyphMaterials.get(symbol)!, instanceCount]}
        />
      ))}
      {showNames && (
        <BatchedActorNames3D
          lookup={lookup}
          timeRef={timeRef}
          scale={scale}
          actorIds={actorIds}
          playerVisibility={playerVisibility}
        />
      )}
    </>
  );
};
