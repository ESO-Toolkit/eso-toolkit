import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  ActorPosition,
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { getReplayActorLabelColor } from '../utils/actorVisualState';
import {
  NamePriority,
  NamePriorityValue,
  NameScreenItem,
  resolveNameVisibility,
} from '../utils/resolveNameVisibility';

/**
 * SDF-based actor name layer (Phase 2), replacing the per-actor CanvasTexture billboards in
 * `ActorNameBillboard`. Each name is a drei <Text> (troika SDF text) instead of a 1024×256
 * CanvasTexture + material per actor. The win isn't fewer draw calls (troika renders one mesh per
 * Text, so it stays ~N) — it's removing the per-actor canvas/texture/material churn: all names now
 * share ONE SDF glyph atlas, with no per-actor canvas raster and no per-actor CanvasTexture upload.
 *
 * Behavior preserved from ActorNameBillboard: per-name text, per-actor color (getReplayActorLabelColor),
 * dead dimming, distance-based screen-size scaling, always-camera-facing, the stable per-actor
 * renderOrder (1000 + actorId) + depthTest:false flicker fix, and the N-key visibility toggle
 * (driven by the parent passing/omitting this layer).
 *
 * SCREEN-SPACE DECLUTTER: when actors stack tightly (the melee ball on a boss) the tags pile up
 * into an unreadable blob. Distance-fade can't fix a close stack — every name sits at nearly the
 * same camera distance. So ONE coordinator useFrame (here, NOT per-name) projects every name to the
 * viewport, runs a greedy overlap pass (`resolveNameVisibility`) that keeps the followed player and
 * bosses as priority anchors and fades lower-priority overlappers, then writes the resulting opacity
 * to each <Text>. Doing it in a single coordinator (instead of a useFrame per name) keeps the cost
 * O(N) projection + one O(N²) overlap pass per frame — NOT O(N²) closures — and the coordinator
 * early-returns when neither the camera nor the playhead moved, so idle frames stay render-free
 * (the on-demand render gate only throttles gl.render, not useFrame).
 */
interface BatchedActorNames3DProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  actorIds: number[];
  playerVisibility?: Map<number, boolean>;
  /** The followed/locked-on actor — always kept legible and used as a declutter priority anchor. */
  selectedActorRef?: React.RefObject<number | null>;
}

const GROUND_LEVEL = 0.05;
const BILLBOARD_HEIGHT_OFFSET = 0.35;
const BASE_DISTANCE = 24;
const FONT_SIZE = 0.42;
const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const DEAD_FILL_OPACITY = 0.62;
// Faded overlappers keep a faint ghost rather than vanishing — enough to hint presence without
// rejoining the blob. Outline fades proportionally so the dark halo doesn't outlive the fill.
const FADED_OPACITY = 0.1;
// Rough on-screen label box, in world units before distance-scale, used only to size the
// collision rectangle for the overlap pass. troika's true bounds aren't known until an async sync,
// so we approximate width from glyph count; the declutter only needs the boxes to be in the right
// ballpark, not pixel-exact.
const CHAR_WIDTH_FACTOR = 0.55; // average glyph advance as a fraction of font size
const LABEL_WORLD_HEIGHT = FONT_SIZE * 1.2;

type NameTextMesh = THREE.Mesh & {
  text?: string;
  color?: unknown;
  fillOpacity?: number;
  outlineOpacity?: number;
};

interface NameHandle {
  group: THREE.Group | null;
  text: NameTextMesh | null;
}

interface SingleNameProps {
  actorId: number;
}

/**
 * A single name tag. Deliberately dumb: it owns NO useFrame. All per-frame work (position,
 * camera-facing, scale, text, color, opacity, declutter) is driven by the parent coordinator via
 * the imperative handle below, so there is exactly one useFrame for the whole layer.
 */
const SingleName = forwardRef<NameHandle, SingleNameProps>(({ actorId }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<NameTextMesh>(null);

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return groupRef.current;
      },
      get text() {
        return textRef.current;
      },
    }),
    [],
  );

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
});
SingleName.displayName = 'SingleName';

function priorityForActor(actor: ActorPosition, selectedActorId: number | null): NamePriorityValue {
  if (selectedActorId != null && actor.id === selectedActorId) return NamePriority.FOLLOWED;
  if (actor.type === 'boss') return NamePriority.BOSS;
  return NamePriority.NORMAL;
}

