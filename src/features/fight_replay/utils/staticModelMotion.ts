import {
  type TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
  getClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';

/**
 * Whole-model overview motion for the unrigged, instanced reconstructions (bosses and trash).
 *
 * The shipped NPC models are one static mesh each (no skeleton, no clips), and every actor of an
 * asset shares one InstancedMesh, so per-actor animation mixers are off the table. What remains is
 * motion expressed through the instance matrix alone: a slow breathing scale, a lean into the
 * direction of travel with a light side-to-side sway, a completed-cast reaction, and a fall onto
 * the model's back on death.
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

// ---- Completed cast reaction ----
export const CAST_REACTION_MS = 600;
/** Small forward pitch around the feet; shared geometry remains unmodified. */
export const CAST_REACTION_TILT = 0.09;

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
  /** Completed cast reaction in [0, 1]. Suppressed while dead. */
  castPulse: number;
}

export function createStaticModelMotionSample(): StaticModelMotionSample {
  return { breath: 0, moveStrength: 0, moveDirX: 0, moveDirZ: 0, sway: 0, fall: 0, castPulse: 0 };
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
 * Exact fight-relative death time when available. Older lookups fall back to searching inside
 * `[timeMs - DEATH_FALL_MS, timeMs]`. Returns `null` when the fallback finds the actor already
 * dead (or absent) at the start of the window, meaning the fall has finished.
 */
export function findDeathOnsetMs(
  lookup: TimestampPositionLookup,
  actorId: number,
  timeMs: number,
): number | null {
  const current = getActorPositionAtClosestTimestamp(lookup, actorId, timeMs);
  if (current?.isDead && current.deathTimeMs !== undefined) return current.deathTimeMs;
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

function lastIndexAtOrBefore(times: readonly number[], timeMs: number): number {
  let left = 0;
  let right = times.length - 1;
  while (left <= right) {
    const mid = (left + right) >>> 1;
    if (times[mid] <= timeMs) left = mid + 1;
    else right = mid - 1;
  }
  return right;
}

/** Overlapping casts keep the strongest reaction, avoiding a snap back when another cast starts. */
function sampleCastPulse(times: readonly number[] | undefined, timeMs: number): number {
  if (!times?.length) return 0;
  let strongest = 0;
  for (let i = lastIndexAtOrBefore(times, timeMs); i >= 0; i--) {
    const elapsed = timeMs - times[i];
    if (elapsed >= CAST_REACTION_MS) break;
    const pulse = Math.sin((Math.PI * elapsed) / CAST_REACTION_MS);
    strongest = Math.max(strongest, pulse * pulse);
  }
  return strongest;
}

/**
 * Fill `out` with the motion terms for one actor at `timeMs` (fight-relative milliseconds, the
 * same clock as the lookup). `position` and `isDead` are the actor's sample at `timeMs`, which the
 * caller already has. Movement uses the actual span between lookup samples, while cast and death
 * reactions use event times so their phases remain stable with adaptive sampling.
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
    out.castPulse = 0;
    const onset = findDeathOnsetMs(lookup, actorId, timeMs);
    const t = onset === null ? 1 : Math.min(1, Math.max(0, (timeMs - onset) / DEATH_FALL_MS));
    out.fall = easeInQuad(t);
    return out;
  }

  out.fall = 0;
  out.castPulse = sampleCastPulse(lookup.castTimesByActorId?.[actorId], timeMs);
  out.breath = Math.sin(2 * Math.PI * (timeMs / BREATH_PERIOD_MS + phase));
  out.sway = Math.sin(2 * Math.PI * (timeMs / MOTION_SWAY_PERIOD_MS + phase));

  // Measure over distinct samples, using their actual time span. Adaptive lookups may have
  // intervals longer than the nominal window; a fixed divisor makes those models jerk.
  const currentTimestamp = getClosestTimestamp(lookup, timeMs);
  const windowMs = Math.max(MOTION_VELOCITY_WINDOW_MS, lookup.sampleInterval);
  const earlierIndex =
    currentTimestamp === null
      ? -1
      : lastIndexAtOrBefore(lookup.sortedTimestamps, currentTimestamp - windowMs);
  const earlierTimestamp = earlierIndex < 0 ? null : lookup.sortedTimestamps[earlierIndex];
  const earlier =
    earlierTimestamp === null ? null : lookup.positionsByTimestamp[earlierTimestamp]?.[actorId];
  out.moveStrength = 0;
  out.moveDirX = 0;
  out.moveDirZ = 0;
  if (
    earlier &&
    !earlier.isDead &&
    currentTimestamp !== null &&
    earlierTimestamp !== null &&
    currentTimestamp > earlierTimestamp
  ) {
    const dx = position[0] - earlier.position[0];
    const dz = position[2] - earlier.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = dist / ((currentTimestamp - earlierTimestamp) / 1000);
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
