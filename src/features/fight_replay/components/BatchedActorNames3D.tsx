import { Text } from '@react-three/drei/core/Text.js';
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
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
  /** Barebones budget: at most this many names visible (priority-ranked), null = unlimited. */
  nameTagBudget?: number | null;
  /** Frame-cap verdict — on capped-out frames the whole pass defers (idle-gate refs untouched). */
  capGateRef?: React.RefObject<{ skip: boolean }>;
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
// Overlap-declutter cadence while the camera/playhead moves. 10Hz cuts the O(N) projections +
// O(N²) box pass ~10× at trash-pull actor counts; label tracking stays per-frame regardless.
const DECLUTTER_INTERVAL_MS = 100;
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

  // troika computes text bounds asynchronously after sync, so a freshly synced (or just-moved)
  // tag can carry a stale/empty bounding sphere for a frame and pop out at frustum edges. The
  // coordinator already gates visibility, so culling saves nothing — disable it on both the group
  // and the text. (Set imperatively like the instanced layers: the JSX prop form trips the
  // react/no-unknown-property rule for these elements.)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.frustumCulled = false;
    }
    if (textRef.current) {
      textRef.current.frustumCulled = false;
    }
  }, []);

  return (
    // frustumCulled off (see the effect above): troika bounds compute async while groups move
    // per-frame, so pre-sync empty spheres get culled on fast orbits and names pop.
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
  nameTagBudget = null,
  capGateRef,
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
  // Selection also gates the pass: lock-on usually starts the follow-camera lerp (camera moves →
  // the gate fires anyway), but a selection change while the camera and playhead are static would
  // otherwise be skipped, leaving the newly-followed name faded. The whole promise of the feature
  // is "the followed name is always legible", so the gate must react to selection directly.
  const lastSelected = useRef<number | null | undefined>(undefined);

  // Declutter cadence: the O(N) screen projections + O(N²) overlap resolve run
  // at most every DECLUTTER_INTERVAL_MS while the playhead/camera moves (label
  // TRACKING — position/orientation/scale/text — stays per-frame smooth).
  // Troika applies fillOpacity as a raw uniform with no transition, so between
  // ticks every label simply holds its last opacity: no flicker is possible,
  // the only observable change is ≤100ms latency on a newly-overlapping fade.
  // Selection changes and resizes force a tick (the "followed name is always
  // legible" contract); actor appear/disappear flips are only discoverable
  // mid-loop, so they arm forceDeclutter for the NEXT frame (≤1 rAF late — a
  // fresh label may show at its default opacity for one frame, same as today).
  const lastDeclutterAt = useRef(-Infinity);
  const forceDeclutter = useRef(false);

  // Scratch objects reused every frame (no per-frame allocation in the hot loop).
  const scratchWorld = useRef(new THREE.Vector3());
  const scratchProjected = useRef(new THREE.Vector3());
  // Pooled NameScreenItem objects (grow-only, never shrunk) so Pass 1 mutates existing objects
  // instead of allocating ~N fresh ones every frame — that per-frame garbage was a steady GC drip
  // at the playback frame rate. `screenItems` is the reused active list (length reset each frame; it
  // holds references INTO the pool, so resolveNameVisibility — which only reads — is unaffected).
  const itemPool = useRef<NameScreenItem[]>([]);
  const screenItems = useRef<NameScreenItem[]>([]);

  useFrame(() => {
    // Frame cap: defer the whole pass. The idle-gate bookkeeping below stays
    // untouched, so the next allowed frame sees the camera/time as "moved" and
    // runs the full pass.
    if (capGateRef?.current?.skip) return;

    const handles = handlesRef.current;
    if (!lookup || handles.size === 0) return;

    const currentTime = timeRef ? timeRef.current : 0;
    const selectedActorId = selectedActorRef ? selectedActorRef.current : null;

    // --- Idle gate ---------------------------------------------------------------------------
    const camMoved =
      !lastCamPos.current.equals(camera.position) || !lastCamQuat.current.equals(camera.quaternion);
    const timeMoved = lastTime.current !== currentTime;
    const sizeChanged = lastSize.current.w !== size.width || lastSize.current.h !== size.height;
    const selectionChanged = lastSelected.current !== selectedActorId;
    if (!camMoved && !timeMoved && !sizeChanged && !selectionChanged) return;
    lastCamPos.current.copy(camera.position);
    lastCamQuat.current.copy(camera.quaternion);
    lastTime.current = currentTime;
    lastSize.current.w = size.width;
    lastSize.current.h = size.height;
    lastSelected.current = selectedActorId;

    const nowMs = performance.now();
    const declutterDue =
      forceDeclutter.current ||
      sizeChanged ||
      selectionChanged ||
      nowMs - lastDeclutterAt.current >= DECLUTTER_INTERVAL_MS;
    forceDeclutter.current = false;

    // --- Pass 1: position / orient / scale / text every name; collect on-screen rectangles ----
    const items = screenItems.current;
    items.length = 0;
    const pool = itemPool.current;
    let poolIdx = 0;

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
          // A disappearance frees declutter space — resolve on the next frame.
          if (!declutterDue) forceDeclutter.current = true;
        }
        return;
      }
      if (wasVisible === false || wasVisible === undefined) {
        group.visible = true;
        lastVisible.current.set(actorId, true);
        // A fresh label must be resolved promptly (it mounts at full opacity).
        if (!declutterDue) forceDeclutter.current = true;
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

      // Projection + collision box feed only the declutter pass — skip on
      // non-tick frames (tracking above already ran; opacities hold).
      if (!declutterDue) return;

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

      // Reuse a pooled item object (grow the pool on demand) instead of allocating a fresh literal.
      let it = pool[poolIdx];
      if (!it) {
        it = { id: 0, screenX: 0, screenY: 0, halfW: 0, halfH: 0, priority: NamePriority.NORMAL };
        pool[poolIdx] = it;
      }
      poolIdx++;
      it.id = actorId;
      it.screenX = screenX;
      it.screenY = screenY;
      it.halfW = halfW;
      it.halfH = halfH;
      it.priority = priorityForActor(actor, selectedActorId);
      items.push(it);
    });

    // --- Pass 2: resolve overlap once, then write opacity through the refs --------------------
    if (!declutterDue) return;
    lastDeclutterAt.current = nowMs;
    const visibility = resolveNameVisibility(items, {
      fadedOpacity: FADED_OPACITY,
      maxVisible: nameTagBudget,
    });

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
