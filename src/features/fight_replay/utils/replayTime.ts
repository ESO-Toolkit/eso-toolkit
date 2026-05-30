/**
 * Time helpers for the fight replay timeline.
 */

/**
 * Clamp a replay time (milliseconds from fight start) into the valid
 * [0, duration] range. Guards against malformed deep links (e.g. negative or
 * beyond-duration `?time=` values) and non-finite input.
 *
 * @param time - Requested time in ms from fight start (may be NaN/Infinity).
 * @param duration - Fight duration in ms (clamped to >= 0).
 * @returns A finite time within [0, duration].
 */
export function clampReplayTime(time: number, duration: number): number {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!Number.isFinite(time)) {
    return 0;
  }
  return Math.max(0, Math.min(time, safeDuration));
}
