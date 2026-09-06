import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  getReplayActorCoreColor,
  getReplayActorResolvedAccentColor,
  getReplayActorShellColor,
} from '../utils/actorVisualState';
import { enablePerInstanceOpacity } from '../utils/instanceOpacity';
import { prepareReconstructedModelMaterial } from '../utils/reconstructedModelMaterial';
import {
  COOL_STICKMAN_ASSET,
  NPC_MODEL_PREVIEW_PARAM,
  type NpcModelPreviewMode,
  type StaticReplayActorModelAsset,
  parseNpcModelPreviewMode,
  resolveReplayModelUrl,
} from '../utils/replayActorModelRegistry';
import {
  EMPTY_STATIC_MODEL_PLAN,
  type StaticModelInstancingPlan,
  buildStaticModelInstancingPlan,
  composeStaticModelInstanceColor,
} from '../utils/staticModelInstancing';

import { BatchedActorNames3D } from './BatchedActorNames3D';

/**
 * Shared GLB loader: GLTFLoader holds no per-load mutable state that breaks concurrent loads,
 * so one module instance serves both the pose flipbook and the boss model (previously two
 * `new GLTFLoader()` per mount, duplicating parser setup).
 */
const sharedGltfLoader = new GLTFLoader();

/**
 * Instanced renderer for the standing-figure actor marker (body capsule + role-glyph cap + ground
 * anchor ring + facing wedge + state rings + name card).
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
  /** Per-player body-color overrides (actorId → hex). Living players only; dead stay grey. */
  playerColorOverrides?: Map<number, string>;
  /** When true, the humanoid figures stop casting shadows (drops the shadow-pass tri load). */
  performanceMode?: boolean;
  /**
   * Barebones flag: humanoid pose-GLB flipbook + boss GLB. False skips BOTH
   * fetches entirely — figures stay on the proven capsule fallback (5 fewer
   * instanced layers, no per-frame gait math, no 1.1 MB of model downloads).
   */
  detailedFigures?: boolean;
  /** Barebones flag: PBR (MeshStandard) body/pose/cap materials. False = Lambert (cheap shading). */
  richMaterials?: boolean;
  /** Barebones flag: decorative contact-shadow blob + facing wedge. False drops both layers. */
  figureAccents?: boolean;
  /** Frame-cap verdict — on capped-out frames the whole recompose defers (delta accumulates). */
  capGateRef?: React.RefObject<{ skip: boolean }>;
  /** Barebones name budget forwarded to the name-tag coordinator. */
  nameTagBudget?: number | null;
  /**
   * Repaint + shadow-dirty signal. Called when the async humanoid/boss GLB loads and swaps the
   * shadow-casting geometry: this child's setState does NOT re-run the parent scene's commit effect,
   * so without this a paused scene would keep the stale (capsule / no-boss) shadow map on the next
   * camera-orbit repaint until the playhead moved. Routed to Arena3DScene's markSceneDirty.
   */
  markDirty?: () => void;
}

const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const EMPTY_COLOR_OVERRIDES: Map<number, string> = new Map();
const GROUND_LEVEL = 0.05;
const SELECTION_COLOR = '#38bdf8';
const TAUNT_COLOR = '#f87171';
const HIDDEN_Y = -10000;
const HIDDEN_SCALE = 0.0001;
const MAX_ACTOR_HOVER_DISTANCE = 1000;

// Click/touch hit-proxy. Selection used to raycast the thin VISUAL geometry — the humanoid figure /
// capsule body is only ≈0.11 world-unit radius, so the hit target is a sliver and a finger almost
// always misses (the "tricky and hard to select" report). Instead, every actor gets an INVISIBLE
// fat cylinder spanning ground→over-head that is the sole click/hover target; the visual layers no
// longer carry pointer handlers. The proxy must be invisible-but-raycastable: R3F's event layer
// filters `visible:false` meshes OUT of the pointer path, so it uses colorWrite off (draws nothing)
// + depthWrite off (no depth contribution → no z-fighting with the visual layers) + opacity 0.
// The ground Alt+RightClick context menu still works because the proxy registers ONLY onClick
// (left-click/tap); the context menu is onPointerDown with button===2, and a right-click never fires
// onClick, so with no onPointerDown handler the proxy never stopPropagation()s the right-click and it
// reaches the ground plane behind it. (Do NOT add an onPointerDown to the proxy without re-checking
// this — it would swallow the context menu.) Radius is generous so a fat-finger tap lands; height
// covers head-to-toe so a tap anywhere on the column selects. In-plane separation down to ~0.1 world
// units stays individually selectable (verify-hit-proxy.mjs Test 5); only true camera-axis stacking
// occludes a back actor — never cleanly selectable anyway, and resolved by rotating the camera.
const HIT_PROXY_RADIUS = 0.42; // world units; ~4× the body capsule radius for an easy touch target
const HIT_PROXY_HEIGHT = 1.4; // world units; spans a player's full height with headroom for the glyph
// Threat (boss/enemy) figures stand larger (THREAT_SCALE), so their proxy is scaled up to match.
const HIT_PROXY_THREAT_MULT = 1.8;
// Coplanar-cap tie tolerance for proxy click resolution. The proxy cylinders have FLAT top caps at
// the same world-Y, so a near-top-down ray (the camera can tilt to ~84°, maxPolarAngle = π/2−0.1)
// into a stacked melee pile strikes two overlapping caps at an IDENTICAL distance. three.js then
// reports whichever instance has the lower index — selecting the wrong actor. When the nearest
// intersections tie within this epsilon, we break the tie by which proxy CENTER is closest to the
// click point in the horizontal (XZ) plane, i.e. the actor the tap actually landed on. The window is
// kept tiny so it fires ONLY on a true coplanar tie and never reorders genuine front/back hits (whose
// distances differ by far more than this), keeping clean depth-separated selection byte-identical.
// Proven offline in .scratch/verify-tiebreak.mjs (fixes the 80–84° stacked case; non-regression on
// distinct-depth hits). R3F keeps both tied instances in event.intersections because its dedup key
// includes instanceId.
const HIT_PROXY_TIE_EPS = 1e-4;

// Threat (boss/enemy) figures stand large; players stay short/slim so the crowd doesn't wall off
// the view.
const THREAT_SCALE = 1.55;
const PLAYER_SCALE = 0.82;

// Players render as a humanoid figure (CoolStickman, CC0); non-players keep the capsule blob so
// the SHAPE itself signals "this is a player". The humanoid is a 5-POSE WALK FLIPBOOK: one neutral
// idle stand + four walk-cycle poses (contact L, passing, contact R, passing), each a
// single-material static mesh baked from the same rig (.scratch/bake-stickman-walk.mjs). Each pose
// is its own InstancedMesh layer (exactly like the glyph groups), all sized to the full
// instanceCount with instanceId → actorId uniform across every layer. A player is shown in the ONE
// pose layer matching its current walk-cycle phase (derived from accumulated travel distance) and
// hidden (y=-10000) in the other four. Non-players keep the capsule body. Draw-call cost is +4
// layers (O(1), NOT per-actor) over a single-pose humanoid; instancing is preserved.
const HUMANOID_WALK_MODEL_URL = resolveReplayModelUrl(
  COOL_STICKMAN_ASSET.path,
  import.meta.env.BASE_URL,
);
// Pose layer order. Index 0 is the idle stand; 1..4 are the walk cycle in phase order. The GLB
// stores them as named meshes; we load them into this fixed order so the renderer indexes poses by
// walk-cycle phase. WALK_POSE_COUNT (4) is the cyclic stride length used for phase math.
const POSE_NAMES = ['idle', 'walk1', 'walk2', 'walk3', 'walk4'] as const;
const POSE_COUNT = POSE_NAMES.length; // 5
const WALK_POSE_COUNT = POSE_COUNT - 1; // 4 cyclic walk poses; index 0 is idle
// Baked figure is 1.987m tall, feet at y=0. Normalize it to roughly the capsule figure's visual
// height so the player crowd reads at a comparable scale and doesn't wall off the view. The
// capsule body+cap stack at PLAYER_SCALE is ≈0.6 world units; a touch taller reads cleanly as a
// person. Final scale = groupScale * HUMANOID_NORMALIZE.
const HUMANOID_RAW_HEIGHT = 1.987;
const HUMANOID_TARGET_HEIGHT = 0.95;
const HUMANOID_NORMALIZE = HUMANOID_TARGET_HEIGHT / HUMANOID_RAW_HEIGHT;

