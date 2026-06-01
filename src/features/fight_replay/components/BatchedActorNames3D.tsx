import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { getReplayActorLabelColor } from '../utils/actorVisualState';

/**
 * SDF-based actor name layer (Phase 2), replacing the per-actor CanvasTexture billboards in
 * `ActorNameBillboard`. Each name is a drei <Text> (troika SDF text) instead of a 1024×256
 * CanvasTexture + material per actor. The win isn't fewer draw calls (troika renders one mesh per
 * Text, so it stays ~N) — it's removing the per-actor canvas/texture/material churn: all names now
 * share ONE SDF glyph atlas, with no per-actor canvas raster and no per-actor CanvasTexture upload.
 * Live-measured this drops names-ON render-time well below the CanvasTexture baseline.
 *
 * Behavior preserved from ActorNameBillboard: per-name text, per-actor color (getReplayActorLabelColor),
 * dead dimming, distance-based screen-size scaling, always-camera-facing, the stable per-actor
 * renderOrder (1000 + actorId) + depthTest:false flicker fix, and the N-key visibility toggle
 * (driven by the parent passing/omitting this layer).
 */
interface BatchedActorNames3DProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  actorIds: number[];
  playerVisibility?: Map<number, boolean>;
}

const GROUND_LEVEL = 0.05;
const BILLBOARD_HEIGHT_OFFSET = 0.35;
const BASE_DISTANCE = 24;
const FONT_SIZE = 0.42;
const EMPTY_VISIBILITY: Map<number, boolean> = new Map();

interface SingleNameProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale: number;
}

const SingleName: React.FC<SingleNameProps> = ({ actorId, lookup, timeRef, scale }) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh & { text?: string; color?: unknown; fillOpacity?: number }>(
    null,
  );
  const visibleRef = useRef(true);
  const worldPos = useRef(new THREE.Vector3());
  const lastData = useRef<{ name: string; color: string; alive: boolean } | null>(null);

  // Damp actor scale so oversized arenas don't create huge labels (matches ActorNameBillboard).
  const adjustedActorScale = 0.4 + scale * 0.6;

  useFrame(() => {
    const group = groupRef.current;
    const text = textRef.current;
    if (!lookup || !group || !text) return;

    const currentTime = timeRef ? timeRef.current : 0;
    const actor = getActorPositionAtClosestTimestamp(lookup, actorId, currentTime);

    if (!actor) {
      if (visibleRef.current) {
        group.visible = false;
        visibleRef.current = false;
      }
      return;
    }
    if (!visibleRef.current) {
      group.visible = true;
      visibleRef.current = true;
    }

    // World-anchored position above the actor.
    const [x, y, z] = actor.position;
    group.position.set(x, y + GROUND_LEVEL + BILLBOARD_HEIGHT_OFFSET * scale, z);
    // Always face the camera (copy camera orientation — the group is a scene child, no parent
    // rotation to counteract, mirroring ActorNameBillboard's anchorMode="world").
    group.quaternion.copy(camera.quaternion);

    // Distance-based screen-size scaling, identical curve to ActorNameBillboard.
    group.getWorldPosition(worldPos.current);
    const distanceToCamera = camera.position.distanceTo(worldPos.current);
    const distanceScale = Math.max(0.4, Math.min(1.4, distanceToCamera / BASE_DISTANCE));
    group.scale.setScalar(distanceScale * adjustedActorScale);

    // Update text content/color/opacity only when the underlying data changes.
    const color = getReplayActorLabelColor(actor);
    const alive = !actor.isDead;
    const prev = lastData.current;
    if (!prev || prev.name !== actor.name || prev.color !== color || prev.alive !== alive) {
      text.text = actor.name;
      (text as unknown as { color: string }).color = color;
      text.fillOpacity = alive ? 1 : 0.62;
      lastData.current = { name: actor.name, color, alive };
    }
  }, RenderPriority.HUD);

  return (
    <group ref={groupRef}>
      {/* Stable per-actor renderOrder + depthTest:false: the flicker fix from ActorNameBillboard.
          Overlapping cards would otherwise reorder as the orbit camera moves and pop between
          showing/hiding each other. A fixed per-actor order makes draw order angle-independent. */}
      <Text
        ref={textRef}
        fontSize={FONT_SIZE}
        anchorX="center"
        anchorY="middle"
        // Dark text outline keeps names readable over bright map textures and stacked actors —
        // this replaces the CanvasTexture badge panel (the figure variant ran that panel at ~0.22
        // opacity, so the outline carries the readability the panel used to).
        outlineWidth="6%"
        outlineColor="#020617"
        outlineOpacity={0.95}
        renderOrder={1000 + actorId}
        material-depthTest={false}
        material-depthWrite={false}
        material-transparent
        material-toneMapped={false}
      >
        {''}
      </Text>
    </group>
  );
};

export const BatchedActorNames3D: React.FC<BatchedActorNames3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  actorIds,
  playerVisibility = EMPTY_VISIBILITY,
}) => {
  const visibleActorIds = useMemo(
    () => actorIds.filter((id) => playerVisibility.get(id) ?? true),
    [actorIds, playerVisibility],
  );

  return (
    <>
      {visibleActorIds.map((actorId) => (
        <SingleName
          key={actorId}
          actorId={actorId}
          lookup={lookup}
          timeRef={timeRef}
          scale={scale}
        />
      ))}
    </>
  );
};
