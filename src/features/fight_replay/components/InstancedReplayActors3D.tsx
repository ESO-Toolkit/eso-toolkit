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
  REPLAY_ACTOR_COLORS,
  getReplayActorAccentColor,
  getReplayActorCoreColor,
  getReplayActorHaloColor,
  getReplayActorShellColor,
} from '../utils/actorVisualState';

import { ActorNameBillboard } from './ActorNameBillboard';

interface InstancedReplayActors3DProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  showNames?: boolean;
  selectedActorRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
  playerVisibility?: Map<number, boolean>;
}

interface ActorInstanceGeometries {
  haloGeometry: THREE.RingGeometry;
  puckBaseGeometry: THREE.CylinderGeometry;
  puckCoreGeometry: THREE.CylinderGeometry;
  visionConeGeometry: THREE.BufferGeometry;
  selectionRingGeometry: THREE.RingGeometry;
  tauntRingGeometry: THREE.RingGeometry;
}

interface FrameCache {
  lookup: TimestampPositionLookup | null;
  time: number;
  selectedActorId: number | null;
  playerVisibility: Map<number, boolean> | undefined;
  actorIds: readonly number[];
}

interface InstanceVisualCache {
  baseColor: string;
  coreColor: string;
  haloColor: string;
  visionColor: string;
  visible: boolean;
  selected: boolean;
  taunted: boolean;
  dead: boolean;
}

const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const GROUND_LEVEL = 0.05;
const PUCK_RADIUS = 0.2;
const PUCK_HEIGHT = 0.11;
const HIDDEN_Y = -10000;
const HIDDEN_SCALE = 0.001;
const DEAD_SCALE = 0.78;
const VISION_CONE_LENGTH = 0.88;
const VISION_CONE_ANGLE = Math.PI / 7;
const MAX_ACTOR_HOVER_DISTANCE = 1000;

function getActorIdsFromLookup(lookup: TimestampPositionLookup | null): number[] {
  if (!lookup?.positionsByTimestamp) {
    return [];
  }

  if (lookup.actorIds?.length) {
    return lookup.actorIds;
  }

  const allActorIds = new Set<number>();
  Object.values(lookup.positionsByTimestamp).forEach((timestampActors) => {
    Object.keys(timestampActors).forEach((actorId) => allActorIds.add(Number(actorId)));
  });

  return Array.from(allActorIds).sort((a, b) => a - b);
}