// Movement-driven gait tuning.
//
// Speed is measured in world units per SECOND (raw per-frame travel ÷ frame delta), NOT per frame.
// This is load-bearing: a per-frame measure shrinks as framerate rises (less fight-time elapses per
// frame), so a per-frame gate suppresses the walk/lean on high-refresh monitors while passing on
// 60Hz — the same dilution that left a prior lean/bob "too subtle to see". Normalizing by delta
// makes the gate and the lean/bob strength framerate-independent. (The walk-POSE index and bob
// PHASE key off accumulated travel *distance* — a path length — so they were already framerate- and
// playback-speed-independent; only the speed-derived gate + magnitudes needed the delta.)
//
// Thresholds are in units/second, derived from this fight's lookup ground-truth (top mover 134u /
// median 64u over 215s → ~0.3–0.6 u/s typical, bursts higher) and verified by a deterministic
// gait simulation over the lookup at both 60 and 165fps: all four walk poses occupy ~evenly and the
// walk fraction is framerate-stable (~0.58). Re-derive from data if a very different fight is used.
//
// The speed EMA uses a fixed TIME CONSTANT (not a fixed per-frame factor): alpha = 1 − exp(−delta /
// GAIT_SPEED_TAU). A fixed per-frame factor smooths over a constant number of FRAMES, i.e. a window
// that shrinks in wall-clock as framerate rises — so on a high-refresh monitor the smoothed speed
// reflects only a few ms of motion, crosses the walk gate erratically, and the figure flickers
// idle↔walk several times a second (sim: ~4 toggles/s at 165fps vs ~1.5 at 60fps). A time-constant
// EMA holds the smoothing window fixed in seconds, so the toggle rate is framerate-independent
// (sim: ~1/s at both 60 and 165fps). Pair it with the enter/exit hysteresis below to kill the
// remaining boundary chatter.
const GAIT_SPEED_TAU = 0.2; // seconds; EMA time constant for the smoothed speed
const GAIT_SPEED_FULL = 0.6; // units/SECOND mapping to full lean/bob (≈ a brisk reposition)
const GAIT_MAX_LEAN = 0.22; // radians of forward lean at full speed (~12.6°)
const GAIT_BOB_AMP = 0.05; // world-unit vertical bob amplitude at full speed
// Bob cycles per world unit of accumulated travel. Kept low so the bob can't alias into
// high-frequency vibration: the bob advances GAIT_BOB_FREQ × (per-frame path increment) cycles per
// frame, and the per-frame increment is small (sub-0.05u even at 5× playback on 60Hz, measured from
// the lookup), so 0.4 stays far under the 0.5-cycle/frame Nyquist limit. Reads as a slow rise/fall
// over a stride, not a jitter. (Phase keys off accumulated path length, so it is framerate- and
// playback-speed-independent.)
const GAIT_BOB_FREQ = 0.4;

// Walk-flipbook phase tuning.
// STRIDE_LEN = world units of travel per single pose step. The active walk pose advances as
// floor(distance / STRIDE_LEN) % WALK_POSE_COUNT, where `distance` is accumulated path length —
// framerate- and playback-speed-independent. Strobe-safety bound: floor((d+Δ)/S) − floor(d/S) is 0
// or 1 whenever the per-frame path increment Δ < STRIDE_LEN, so as long as STRIDE_LEN exceeds the
// sustained per-frame travel, the pose advances at most one step per frame (no leg vibration).
// Sustained per-frame travel is small (sub-0.05u even at 5× playback on 60Hz), so 0.4 is safely
// above it. Cadence: with ~0.3–0.6 u/s typical movement, 0.4 yields a step roughly every ~1s while
// repositioning and several per second during bursts — deliberate and readable. The lookup-driven
// gait sim confirmed all four poses cycle ~evenly. THIS IS THE LEAD LOOK TUNABLE: higher =
// slower/longer strides, lower = quicker cadence (keep ≳0.1 to stay strobe-safe). Tune live.
const STRIDE_LEN = 0.4;
// Walk/idle gate WITH HYSTERESIS: a parked figure starts walking only when its smoothed speed rises
// above the ENTER threshold, and returns to idle only when it falls below the (lower) EXIT
// threshold. A single threshold makes a player whose speed hovers at the boundary flip idle↔walk
// every frame (chatter); the enter>exit gap forces speed to clearly change state before the pose
// does. Both are units/SECOND, straddling typical movement (~0.3–0.6 u/s) and standstill (~0). The
// gait sim over the lookup gives ~1 toggle/s (max), framerate-stable across 60–165fps, walk fraction
// ~0.58. These (with STRIDE_LEN and GAIT_SPEED_FULL) are the coupled, scale-sensitive look tunables.
const GAIT_WALK_ENTER_SPEED = 0.18; // units/SECOND to start walking from idle
const GAIT_WALK_EXIT_SPEED = 0.1; // units/SECOND to drop back to idle (must be < enter)

// ---- Optional reconstructed NPC models (one InstancedMesh per registry asset) ----
// No game-derived geometry is bundled. Reconstructed art enters exclusively through
// `replayActorModelRegistry`, which records each asset's provenance and keeps it behind the
// `?npcModels=prototype` opt-in. Anything the registry does not recognise — including every boss
// with no shipped model — keeps the project-owned capsule renderer below, so an unknown, missing,
// or failed asset can never make a combatant disappear.
//
// Per-asset orientation/scale/offsets live on the registry entry's `transform` rather than as
// module constants, because each reconstruction is exported at its own scale and facing.
//
// Every actor that resolves to the SAME asset shares one InstancedMesh (see `staticModelInstancing`),
// so a pack of identical trash costs one draw call and no sibling is silently left on a capsule.
// Distinct assets in one fight simply get one mesh each.

// Dead-model look (Taleria dies at fight end; observable). Death is conveyed by lowering opacity,
// darkening the albedo, and squashing Y (feet stay grounded since the offset puts min.y at 0).
//
// All three are now PER INSTANCE, because one material is shared by every actor of an asset and a
// dead raider must not drag its living sibling down with it: the squash rides the instance matrix,
// the darken multiplies into `instanceColor` (alongside the registry tint), and the opacity goes
// through the same `instanceOpacity` attribute the capsule layers already use. The material itself
// is touched exactly once, at load, where `transparent` is set — flipping material state per frame
// recompiles the shader, and that stays true no matter how many instances share it. THESE ARE THE
// USER'S LOOK CALL — lowered opacity on a 19.8k-tri swirling mesh can show depth-sort artifacts; if
// it looks bad, the fallback is darken-only (DEAD_OPACITY back to 1, lean on DEAD_DARKEN +
// DEAD_SQUASH_Y).
const DEAD_OPACITY = 0.45;
const DEAD_DARKEN = 0.45; // multiply material color toward black (1 = unchanged, 0 = black)
const DEAD_SQUASH_Y = 0.55; // Y scale factor when dead (compresses toward the grounded feet)

/**
 * Read the reconstructed-model opt-in straight from the URL.
 *
 * This is deliberately not a prop or a router hook: the figures render inside the
 * `@react-three/fiber` canvas, which reconciles in its own root, so router context is not reliably
 * available here. The flag only changes on navigation, which remounts the replay anyway.
 */
function readNpcModelPreviewMode(): NpcModelPreviewMode {
  if (typeof window === 'undefined') return 'off';
  return parseNpcModelPreviewMode(
    new URLSearchParams(window.location.search).get(NPC_MODEL_PREVIEW_PARAM),
  );
}

/**
 * Parse one reconstruction into the form the renderer drives.
 *
 * Bakes the mesh's node (world) transform into the geometry so the per-instance matrix we write is
 * the only transform applied, sets `transparent` ONCE (per-frame flipping recompiles the shader),
 * and measures the RAW bbox — orient-independent, so the per-frame compose can re-derive the
 * grounded/recentered offset live from the current ORIENT.
 */
