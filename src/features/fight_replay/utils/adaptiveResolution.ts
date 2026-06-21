/**
 * Pure decision logic for the replay's adaptive resolution (dynamic render-resolution scaling).
 *
 * Playback of the full-fidelity arena (bloom + 2048² shadows + image-based lighting + cosmic
 * backdrop) is GPU-bound: on a strong GPU it runs well past 120fps, but a weak GPU / 4K display /
 * heavy fight can't sustain 120fps at full render resolution. Rather than permanently lowering
 * quality for everyone (the existing opt-in "performance mode"), this scales the render pixel ratio
 * (`gl.setPixelRatio`) up and down at runtime to hold the target framerate:
 *
 *   - Full quality whenever there's headroom — on a capable GPU the controller never leaves the
 *     starting DPR, so the experience is byte-for-byte identical (no visual degradation).
 *   - When frames are SUSTAINED below target, step the resolution down until 120fps is met; when
 *     headroom returns, step it back up toward full quality.
 *
 * The decision is kept pure (no three.js, no timers) so the hysteresis can be unit-tested. The
 * component (AdaptiveResolution.tsx) owns the per-frame measurement and applies the result.
 */

/**
 * The frame-time target in ms. We want `desiredFps` (120), but never faster than the display can
 * actually present — on a 60Hz panel the vsync-paced frame time is ~16.7ms even with massive GPU
 * headroom, and treating that as "missing 120fps" would pointlessly downscale a scene that is
 * already as smooth as the display allows. So the target is floored at the measured display
 * interval (the fastest frame observed).
 */
export function computeTargetMs(displayIntervalMs: number, desiredFps = 120): number {
  const ideal = 1000 / desiredFps;
  if (!Number.isFinite(displayIntervalMs) || displayIntervalMs <= 0) return ideal;
  return Math.max(ideal, displayIntervalMs);
}

export interface DprDecisionConfig {
  /** Lowest render pixel ratio the scaler may drop to (blurriest). */
  minDpr: number;
  /** Highest pixel ratio = full quality (the DPR the canvas started at). */
  maxDpr: number;
  /** Frame-time target in ms (see computeTargetMs). */
  targetMs: number;
  /**
   * Decline when avg frame time exceeds targetMs × this. Default 1.4 (≈ sustained <86fps at a 120
   * target) is deliberately well past target: a capable GPU that holds ~120fps with occasional
   * transient dips never trips it (so it stays pixel-identical), and those transient spikes aren't
   * pixel-fill-bound anyway — only hardware that is GENUINELY below ~86fps for a sustained window,
   * where trading resolution actually buys smoothness, downscales.
   */
  declineFactor?: number;
  /** Incline (restore quality) when avg frame time is below targetMs × this (default 0.85). */
  inclineFactor?: number;
  /**
   * Measured display refresh interval (ms), or non-finite if not yet known. Two roles:
   *  - GATES downscaling: with no known interval we can't tell a smooth display-limited panel
   *    (a healthy 60Hz at ~16.7ms) from a genuinely slow one, so we must NOT downscale blindly.
   *  - Enables a DISPLAY-LIMITED incline path: on a vsync-capped panel the ideal target can't be
   *    beaten, so the plain `inclineFactor` threshold sits below the floor and is unreachable —
   *    leaving a downscaled scene stuck. Allowing incline when frames keep pace with the refresh
   *    (≈ the display interval) lets quality recover; a genuine overshoot then re-declines.
   */
  displayIntervalMs?: number;
  /**
   * Absolute frame-time (ms) above which to downscale even when the display interval is NOT yet
   * known (default 20ms ≈ <50fps). Safety net for scenes that never produce an idle frame to learn
   * the refresh from (e.g. a paused `?actorId=` deep link the render loop paints continuously, then
   * straight into playback): without it such a weak-GPU scene would stay stuck stuttering at full
   * DPR. 50fps sits below every common refresh (60/120/144/240Hz), so >20ms means genuinely dropping
   * frames on any of them — a smooth 60Hz scene (16.7ms) is never wrongly downscaled by this path.
   */
  fallbackDeclineMs?: number;
  /** Step size per adjustment. */
  step?: number;
}

/**
 * Decide the next render pixel ratio given the recent average frame time, or null for "no change".
 * The gap between declineFactor (1.4) and the incline threshold is a deliberate dead zone so a scene
 * whose frame time hovers near target does not oscillate up/down.
 */
export function decideNextDpr(
  avgFrameMs: number,
  currentDpr: number,
  cfg: DprDecisionConfig,
): number | null {
  const decline = cfg.declineFactor ?? 1.4;
  const incline = cfg.inclineFactor ?? 0.85;
  const step = cfg.step ?? 0.15;
  if (!Number.isFinite(avgFrameMs) || avgFrameMs <= 0) return null;
  const displayKnown =
    typeof cfg.displayIntervalMs === 'number' &&
    Number.isFinite(cfg.displayIntervalMs) &&
    cfg.displayIntervalMs > 0;
  const fallbackDeclineMs = cfg.fallbackDeclineMs ?? 1000 / 50;

  // Downscale threshold: when the display interval is known, relative to the target (so a healthy
  // display-limited panel is never blurred); when it is NOT yet known, an absolute "clearly bad on
  // any refresh" floor so a never-idle weak GPU still makes progress instead of stuttering forever.
  const declineThreshold = displayKnown ? cfg.targetMs * decline : fallbackDeclineMs;
  if (avgFrameMs > declineThreshold && currentDpr > cfg.minDpr) {
    return Math.max(cfg.minDpr, Number((currentDpr - step).toFixed(3)));
  }

  // Recover quality when there's headroom: comfortably under target, OR — on a display-limited
  // panel — when frames are keeping pace with the refresh (so the unreachable `inclineFactor` floor
  // doesn't pin a vsync-capped panel at reduced resolution forever). When the display interval is
  // UNKNOWN, mirror the absolute fallback decline (incline once frames are back below a clearly-smooth
  // absolute time) so a never-idle scene that fallback-downscaled can still climb back — otherwise
  // the relative `targetMs * incline` floor (~7ms) is unreachable on a recovered 60Hz panel.
  const inclineThreshold = displayKnown
    ? Math.max(cfg.targetMs * incline, (cfg.displayIntervalMs as number) * 1.12)
    : fallbackDeclineMs * incline;
  if (avgFrameMs < inclineThreshold && currentDpr < cfg.maxDpr) {
    return Math.min(cfg.maxDpr, Number((currentDpr + step).toFixed(3)));
  }
  return null;
}

/** The blurriest DPR we allow, derived from the starting (full-quality) DPR. */
export function computeMinDpr(maxDpr: number): number {
  return Math.max(0.75, Number((maxDpr * 0.6).toFixed(3)));
}

/**
 * Robust display-refresh-interval estimate (ms) from a window of IDLE-frame deltas (vsync-paced,
 * workload-free). Returns Infinity until at least `minSamples` have been collected — so a single
 * stray delta can't set a target before we've confirmed the cadence — then a LOW PERCENTILE (default
 * 20th) rather than the raw minimum, so one anomalously-short delta (a clock hiccup / post-resize
 * blip) can't pin the target too low and wrongly downscale a smooth display-limited panel. For clean
 * vsync data (all deltas ≈ the refresh interval) the percentile equals that interval.
 */
export function estimateDisplayIntervalMs(
  idleDeltas: readonly number[],
  minSamples = 10,
  percentile = 0.2,
): number {
  if (idleDeltas.length < minSamples) return Infinity;
  const sorted = [...idleDeltas].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(percentile * sorted.length)));
  return sorted[idx];
}
