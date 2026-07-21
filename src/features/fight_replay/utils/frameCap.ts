/**
 * Pure decision logic for the replay's 30fps frame cap (the FRAME_CAP /
 * BAREBONES quality rungs). The FrameCapGate component runs this per rAF at a
 * priority before every other useFrame and publishes the verdict into a shared
 * ref; RenderLoop (skip the paint), InstancedReplayFigures3D (skip the actor
 * recompose, accumulate delta) and BatchedActorNames3D (skip the pass) honor it.
 *
 * Deadline-accumulator, NOT `now - last >= interval`: the naive comparison can
 * only paint on rAF ticks AT OR AFTER the interval boundary, systematically
 * overshooting by up to one display frame (~28.8fps on a 144Hz panel). Advancing
 * a phase-locked deadline by exactly `intervalMs` per paint keeps the AVERAGE
 * cadence at the cap on any refresh rate; the half-rAF tolerance paints on the
 * tick CLOSEST to each deadline rather than the first tick past it.
 */

export interface FrameCapState {
  /** Absolute timestamp (ms) before which the next paint must not start; null = not yet anchored. */
  nextDeadlineMs: number | null;
}

export interface FrameCapDecision {
  paint: boolean;
  state: FrameCapState;
}

/** Shared per-rAF verdict written by FrameCapGate, read by the gated consumers. */
export interface FrameCapGateValue {
  skip: boolean;
}

/**
 * Playhead jump (ms) above which a timeRef step is a SEEK, not continuous
 * playback — seeks bypass the cap so interaction paints immediately. Sized
 * above the worst legitimate per-rAF advance (a ~50ms hitch frame at the 5×
 * max playback speed ≈ 250ms); a false bypass on a pathological hitch costs
 * one extra paint, which is harmless.
 */
export const SEEK_JUMP_MS = 300;

/**
 * Decide whether this rAF may paint under the cap.
 *
 * - `bypass` (paused, seek, camera interaction) paints immediately AND
 *   re-anchors the deadline a full interval out — interaction is never queued
 *   behind a stale deadline and never double-paints right after.
 * - On a paint, the deadline advances by exactly `intervalMs` (phase-locked,
 *   zero average drift); after a gap (hidden tab, long hitch) it re-anchors to
 *   `now + intervalMs` so there is never a catch-up burst.
 * - `rafDeltaMs` sizes the tolerance: if waiting one more rAF would overshoot
 *   the deadline by more than this tick undershoots it, paint now.
 */
export function decideFrameCapPaint(
  nowMs: number,
  rafDeltaMs: number,
  state: FrameCapState,
  intervalMs: number,
  bypass: boolean,
): FrameCapDecision {
  if (bypass || state.nextDeadlineMs === null) {
    return { paint: true, state: { nextDeadlineMs: nowMs + intervalMs } };
  }
  const tolerance = Math.max(0, rafDeltaMs) * 0.5;
  if (nowMs + tolerance >= state.nextDeadlineMs) {
    let next = state.nextDeadlineMs + intervalMs;
    if (nowMs > next) next = nowMs + intervalMs; // gap clamp — no burst catch-up
    return { paint: true, state: { nextDeadlineMs: next } };
  }
  return { paint: false, state };
}
