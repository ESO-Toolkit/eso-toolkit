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

import { BatchedActorNames3D } from './BatchedActorNames3D';

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
}

const EMPTY_VISIBILITY: Map<number, boolean> = new Map();
const EMPTY_COLOR_OVERRIDES: Map<number, string> = new Map();
const GROUND_LEVEL = 0.05;
const SELECTION_COLOR = '#38bdf8';
const TAUNT_COLOR = '#f87171';
const HIDDEN_Y = -10000;
const HIDDEN_SCALE = 0.0001;
const MAX_ACTOR_HOVER_DISTANCE = 1000;

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
const HUMANOID_WALK_MODEL_URL = `${import.meta.env.BASE_URL}models/coolstickman-walk.glb`;
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

// ---- Boss model (single non-instanced GLB) ----
//
// Unlike players (a crowd → instanced single-material figures with per-instance setColorAt), the BOSS
// is ONE actor rendered as its own self-materialled GLB scene. So it is NOT a third instanced layer:
// it's a single <primitive> whose world matrix is rebuilt every frame inside this component's existing
// useFrame (reusing the one proven idle gate) from the boss actor's position + facing + the live-tune
// constants below. A handful of draw calls for one boss is O(1) in actor count.
//
// AirAtronach_Coral_Boss.glb (verified offline, .scratch/inspect-boss*.mjs): 1 mesh / 1 material / NO
// embedded textures / 19,862 tris / no skeleton / no animations. It is mis-oriented (largest axis is
// WIDTH — but an Air Atronach IS a wide swirling elemental, so "tallest axis = up" is not a reliable
// test here) and not grounded. rotateX(-90°) stands it more upright (H 1.79→2.84, min.y 1.18→-0.53).
//
// THESE ARE LIVE-TUNE CONSTANTS. They are read fresh in the per-frame matrix compose (NOT baked into
// geometry behind a load effect), so editing one takes effect on the next HMR commit immediately —
// the boss is one actor, so rebuilding its world matrix per frame is free, and a baked/memoized
// offset would go stale on HMR (the scene identity is unchanged so the memo/effect never re-runs).
// The ground+recenter offset is derived live from the raw bbox under the current ORIENT (see useFrame),
// so it auto-adapts when ORIENT changes — nothing here is a measured hardcode to re-derive by hand.
const BOSS_MODEL_URL = `${import.meta.env.BASE_URL}models/bosses/AirAtronach_Coral_Boss.glb`;
// Boss name / species → model. Hardcoded + trivially extensible; unknown boss → capsule fallback (no
// model). Match is case-insensitive substring so "Tideborn Taleria" and an "AirAtronach" species both
// resolve. We do NOT port PR #877's mapping infra (creature catalog/scan JSON, viewer page).
const BOSS_MODEL_NAME_KEYS = ['taleria', 'airatronach', 'air atronach'];
const ORIENT_EULER: [number, number, number] = [-Math.PI / 2, 0, 0]; // rotateX(-90°) to stand it up
// World-unit scale. The oriented model is ≈2.84u tall (raw), so BOSS_SCALE≈0.9 makes it ≈2.5u —
// clearly bigger than the ≈0.95u players without dwarfing the arena (the viewer's 3/maxDim≈0.87 is a
// comparable reference). Reads as a boss. Tune live.
const BOSS_SCALE = 0.9;
const BOSS_Y_OFFSET = 0; // extra lift above the grounded feet (feet land at y=0 from the bbox offset)
const BOSS_YAW_OFFSET = 0; // radians added to actor.rotation; the model's facing axis is unknown — tune
// Dead-boss look (Taleria dies at fight end; observable). A non-instanced materialled mesh can't be
// setColorAt'd like the capsule, so death is conveyed by lowering material opacity, optionally
// darkening the material color, and squashing Y (feet stay grounded since the offset puts min.y at 0).
// `transparent` is set ONCE at load (flipping it per frame recompiles the material); only opacity +
// color are animated, and only on the dead-flag transition. THESE ARE THE USER'S LOOK CALL — lowered
// opacity on a 19.8k-tri swirling mesh can show depth-sort artifacts; if it looks bad, the fallback is
// darken-only (set DEAD_OPACITY back to 1 and lean on DEAD_DARKEN + DEAD_SQUASH_Y).
const DEAD_OPACITY = 0.45;
const DEAD_DARKEN = 0.45; // multiply material color toward black (1 = unchanged, 0 = black)
const DEAD_SQUASH_Y = 0.55; // Y scale factor when dead (compresses toward the grounded feet)

