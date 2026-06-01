import { useFrame, type ThreeEvent } from '@react-three/fiber';
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
  getReplayActorCoreColor,
  getReplayActorShellColor,
} from '../utils/actorVisualState';

import { ActorNameBillboard } from './ActorNameBillboard';

/**
 * Variant C — "tall figure with baked glyph". The explicit "too far / don't ship" reference.
 *
 * A taller 3D body (capsule) carries a role glyph BAKED onto a 3D cap plane — deliberately not
 * a billboard — so the user can feel, live, exactly why the literature warns against this under
 * a tilted/rotating orbit camera: tall bodies occlude neighbors in dense stacks, and the baked
 * glyph foreshortens and rotates away from the viewer as the camera orbits. Built so the
 * judgment is concrete, not theoretical.
 */
interface FigureReplayActors3DProps {
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

interface FigureActorProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale: number;
  showName: boolean;
  selectedActorRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
}

const FigureActor: React.FC<FigureActorProps> = ({
  actorId,
  lookup,
  timeRef,
  scale,
  showName,
  selectedActorRef,
  onActorClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const capMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const selectionRingRef = useRef<THREE.Mesh>(null);
  const tauntRingRef = useRef<THREE.Mesh>(null);
  const isVisibleRef = useRef(false);

  const bodyHeight = 0.55 * scale;

  const geometries = useMemo(() => {
    const r = 0.18 * scale;
    return {
      body: new THREE.CapsuleGeometry(0.11 * scale, bodyHeight * 0.5, 6, 12),
      cap: new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.04 * scale, 16),
      glyph: new THREE.PlaneGeometry(0.22 * scale, 0.22 * scale),
      ring: new THREE.RingGeometry(r * 0.8, r * 1.2, 40),
      selection: new THREE.RingGeometry(r * 1.6, r * 2.0, 48),
      taunt: new THREE.RingGeometry(r * 1.1, r * 1.4, 40),
    };
  }, [scale, bodyHeight]);

  useEffect(() => {
    return () => Object.values(geometries).forEach((g) => g.dispose());
  }, [geometries]);

  const glyphMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(() => () => glyphMaterial.dispose(), [glyphMaterial]);

  const prevStateRef = useRef<{
    color: string;
    glyphKey: string;
    isDead: boolean;
    isTaunted: boolean;
    isSelected: boolean;
  } | null>(null);

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

    const accent = getReplayActorAccentColor(actor);
    const core = getReplayActorCoreColor(actor);
    const shell = getReplayActorShellColor(actor);
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
      if (bodyMaterialRef.current) {
        bodyMaterialRef.current.color.set(core);
        bodyMaterialRef.current.opacity = actor.isDead ? 0.4 : 1;
        bodyMaterialRef.current.transparent = actor.isDead;
      }
      if (capMaterialRef.current) {
        capMaterialRef.current.color.set(accent);
        capMaterialRef.current.opacity = actor.isDead ? 0.4 : 1;
        capMaterialRef.current.transparent = actor.isDead;
      }
      glyphMaterial.map = glyphTexture;
      glyphMaterial.opacity = actor.isDead ? 0.4 : 1;
      glyphMaterial.needsUpdate = true;
      if (ringMaterialRef.current) {
        ringMaterialRef.current.color.set(shell);
        ringMaterialRef.current.opacity = actor.isDead ? 0.4 : 0.9;
      }
      // Dead figure collapses (body squashes toward the ground).
      if (bodyRef.current) {
        bodyRef.current.scale.y = actor.isDead ? 0.3 : 1;
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

  const capY = bodyHeight + 0.02 * scale;

  return (
    <group ref={groupRef} visible={false}>
      {/* Ground anchor ring */}
      <mesh
        geometry={geometries.ring}
        position={[0, 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshBasicMaterial
          ref={ringMaterialRef}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tall body (occludes neighbors — that's the point of the reference) */}
      <mesh
        ref={bodyRef}
        geometry={geometries.body}
        position={[0, bodyHeight * 0.6, 0]}
        castShadow
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshStandardMaterial ref={bodyMaterialRef} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Cap + baked glyph plane (foreshortens/rotates away under orbit — the point) */}
      <mesh geometry={geometries.cap} position={[0, capY, 0]}>
        <meshStandardMaterial ref={capMaterialRef} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh
        geometry={geometries.glyph}
        material={glyphMaterial}
        position={[0, capY + 0.03 * scale, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Selection ring (cyan) */}
      <mesh
        ref={selectionRingRef}
        geometry={geometries.selection}
        position={[0, 0.016, 0]}
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

      {/* Taunt ring */}
      <mesh
        ref={tauntRingRef}
        geometry={geometries.taunt}
        position={[0, 0.022, 0]}
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

      {showName && (
        <ActorNameBillboard actorId={actorId} lookup={lookup} timeRef={timeRef} scale={scale} />
      )}
    </group>
  );
};

export const FigureReplayActors3D: React.FC<FigureReplayActors3DProps> = ({
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
          <FigureActor
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
