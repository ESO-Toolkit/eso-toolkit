import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { getActorGlyphTexture } from '../utils/actorGlyphTexture';
import {
  getReplayActorAccentColor,
  getReplayActorHaloColor,
  getReplayActorShellColor,
} from '../utils/actorVisualState';

import { ActorNameBillboard } from './ActorNameBillboard';

/**
 * Variant B — "low billboarded pawn".
 *
 * Each actor is anchored by a flat ground ring (universal, evidence-backed) and gains a short
 * CAMERA-FACING billboard "pawn card" that carries the role/type glyph. The raised part is a
 * billboard, never baked 3D geometry, so identity never foreshortens or rotates away under the
 * tilted orbit camera, and stacked actors don't occlude each other with tall bodies.
 *
 * This is a per-actor proto (not instanced) — acceptable for live A/B/C judging; the winner
 * gets the instanced perf pass. Honors the full marker contract: click-to-follow, hover cursor,
 * playerVisibility gating, dead/taunt/selected, name billboards, scale.
 */
interface PawnReplayActors3DProps {
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

function getActorIdsFromLookup(lookup: TimestampPositionLookup | null): number[] {
  if (!lookup?.positionsByTimestamp) return [];
  if (lookup.actorIds?.length) return lookup.actorIds;
  const ids = new Set<number>();
  Object.values(lookup.positionsByTimestamp).forEach((actors) => {
    Object.keys(actors).forEach((id) => ids.add(Number(id)));
  });
  return Array.from(ids).sort((a, b) => a - b);
}

interface PawnActorProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale: number;
  showName: boolean;
  selectedActorRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
}

