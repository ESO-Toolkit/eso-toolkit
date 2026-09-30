import {
  type TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';

/**
 * Whole-model overview motion for the unrigged, instanced reconstructions (bosses and trash).
 *
 * The shipped NPC models are one static mesh each (no skeleton, no clips), and every actor of an
 * asset shares one InstancedMesh, so per-actor animation mixers are off the table. What remains is
 * motion expressed through the instance matrix alone: a slow breathing scale, a lean into the
 * direction of travel with a light side-to-side sway, and a fall onto the model's back on death.
 *
 * Every term is a pure function of (lookup, actor, replay time). Nothing is accumulated across
 * frames, so pausing freezes the pose, seeking lands on the exact pose that playback would have
 * reached, and the same timeline always renders identically.
 */

// ---- Breathing ----
/** Milliseconds per breath. Slow enough to read as a resting creature, not a pulse. */
export const BREATH_PERIOD_MS = 3400;
/** Peak fractional Y scale change. Visible on a 30-60 px boss without looking rubbery. */
export const BREATH_AMPLITUDE = 0.014;
/** Share of the Y change applied inversely to X/Z, so the model keeps roughly constant volume. */
export const BREATH_WIDTH_SHARE = 0.5;

// ---- Movement ----
/**
 * Window used to measure speed. Positions come from the worker's interpolated lookup, so a
 * finite difference across this window is a stable velocity estimate that does not depend on the
 * render framerate or on the previous frame (unlike the player EMA, which carries state).
 */
export const MOTION_VELOCITY_WINDOW_MS = 250;
/** Speeds below this (world units per second) are treated as standing still. */
export const MOTION_SPEED_MIN = 0.1;
/** Speed (world units per second) that maps to full lean and sway. Matches the player gait. */
export const MOTION_SPEED_FULL = 0.6;
/** Radians of lean into the direction of travel at full speed (~6.9°). Bosses are heavy. */
export const MOTION_MAX_LEAN = 0.12;
/** Radians of side-to-side roll at full speed. */
export const MOTION_MAX_SWAY = 0.035;
/** Milliseconds per full left-right sway cycle (two footfalls). */
export const MOTION_SWAY_PERIOD_MS = 900;

// ---- Death ----
/** Milliseconds from the death sample to lying at rest. */
export const DEATH_FALL_MS = 700;
/** Radians the model tips backwards when it comes to rest (~69°). */
export const DEATH_FALL_TILT = 1.2;
/** Binary-search steps used to find the death sample inside the fall window. */
const DEATH_SEARCH_STEPS = 10;

/** Scratch output. Callers keep one instance and pass it in every frame. */
export interface StaticModelMotionSample {
  /** Breathing phase in [-1, 1]. 0 while dead. */
  breath: number;
  /** Movement strength in [0, 1]. 0 while dead or standing still. */
  moveStrength: number;
  /** Unit X/Z direction of travel in world space. (0, 0) when not moving. */
  moveDirX: number;
  moveDirZ: number;
  /** Sway phase in [-1, 1]. The caller scales it by moveStrength. */
  sway: number;
  /** Death fall progress in [0, 1], eased. 0 while alive, 1 once at rest. */
  fall: number;
}

export function createStaticModelMotionSample(): StaticModelMotionSample {
  return { breath: 0, moveStrength: 0, moveDirX: 0, moveDirZ: 0, sway: 0, fall: 0 };
}

/**
 * Stable per-actor phase in [0, 1), so a pack of identical trash does not breathe or sway in
 * lockstep. Fractional golden-ratio sequence: consecutive ids land far apart on the circle.
 */
export function actorMotionPhase(actorId: number): number {
  const v = Math.abs(actorId) * 0.6180339887498949;
  return v - Math.floor(v);
}

/**
 * Time (ms) at which the actor's lookup samples first report it dead, searched inside
 * `[timeMs - DEATH_FALL_MS, timeMs]`. Returns `null` when the actor was already dead (or absent)
 * at the start of the window, meaning the fall has finished.
 */
export function findDeathOnsetMs(
  lookup: TimestampPositionLookup,
  actorId: number,
  timeMs: number,
): number | null {
  let alive = timeMs - DEATH_FALL_MS;
  const before = getActorPositionAtClosestTimestamp(lookup, actorId, alive);
  if (!before || before.isDead) return null;
  let dead = timeMs;
  for (let i = 0; i < DEATH_SEARCH_STEPS && dead - alive > 1; i++) {
    const mid = (alive + dead) / 2;
    const sample = getActorPositionAtClosestTimestamp(lookup, actorId, mid);
    if (sample && !sample.isDead) alive = mid;
    else dead = mid;
  }
  return dead;
}

/** Ease-in: a body accelerates as it topples, then stops at rest. */
function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Fill `out` with the motion terms for one actor at `timeMs` (fight-relative milliseconds, the
 * same clock as the lookup). `position` and `isDead` are the actor's sample at `timeMs`, which the
 * caller already has, so only the earlier velocity sample (and, during a fall, the onset search)
 * touch the lookup.
 */
export function sampleStaticModelMotion(
  lookup: TimestampPositionLookup,
  actorId: number,
  timeMs: number,
  position: readonly [number, number, number],
  isDead: boolean,
  out: StaticModelMotionSample,
): StaticModelMotionSample {
  const phase = actorMotionPhase(actorId);

  if (isDead) {
    out.breath = 0;
    out.moveStrength = 0;
    out.moveDirX = 0;
    out.moveDirZ = 0;
    out.sway = 0;
    const onset = findDeathOnsetMs(lookup, actorId, timeMs);
    const t = onset === null ? 1 : Math.min(1, Math.max(0, (timeMs - onset) / DEATH_FALL_MS));
    out.fall = easeInQuad(t);
    return out;
  }

  out.fall = 0;
  out.breath = Math.sin(2 * Math.PI * (timeMs / BREATH_PERIOD_MS + phase));
  out.sway = Math.sin(2 * Math.PI * (timeMs / MOTION_SWAY_PERIOD_MS + phase));

  const earlier = getActorPositionAtClosestTimestamp(
    lookup,
    actorId,
    timeMs - MOTION_VELOCITY_WINDOW_MS,
  );
  out.moveStrength = 0;
  out.moveDirX = 0;
  out.moveDirZ = 0;
  if (earlier && !earlier.isDead) {
    const dx = position[0] - earlier.position[0];
    const dz = position[2] - earlier.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = dist / (MOTION_VELOCITY_WINDOW_MS / 1000);
    if (speed >= MOTION_SPEED_MIN && dist > 0) {
      out.moveStrength = Math.min(
        1,
        (speed - MOTION_SPEED_MIN) / (MOTION_SPEED_FULL - MOTION_SPEED_MIN),
      );
      out.moveDirX = dx / dist;
      out.moveDirZ = dz / dist;
    }
  }
  return out;
}