function getBossModelUrlForActor(actor: ActorPosition): string | null {
  if (actor.type !== 'boss') return null;
  const name = actor.name?.toLowerCase() ?? '';
  return BOSS_MODEL_NAME_KEYS.some((key) => name.includes(key)) ? BOSS_MODEL_URL : null;
}

// Scan the lookup for the first boss actor that maps to a model, returning its URL (or null). Used to
// gate the GLB load: non-Taleria fights never fetch/parse the 560 KB model.
//
// Correctness vs cost: a fixed timestamp cap is UNSOUND — a boss with no recorded death (a wipe) is
// gated by recent-event visibility in CalculateActorPositions, so it can be absent from the earliest
// buckets until its first event, and a small cap would miss it (→ capsule for the whole replay). The
// matching case must therefore be allowed to find a late-appearing boss, while the NON-matching case
// must not walk all ~72k timestamps at render time. Both are satisfied by sampling each distinct actor
// ONCE: we walk timestamps but track which actor ids we've already checked and stop as soon as every
// id in `actorIds` has been seen. Every actor appears within a bounded number of buckets (players from
// start, a boss within its first event window), so this terminates early for matching AND non-matching
// fights, yet still checks every actor — so it can't miss a late-spawning boss.
function getBossModelUrlInLookup(
  lookup: TimestampPositionLookup | null,
  actorIds: readonly number[],
): string | null {
  const positions = lookup?.positionsByTimestamp;
  if (!positions || actorIds.length === 0) return null;
  const seen = new Set<number>();
  for (const ts of Object.keys(positions)) {
    const atTs = positions[Number(ts)];
    for (const id of Object.keys(atTs)) {
      const actorId = Number(id);
      if (seen.has(actorId)) continue;
      seen.add(actorId);
      const url = getBossModelUrlForActor(atTs[actorId]);
      if (url) return url;
    }
    if (seen.size >= actorIds.length) break; // every distinct actor sampled → no boss matched
  }
  return null;
}

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
  playerColorOverrides: Map<number, string> | undefined;
  actorIds: readonly number[];
  // Signature of the live boss-tune constants + performanceMode. The boss is static, so the user
  // tunes it while PAUSED; on an HMR const edit the component re-renders but frameCacheRef is
  // preserved (no remount) → without this the time/lookup compare would early-return and the edit
  // would never recompose. Folding the constants in forces exactly one recompose on the edit.
  bossSignature: string;
}

// Baked boss model: the single mesh's geometry (node transform already baked in), its material(s)
// with the original colors (for the dead-darken lerp), and the RAW (orient-independent) bounding box
// used to derive the live grounded/recentered offset in the per-frame compose.
interface BossModelData {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  originalColors: THREE.Color[];
  rawBox: THREE.Box3;
}

function isThreatActor(actor: ActorPosition): boolean {
  return actor.type === 'boss' || actor.type === 'enemy';
}