const PawnActor: React.FC<PawnActorProps> = ({
  actorId,
  lookup,
  timeRef,
  scale,
  showName,
  selectedActorRef,
  onActorClick,
}) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const visionMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cardGroupRef = useRef<THREE.Group>(null);
  const cardMeshRef = useRef<THREE.Mesh>(null);
  const stemMeshRef = useRef<THREE.Mesh>(null);
  const selectionRingRef = useRef<THREE.Mesh>(null);
  const tauntRingRef = useRef<THREE.Mesh>(null);

  const isVisibleRef = useRef(false);
  const cardQuaternionRef = useRef(new THREE.Quaternion());
  const parentQuaternionRef = useRef(new THREE.Quaternion());

  // Per-actor geometries (proto — winner gets instanced rewrite). Disposed on unmount.
  const geometries = useMemo(() => {
    const ringRadius = 0.18 * scale;
    return {
      ring: new THREE.RingGeometry(ringRadius * 0.7, ringRadius, 40),
      halo: new THREE.RingGeometry(ringRadius, ringRadius * 1.7, 40),
      vision: createVisionCone(scale),
      card: new THREE.PlaneGeometry(0.34 * scale, 0.34 * scale),
      stem: new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, 0.34 * scale, 6),
      selection: new THREE.RingGeometry(ringRadius * 1.7, ringRadius * 2.1, 48),
      taunt: new THREE.RingGeometry(ringRadius * 1.18, ringRadius * 1.46, 40),
    };
  }, [scale]);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [geometries]);

  const cardMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        alphaTest: 0.05,
      }),
    [],
  );
  useEffect(() => () => cardMaterial.dispose(), [cardMaterial]);

  const prevStateRef = useRef<{
    color: string;
    glyphKey: string;
    isDead: boolean;
    isTaunted: boolean;
    isSelected: boolean;
  } | null>(null);

  const cardStemHeight = 0.32 * scale;

  useFrame(() => {
    if (!lookup || !groupRef.current) return;
    const currentTime = timeRef ? timeRef.current : 0;
    const actor = getActorPositionAtClosestTimestamp(lookup, actorId, currentTime);

    if (!actor) {
      if (isVisibleRef.current) {
        groupRef.current.visible = false;
        isVisibleRef.current = false;
      }
      return;
    }

    if (!isVisibleRef.current) {
      groupRef.current.visible = true;
      isVisibleRef.current = true;
    }

    const [x, y, z] = actor.position;
    groupRef.current.position.set(x, y + GROUND_LEVEL, z);
    groupRef.current.rotation.y = actor.rotation;

    // Card billboards toward the camera, counteracting the parent's facing rotation.
    if (cardGroupRef.current) {
      const parentQ = parentQuaternionRef.current.identity();
      cardGroupRef.current.parent?.getWorldQuaternion(parentQ);
      cardQuaternionRef.current.copy(parentQ).invert().multiply(camera.quaternion);
      cardGroupRef.current.quaternion.copy(cardQuaternionRef.current);
    }

    const accent = getReplayActorAccentColor(actor);
    const shell = getReplayActorShellColor(actor);
    const halo = getReplayActorHaloColor(actor);
    const glyphTexture = getActorGlyphTexture(actor);
    const isSelected = selectedActorRef.current === actorId;
    const isTaunted = actor.isTaunted || false;
    const glyphKey = glyphTexture.uuid;

    const prev = prevStateRef.current;
    const changed =
      !prev ||
      prev.color !== accent ||
      prev.glyphKey !== glyphKey ||
      prev.isDead !== actor.isDead ||
      prev.isTaunted !== isTaunted ||
      prev.isSelected !== isSelected;

    if (changed) {
      if (ringMaterialRef.current) {
        ringMaterialRef.current.color.set(shell);
        ringMaterialRef.current.opacity = actor.isDead ? 0.45 : 1;
        ringMaterialRef.current.transparent = true;
      }
      if (haloMaterialRef.current) {
        haloMaterialRef.current.color.set(halo);
        haloMaterialRef.current.opacity = actor.isDead ? 0.12 : 0.4;
      }
      if (visionMaterialRef.current) {
        visionMaterialRef.current.color.set(accent);
        visionMaterialRef.current.opacity = actor.isDead ? 0.12 : 0.42;
      }
      if (cardMeshRef.current) {
        cardMaterial.map = glyphTexture;
        cardMaterial.opacity = actor.isDead ? 0.5 : 1;
        cardMaterial.needsUpdate = true;
      }
      if (stemMeshRef.current) {
        stemMeshRef.current.visible = !actor.isDead;
      }
      // Dead pawn collapses to the ground (the card drops onto its anchor).
      if (cardGroupRef.current) {
        cardGroupRef.current.position.y = actor.isDead ? 0.04 * scale : cardStemHeight;
      }
      if (selectionRingRef.current) selectionRingRef.current.visible = isSelected;
      if (tauntRingRef.current) tauntRingRef.current.visible = isTaunted;

      prevStateRef.current = {
        color: accent,
        glyphKey,
        isDead: actor.isDead,
        isTaunted,
        isSelected,
      };
    }
  }, RenderPriority.ACTORS);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isVisibleRef.current) return;
      e.stopPropagation();
      onActorClick?.(actorId);
    },
    [actorId, onActorClick],
  );
  const handleOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isVisibleRef.current) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  }, []);
  const handleOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <group ref={groupRef} visible={false}>
      {/* Anchor ring (flat on ground) */}
      <mesh
        geometry={geometries.ring}
        position={[0, 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshBasicMaterial ref={ringMaterialRef} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Soft halo — also the primary click/hover surface (largest ground footprint),
          matching variant A so click-to-follow is not finicky. */}
      <mesh
        geometry={geometries.halo}
        position={[0, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshBasicMaterial
          ref={haloMaterialRef}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Facing wedge */}
      <mesh
        geometry={geometries.vision}
        position={[0, 0.012, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshBasicMaterial
          ref={visionMaterialRef}
          transparent
          opacity={0.42}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Selection ring (cyan) */}
      <mesh
        ref={selectionRingRef}
        geometry={geometries.selection}
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <meshBasicMaterial
          color={SELECTION_COLOR}
          transparent
          opacity={0.92}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Taunt ring (theme danger) */}
      <mesh
        ref={tauntRingRef}
        geometry={geometries.taunt}
        position={[0, 0.024, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <meshBasicMaterial
          color={TAUNT_COLOR}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stem connecting anchor to card (visual "presence") */}
      <mesh
        ref={stemMeshRef}
        geometry={geometries.stem}
        position={[0, cardStemHeight / 2, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Billboarded pawn card carrying the role glyph */}
      <group ref={cardGroupRef} position={[0, cardStemHeight, 0]}>
        <mesh
          ref={cardMeshRef}
          geometry={geometries.card}
          material={cardMaterial}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        />
      </group>

      {showName && (
        <ActorNameBillboard actorId={actorId} lookup={lookup} timeRef={timeRef} scale={scale} />
      )}
    </group>
  );
};

function createVisionCone(scale: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const radius = 0.18 * scale;
  const length = 0.7 * scale;
  const half = radius * 0.55;
  const tip = radius * 0.9;
  const vertices = new Float32Array([
    -half,
    0,
    -tip,
    half,
    0,
    -tip,
    radius * 0.8,
    0,
    -length,
    -half,
    0,
    -tip,
    radius * 0.8,
    0,
    -length,
    -radius * 0.8,
    0,
    -length,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

export const PawnReplayActors3D: React.FC<PawnReplayActors3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  showNames = false,
  selectedActorRef,
  onActorClick,
  playerVisibility = EMPTY_VISIBILITY,
}) => {
  const actorIds = useMemo(() => getActorIdsFromLookup(lookup), [lookup]);

  return (
    <>
      {actorIds.map((actorId) => {
        const visible = playerVisibility.get(actorId) ?? true;
        if (!visible) return null;
        return (
          <PawnActor
            key={actorId}
            actorId={actorId}
            lookup={lookup}
            timeRef={timeRef}
            scale={scale}
            showName={showNames}
            selectedActorRef={selectedActorRef}
            onActorClick={onActorClick}
          />
        );
      })}
    </>
  );
};
