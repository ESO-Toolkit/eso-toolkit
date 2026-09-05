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

/**
 * Format milliseconds as m:ss (the replay's one clock format). Non-finite and negative inputs
 * render as 0:00 — clocks never show "-1:-30" or "NaN:NaN". Single definition for the ~10
 * call sites that each hand-rolled this (they drifted on the negative case).
 */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