function loadStaticModel(asset: StaticReplayActorModelAsset): Promise<StaticModelData> {
  // Join to the app base URL. A bare catalog path would resolve against the current route, and the
  // replay is always nested (/report/<code>/fight/<n>/replay), so the fetch would 404 and silently
  // fall back to the capsule — indistinguishable from "this NPC has no model".
  const url = resolveReplayModelUrl(asset.path, import.meta.env.BASE_URL);
  return new Promise<StaticModelData>((resolve, reject) => {
    sharedGltfLoader.load(
      url,
      (gltf) => {
        let found: THREE.Mesh | null = null;
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((obj) => {
          const candidate = obj as THREE.Mesh;
          if (candidate.isMesh && candidate.geometry && !found) found = candidate;
        });
        if (!found) {
          reject(new Error(`No mesh in ${asset.id}`));
          return;
        }
        const mesh = found as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BufferGeometry;
        geometry.applyMatrix4(mesh.matrixWorld);
        const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(
          (m): m is THREE.Material => !!m,
        );
        materials.forEach((m) => {
          m.transparent = true; // set ONCE; per-instance opacity animates, the material never does
          // Image-to-3D exports routinely omit metallicFactor, which glTF defines as 1 — that makes
          // a baked photographic albedo read as polished metal and go nearly black under the
          // replay's overhead lighting. Normalise to cloth/leather defaults while keeping the
          // authored atlas. Front-side: the shipped reconstructions are closed meshes, so back faces
          // are pure overdraw. Two-sided remains the helper's default for thin armor shells.
          prepareReconstructedModelMaterial(m, { doubleSided: false });
        });
        const rawBox = new THREE.Box3().setFromBufferAttribute(
          geometry.getAttribute('position') as THREE.BufferAttribute,
        );
        resolve({ assetId: asset.id, geometry, materials, rawBox });
      },
      undefined,
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}

function disposeStaticModel(model: StaticModelData): void {
  model.geometry.dispose();
  model.materials.forEach((m) => m.dispose());
}

/** Stable empty map so `setStaticModels(EMPTY_STATIC_MODELS)` is a no-op re-render, not a loop. */
const EMPTY_STATIC_MODELS: ReadonlyMap<string, StaticModelData> = new Map();

function isPlayerActor(actor: ActorPosition): boolean {
  return actor.type === 'player';
}

function getActorIdsFromLookup(lookup: TimestampPositionLookup | null): number[] {
  if (!lookup?.positionsByTimestamp) return [];
  if (lookup.actorIds?.length) return lookup.actorIds;
  const ids = new Set<number>();
  Object.values(lookup.positionsByTimestamp).forEach((actors) => {
    Object.keys(actors).forEach((id) => ids.add(Number(id)));
  });
  return Array.from(ids).sort((a, b) => a - b);
}

// Soft radial gradient used as the contact-shadow blob's alphaMap. three.js samples the GREEN
// channel for alphaMap (diffuseColor.a *= texture.g), NOT the alpha channel, so this is a fully
// OPAQUE luminance ramp — white (g=1) center → black (g=0) edge — giving an opaque-center →
// transparent-edge falloff once multiplied by the material's black color + 0.33 opacity. (A
// white→transparent ramp would reintroduce canvas premultiply ambiguity at the edge and lose the
// falloff, so it's white→black with alpha=1 throughout.) Built once and shared by the single
// aoBlob InstancedMesh.
function createAoBlobAlphaMap(): THREE.CanvasTexture {
  const SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Degrade gracefully — an empty texture rather than a throw at module load.
    return new THREE.CanvasTexture(canvas);
  }
  const c = SIZE / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // opaque center → full alpha (g=1)
  gradient.addColorStop(1, 'rgba(0, 0, 0, 1)'); // opaque edge → zero alpha (g=0)
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  // Data, not color — keep it linear so sRGB doesn't bend the falloff curve.
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Flat ground wedge pointing in the actor's facing (+Z local).
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
  aoBlob: THREE.CircleGeometry;
  anchorRing: THREE.RingGeometry;
  selectionRing: THREE.RingGeometry;
  tauntRing: THREE.RingGeometry;
  hitProxy: THREE.CylinderGeometry;
}

function createFigureGeometries(scale: number, bodyHeight: number): FigureGeometries {
  const r = 0.18 * scale;
  return {
    body: new THREE.CapsuleGeometry(0.11 * scale, bodyHeight * 0.5, 6, 12),
    cap: new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.04 * scale, 16),
    glyph: new THREE.PlaneGeometry(0.22 * scale, 0.22 * scale),
    vision: createVisionCone(scale),
    // Soft contact-shadow blob disc: a flat circle a bit larger than the anchor ring so it reads as
    // a shadow pool under the actor. `scale` is baked in (like `r` above) so it tracks larger
    // figures on small maps; the per-actor groupScale is applied in the loop. Rotated flat (-PI/2 X)
    // per-instance in the matrix write, exactly like the anchor ring.
    aoBlob: new THREE.CircleGeometry(0.55 * scale, 48),
    anchorRing: new THREE.RingGeometry(r * 0.8, r * 1.2, 40),
    selectionRing: new THREE.RingGeometry(r * 1.6, r * 2.0, 48),
    tauntRing: new THREE.RingGeometry(r * 1.1, r * 1.4, 40),
    // Invisible fat click/touch target. Built at unit scale (radius/height in world units, scaled
    // and re-positioned per instance in the loop) so the proxy doesn't track `scale` — it's a
    // generous fixed-size target, not a visual element. 8 radial segments keep its raycast cheap.
    hitProxy: new THREE.CylinderGeometry(HIT_PROXY_RADIUS, HIT_PROXY_RADIUS, HIT_PROXY_HEIGHT, 8),
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
  playerColorOverrides: Map<number, string> | undefined;
  actorIds: readonly number[];
  // Signature of the live model-tune constants + performanceMode, over EVERY asset in the fight.
  // The models are static, so the user tunes them while PAUSED; on an HMR const edit the component
  // re-renders but frameCacheRef is preserved (no remount) → without this the time/lookup compare
  // would early-return and the edit would never recompose. Folding the constants in forces exactly
  // one recompose on the edit.
  staticModelSignature: string;
}

// A loaded reconstruction: the mesh's geometry (node transform already baked in), its material(s),
// and the RAW (orient-independent) bounding box used to derive the live grounded/recentered offset
// in the per-frame compose. The original material colors are no longer captured — the dead-darken
// moved onto `instanceColor`, so nothing mutates the material after load.
interface StaticModelData {
  assetId: string;
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  rawBox: THREE.Box3;
}

function isThreatActor(actor: ActorPosition): boolean {
  return actor.type === 'boss' || actor.type === 'enemy';
}

// Signature folded into the FrameCache so a paused HMR edit of any live model-tune constant (or a
// performanceMode toggle) forces one recompose. Keep every value the per-frame model compose reads
// — for EVERY asset in the fight, not just the first one — plus the barebones flags, since a preset
// flip while paused must recompose once too.
function staticModelTuneSignature(
  assets: readonly StaticReplayActorModelAsset[],
  performanceMode: boolean,
  detailedFigures: boolean,
  richMaterials: boolean,
  figureAccents: boolean,
): string {
  const perAsset = assets.map(({ id, transform }) =>
    [
      id,
      transform.scale,
      transform.yOffset,
      transform.yawOffset,
      transform.orientEuler[0],
      transform.orientEuler[1],
      transform.orientEuler[2],
    ].join(','),
  );
  return [
    perAsset.join('|') || 'none',
    DEAD_OPACITY,
    DEAD_DARKEN,
    DEAD_SQUASH_Y,
    performanceMode ? 1 : 0,
    detailedFigures ? 1 : 0,
    richMaterials ? 1 : 0,
    figureAccents ? 1 : 0,
  ].join(',');
}

// Stable per-attribute "needs upload" flaggers, hoisted to module scope so the per-frame flush can
// mark every layer dirty WITHOUT allocating a fresh temp array + arrow closure each frame (that
// churn ran at the playback frame rate and added avoidable GC pressure → micro-stutters). They're
// shape-compatible with Array.forEach AND Map.forEach (extra index/key args are ignored).
function flagMatrixNeedsUpdate(mesh: THREE.InstancedMesh | null | undefined): void {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}
function flagColorNeedsUpdate(mesh: THREE.InstancedMesh | null | undefined): void {
  if (mesh?.instanceColor) {
    // instanceColor is created lazily by the first setColorAt — which happens in the recompose
    // loop, not in setup — so dynamic usage is (re)asserted here, on the only path that can
    // observe a freshly created attribute. Idempotent; runs only when colors changed.
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor.needsUpdate = true;
  }
}
function flagOpacityNeedsUpdate(mesh: THREE.InstancedMesh | null | undefined): void {
  const attr = mesh?.geometry.getAttribute('instanceOpacity') as
    THREE.InstancedBufferAttribute | undefined;
  if (attr) attr.needsUpdate = true;
}

export const InstancedReplayFigures3D: React.FC<InstancedReplayFigures3DProps> = ({
  lookup,
  timeRef,
  scale = 1,
  showNames = false,
  selectedActorRef,
  onActorClick,
  playerVisibility = EMPTY_VISIBILITY,
  playerColorOverrides = EMPTY_COLOR_OVERRIDES,
  performanceMode = false,
  detailedFigures = true,
  richMaterials = true,
  figureAccents = true,
  capGateRef,
  nameTagBudget = null,
  markDirty,
}) => {
  const bodyHeight = 0.55 * scale;
  const capY = bodyHeight + 0.02 * scale;
  const glyphY = capY + 0.03 * scale;

  const actorIds = useMemo(() => getActorIdsFromLookup(lookup), [lookup]);
  const instanceCount = actorIds.length;

  // The reconstructed-art opt-in. Read once per mount: changing it requires a navigation, which
  // remounts the replay.
  const npcModelPreviewMode = useMemo(readNpcModelPreviewMode, []);

  // Which registry assets this fight needs and which instance slot each actor occupies. Gates the
  // GLB loads so a fight with no modelled NPC never fetches/parses anything. Barebones
  // (detailedFigures=false) keeps every NPC on the capsule and never fetches.
  const staticModelPlan: StaticModelInstancingPlan = useMemo(
    () =>
      detailedFigures
        ? buildStaticModelInstancingPlan(lookup, actorIds, npcModelPreviewMode)
        : EMPTY_STATIC_MODEL_PLAN,
    [lookup, actorIds, detailedFigures, npcModelPreviewMode],
  );

  // actorId → loop index. Used to check an actor's live visibility from a pointer event on a model
  // mesh, whose instanceId indexes that ASSET's slots rather than the shared actor index.
  const actorIndexById = useMemo(() => {
    const map = new Map<number, number>();
    actorIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [actorIds]);

  // Stable index → glyph-group membership. An actor's symbol is fixed (role/type don't change
  // mid-fight), so we can assign each actor to one glyph group once and only toggle visibility.
  const glyphSymbolByIndex = useRef<GlyphSymbol[]>([]);

  // rAF time banked while the frame cap skipped recomposes (see the useFrame).
  const skippedDeltaRef = useRef(0);

  // Async-loaded humanoid pose geometries (the 5-pose walk flipbook). Null until the GLB resolves;
  // players fall back to the capsule body until then. The array holds one BufferGeometry per pose in
  // POSE_NAMES order (idle, walk1..walk4). Setting state on load triggers a React commit, which
  // refills the on-demand render budget (Arena3DScene) so the swap actually paints while paused.
  const [poseGeometries, setPoseGeometries] = useState<THREE.BufferGeometry[] | null>(null);
  useEffect(() => {
    // Barebones: never fetch the walk flipbook — the capsule fallback IS the figure.
    if (!detailedFigures) {
      setPoseGeometries(null);
      return;
    }
    let cancelled = false;
    sharedGltfLoader.load(
      HUMANOID_WALK_MODEL_URL,
      (gltf) => {
        if (cancelled) return;
        // Collect the named pose meshes and order them by POSE_NAMES so index → walk-cycle phase.
        const byName = new Map<string, THREE.BufferGeometry>();
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh && mesh.geometry) {
            byName.set(mesh.name, mesh.geometry as THREE.BufferGeometry);
          }
        });
        const ordered = POSE_NAMES.map((name) => byName.get(name));
        // Only swap in the flipbook if every expected pose is present; otherwise keep the capsule
        // fallback (a partial set would leave some phases blank).
        if (ordered.every((g): g is THREE.BufferGeometry => g !== undefined)) {
          setPoseGeometries(ordered);
        }
      },
      undefined,
      () => {
        // On load failure the capsule fallback stays — players just don't get the humanoid shape.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [detailedFigures]);

  // Async-loaded reconstructions, keyed by registry asset id. Empty until the GLBs resolve; every
  // actor falls back to the capsule body until its asset lands, and an asset that fails to load
  // simply never appears — the capsule fallback stays, so a combatant can never disappear.
  //
  // The map is published in ONE setState once every asset has settled, rather than incrementally.
  // Publishing per-asset would share `StaticModelData` objects across successive maps, and the
  // dispose-on-replace effect below would then free geometry that the newer map still mounts.
  // Setting state triggers a React commit → Arena3DScene refills the on-demand render budget so the
  // swap paints while paused.
  const [staticModels, setStaticModels] =
    useState<ReadonlyMap<string, StaticModelData>>(EMPTY_STATIC_MODELS);
  useEffect(() => {
    const assets = staticModelPlan.assets;
    // Drop whatever the previous fight loaded before fetching; the dispose effect below frees it.
    setStaticModels(EMPTY_STATIC_MODELS);
    if (assets.length === 0) return;
    let cancelled = false;
    void Promise.all(assets.map((asset) => loadStaticModel(asset).catch(() => null))).then(
      (results) => {
        const models = results.filter((model): model is StaticModelData => model !== null);
        // If the component unmounted (or the plan changed) while the GLBs were in flight, dispose the
        // just-parsed resources instead of leaking them — nothing will mount this geometry/material.
        if (cancelled) {
          models.forEach(disposeStaticModel);
          return;
        }
        if (models.length === 0) return;
        setStaticModels(new Map(models.map((model) => [model.assetId, model])));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [staticModelPlan]);

  // Dispose a loaded set when it is replaced or the component unmounts. Safe because every map
  // published above owns a disjoint set of StaticModelData.
  useEffect(() => {
    return () => {
      staticModels.forEach(disposeStaticModel);
    };
  }, [staticModels]);

  // The layers actually renderable this frame: an asset the plan asked for AND whose GLB has landed.
  // Intersecting the two is load-bearing during a fight change, when `staticModels` can briefly hold
  // the previous plan's assets.
  const staticModelLayers = useMemo(
    () =>
      staticModelPlan.assets.flatMap((asset) => {
        const model = staticModels.get(asset.id);
        const slots = staticModelPlan.actorIdsByAssetId.get(asset.id);
        return model && slots?.length ? [{ asset, model, slots }] : [];
      }),
    [staticModelPlan, staticModels],
  );

  // Mesh refs.
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  // One InstancedMesh per walk pose (idle, walk1..walk4), in POSE_NAMES order. Each is sized to the
  // full instanceCount; a player is shown in exactly one and hidden in the other four per frame.
  const poseRefs = useRef<Array<THREE.InstancedMesh | null>>(
    Array.from({ length: POSE_COUNT }, () => null),
  );
  const visionRef = useRef<THREE.InstancedMesh>(null);
  // Invisible fat click/touch target, one instance per actor; the sole hit layer (visual layers no
  // longer carry pointer handlers). instanceId → actorId is uniform with every other layer.
  const hitProxyRef = useRef<THREE.InstancedMesh>(null);
  // Soft radial contact-shadow blob disc under each actor; one shared InstancedMesh (1 draw call).
  const aoBlobRef = useRef<THREE.InstancedMesh>(null);
  const anchorRingRef = useRef<THREE.InstancedMesh>(null);
  const selectionRingRef = useRef<THREE.InstancedMesh>(null);
  const tauntRingRef = useRef<THREE.InstancedMesh>(null);
  // One glyph InstancedMesh per symbol; each sized to the full instanceCount and indexed by the
  // same actor index (non-members are hidden) so instanceId → actorId stays uniform across layers.
  const glyphRefs = useRef<Map<GlyphSymbol, THREE.InstancedMesh>>(new Map());

  // One InstancedMesh per registry asset, keyed by asset id. Every actor resolving to that asset
  // occupies a slot in it, so a pack of identical trash is one draw call and no sibling is left on a
  // capsule — the constraint that blocked shipping any lesser enemy.
  const staticModelMeshes = useRef<Map<string, THREE.InstancedMesh>>(new Map());
  // Per-frame scratch for the model world-matrix compose (allocated once, never per frame).
  const modelTemp = useRef({
    box: new THREE.Box3(),
    center: new THREE.Vector3(),
    euler: new THREE.Euler(),
    orient: new THREE.Matrix4(),
    offset: new THREE.Matrix4(),
    scale: new THREE.Matrix4(),
    yaw: new THREE.Matrix4(),
    world: new THREE.Matrix4(),
  });

  // Per-instance opacity attribute arrays (filled in once meshes mount, in the layout effect).
  // `pose` holds one array per walk-pose layer (POSE_NAMES order); each pose layer carries its own
  // instanceOpacity buffer because the opacity write goes to every pose layer (not just the active
  // one) so an actor migrating between poses is never left uncolored/opaque on its new layer.
  const opacityArrays = useRef<{
    body?: Float32Array;
    pose: Array<Float32Array | undefined>;
    cap?: Float32Array;
    vision?: Float32Array;
    anchorRing?: Float32Array;
    glyph: Map<GlyphSymbol, Float32Array>;
    /** assetId → per-slot opacity for that asset's model mesh (dead fade). */
    model: Map<string, Float32Array>;
  }>({ pose: [], glyph: new Map(), model: new Map() });

  const cacheRef = useRef<Array<InstanceCache | null>>([]);
  const frameCacheRef = useRef<FrameCache | null>(null);
  const tempObject = useRef(new THREE.Object3D());
  const tempColor = useRef(new THREE.Color());
  // Holds the active-pose matrix while the pose loop hides the other layers. hideInstance() reuses
  // the shared tempObject and clobbers its matrix, so the visible-pose matrix must be stashed here
  // BEFORE the hide calls run — otherwise the active write picks up a hidden matrix.
  const poseMatrix = useRef(new THREE.Matrix4());

  // Per-instance gait state. We have only position+rotation per frame (no per-limb pose data), and
  // skeletal walking can't be instanced in three core, so motion is conveyed two ways, both driven
  // by movement: (1) the WALK FLIPBOOK — accumulated travel distance selects which pose layer shows
  // the legs (idle/walk1..walk4); (2) a whole-body LEAN + BOB folded into the matrix (the figure
  // pitches forward ∝ speed and rises/falls over a stride). The two compose: legs step while the
  // whole body tilts and bobs. Both are MOVEMENT-DRIVEN only — every term is zero when the actor is
  // still (pose stays idle, lean/bob = 0), so a paused/idle scene adds no work and the on-demand
  // render gate stays intact (a wall-clock-driven cycle would tick while paused and break it).
  const gaitRef = useRef<{
    lastX: Float32Array;
    lastZ: Float32Array;
    speed: Float32Array; // smoothed units/SECOND (time-constant EMA)
    distance: Float32Array; // accumulated travel; drives BOTH the bob phase and the pose index
    seeded: Uint8Array; // whether lastX/Z hold a real previous sample yet
    walking: Uint8Array; // hysteretic walk/idle latch (1 = currently walking)
  } | null>(null);

  const geometries = useMemo(() => createFigureGeometries(scale, bodyHeight), [scale, bodyHeight]);

  const materials = useMemo(
    () => ({
      // Barebones (richMaterials=false): Lambert instead of Standard — still
      // light-responsive so depth reads, but per-fragment cost drops (no PBR).
      // setColorAt / per-instance opacity behave identically on both. The memo
      // dep means a preset flip recreates the instanced meshes (args identity)
      // — a one-frame rebuild hitch on toggle; the commit refills the render
      // budget so it paints, and the cleanup below disposes the old set.
      body: richMaterials
        ? new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, transparent: true })
        : new THREE.MeshLambertMaterial({ transparent: true }),
      humanoid: richMaterials
        ? new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, transparent: true })
        : new THREE.MeshLambertMaterial({ transparent: true }),
      cap: richMaterials
        ? new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, transparent: true })
        : new THREE.MeshLambertMaterial({ transparent: true }),
      vision: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
      // Soft contact-shadow blob. Black + a radial-gradient alphaMap (opaque center → transparent
      // edge) reads as a soft shadow pool. NormalBlending (the default) darkens via alpha over the
      // bright map — additive would LIGHTEN, which we don't want. depthWrite off (it sits just above
      // the floor; no z-fight, no polygonOffset needed). Shared by one InstancedMesh across all
      // actors. No vertexColors / per-instance opacity — every blob is the same flat soft black, so
      // hideInstance (matrix only) is enough to drop hidden/dead actors, like the hit proxy.
      aoBlob: new THREE.MeshBasicMaterial({
        color: 0x000000,
        alphaMap: createAoBlobAlphaMap(),
        transparent: true,
        opacity: 0.33,
        depthWrite: false,
        blending: THREE.NormalBlending,
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
      // Invisible-but-raycastable click/touch proxy material. `visible:false` would skip raycasting
      // in three.js, so instead we draw nothing (colorWrite off) and keep it out of the depth buffer
      // (depthWrite off) — the mesh contributes zero pixels yet still receives pointer events. The
      // tiny colorWrite-off draw is negligible (one extra instanced layer, 8-segment cylinders).
      // DoubleSide is load-bearing: the camera can zoom INSIDE a proxy cylinder (minDistance drops to
      // 0.5, and large threat/scaled proxies are several units across), and a FrontSide mesh raycasts
      // only from the outside — a ray originating inside hits the far wall's back faces, which
      // FrontSide culls, so the actor becomes unselectable at close zoom. DoubleSide keeps the inside
      // wall hittable. It draws nothing extra (colorWrite is off), so the only cost is raycasting.
      hitProxy: new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    }),
    [richMaterials],
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

  // Dispose each memoized resource set ONLY when that set is itself replaced (or on unmount). Split
  // into three per-memo effects rather than one keyed on [geometries, materials, glyphMaterials]:
  // `materials` alone rebuilds on a barebones/quality toggle (dep: richMaterials), and the combined
  // effect would then dispose the still-mounted geometries and glyph materials out from under the
  // live instanced meshes (a visible actor flash until the next re-upload).
  useLayoutEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [geometries]);

  useLayoutEffect(() => {
    return () => {
      // material.dispose() does NOT dispose embedded textures; the aoBlob's alphaMap is created fresh
      // per mount (unlike the process-global glyph textures), so dispose it explicitly to avoid
      // leaking a 128² CanvasTexture on every mount/unmount cycle.
      materials.aoBlob.alphaMap?.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [materials]);

  useLayoutEffect(() => {
    return () => {
      glyphMaterials.forEach((m) => m.dispose());
    };
  }, [glyphMaterials]);

  // Dispose the loaded pose geometries when they are replaced or the component unmounts.
  useEffect(() => {
    return () => {
      poseGeometries?.forEach((g) => g.dispose());
    };
  }, [poseGeometries]);

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
      // NOTE: instanceColor usage is NOT set here — three creates instanceColor lazily on the
      // first setColorAt (recompose loop), so this guard never fires at setup time. Dynamic usage
      // is asserted in flagColorNeedsUpdate instead, on the path that observes a live attribute.
      if (withOpacity) {
        return enablePerInstanceOpacity(
          mesh.geometry,
          mesh.material as THREE.Material,
          instanceCount,
        );
      }
      return undefined;
    };

    // Contact-shadow blob. renderOrder 9 (BELOW the anchor ring's 10): both layers are
    // depthWrite:false, so the depth buffer does NOT separate them — paint order decides what reads
    // on top, and the blob (radius 0.55) fully contains the ring, so it must paint FIRST or it would
    // dim the ring. No per-instance opacity (flat soft black; hideInstance drops it via matrix).
    setup(aoBlobRef.current, 9, false);
    o.anchorRing = setup(anchorRingRef.current, 10, true);
    o.vision = setup(visionRef.current, 11, true);
    // The hit proxy draws nothing (colorWrite off), so it needs no per-instance opacity attribute;
    // it just needs dynamic matrices and frustum culling off (instances move off-screen to hide).
    setup(hitProxyRef.current, 9, false);
    o.body = setup(bodyRef.current, 12, true);
    // Every pose layer is wired identically and at the same render order as the capsule body.
    o.pose = poseRefs.current.map((mesh) => setup(mesh, 12, true));
    o.cap = setup(capRef.current, 13, true);
    setup(selectionRingRef.current, 14, false);
    setup(tauntRingRef.current, 15, false);
    glyphRefs.current.forEach((mesh, symbol) => {
      // All 8 glyph meshes share ONE geometry (and thus one opacity array) by design: every mesh
      // holds ALL actors at the same indices (non-members hide via matrix), and the written value
      // depends only on dead-state, never on symbol — so the shared array is always correct and
      // per-symbol divergence is impossible by construction. enablePerInstanceOpacity reuses the
      // existing attribute on repeat calls (see instanceOpacity.ts).
      const arr = setup(mesh, 16, true);
      if (arr) o.glyph.set(symbol, arr);
    });

    // Reconstructed-model layers. Sized to the asset's SLOT count (not instanceCount) — the plan
    // packs only the actors that resolve to it. Per-instance opacity is patched onto every material
    // of the mesh; the attribute lives on the shared geometry, so the helper hands back the same
    // array each time.
    //
    // renderOrder stays 0, which is what the previous single <mesh> used. It is deliberately NOT the
    // capsule body's 12: the ground layers (blob 9, anchor ring 10, wedge 11) are all depthWrite
    // false, so paint order alone decides whether they read on top of the model's feet, and 12 would
    // silently flip that relationship from what shipped.
    o.model.clear();
    staticModelLayers.forEach(({ asset, model, slots }) => {
      const mesh = staticModelMeshes.current.get(asset.id);
      if (!mesh) return;
      mesh.frustumCulled = false;
      mesh.renderOrder = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      let array: Float32Array | undefined;
      model.materials.forEach((material) => {
        array = enablePerInstanceOpacity(mesh.geometry, material, slots.length);
      });
      if (array) o.model.set(asset.id, array);
    });

    // (Re)allocate gait state to the instance count.
    gaitRef.current = {
      lastX: new Float32Array(instanceCount),
      lastZ: new Float32Array(instanceCount),
      speed: new Float32Array(instanceCount),
      distance: new Float32Array(instanceCount),
      seeded: new Uint8Array(instanceCount),
      walking: new Uint8Array(instanceCount),
    };

    // Force a full rebuild on the next frame. Clearing BOTH caches is load-bearing: the
    // frame-level cache gates whether the loop runs at all, but the per-instance cache gates the
    // `changed` block that calls setColorAt. When the walk GLB loads, an actor's role color is
    // unchanged from its capsule-era cache entry, so without clearing cacheRef the `changed` check
    // stays false and setColorAt never fires on the new pose layers → their instanceColor never
    // lazily creates → players render white. Clearing cacheRef makes prev=undefined → changed →
    // colors written to body AND every pose layer next frame. cacheRef repopulates that same frame.
    // Clearing both caches here is also what forces the one recompose a freshly loaded model needs:
    // the setState commit refills the render budget, but the per-frame loop's frame cache would
    // otherwise early-return while PAUSED and the model would never get positioned (invisible until
    // the user scrubs). `staticModelLayers` is a dep for exactly that reason.
    frameCacheRef.current = null;
    cacheRef.current = [];
  }, [instanceCount, geometries, materials, glyphMaterials, poseGeometries, staticModelLayers]);

  // When the humanoid poses or boss GLB finish loading, the shadow-CASTING geometry swaps
  // (capsule → humanoid pose meshes; boss capsule → boss model). This is a child-local state change
  // that does NOT re-run the parent scene's commit effect, so signal a repaint + shadow regeneration
  // explicitly — otherwise a paused scene keeps the stale shadow map (and the swap may not paint)
  // until the playhead next moves. Fires once on mount too (harmless). See markDirty prop doc.
  useEffect(() => {
    markDirty?.();
  }, [poseGeometries, staticModelLayers, markDirty]);

  const hideInstance = useCallback((mesh: THREE.InstancedMesh | null, index: number): void => {
    if (!mesh) return;
    const obj = tempObject.current;
    obj.position.set(0, HIDDEN_Y, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(HIDDEN_SCALE);
    obj.updateMatrix();
    mesh.setMatrixAt(index, obj.matrix);
  }, []);

  // Memoized: building the signature allocated an array + string EVERY rAF,
  // before the frame-cache early-return — the hottest allocation site in the
  // actor loop. The HMR contract survives memoization: Fast Refresh re-runs
  // useMemo on any edit to this file, so a paused boss-tune edit still
  // produces a new signature and forces one recompose. The barebones flags are
  // deps too — a preset flip while paused must recompose once.
  const staticModelSignature = useMemo(
    () =>
      staticModelTuneSignature(
        staticModelPlan.assets,
        performanceMode,
        detailedFigures,
        richMaterials,
        figureAccents,
      ),
    [staticModelPlan, performanceMode, detailedFigures, richMaterials, figureAccents],
  );

  useFrame((_state, rafDelta) => {
    // Frame cap: defer the whole recompose to the next painted frame, but bank
    // the skipped rAF time — the gait speed/EMA below divide by delta (units
    // per SECOND), so the painted frame must see the FULL elapsed time or
    // measured speed inflates ~4x at 120Hz (33ms of travel / 8.3ms delta).
    // The frame cache is untouched on skips, so the next allowed frame always
    // does a full recompose (stale signatures, async GLB loads included).
    if (capGateRef?.current?.skip) {
      skippedDeltaRef.current += rafDelta;
      return;
    }
    const delta = rafDelta + skippedDeltaRef.current;
    skippedDeltaRef.current = 0;

    const currentTime = timeRef ? timeRef.current : 0;
    const selectedActorId = selectedActorRef.current;
    const prevFrame = frameCacheRef.current;

    if (
      prevFrame &&
      prevFrame.lookup === lookup &&
      prevFrame.time === currentTime &&
      prevFrame.selectedActorId === selectedActorId &&
      prevFrame.playerVisibility === playerVisibility &&
      prevFrame.playerColorOverrides === playerColorOverrides &&
      prevFrame.actorIds === actorIds &&
      prevFrame.staticModelSignature === staticModelSignature
    ) {
      return;
    }
    frameCacheRef.current = {
      lookup,
      time: currentTime,
      selectedActorId,
      playerVisibility,
      playerColorOverrides,
      actorIds,
      staticModelSignature,
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
          poseRefs.current.forEach((mesh) => hideInstance(mesh, index));
          hideInstance(capRef.current, index);
          hideInstance(visionRef.current, index);
          hideInstance(hitProxyRef.current, index);
          hideInstance(aoBlobRef.current, index);
          hideInstance(anchorRingRef.current, index);
          hideInstance(selectionRingRef.current, index);
          hideInstance(tauntRingRef.current, index);
          glyphRefs.current.forEach((mesh) => hideInstance(mesh, index));
          // Also park this actor's model slot (if it has one). Slots are per ASSET, so this hides
          // exactly one instance and leaves its living siblings on screen.
          const hiddenAssignment = staticModelPlan.byActorId.get(actorId);
          if (hiddenAssignment) {
            hideInstance(
              staticModelMeshes.current.get(hiddenAssignment.asset.id) ?? null,
              hiddenAssignment.slot,
            );
          }
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
      // Previous frame's cached state for this actor (written at the end of this iteration). Used to
      // skip re-hiding layers whose membership/state is unchanged — an actor's glyph group is fixed
      // and most actors are neither selected nor taunted, so re-hiding those layers every frame
      // re-composed hundreds of identical "hidden" matrices for nothing. null on first frame / after
      // a cache reset → the full hide runs then, so initial hidden state is always established.
      const prev = cacheRef.current[index];
      // Players become the humanoid figure once the pose geometries have loaded; everyone else (and
      // players pre-load) keeps the capsule blob. For a humanoid player, exactly one pose layer is
      // shown (the capsule body and the other four pose layers are hidden off-screen). For everyone
      // else, the capsule body shows and all five pose layers are hidden.
      const useHumanoid = isPlayerActor(actor) && poseGeometries !== null;
      // A modelled NPC becomes its real GLB once that asset has loaded; its capsule body + cap are
      // then hidden (anchor ring / vision wedge / glyph / name stay). EVERY actor the plan assigned
      // gets its own slot in the shared mesh — there is no longer a "first match wins" rule, so two
      // Half-Giant Raiders both get a body instead of one of them silently staying a capsule.
      const modelAssignment = staticModelPlan.byActorId.get(actorId);
      const modelData = modelAssignment ? staticModels.get(modelAssignment.asset.id) : undefined;
      const modelMesh = modelAssignment
        ? staticModelMeshes.current.get(modelAssignment.asset.id)
        : undefined;
      const useStaticModel = !!modelAssignment && !!modelData && !!modelMesh;

      // Per-player override (player panel) wins for living players only; dead stays grey. Only
      // players can be overridden — boss/enemy/npc/pet keep their type colors.
      const override = isPlayerActor(actor) ? playerColorOverrides.get(actorId) : undefined;
      const accentColor = getReplayActorResolvedAccentColor(actor, override);
      const coreColor = getReplayActorCoreColor(actor, override);
      const shellColor = getReplayActorShellColor(actor, override);

      const bodyOpacity = dead ? 0.4 : 1;
      const capOpacity = dead ? 0.4 : 1;
      const glyphOpacity = dead ? 0.45 : 1;
      const ringOpacity = dead ? 0.35 : isThreat ? 0.95 : 0.7;
      const visionOpacity = dead ? 0.12 : 0.42;

      // ---- Matrices ----
      if (useHumanoid) {
        // Humanoid is feet-anchored at y=0, so sit it on the ground (no center offset). Dead
        // squashes y to 0.3 exactly like the capsule. Faces +Z, so actor.rotation maps directly.
        const hScale = groupScale * HUMANOID_NORMALIZE;

        // ---- Movement-driven gait (walk-pose flipbook + lean + bob) ----
        // Derive per-frame travel from the last sample, smooth it, and accumulate distance. The
        // distance drives BOTH the bob phase and the walk-pose index. Dead actors freeze (no gait,
        // idle pose). All terms vanish at zero speed → idle-gate-safe.
        let lean = 0;
        let bob = 0;
        let poseIndex = 0; // 0 = idle stand; 1..4 = walk cycle
        const gait = gaitRef.current;
        if (gait && !dead) {
          if (gait.seeded[index]) {
            const dx = x - gait.lastX[index];
            const dz = z - gait.lastZ[index];
            const raw = Math.sqrt(dx * dx + dz * dz);
            // Speed is units/SECOND (raw path increment ÷ frame delta) so the gate and lean/bob
            // strength don't dilute on high-refresh monitors. Guard delta>0 (first frame / clock
            // hiccups). The EMA uses a fixed TIME CONSTANT (alpha = 1−exp(−delta/tau)) so the
            // smoothing window is constant in seconds — a fixed per-frame factor would smooth over a
            // wall-clock window that shrinks as framerate rises, making the gate chatter on
            // high-refresh monitors.
            const rawPerSec = delta > 0 ? raw / delta : 0;
            const alpha = delta > 0 ? 1 - Math.exp(-delta / GAIT_SPEED_TAU) : 1;
            gait.speed[index] += (rawPerSec - gait.speed[index]) * alpha;
            // Distance is accumulated PATH LENGTH (not per-second) — drives the pose index and bob
            // phase, both framerate- and playback-speed-independent by construction.
            gait.distance[index] += raw;
          } else {
            gait.seeded[index] = 1;
          }
          gait.lastX[index] = x;
          gait.lastZ[index] = z;
          const speedT = Math.min(1, gait.speed[index] / GAIT_SPEED_FULL);
          lean = GAIT_MAX_LEAN * speedT;
          bob = Math.sin(gait.distance[index] * GAIT_BOB_FREQ) * GAIT_BOB_AMP * speedT;
          // Hysteretic walk/idle latch: enter walking above the ENTER speed, return to idle only
          // below the (lower) EXIT speed. A single threshold makes a boundary-hovering player flip
          // poses every frame; the enter>exit gap forces a clear state change before the legs do.
          const s = gait.speed[index];
          if (gait.walking[index]) {
            if (s < GAIT_WALK_EXIT_SPEED) gait.walking[index] = 0;
          } else if (s >= GAIT_WALK_ENTER_SPEED) {
            gait.walking[index] = 1;
          }
          // Walk-pose phase: advance one pose per STRIDE_LEN of travel, cycling walk1..walk4 while
          // the walk latch is set; otherwise hold the idle pose.
          if (gait.walking[index]) {
            const phase = Math.floor(gait.distance[index] / STRIDE_LEN) % WALK_POSE_COUNT;
            poseIndex = 1 + phase; // 1..4
          }
        }

        // Euler order YXZ: face first (Y), then lean forward about the rotated X — a forward pitch
        // in the travel direction. Bob lifts the feet-anchored figure slightly; never below ground.
        obj.position.set(x, y + GROUND_LEVEL + Math.max(0, bob), z);
        obj.rotation.set(lean, actor.rotation, 0, 'YXZ');
        obj.scale.set(hScale, hScale * (dead ? 0.3 : 1), hScale);
        obj.updateMatrix();
        obj.rotation.order = 'XYZ'; // restore default for the order-agnostic writes below
        // Stash the active-pose matrix BEFORE the hide loop. hideInstance() mutates the shared
        // tempObject and overwrites obj.matrix, so writing obj.matrix from inside the loop (when the
        // active pose isn't index 0) would write a hidden matrix. Copy it out first.
        const activeMatrix = poseMatrix.current.copy(obj.matrix);

        // Show this actor in exactly the active pose layer; hide it in the capsule body and the
        // other four pose layers. instanceId → actorId stays uniform across every pose layer.
        for (let p = 0; p < POSE_COUNT; p++) {
          if (p === poseIndex) {
            poseRefs.current[p]?.setMatrixAt(index, activeMatrix);
          } else {
            hideInstance(poseRefs.current[p], index);
          }
        }
        hideInstance(bodyRef.current, index);
      } else if (modelAssignment && modelData && modelMesh) {
        // This actor renders as the GLB model. Hide its capsule body + all pose layers; the model
        // takes the body's place. Anchor ring / vision wedge / glyph / name stay.
        hideInstance(bodyRef.current, index);
        poseRefs.current.forEach((mesh) => hideInstance(mesh, index));

        // Compose M = T_world · R_yaw · S · T_offset · R_orient (applied right-to-left). T_offset is
        // BEFORE scale so feet (oriented min.y → 0) stay grounded under scale and yaw spins about
        // the model center; the dead Y-squash then compresses toward the grounded feet. The
        // grounded/recentered offset is re-derived here from the RAW (orient-independent) bbox under
        // the current ORIENT, so an HMR edit of any transform constant takes effect immediately
        // (they are folded into staticModelSignature, which forces a recompose).
        const t = modelTemp.current;
        const {
          orientEuler,
          scale: modelScale,
          yOffset,
          yawOffset,
        } = modelAssignment.asset.transform;
        t.orient.makeRotationFromEuler(t.euler.set(orientEuler[0], orientEuler[1], orientEuler[2]));
        // Oriented bbox: re-AABB the raw box under ORIENT (8-corner transform).
        t.box.copy(modelData.rawBox).applyMatrix4(t.orient);
        t.box.getCenter(t.center);
        t.offset.makeTranslation(-t.center.x, -t.box.min.y, -t.center.z);
        t.scale.makeScale(modelScale, modelScale * (dead ? DEAD_SQUASH_Y : 1), modelScale);
        t.yaw.makeRotationY(actor.rotation + yawOffset);
        t.world.makeTranslation(x, y + GROUND_LEVEL + yOffset, z);
        t.world.multiply(t.yaw).multiply(t.scale).multiply(t.offset).multiply(t.orient);
        modelMesh.setMatrixAt(modelAssignment.slot, t.world);
      } else {
        // Body capsule: at group scale, dead squashes y to 0.3. Positioned at bodyHeight*0.6.
        obj.position.set(x, y + GROUND_LEVEL + bodyHeight * 0.6 * groupScale, z);
        obj.rotation.set(0, actor.rotation, 0);
        obj.scale.set(groupScale, groupScale * (dead ? 0.3 : 1), groupScale);
        obj.updateMatrix();
        bodyRef.current?.setMatrixAt(index, obj.matrix);
        poseRefs.current.forEach((mesh) => hideInstance(mesh, index));
      }

      // Cap rides atop the capsule head. The humanoid already has its own head, so the cap is
      // redundant (and would float at the wrong height) — hide it for humanoid players. The boss
      // model replaces the capsule entirely, so its cap is hidden too.
      if (useHumanoid || useStaticModel) {
        hideInstance(capRef.current, index);
      } else {
        obj.position.set(x, y + GROUND_LEVEL + capY * groupScale, z);
        obj.rotation.set(0, actor.rotation, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        capRef.current?.setMatrixAt(index, obj.matrix);
      }

      // Glyph plane lies flat above the head, faces up (rotation -PI/2 X). For the humanoid it
      // floats as a halo above the (taller) figure's head; for a modelled NPC it floats above the
      // (much taller) model; for the capsule it rides just above the cap as before. The model glyph
      // height tracks THAT actor's registry entry height and scale, so with several assets on screen
      // each glyph sits over its own model instead of assuming one shared size.
      const glyphYWorld = useHumanoid
        ? y + GROUND_LEVEL + HUMANOID_TARGET_HEIGHT * groupScale + 0.12 * groupScale
        : useStaticModel && modelAssignment
          ? y +
            GROUND_LEVEL +
            modelAssignment.asset.transform.yOffset +
            modelAssignment.asset.transform.modelHeight * modelAssignment.asset.transform.scale +
            0.25
          : y + GROUND_LEVEL + glyphY * groupScale;
      // Model glyph rides a touch larger so it reads above the bigger mesh; others use group scale.
      const glyphScale = useStaticModel ? groupScale * 1.6 : groupScale;
      obj.position.set(x, glyphYWorld, z);
      obj.rotation.set(-Math.PI / 2, 0, 0);
      obj.scale.setScalar(glyphScale);
      obj.updateMatrix();
      // Write the matching glyph from the CLEAN obj.matrix first (before any hideInstance below
      // clobbers the shared tempObject). An actor's glyph group never changes, so it only needs
      // hiding in the OTHER groups on (re)appearance — re-hiding all 7 every frame re-composed ~7
      // identical hidden matrices per actor for nothing (the single largest waste in this loop).
      glyphRefs.current.get(groupSymbol)?.setMatrixAt(index, obj.matrix);
      if (!prev || !prev.visible || prev.glyphSymbol !== groupSymbol) {
        glyphRefs.current.forEach((mesh, symbol) => {
          if (symbol !== groupSymbol) hideInstance(mesh, index);
        });
      }

      // Contact-shadow blob flat on ground, just UNDER the anchor ring (+0.004 vs the ring's +0.006)
      // so the ring still reads on top. Same x,z + groupScale as the ring; flat orientation (-PI/2 X).
      obj.position.set(x, y + GROUND_LEVEL + 0.004, z);
      obj.rotation.set(-Math.PI / 2, 0, 0);
      obj.scale.setScalar(groupScale);
      obj.updateMatrix();
      aoBlobRef.current?.setMatrixAt(index, obj.matrix);

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

      // Invisible fat click/touch proxy — the sole hit target. A vertical cylinder centered at half
      // its height so it spans ground→over-head; threat actors (boss/enemy) get a larger column to
      // match their bigger figure. The unit-scale geometry is in world units. We scale it by the
      // threat multiplier (decoupled from groupScale — the proxy is a fixed generous target, NOT tied
      // to the player/threat visual ratio) AND by a GROW-ONLY floor on the map `scale` prop. The
      // capsule visual geometry bakes `scale` in (0.11*scale radius, 0.55*scale body), so on small
      // maps `scale` climbs to 4.0 and the visual capsule would outgrow a fixed proxy, leaving its
      // upper body unclickable. `Math.max(scale, 1)` grows the proxy to cover those large figures
      // while NEVER shrinking it below today's generous size when `scale` < 1 (default 0.8) — a raw
      // `* scale` would shrink the target on large maps and bring back the original "impossible to
      // click" bug. Verified in .scratch/verify-proxy-coverage.mjs. Covers humanoid players, capsule
      // enemies, AND the reconstructed models. Dead actors stay selectable (inspect a corpse); the loop only
      // reaches here when visible.
      const proxyMult = (isThreat ? HIT_PROXY_THREAT_MULT : 1) * Math.max(scale, 1);
      obj.position.set(x, y + GROUND_LEVEL + (HIT_PROXY_HEIGHT * proxyMult) / 2, z);
      obj.rotation.set(0, 0, 0);
      obj.scale.setScalar(proxyMult);
      obj.updateMatrix();
      hitProxyRef.current?.setMatrixAt(index, obj.matrix);

      // Selection / taunt rings: shown only when active. When ACTIVE the ring tracks the moving
      // actor, so its matrix updates every frame. When INACTIVE it only needs hiding on the
      // transition into inactive (or first appearance) — once parked off-screen it stays there, so
      // re-hiding it for every unselected/untaunted actor every frame was pure waste (~80 hidden
      // matrix composes/frame across a raid where at most one actor is selected).
      if (selected) {
        obj.position.set(x, y + GROUND_LEVEL + 0.016, z);
        obj.rotation.set(-Math.PI / 2, 0, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        selectionRingRef.current?.setMatrixAt(index, obj.matrix);
      } else if (!prev || !prev.visible || prev.selected) {
        hideInstance(selectionRingRef.current, index);
      }
      if (taunted) {
        obj.position.set(x, y + GROUND_LEVEL + 0.022, z);
        obj.rotation.set(-Math.PI / 2, 0, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        tauntRingRef.current?.setMatrixAt(index, obj.matrix);
      } else if (!prev || !prev.visible || prev.taunted) {
        hideInstance(tauntRingRef.current, index);
      }

      // ---- Colors + opacity (only write when changed) ---- (prev captured at the top of the loop)
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
        // Color + opacity are written to EVERY pose layer, not just the active one. Pose membership
        // changes every frame as the actor walks, but color rarely changes, so when an actor
        // migrates idle→walk1 its `changed` gate is usually false — if only the active layer were
        // colored, the destination layer's instanceColor would never lazily create and the figure
        // would render white on that pose. Coloring all five keeps every layer always-correct
        // regardless of which is visible; pose-swap then only moves matrices (above). Five
        // setColorAt instead of one is negligible since this path runs only when color/opacity change.
        col.set(coreColor);
        for (let p = 0; p < POSE_COUNT; p++) {
          poseRefs.current[p]?.setColorAt(index, col);
        }
        capRef.current?.setColorAt(index, col.set(accentColor));
        anchorRingRef.current?.setColorAt(index, col.set(shellColor));
        visionRef.current?.setColorAt(index, col.set(accentColor));
        colorDirty = true;

        if (o.body) o.body[index] = bodyOpacity;
        for (let p = 0; p < POSE_COUNT; p++) {
          const arr = o.pose[p];
          if (arr) arr[index] = bodyOpacity;
        }
        if (o.cap) o.cap[index] = capOpacity;
        if (o.anchorRing) o.anchorRing[index] = ringOpacity;
        if (o.vision) o.vision[index] = visionOpacity;
        const glyphArr = o.glyph.get(groupSymbol);
        if (glyphArr) glyphArr[index] = glyphOpacity;

        // Reconstructed model: the registry tint and the dead-darken both ride instanceColor, and
        // the dead fade rides the per-slot opacity attribute. Neither touches the shared material,
        // which is what makes one mesh able to serve N actors in different states — and what keeps
        // the "never flip material state per frame" rule intact. A neutral tint on a living actor is
        // (1,1,1), i.e. the albedo exactly as authored.
        if (modelAssignment && modelMesh) {
          const [tintR, tintG, tintB] = composeStaticModelInstanceColor(
            modelAssignment.tint,
            dead ? DEAD_DARKEN : 1,
          );
          modelMesh.setColorAt(modelAssignment.slot, col.setRGB(tintR, tintG, tintB));
          const modelArr = o.model.get(modelAssignment.asset.id);
          if (modelArr) modelArr[modelAssignment.slot] = dead ? DEAD_OPACITY : 1;
        }
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

    // Flush matrices every frame (positions change constantly during playback). Iterate the refs
    // directly with the hoisted stable flaggers — no per-frame temp array / closure allocation.
    const poses = poseRefs.current;
    flagMatrixNeedsUpdate(bodyRef.current);
    for (let p = 0; p < poses.length; p++) flagMatrixNeedsUpdate(poses[p]);
    flagMatrixNeedsUpdate(capRef.current);
    flagMatrixNeedsUpdate(visionRef.current);
    flagMatrixNeedsUpdate(hitProxyRef.current);
    flagMatrixNeedsUpdate(aoBlobRef.current);
    flagMatrixNeedsUpdate(anchorRingRef.current);
    flagMatrixNeedsUpdate(selectionRingRef.current);
    flagMatrixNeedsUpdate(tauntRingRef.current);
    glyphRefs.current.forEach(flagMatrixNeedsUpdate);
    staticModelMeshes.current.forEach(flagMatrixNeedsUpdate);

    if (colorDirty) {
      flagColorNeedsUpdate(bodyRef.current);
      for (let p = 0; p < poses.length; p++) flagColorNeedsUpdate(poses[p]);
      flagColorNeedsUpdate(capRef.current);
      flagColorNeedsUpdate(anchorRingRef.current);
      flagColorNeedsUpdate(visionRef.current);
      staticModelMeshes.current.forEach(flagColorNeedsUpdate);
    }
    if (opacityDirty) {
      flagOpacityNeedsUpdate(bodyRef.current);
      for (let p = 0; p < poses.length; p++) flagOpacityNeedsUpdate(poses[p]);
      flagOpacityNeedsUpdate(capRef.current);
      flagOpacityNeedsUpdate(anchorRingRef.current);
      flagOpacityNeedsUpdate(visionRef.current);
      glyphRefs.current.forEach(flagOpacityNeedsUpdate);
      staticModelMeshes.current.forEach(flagOpacityNeedsUpdate);
    }
  }, RenderPriority.ACTORS);

  // ---- Interaction (instanceId → actorId) ----
  // Reusable scratch for the proxy tie-break (allocated once; never per click).
  const pickScratch = useRef({ mat: new THREE.Matrix4(), center: new THREE.Vector3() });
  // Resolve which proxy instance a pointer event selected. Normally this is just the nearest hit
  // (event.instanceId). But flat coplanar proxy caps make a near-top-down ray into a stacked pile
  // tie EXACTLY in distance, where three.js arbitrarily returns the lower-index instance (see
  // HIT_PROXY_TIE_EPS). When the nearest intersections tie, pick the proxy whose center is closest to
  // the click point in the XZ plane — the actor actually under the tap. Reads event.intersections,
  // which R3F populates with every tied instance of this mesh (its dedup key includes instanceId).
  const resolveProxyInstanceId = useCallback(
    (event: {
      instanceId?: number;
      intersections?: ThreeEvent<PointerEvent>['intersections'];
    }): number | undefined => {
      const intersections = event.intersections;
      const proxy = hitProxyRef.current;
      if (!intersections || intersections.length === 0 || !proxy) return event.instanceId;
      // Restrict to this proxy mesh's hits that carry an instanceId, sorted nearest-first (R3F
      // already sorts by distance ascending).
      const proxyHits = intersections.filter(
        (h) => h.object === proxy && typeof h.instanceId === 'number',
      );
      if (proxyHits.length <= 1) return event.instanceId;
      const nearest = proxyHits[0];
      const tied = proxyHits.filter((h) => h.distance - nearest.distance <= HIT_PROXY_TIE_EPS);
      if (tied.length <= 1) return nearest.instanceId;
      const point = nearest.point;
      const { mat, center } = pickScratch.current;
      let bestId = tied[0].instanceId;
      let bestDistSq = Infinity;
      for (const hit of tied) {
        const id = hit.instanceId;
        if (typeof id !== 'number') continue;
        proxy.getMatrixAt(id, mat);
        center.setFromMatrixPosition(mat);
        const dx = center.x - point.x;
        const dz = center.z - point.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestId = id;
        }
      }
      return bestId;
    },
    [],
  );
  const getActorIdFromEvent = useCallback(
    (event: {
      instanceId?: number;
      intersections?: ThreeEvent<PointerEvent>['intersections'];
    }): number | null => {
      const id = resolveProxyInstanceId(event);
      if (typeof id !== 'number' || id < 0 || id >= actorIds.length) return null;
      if (cacheRef.current[id]?.visible === false) return null;
      return actorIds[id];
    },
    [actorIds, resolveProxyInstanceId],
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

  // Model meshes are instanced too, but their instanceId indexes that ASSET's slots rather than the
  // shared actor index, so they resolve through the plan's slot→actorId table instead of `actorIds`.
  // The asset id travels on the mesh's userData, which is how one shared handler serves every layer.
  // Each modelled actor ALSO has a fat hit proxy at its actor index (the proxy loop runs for every
  // visible actor), so it is covered twice: nearest-hit wins and both routes resolve to the same
  // actor. Keeping the GLB handlers is belt-and-suspenders — a model can be visually wider than its
  // proxy cylinder, so this guarantees no selection regression.
  const getModelActorIdFromEvent = useCallback(
    (event: { object?: THREE.Object3D; instanceId?: number }): number | null => {
      const assetId = (event.object?.userData as { staticModelAssetId?: string } | undefined)
        ?.staticModelAssetId;
      const slot = event.instanceId;
      if (!assetId || typeof slot !== 'number') return null;
      const actorId = staticModelPlan.actorIdsByAssetId.get(assetId)?.[slot];
      if (actorId === undefined) return null;
      const index = actorIndexById.get(actorId);
      if (index !== undefined && cacheRef.current[index]?.visible === false) return null;
      return actorId;
    },
    [staticModelPlan, actorIndexById],
  );
  const handleModelClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const actorId = getModelActorIdFromEvent(event);
      if (actorId === null) return;
      event.stopPropagation();
      onActorClick?.(actorId);
    },
    [getModelActorIdFromEvent, onActorClick],
  );
  const handleModelOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.distance > MAX_ACTOR_HOVER_DISTANCE || getModelActorIdFromEvent(event) === null) {
        return;
      }
      event.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    [getModelActorIdFromEvent],
  );

  if (instanceCount === 0) {
    return null;
  }

  return (
    <>
      {/* Invisible fat click/touch proxy — the SOLE hit target for actor selection. The visual
          layers (body, poses, cap, anchor ring, boss model) no longer carry pointer handlers; this
          generous cylinder per actor is what raycasts catch, so a finger no longer has to land on the
          thin figure. instanceId → actorId is uniform with every layer, so handleClick/handleOver
          (which read event.instanceId) resolve the right actor. */}
      <instancedMesh
        ref={hitProxyRef}
        args={[geometries.hitProxy, materials.hitProxy, instanceCount]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      />
      {/* Soft radial contact-shadow blob disc under each actor (one shared InstancedMesh, 1 draw
          call). renderOrder 9 (set in the setup effect) paints it UNDER the anchor ring. Decorative
          accents (blob + facing wedge) unmount on barebones — every per-frame write to them is
          ref-optional-chained, so a null ref is a clean no-op. */}
      {figureAccents && (
        <instancedMesh
          ref={aoBlobRef}
          args={[geometries.aoBlob, materials.aoBlob, instanceCount]}
        />
      )}
      <instancedMesh
        ref={anchorRingRef}
        args={[geometries.anchorRing, materials.anchorRing, instanceCount]}
      />
      {figureAccents && (
        <instancedMesh
          ref={visionRef}
          args={[geometries.vision, materials.vision, instanceCount]}
        />
      )}
      <instancedMesh
        ref={bodyRef}
        args={[geometries.body, materials.body, instanceCount]}
        castShadow={!performanceMode}
      />
      {poseGeometries?.map((geo, p) => (
        <instancedMesh
          key={POSE_NAMES[p]}
          ref={(mesh) => {
            poseRefs.current[p] = mesh;
          }}
          args={[geo, materials.humanoid, instanceCount]}
          castShadow={!performanceMode}
        />
      ))}
      {/* Reconstructed NPC models: ONE InstancedMesh per registry asset, sized to the number of
          actors that resolve to it, with each instance's world matrix written in the useFrame above.
          This is what lets a pack render — N raiders share one geometry and one draw call — and what
          lets one reconstruction serve recolour variants, via the per-instance tint on instanceColor.
          Distinct assets in the same fight just add another mesh. castShadow tracks performanceMode:
          the ~20k-tri shadow pass is the one real per-model cost lever. Absent actors are parked
          off-screen per slot in the loop. */}
      {staticModelLayers.map(({ asset, model, slots }) => (
        <instancedMesh
          key={asset.id}
          ref={(mesh) => {
            if (mesh) {
              // The handler reads this back to map instanceId → slot → actorId for this asset.
              mesh.userData.staticModelAssetId = asset.id;
              staticModelMeshes.current.set(asset.id, mesh);
            } else {
              staticModelMeshes.current.delete(asset.id);
            }
          }}
          args={[
            model.geometry,
            model.materials.length === 1 ? model.materials[0] : model.materials,
            slots.length,
          ]}
          castShadow={!performanceMode}
          receiveShadow={false}
          onClick={handleModelClick}
          onPointerOver={handleModelOver}
          onPointerOut={handleOut}
        />
      ))}
      <instancedMesh ref={capRef} args={[geometries.cap, materials.cap, instanceCount]} />
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
          selectedActorRef={selectedActorRef}
          nameTagBudget={nameTagBudget}
          capGateRef={capGateRef}
        />
      )}
    </>
  );
};
