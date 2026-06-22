/**
 * Pure decision logic for the replay's adaptive QUALITY GOVERNOR — the tier below the dynamic
 * resolution controller (see utils/adaptiveResolution.ts).
 *
 * AdaptiveResolution scales the render pixel ratio (DPR) to hold the target framerate. That is the
 * right first lever (it trades a little sharpness for fill cost), but it has a floor and it only
 * helps when the bottleneck is pixel fill. On a genuinely weak / thermally-throttled GPU the cost is
 * pass-count and per-frame work — the 2048² shadow map (regenerated every frame because the actors
 * move), the bloom post chain, image-based lighting, the cosmic backdrop — which DPR cannot fix once
 * it is at floor. This governor escalates BEYOND DPR through an ordered quality ladder, dropping the
 * most expensive-per-pixel-of-quality effects first and finally capping to a stable framerate, then
 * recovers in reverse as headroom returns. It is the automatic, incremental form of the manual
 * "performance mode" toggle.
 *
 * The component (QualityGovernor.tsx) owns the per-frame measurement and applies the level; this
 * module is the pure hysteresis so it can be unit-tested. Kept deliberately conservative: it only
 * engages on a SUSTAINED shortfall (so a capable GPU never drops an effect), and only after DPR is
 * exhausted (so mild shortfalls are absorbed by resolution, not by visibly dropping shadows).
 */

/** The ladder. Higher level = more aggressively degraded. 0 = full quality. */
export const QUALITY_LEVEL = {
  FULL: 0,
  /** Drop bloom / post-processing (a full-screen overdraw pass; biggest GPU cut, low readability loss). */
  NO_BLOOM: 1,
  /** + drop image-based lighting + the cosmic backdrop (env maps + fill-heavy sky/star layers). */
  NO_ENV: 2,
  /** + drop the directional shadow pass (a second full scene render every frame the actors move). */
  NO_SHADOWS: 3,
  /** + cap the render to a stable lower framerate (last resort: cuts every per-frame cost + judder). */
  FRAME_CAP: 4,
} as const;

export const MAX_QUALITY_LEVEL = QUALITY_LEVEL.FRAME_CAP;

/** The stable framerate the top rung caps to (a steady 30fps reads better than a fluctuating 35–50). */
export const FRAME_CAP_FPS = 30;

export interface QualityFlags {
  /** Bloom / post-processing on. */
  bloom: boolean;
  /** Image-based lighting (drei <Environment>) on. */
  environment: boolean;
  /** Cosmic backdrop (sky dome / stars / moons) on. */
  cosmic: boolean;
  /** Directional shadow casting on. */
  shadows: boolean;
  /** Target render FPS cap, or null for uncapped (render every frame). */
  frameCapFps: number | null;
}

/** Map a quality level to the concrete effect flags the scene consumes. */
export function qualityFlagsForLevel(level: number): QualityFlags {
  const l = Math.max(0, Math.min(MAX_QUALITY_LEVEL, Math.round(level)));
  return {
    bloom: l < QUALITY_LEVEL.NO_BLOOM,
    environment: l < QUALITY_LEVEL.NO_ENV,
    cosmic: l < QUALITY_LEVEL.NO_ENV,
    shadows: l < QUALITY_LEVEL.NO_SHADOWS,
    frameCapFps: l >= QUALITY_LEVEL.FRAME_CAP ? FRAME_CAP_FPS : null,
  };
}

export interface QualityDecisionConfig {
  /** Highest level the governor may climb to (default MAX_QUALITY_LEVEL). */
  maxLevel?: number;
  /** Frame-time target in ms (shared with the DPR controller — see computeTargetMs). */
  targetMs: number;
  /**
   * Escalate (drop a tier) when avg frame time exceeds targetMs × this. Default 1.4 — the same
   * "genuinely below target for a sustained window" bar the DPR controller uses, so a capable GPU
   * with transient dips never drops an effect.
   */
  declineFactor?: number;
  /**
   * Recover (restore a tier) when avg frame time is below targetMs × this. Default 1.1 — recover once
   * the device is KEEPING PACE with the target framerate (within ~10%) at the current quality. It is
   * deliberately ≥1.0: a vsync-capped display floors the frame time AT the refresh interval (≈ the
   * target), so a scene with plenty of headroom still measures avg ≈ targetMs — a threshold below
   * 1.0× would be unreachable and the governor would stay stuck-degraded forever. The gap up to
   * declineFactor (1.4) is the anti-oscillation dead zone.
   */
  inclineFactor?: number;
  /**
   * Measured display refresh interval (ms), or non-finite if unknown. Gates escalation exactly like
   * the DPR controller: with no known refresh we can't tell a smooth display-limited panel from a
   * slow one, so we must not drop effects blind (the absolute fallback below covers the never-idle
   * case).
   */
  displayIntervalMs?: number;
  /** Absolute frame-time (ms) above which to escalate even when the refresh is unknown (default 20 ≈ <50fps). */
  fallbackDeclineMs?: number;
  /**
   * Whether the DPR controller has exhausted its range (at floor) or proven ineffective. The
   * governor only ESCALATES when this is true — DPR gets first crack at a mild shortfall, so we
   * never drop a visible effect for something a little extra resolution scaling would have fixed.
   * Recovery is NOT gated on it (restore effects whenever there's headroom).
   */
  dprExhausted?: boolean;
}

/**
 * Decide the next quality level given the recent average frame time, or null for "no change".
 *
 * Escalate one tier when frames are SUSTAINED slow AND DPR is exhausted; recover one tier when there
 * is clear headroom. The gap between the escalate and recover thresholds is a deliberate dead zone
 * so the level does not oscillate.
 */
export function decideNextQualityLevel(
  avgFrameMs: number,
  currentLevel: number,
  cfg: QualityDecisionConfig,
): number | null {
  if (!Number.isFinite(avgFrameMs) || avgFrameMs <= 0) return null;
  const maxLevel = cfg.maxLevel ?? MAX_QUALITY_LEVEL;
  const decline = cfg.declineFactor ?? 1.4;
  const incline = cfg.inclineFactor ?? 1.1;
  const fallbackDeclineMs = cfg.fallbackDeclineMs ?? 1000 / 50;
  const displayKnown =
    typeof cfg.displayIntervalMs === 'number' &&
    Number.isFinite(cfg.displayIntervalMs) &&
    cfg.displayIntervalMs > 0;

  // Escalate: sustained slow, DPR already exhausted, and room to climb.
  const declineThreshold = displayKnown ? cfg.targetMs * decline : fallbackDeclineMs;
  if (cfg.dprExhausted && avgFrameMs > declineThreshold && currentLevel < maxLevel) {
    return currentLevel + 1;
  }

  // Recover: meeting the target framerate at the current quality, and something to restore. Not gated
  // on DPR (we always prefer to give quality back when we can; if it was premature the escalate path
  // re-drops it). The fallback path (refresh unknown) recovers at 0.85× the 20ms decline (≈17ms) so a
  // vsync-limited 60Hz device — which floors at ~16.7ms and can't reach a tighter threshold — still
  // climbs back out of a degraded state; mirrors AdaptiveResolution's fallback incline.
  const inclineThreshold = displayKnown ? cfg.targetMs * incline : fallbackDeclineMs * 0.85;
  if (avgFrameMs < inclineThreshold && currentLevel > 0) {
    return currentLevel - 1;
  }

  return null;
}