function createVisionConeGeometry(scale: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const puckRadius = PUCK_RADIUS * scale;
  const coneRadius = VISION_CONE_LENGTH * scale * Math.tan(VISION_CONE_ANGLE);
  const coneLength = VISION_CONE_LENGTH * scale;
  const shoulder = puckRadius * 0.64;

  const vertices = new Float32Array([
    -shoulder,
    0,
    puckRadius * 0.16,
    shoulder,
    0,
    puckRadius * 0.16,
    coneRadius,
    0,
    coneLength,
    -shoulder,
    0,
    puckRadius * 0.16,
    coneRadius,
    0,
    coneLength,
    -coneRadius,
    0,
    coneLength,
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  geometry.computeVertexNormals();

  return geometry;
}

function createActorInstanceGeometries(scale: number): ActorInstanceGeometries {
  const puckRadius = PUCK_RADIUS * scale;
  const puckHeight = PUCK_HEIGHT * scale;

  const haloGeometry = new THREE.RingGeometry(puckRadius * 1.32, puckRadius * 2.24, 48);
  const puckBaseGeometry = new THREE.CylinderGeometry(
    puckRadius * 1.1,
    puckRadius * 1.2,
    puckHeight * 0.52,
    32,
    1,
  );
  const puckCoreGeometry = new THREE.CylinderGeometry(
    puckRadius * 0.98,
    puckRadius * 0.92,
    puckHeight * 0.9,
    32,
    1,
  );
  const visionConeGeometry = createVisionConeGeometry(scale);
  const selectionRingGeometry = new THREE.RingGeometry(
    (PUCK_RADIUS + 0.2) * scale,
    (PUCK_RADIUS + 0.35) * scale,
    56,
  );
  const tauntRingGeometry = new THREE.RingGeometry(
    (PUCK_RADIUS + 0.05) * scale,
    (PUCK_RADIUS + 0.14) * scale,
    40,
  );

  puckBaseGeometry.translate(0, -puckHeight * 0.04, 0);
  puckCoreGeometry.translate(0, puckHeight * 0.14, 0);

  return {
    haloGeometry,
    puckBaseGeometry,
    puckCoreGeometry,
    visionConeGeometry,
    selectionRingGeometry,
    tauntRingGeometry,
  };
}

function setInstanceMatrix(
  mesh: THREE.InstancedMesh | null,
  index: number,
  object: THREE.Object3D,
): void {
  if (!mesh) return;
  object.updateMatrix();
  mesh.setMatrixAt(index, object.matrix);
}

function setHiddenMatrix(
  mesh: THREE.InstancedMesh | null,
  index: number,
  object: THREE.Object3D,
): void {
  object.position.set(0, HIDDEN_Y, 0);
  object.rotation.set(0, 0, 0);
  object.scale.setScalar(HIDDEN_SCALE);
  setInstanceMatrix(mesh, index, object);
}

function markMatrixNeedsUpdate(mesh: THREE.InstancedMesh | null): void {
  if (mesh) {
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function markColorNeedsUpdate(mesh: THREE.InstancedMesh | null): void {
  if (mesh?.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

export const InstancedReplayActors3D: React.FC<InstancedReplayActors3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  showNames = false,
  selectedActorRef,
  onActorClick,
  playerVisibility = EMPTY_VISIBILITY,
}) => {
  const haloMeshRef = useRef<THREE.InstancedMesh>(null);
  const puckBaseMeshRef = useRef<THREE.InstancedMesh>(null);
  const puckCoreMeshRef = useRef<THREE.InstancedMesh>(null);
  const visionConeMeshRef = useRef<THREE.InstancedMesh>(null);
  const selectionRingMeshRef = useRef<THREE.InstancedMesh>(null);
  const tauntRingMeshRef = useRef<THREE.InstancedMesh>(null);
  const frameCacheRef = useRef<FrameCache | null>(null);
  const visualCacheRef = useRef<Array<InstanceVisualCache | null>>([]);
  const visibleInstancesRef = useRef<boolean[]>([]);
  const tempObjectRef = useRef(new THREE.Object3D());
  const tempColorRef = useRef(new THREE.Color());

  const actorIds = useMemo(() => getActorIdsFromLookup(lookup), [lookup]);
  const actorIdByInstance = useMemo(() => actorIds, [actorIds]);
  const instanceCount = actorIds.length;

  const geometries = useMemo(() => createActorInstanceGeometries(scale), [scale]);
  const materials = useMemo(
    () => ({
      halo: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      puckBase: new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
      puckCore: new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
      visionCone: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      selectionRing: new THREE.MeshBasicMaterial({
        color: '#fde68a',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      tauntRing: new THREE.MeshBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );

  useLayoutEffect(() => {
    return () => {
      geometries.haloGeometry.dispose();
      geometries.puckBaseGeometry.dispose();
      geometries.puckCoreGeometry.dispose();
      geometries.visionConeGeometry.dispose();
      geometries.selectionRingGeometry.dispose();
      geometries.tauntRingGeometry.dispose();
    };
  }, [geometries]);

  useLayoutEffect(() => {
    return () => {
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [materials]);

  useLayoutEffect(() => {
    [
      haloMeshRef.current,
      puckBaseMeshRef.current,
      puckCoreMeshRef.current,
      visionConeMeshRef.current,
      selectionRingMeshRef.current,
      tauntRingMeshRef.current,
    ].forEach((mesh) => {
      if (mesh) {
        mesh.frustumCulled = false;
      }
    });

    const renderOrderedMeshes: Array<[THREE.InstancedMesh | null, number]> = [
      [haloMeshRef.current, 10],
      [visionConeMeshRef.current, 11],
      [puckBaseMeshRef.current, 12],
      [puckCoreMeshRef.current, 13],
      [selectionRingMeshRef.current, 14],
      [tauntRingMeshRef.current, 15],
    ];

    renderOrderedMeshes.forEach(([mesh, renderOrder]) => {
      if (mesh) {
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.renderOrder = renderOrder;
      }
    });
  }, [geometries, instanceCount]);

  const hideAllInstances = useCallback((): void => {
    const object = tempObjectRef.current;
    for (let index = 0; index < instanceCount; index++) {
      setHiddenMatrix(haloMeshRef.current, index, object);
      setHiddenMatrix(puckBaseMeshRef.current, index, object);
      setHiddenMatrix(puckCoreMeshRef.current, index, object);
      setHiddenMatrix(visionConeMeshRef.current, index, object);
      setHiddenMatrix(selectionRingMeshRef.current, index, object);
      setHiddenMatrix(tauntRingMeshRef.current, index, object);
      visibleInstancesRef.current[index] = false;
      visualCacheRef.current[index] = null;
    }

    [
      haloMeshRef.current,
      puckBaseMeshRef.current,
      puckCoreMeshRef.current,
      visionConeMeshRef.current,
      selectionRingMeshRef.current,
      tauntRingMeshRef.current,
    ].forEach(markMatrixNeedsUpdate);
  }, [instanceCount]);

  useLayoutEffect(() => {
    hideAllInstances();

    const defaultColor = tempColorRef.current.set(REPLAY_ACTOR_COLORS.defaultPlayer);
    for (let index = 0; index < instanceCount; index++) {
      haloMeshRef.current?.setColorAt(index, defaultColor);
      puckBaseMeshRef.current?.setColorAt(index, defaultColor);
      puckCoreMeshRef.current?.setColorAt(index, defaultColor);
      visionConeMeshRef.current?.setColorAt(index, defaultColor);
    }

    [
      haloMeshRef.current,
      puckBaseMeshRef.current,
      puckCoreMeshRef.current,
      visionConeMeshRef.current,
    ].forEach((mesh) => {
      mesh?.instanceColor?.setUsage(THREE.DynamicDrawUsage);
    });

    markColorNeedsUpdate(haloMeshRef.current);
    markColorNeedsUpdate(puckBaseMeshRef.current);
    markColorNeedsUpdate(puckCoreMeshRef.current);
    markColorNeedsUpdate(visionConeMeshRef.current);
    frameCacheRef.current = null;
  }, [hideAllInstances, instanceCount]);

  const setInstanceColor = useCallback(
    (mesh: THREE.InstancedMesh | null, index: number, color: string): void => {
      if (!mesh) return;
      mesh.setColorAt(index, tempColorRef.current.set(color));
    },
    [],
  );

  const updateActorInstance = useCallback(
    (
      actor: ActorPosition,
      index: number,
      selectedActorId: number | null,
    ): {
      baseColorChanged: boolean;
      coreColorChanged: boolean;
      haloColorChanged: boolean;
      visionColorChanged: boolean;
    } => {
      const object = tempObjectRef.current;
      const [x, y, z] = actor.position;
      const yOffset = (index % 100) * 0.00008;
      const actorScale = actor.isDead ? DEAD_SCALE : 1;
      const selected = selectedActorId === actor.id;
      const taunted = actor.isTaunted || false;
      const baseColor = getReplayActorShellColor(actor);
      const coreColor = getReplayActorCoreColor(actor);
      const haloColor = getReplayActorHaloColor(actor);
      const visionColor = getReplayActorAccentColor(actor);
      const previous = visualCacheRef.current[index];

      object.position.set(x, y + GROUND_LEVEL + yOffset, z);
      object.rotation.set(0, actor.rotation, 0);
      object.scale.setScalar(actorScale);
      setInstanceMatrix(puckBaseMeshRef.current, index, object);
      setInstanceMatrix(puckCoreMeshRef.current, index, object);

      object.position.set(x, GROUND_LEVEL + 0.004 + yOffset, z);
      object.rotation.set(-Math.PI / 2, 0, 0);
      object.scale.setScalar(actor.isDead ? DEAD_SCALE * 0.86 : 1);
      setInstanceMatrix(haloMeshRef.current, index, object);

      if (actor.isDead) {
        setHiddenMatrix(visionConeMeshRef.current, index, object);
      } else {
        object.position.set(x, GROUND_LEVEL + 0.012 + yOffset, z);
        object.rotation.set(0, actor.rotation, 0);
        object.scale.setScalar(1);
        setInstanceMatrix(visionConeMeshRef.current, index, object);
      }

      if (selected) {
        object.position.set(x, GROUND_LEVEL + 0.018 + yOffset, z);
        object.rotation.set(-Math.PI / 2, 0, 0);
        object.scale.setScalar(1);
        setInstanceMatrix(selectionRingMeshRef.current, index, object);
      } else {
        setHiddenMatrix(selectionRingMeshRef.current, index, object);
      }

      if (taunted) {
        object.position.set(x, GROUND_LEVEL + 0.024 + yOffset, z);
        object.rotation.set(-Math.PI / 2, 0, 0);
        object.scale.setScalar(1);
        setInstanceMatrix(tauntRingMeshRef.current, index, object);
      } else {
        setHiddenMatrix(tauntRingMeshRef.current, index, object);
      }

      visibleInstancesRef.current[index] = true;
      visualCacheRef.current[index] = {
        baseColor,
        coreColor,
        haloColor,
        visionColor,
        visible: true,
        selected,
        taunted,
        dead: actor.isDead,
      };

      const baseColorChanged = previous?.baseColor !== baseColor || !previous.visible;
      const coreColorChanged = previous?.coreColor !== coreColor || !previous.visible;
      const haloColorChanged = previous?.haloColor !== haloColor || !previous.visible;
      const visionColorChanged = previous?.visionColor !== visionColor || !previous.visible;

      if (baseColorChanged) {
        setInstanceColor(puckBaseMeshRef.current, index, baseColor);
      }
      if (coreColorChanged) {
        setInstanceColor(puckCoreMeshRef.current, index, coreColor);
      }
      if (haloColorChanged) {
        setInstanceColor(haloMeshRef.current, index, haloColor);
      }
      if (visionColorChanged) {
        setInstanceColor(visionConeMeshRef.current, index, visionColor);
      }

      return { baseColorChanged, coreColorChanged, haloColorChanged, visionColorChanged };
    },
    [setInstanceColor],
  );

  const hideActorInstance = useCallback((index: number): void => {
    if (!visibleInstancesRef.current[index]) {
      return;
    }

    const object = tempObjectRef.current;
    setHiddenMatrix(haloMeshRef.current, index, object);
    setHiddenMatrix(puckBaseMeshRef.current, index, object);
    setHiddenMatrix(puckCoreMeshRef.current, index, object);
    setHiddenMatrix(visionConeMeshRef.current, index, object);
    setHiddenMatrix(selectionRingMeshRef.current, index, object);
    setHiddenMatrix(tauntRingMeshRef.current, index, object);
    visibleInstancesRef.current[index] = false;
    visualCacheRef.current[index] = null;
  }, []);

  useFrame(() => {
    const currentTime = timeRef ? timeRef.current : 0;
    const selectedActorId = selectedActorRef.current;
    const previousFrame = frameCacheRef.current;

    if (
      previousFrame &&
      previousFrame.lookup === lookup &&
      previousFrame.time === currentTime &&
      previousFrame.selectedActorId === selectedActorId &&
      previousFrame.playerVisibility === playerVisibility &&
      previousFrame.actorIds === actorIds
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
      hideAllInstances();
      return;
    }

    const positionsById = getActorPositionsByIdAtClosestTimestamp(lookup, currentTime);
    let baseColorNeedsUpdate = false;
    let coreColorNeedsUpdate = false;
    let haloColorNeedsUpdate = false;
    let visionColorNeedsUpdate = false;

    for (let index = 0; index < instanceCount; index++) {
      const actorId = actorIds[index];
      const actor = positionsById?.[actorId] || null;
      const isVisible = actor && (playerVisibility.get(actorId) ?? true);

      if (!actor || !isVisible) {
        hideActorInstance(index);
        continue;
      }

      const changes = updateActorInstance(actor, index, selectedActorId);
      baseColorNeedsUpdate ||= changes.baseColorChanged;
      coreColorNeedsUpdate ||= changes.coreColorChanged;
      haloColorNeedsUpdate ||= changes.haloColorChanged;
      visionColorNeedsUpdate ||= changes.visionColorChanged;
    }

    [
      haloMeshRef.current,
      puckBaseMeshRef.current,
      puckCoreMeshRef.current,
      visionConeMeshRef.current,
      selectionRingMeshRef.current,
      tauntRingMeshRef.current,
    ].forEach(markMatrixNeedsUpdate);

    if (baseColorNeedsUpdate) {
      markColorNeedsUpdate(puckBaseMeshRef.current);
    }
    if (coreColorNeedsUpdate) {
      markColorNeedsUpdate(puckCoreMeshRef.current);
    }
    if (haloColorNeedsUpdate) {
      markColorNeedsUpdate(haloMeshRef.current);
    }
    if (visionColorNeedsUpdate) {
      markColorNeedsUpdate(visionConeMeshRef.current);
    }
  }, RenderPriority.ACTORS);

  const getActorIdFromEvent = useCallback(
    (event: { instanceId?: number }): number | null => {
      const instanceId = event.instanceId;
      if (
        typeof instanceId !== 'number' ||
        instanceId < 0 ||
        instanceId >= actorIdByInstance.length ||
        !visibleInstancesRef.current[instanceId]
      ) {
        return null;
      }

      return actorIdByInstance[instanceId];
    },
    [actorIdByInstance],
  );

  const handleActorClick = useCallback(
    (event: ThreeEvent<MouseEvent>): void => {
      const actorId = getActorIdFromEvent(event);
      if (actorId === null) {
        return;
      }

      event.stopPropagation();
      onActorClick?.(actorId);
    },
    [getActorIdFromEvent, onActorClick],
  );

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>): void => {
      if (event.distance > MAX_ACTOR_HOVER_DISTANCE || getActorIdFromEvent(event) === null) {
        return;
      }

      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    [getActorIdFromEvent],
  );

  const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <>
      <instancedMesh
        name="replay-actor-halo"
        ref={haloMeshRef}
        args={[geometries.haloGeometry, materials.halo, instanceCount]}
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <instancedMesh
        name="replay-actor-puck-base"
        ref={puckBaseMeshRef}
        args={[geometries.puckBaseGeometry, materials.puckBase, instanceCount]}
        castShadow
        receiveShadow
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <instancedMesh
        name="replay-actor-puck-core"
        ref={puckCoreMeshRef}
        args={[geometries.puckCoreGeometry, materials.puckCore, instanceCount]}
        castShadow
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <instancedMesh
        name="replay-actor-facing-cone"
        ref={visionConeMeshRef}
        args={[geometries.visionConeGeometry, materials.visionCone, instanceCount]}
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <instancedMesh
        name="replay-actor-selection-ring"
        ref={selectionRingMeshRef}
        args={[geometries.selectionRingGeometry, materials.selectionRing, instanceCount]}
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <instancedMesh
        name="replay-actor-taunt-ring"
        ref={tauntRingMeshRef}
        args={[geometries.tauntRingGeometry, materials.tauntRing, instanceCount]}
        onClick={handleActorClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      {showNames &&
        actorIds.map((actorId) => {
          const isVisible = playerVisibility.get(actorId) ?? true;
          return isVisible ? (
            <ActorNameBillboard
              key={actorId}
              actorId={actorId}
              lookup={lookup}
              timeRef={timeRef}
              scale={scale}
              anchorMode="world"
            />
          ) : null;
        })}
    </>
  );
};