// Signature folded into the FrameCache so a paused HMR edit of any live boss-tune constant (or a
// performanceMode toggle) forces one recompose. Keep every value the per-frame boss compose reads.
function bossTuneSignature(performanceMode: boolean): string {
  return [
    BOSS_SCALE,
    BOSS_Y_OFFSET,
    BOSS_YAW_OFFSET,
    ORIENT_EULER[0],
    ORIENT_EULER[1],
    ORIENT_EULER[2],
    DEAD_OPACITY,
    DEAD_DARKEN,
    DEAD_SQUASH_Y,
    performanceMode ? 1 : 0,
  ].join(',');
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
}) => {
  const bodyHeight = 0.55 * scale;
  const capY = bodyHeight + 0.02 * scale;
  const glyphY = capY + 0.03 * scale;

  const actorIds = useMemo(() => getActorIdsFromLookup(lookup), [lookup]);
  const instanceCount = actorIds.length;

  // URL of the boss model this fight needs, or null if no actor maps to one. Gates the GLB load so
  // non-Taleria fights never fetch/parse the 560 KB model.
  const bossModelUrl = useMemo(() => getBossModelUrlInLookup(lookup, actorIds), [lookup, actorIds]);

  // Stable index → glyph-group membership. An actor's symbol is fixed (role/type don't change
  // mid-fight), so we can assign each actor to one glyph group once and only toggle visibility.
  const glyphSymbolByIndex = useRef<GlyphSymbol[]>([]);

  // Async-loaded humanoid pose geometries (the 5-pose walk flipbook). Null until the GLB resolves;
  // players fall back to the capsule body until then. The array holds one BufferGeometry per pose in
  // POSE_NAMES order (idle, walk1..walk4). Setting state on load triggers a React commit, which
  // refills the on-demand render budget (Arena3DScene) so the swap actually paints while paused.
  const [poseGeometries, setPoseGeometries] = useState<THREE.BufferGeometry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
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
  }, []);

  // Async-loaded boss model. Null until the GLB resolves; the boss falls back to the capsule body
  // until then. On load we bake the mesh's node (world) transform into its geometry so the single
  // <primitive> can be driven by a directly-written matrix (no double-applied node transform), set
  // each material `transparent` ONCE (per-frame flipping would recompile), capture the original
  // material colors (for the dead-darken lerp), and measure the RAW bbox — orient-independent, so the
  // per-frame compose can re-derive the grounded/recentered offset live from the current ORIENT.
  // Setting state triggers a React commit → Arena3DScene refills the on-demand render budget so the
  // swap paints while paused.
  const [bossModel, setBossModel] = useState<BossModelData | null>(null);
  useEffect(() => {
    // Only load when this fight actually has a boss that maps to a model.
    if (!bossModelUrl) {
      setBossModel(null);
      return;
    }
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      bossModelUrl,
      (gltf) => {
        let bossMesh: THREE.Mesh | null = null;
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh && mesh.geometry && !bossMesh) {
            bossMesh = mesh;
          }
        });
        if (!bossMesh) return;
        const mesh = bossMesh as THREE.Mesh;
        // Bake the node transform into the geometry, then neutralise the node so the matrix we write
        // each frame is the only transform applied.
        const geometry = mesh.geometry as THREE.BufferGeometry;
        geometry.applyMatrix4(mesh.matrixWorld);
        const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(
          (m): m is THREE.Material => !!m,
        );
        // If the component unmounted (or the url changed) while the GLB was in flight, dispose the
        // just-parsed resources instead of leaking them — nothing will mount this geometry/material.
        if (cancelled) {
          geometry.dispose();
          materials.forEach((m) => m.dispose());
          return;
        }
        const originalColors = materials.map(
          (m) => (m as THREE.MeshStandardMaterial).color?.clone() ?? new THREE.Color(1, 1, 1),
        );
        materials.forEach((m) => {
          m.transparent = true; // set ONCE; only opacity/color animate (per-frame flip would recompile)
        });
        const rawBox = new THREE.Box3().setFromBufferAttribute(
          geometry.getAttribute('position') as THREE.BufferAttribute,
        );
        setBossModel({ geometry, materials, originalColors, rawBox });
      },
      undefined,
      () => {
        // On load failure the capsule fallback stays — the boss just keeps the capsule blob.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bossModelUrl]);

  // Mesh refs.
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  // One InstancedMesh per walk pose (idle, walk1..walk4), in POSE_NAMES order. Each is sized to the
  // full instanceCount; a player is shown in exactly one and hidden in the other four per frame.
  const poseRefs = useRef<Array<THREE.InstancedMesh | null>>(
    Array.from({ length: POSE_COUNT }, () => null),
  );
  const visionRef = useRef<THREE.InstancedMesh>(null);
  const anchorRingRef = useRef<THREE.InstancedMesh>(null);
  const selectionRingRef = useRef<THREE.InstancedMesh>(null);
  const tauntRingRef = useRef<THREE.InstancedMesh>(null);
  // One glyph InstancedMesh per symbol; each sized to the full instanceCount and indexed by the
  // same actor index (non-members are hidden) so instanceId → actorId stays uniform across layers.
  const glyphRefs = useRef<Map<GlyphSymbol, THREE.InstancedMesh>>(new Map());

  // The single boss <primitive> (matrixAutoUpdate off; we write its world matrix each frame).
  const bossMeshRef = useRef<THREE.Mesh>(null);
  // Per-frame scratch for the boss world-matrix compose (allocated once, never per frame).
  const bossTemp = useRef({
    box: new THREE.Box3(),
    center: new THREE.Vector3(),
    euler: new THREE.Euler(),
    orient: new THREE.Matrix4(),
    offset: new THREE.Matrix4(),
    scale: new THREE.Matrix4(),
    yaw: new THREE.Matrix4(),
    world: new THREE.Matrix4(),
  });
  // Cached signature of the last-written boss material state (alive/dead × opacity × darken). The
  // material opacity/color write fires only when this changes — not every frame — but keying it on
  // the full target state (not just the dead flag) means a paused HMR edit of DEAD_OPACITY/DEAD_DARKEN
  // re-applies even though the dead flag itself did not transition. null = never written yet.
  const bossMatStateRef = useRef<string | null>(null);
  // Actor id currently rendered as the boss model (null when no boss model is shown). The boss mesh
  // is not instanced, so its click/hover handlers read this instead of event.instanceId.
  const bossActorIdRef = useRef<number | null>(null);

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
  }>({ pose: [], glyph: new Map() });

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
      body: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, transparent: true }),
      humanoid: new THREE.MeshStandardMaterial({
        roughness: 0.6,
        metalness: 0.1,
        transparent: true,
      }),
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

  // Dispose the loaded pose geometries when they are replaced or the component unmounts.
  useEffect(() => {
    return () => {
      poseGeometries?.forEach((g) => g.dispose());
    };
  }, [poseGeometries]);

  // Dispose the loaded boss geometry + material(s) when replaced or on unmount.
  useEffect(() => {
    return () => {
      bossModel?.geometry.dispose();
      bossModel?.materials.forEach((m) => m.dispose());
    };
  }, [bossModel]);

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
    // Every pose layer is wired identically and at the same render order as the capsule body.
    o.pose = poseRefs.current.map((mesh) => setup(mesh, 12, true));
    o.cap = setup(capRef.current, 13, true);
    setup(selectionRingRef.current, 14, false);
    setup(tauntRingRef.current, 15, false);
    glyphRefs.current.forEach((mesh, symbol) => {
      const arr = setup(mesh, 16, true);
      if (arr) o.glyph.set(symbol, arr);
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
    frameCacheRef.current = null;
    cacheRef.current = [];
  }, [instanceCount, geometries, materials, glyphMaterials, poseGeometries]);

  // When the boss model loads (or is replaced), force one recompose: the setState commit refills the
  // render budget, but the per-frame loop's frame cache would otherwise early-return while PAUSED and
  // the model would never get positioned (boss invisible until the user scrubs). Nulling the frame
  // cache makes the next budgeted frame recompose — placing the model + hiding its capsule. Also
  // reset the boss dead-state cache so the first frame writes the material opacity/color.
  useEffect(() => {
    frameCacheRef.current = null;
    bossMatStateRef.current = null;
  }, [bossModel]);

  const hideInstance = useCallback((mesh: THREE.InstancedMesh | null, index: number): void => {
    if (!mesh) return;
    const obj = tempObject.current;
    obj.position.set(0, HIDDEN_Y, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(HIDDEN_SCALE);
    obj.updateMatrix();
    mesh.setMatrixAt(index, obj.matrix);
  }, []);

  useFrame((_state, delta) => {
    const currentTime = timeRef ? timeRef.current : 0;
    const selectedActorId = selectedActorRef.current;
    const prevFrame = frameCacheRef.current;
    const bossSignature = bossTuneSignature(performanceMode);

    if (
      prevFrame &&
      prevFrame.lookup === lookup &&
      prevFrame.time === currentTime &&
      prevFrame.selectedActorId === selectedActorId &&
      prevFrame.playerVisibility === playerVisibility &&
      prevFrame.playerColorOverrides === playerColorOverrides &&
      prevFrame.actorIds === actorIds &&
      prevFrame.bossSignature === bossSignature
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
      bossSignature,
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

    // First boss actor that has a model loaded → drive the single <primitive> after the loop. Its
    // capsule body + cap are hidden in the loop (anchor ring / vision wedge / glyph / name stay).
    let bossActor: ActorPosition | null = null;
    let bossActorId = -1; // the loop actorId of bossActor (drives the boss mesh's click/hover)

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
      // Players become the humanoid figure once the pose geometries have loaded; everyone else (and
      // players pre-load) keeps the capsule blob. For a humanoid player, exactly one pose layer is
      // shown (the capsule body and the other four pose layers are hidden off-screen). For everyone
      // else, the capsule body shows and all five pose layers are hidden.
      const useHumanoid = isPlayerActor(actor) && poseGeometries !== null;
      // The boss becomes its real GLB model once that's loaded; its capsule body + cap are then
      // hidden (anchor ring / vision wedge / glyph / name stay). The model itself is the single
      // <primitive>, driven after this loop from the recorded boss actor. Only the FIRST matching
      // boss drives the one primitive.
      const useBossModel =
        bossModel !== null && bossActor === null && getBossModelUrlForActor(actor) !== null;
      if (useBossModel) {
        bossActor = actor;
        bossActorId = actorId;
      }

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
      } else if (useBossModel) {
        // Boss renders as the GLB model (driven after the loop). Hide its capsule body + all pose
        // layers; the model takes the body's place. Anchor ring / vision wedge / glyph / name stay.
        hideInstance(bodyRef.current, index);
        poseRefs.current.forEach((mesh) => hideInstance(mesh, index));
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
      if (useHumanoid || useBossModel) {
        hideInstance(capRef.current, index);
      } else {
        obj.position.set(x, y + GROUND_LEVEL + capY * groupScale, z);
        obj.rotation.set(0, actor.rotation, 0);
        obj.scale.setScalar(groupScale);
        obj.updateMatrix();
        capRef.current?.setMatrixAt(index, obj.matrix);
      }

      // Glyph plane lies flat above the head, faces up (rotation -PI/2 X). For the humanoid it
      // floats as a halo above the (taller) figure's head; for the boss model it floats above the
      // (much taller) model; for the capsule it rides just above the cap as before. The boss glyph
      // height tracks BOSS_SCALE so it follows the model up/down when the scale is tuned live (the
      // oriented model is ≈2.84u tall before scale).
      const glyphYWorld = useHumanoid
        ? y + GROUND_LEVEL + HUMANOID_TARGET_HEIGHT * groupScale + 0.12 * groupScale
        : useBossModel
          ? y + GROUND_LEVEL + BOSS_Y_OFFSET + 2.84 * BOSS_SCALE + 0.25
          : y + GROUND_LEVEL + glyphY * groupScale;
      // Boss glyph rides a touch larger so it reads above the bigger model; others use group scale.
      const glyphScale = useBossModel ? groupScale * 1.6 : groupScale;
      obj.position.set(x, glyphYWorld, z);
      obj.rotation.set(-Math.PI / 2, 0, 0);
      obj.scale.setScalar(glyphScale);
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

    // ---- Boss model: compose the single <primitive> world matrix from the live tune constants ----
    // Runs strictly after the frame-cache early-return above, so a paused/idle scene adds no work
    // (the boss is static — no time-driven term). The grounded/recentered offset is derived live
    // from the RAW (orient-independent) bbox under the current ORIENT, so an HMR edit of ORIENT or
    // any other constant takes effect immediately (folded into bossSignature → forces a recompose).
    const bossMesh = bossMeshRef.current;
    if (bossModel && bossMesh) {
      if (bossActor) {
        bossActorIdRef.current = bossActorId;
        const t = bossTemp.current;
        const [bx, by, bz] = bossActor.position;
        const bossDead = bossActor.isDead;

        // Compose M = T_world · R_yaw · S · T_offset · R_orient (applied right-to-left). T_offset is
        // BEFORE scale so feet (oriented min.y → 0) stay grounded under scale and yaw spins about the
        // model center; the dead Y-squash then compresses toward the grounded feet.
        t.orient.makeRotationFromEuler(
          t.euler.set(ORIENT_EULER[0], ORIENT_EULER[1], ORIENT_EULER[2]),
        );
        // Oriented bbox: re-AABB the raw box under ORIENT (8-corner transform — free for one actor).
        t.box.copy(bossModel.rawBox).applyMatrix4(t.orient);
        t.box.getCenter(t.center);
        t.offset.makeTranslation(-t.center.x, -t.box.min.y, -t.center.z);
        const squashY = bossDead ? DEAD_SQUASH_Y : 1;
        t.scale.makeScale(BOSS_SCALE, BOSS_SCALE * squashY, BOSS_SCALE);
        t.yaw.makeRotationY(bossActor.rotation + BOSS_YAW_OFFSET);
        t.world.makeTranslation(bx, by + GROUND_LEVEL + BOSS_Y_OFFSET, bz);
        // world = T_world · R_yaw · S · T_offset · R_orient
        t.world.multiply(t.yaw).multiply(t.scale).multiply(t.offset).multiply(t.orient);
        bossMesh.matrix.copy(t.world);
        // matrixAutoUpdate is off, so three won't recompute matrixWorld from our write unless we flag
        // it dirty — without this the matrix copy above would never reach the GPU.
        bossMesh.matrixWorldNeedsUpdate = true;
        bossMesh.visible = true;

        // Dead-state material write, gated on a SIGNATURE of the target state (not just the dead flag)
        // so it fires once per real change but still re-applies when a paused HMR edit of DEAD_OPACITY/
        // DEAD_DARKEN changes the target without flipping `dead`. `transparent` was set once at load;
        // here we animate only opacity + color (darken lerps toward black).
        const targetOpacity = bossDead ? DEAD_OPACITY : 1;
        const targetDarken = bossDead ? DEAD_DARKEN : 1;
        const matState = `${targetOpacity},${targetDarken}`;
        if (bossMatStateRef.current !== matState) {
          bossModel.materials.forEach((m, i) => {
            const std = m as THREE.MeshStandardMaterial;
            m.opacity = targetOpacity;
            if (std.color) {
              std.color.copy(bossModel.originalColors[i]).multiplyScalar(targetDarken);
            }
          });
          bossMatStateRef.current = matState;
        }
      } else {
        // No boss actor this frame (not present / not visible) → hide the model.
        bossMesh.visible = false;
        bossActorIdRef.current = null;
      }
    }

    // Flush matrices every frame (positions change constantly during playback).
    [
      bodyRef.current,
      ...poseRefs.current,
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
      [
        bodyRef.current,
        ...poseRefs.current,
        capRef.current,
        anchorRingRef.current,
        visionRef.current,
      ].forEach((m) => {
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
      poseRefs.current.forEach((m) => flag(m));
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

  // The boss mesh is not instanced (no instanceId), so it selects/hovers via the tracked boss actor
  // id instead of getActorIdFromEvent. Mirrors the capsule body's click/hover so clicking the model
  // still follows the boss.
  const handleBossClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const actorId = bossActorIdRef.current;
      if (actorId === null) return;
      event.stopPropagation();
      onActorClick?.(actorId);
    },
    [onActorClick],
  );
  const handleBossOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.distance > MAX_ACTOR_HOVER_DISTANCE || bossActorIdRef.current === null) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
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
      {poseGeometries?.map((geo, p) => (
        <instancedMesh
          key={POSE_NAMES[p]}
          ref={(mesh) => {
            poseRefs.current[p] = mesh;
          }}
          args={[geo, materials.humanoid, instanceCount]}
          castShadow={!performanceMode}
          onClick={handleClick}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        />
      ))}
      {/* Boss model: a single non-instanced mesh whose world matrix is written each frame in the
          useFrame above (matrixAutoUpdate off so the manual write isn't clobbered). castShadow tracks
          performanceMode — the 19.8k-tri shadow pass is the one real per-boss cost lever. Hidden when
          no boss actor is present this frame (bossMesh.visible toggled in the loop). */}
      {bossModel && (
        <mesh
          ref={bossMeshRef}
          geometry={bossModel.geometry}
          material={bossModel.materials.length === 1 ? bossModel.materials[0] : bossModel.materials}
          matrixAutoUpdate={false}
          castShadow={!performanceMode}
          receiveShadow={false}
          onClick={handleBossClick}
          onPointerOver={handleBossOver}
          onPointerOut={handleOut}
        />
      )}
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