export const BatchedActorNames3D: React.FC<BatchedActorNames3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  actorIds,
  playerVisibility = EMPTY_VISIBILITY,
  selectedActorRef,
}) => {
  const { camera, size } = useThree();

  const visibleActorIds = useMemo(
    () => actorIds.filter((id) => playerVisibility.get(id) ?? true),
    [actorIds, playerVisibility],
  );

  // Damp actor scale so oversized arenas don't create huge labels (matches ActorNameBillboard).
  const adjustedActorScale = 0.4 + scale * 0.6;

  // One handle per name; the coordinator writes through these refs.
  const handlesRef = useRef<Map<number, NameHandle>>(new Map());

  // Per-name presentation cache so we only touch troika's text/color/opacity when they change.
  const lastData = useRef<Map<number, { name: string; color: string; alive: boolean }>>(new Map());
  const lastVisible = useRef<Map<number, boolean>>(new Map());

  // Idle gate: skip the entire pass (no ref writes, no projection, no render trigger) when neither
  // the camera nor the playhead moved since last frame. The on-demand render gate throttles
  // gl.render but NOT useFrame, so this guard is what keeps an idle, paused scene render-free.
  const lastCamPos = useRef(new THREE.Vector3(NaN, NaN, NaN));
  const lastCamQuat = useRef(new THREE.Quaternion(NaN, NaN, NaN, NaN));
  const lastTime = useRef(NaN);
  const lastSize = useRef({ w: 0, h: 0 });

  // Scratch objects reused every frame (no per-frame allocation in the hot loop).
  const scratchWorld = useRef(new THREE.Vector3());
  const scratchProjected = useRef(new THREE.Vector3());
  const screenItems = useRef<NameScreenItem[]>([]);

  useFrame(() => {
    const handles = handlesRef.current;
    if (!lookup || handles.size === 0) return;

    const currentTime = timeRef ? timeRef.current : 0;

    // --- Idle gate ---------------------------------------------------------------------------
    const camMoved =
      !lastCamPos.current.equals(camera.position) || !lastCamQuat.current.equals(camera.quaternion);
    const timeMoved = lastTime.current !== currentTime;
    const sizeChanged = lastSize.current.w !== size.width || lastSize.current.h !== size.height;
    if (!camMoved && !timeMoved && !sizeChanged) return;
    lastCamPos.current.copy(camera.position);
    lastCamQuat.current.copy(camera.quaternion);
    lastTime.current = currentTime;
    lastSize.current.w = size.width;
    lastSize.current.h = size.height;

    const selectedActorId = selectedActorRef ? selectedActorRef.current : null;

    // --- Pass 1: position / orient / scale / text every name; collect on-screen rectangles ----
    const items = screenItems.current;
    items.length = 0;

    handles.forEach((handle, actorId) => {
      const group = handle.group;
      const text = handle.text;
      if (!group || !text) return;

      const actor = getActorPositionAtClosestTimestamp(lookup, actorId, currentTime);

      const wasVisible = lastVisible.current.get(actorId);
      if (!actor) {
        if (wasVisible !== false) {
          group.visible = false;
          lastVisible.current.set(actorId, false);
        }
        return;
      }
      if (wasVisible === false || wasVisible === undefined) {
        group.visible = true;
        lastVisible.current.set(actorId, true);
      }

      // World-anchored position above the actor.
      const [x, y, z] = actor.position;
      group.position.set(x, y + GROUND_LEVEL + BILLBOARD_HEIGHT_OFFSET * scale, z);
      // Always face the camera (copy camera orientation — the group is a scene child, no parent
      // rotation to counteract, mirroring ActorNameBillboard's anchorMode="world").
      group.quaternion.copy(camera.quaternion);

      // Distance-based screen-size scaling, identical curve to ActorNameBillboard.
      group.getWorldPosition(scratchWorld.current);
      const distanceToCamera = camera.position.distanceTo(scratchWorld.current);
      const distanceScale = Math.max(0.4, Math.min(1.4, distanceToCamera / BASE_DISTANCE));
      const finalScale = distanceScale * adjustedActorScale;
      group.scale.setScalar(finalScale);

      // Update text content/color only when the underlying data changes (opacity is set below,
      // every frame the pass runs, because the declutter result can change without the data).
      const color = getReplayActorLabelColor(actor);
      const alive = !actor.isDead;
      const prev = lastData.current.get(actorId);
      if (!prev || prev.name !== actor.name || prev.color !== color || prev.alive !== alive) {
        text.text = actor.name;
        (text as unknown as { color: string }).color = color;
        lastData.current.set(actorId, { name: actor.name, color, alive });
      }

      // Project the anchor to screen pixels and size an approximate collision box.
      scratchProjected.current.copy(scratchWorld.current).project(camera);
      // Behind the camera → treat as off-screen (don't let it occupy declutter space).
      if (scratchProjected.current.z > 1) return;
      const screenX = (scratchProjected.current.x * 0.5 + 0.5) * size.width;
      const screenY = (-scratchProjected.current.y * 0.5 + 0.5) * size.height;

      // World→pixel scale: a 1-unit segment at this depth spans this many vertical pixels.
      // Derived from the perspective frustum half-height at this distance (h = 2·d·tan(fov/2)).
      const fovRad = ((camera as THREE.PerspectiveCamera).fov ?? 50) * (Math.PI / 180);
      const frustumHeight = 2 * Math.max(distanceToCamera, 0.001) * Math.tan(fovRad / 2);
      const worldToPixel = size.height / frustumHeight;
      const charCount = Math.max(actor.name.length, 1);
      const labelWorldW = charCount * FONT_SIZE * CHAR_WIDTH_FACTOR * finalScale;
      const labelWorldH = LABEL_WORLD_HEIGHT * finalScale;
      const halfW = (labelWorldW * worldToPixel) / 2;
      const halfH = (labelWorldH * worldToPixel) / 2;

      items.push({
        id: actorId,
        screenX,
        screenY,
        halfW,
        halfH,
        priority: priorityForActor(actor, selectedActorId),
      });
    });

    // --- Pass 2: resolve overlap once, then write opacity through the refs --------------------
    const visibility = resolveNameVisibility(items, { fadedOpacity: FADED_OPACITY });

    handles.forEach((handle, actorId) => {
      const text = handle.text;
      if (!text) return;
      const data = lastData.current.get(actorId);
      const declutter = visibility.get(actorId);
      if (declutter === undefined) return; // off-screen / no actor this frame
      const deadDim = data && !data.alive ? DEAD_FILL_OPACITY : 1;
      const fill = deadDim * declutter;
      text.fillOpacity = fill;
      text.outlineOpacity = 0.95 * declutter;
    });
  }, RenderPriority.HUD);

  return (
    <>
      {visibleActorIds.map((actorId) => (
        <SingleName
          key={actorId}
          actorId={actorId}
          ref={(handle) => {
            if (handle) handlesRef.current.set(actorId, handle);
            else handlesRef.current.delete(actorId);
          }}
        />
      ))}
    </>
  );
};
