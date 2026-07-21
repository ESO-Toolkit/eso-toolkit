import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';

import { RenderPriority } from '../constants/renderPriorities';
import { computeTargetMs, estimateDisplayIntervalMs } from '../utils/adaptiveResolution';
import { decideNextQualityLevel, QUALITY_LEVEL } from '../utils/qualityGovernor';

// The auto-governor escalates only as far as dropping shadows. FRAME_CAP and BAREBONES are now
// fully wired (FrameCapGate + RenderLoop + the barebones flags) but remain MANUAL-ONLY, reached via
// the quality preset: a 30fps cap changes MOTION, not just fidelity — never something to spring on
// a user over a transient stutter — and with measurement frozen under the cap the governor would
// have no signal to ever recover out of it (a one-way door). Recovery under 'auto' therefore always
// has headroom to climb back to full.
const AUTO_MAX_LEVEL = QUALITY_LEVEL.NO_SHADOWS;

interface QualityGovernorProps {
  /** Live playhead — only frames where this advanced are measured as real playback workload. */
  timeRef: React.RefObject<number> | { current: number };
  /**
   * AdaptiveResolution's exhaustion status (written by it): true once DPR is at its floor OR its
   * effectiveness guard has fired. The governor only escalates effects when this is true, so
   * resolution scaling always gets the first crack at a shortfall (no premature effect loss after a
   * single DPR step).
   */
  dprExhaustedRef: React.RefObject<boolean>;
  /** True when RenderLoop painted the previous frame (idle vs rendered classification). */
  paintedRef: React.RefObject<boolean>;
  /** The governor's current quality level (owned by FightReplay3D so the scene + chip stay in sync). */
  level: number;
  /** Request a new quality level (escalate/recover one tier). */
  onLevelChange: (level: number) => void;
  /** When true the user forced full quality (chip) — the governor stands down entirely. */
  disabled?: boolean;
}

// Mirror AdaptiveResolution's measurement constants; the ladder is a coarser, slower tier BELOW it,
// so use a slightly longer window + cooldown — dropping a whole effect is far more visible than a
// resolution nudge, so we only do it on a clearly sustained shortfall and let each change settle.
const SAMPLE_WINDOW = 110;
const COOLDOWN_FRAMES = 180;
const MAX_PLAUSIBLE_FRAME_MS = 250;
const IDLE_WINDOW = 60;
// Consecutive non-advancing frames after which a degraded scene is treated as PAUSED and restored to
// full effects (mirrors AdaptiveResolution's pause-restore). A static scene has no frame pressure, so
// paused / end-of-fight inspection + screenshots should be full quality; the playback level is
// remembered and snapped back on resume so a weak device doesn't re-escalate from scratch.
const PAUSE_RESTORE_FRAMES = 12;
// Bootstrap only accepts mount-time deltas this fast or faster (~105Hz+) as a refresh sample — same
// rationale as AdaptiveResolution: such a delta proves a >=~120Hz display, so targeting 120 is
// meaningful, whereas a slower mount delta is ambiguous (true 60Hz vs load-contaminated).
const BOOTSTRAP_MAX_REFRESH_MS = 1000 / 120 + 1.2; // ≈ 9.5ms

/**
 * Adaptive quality governor — the tier below AdaptiveResolution. Measures the real playback frame
 * time and, when a weak / throttled GPU stays below target AFTER resolution scaling is exhausted,
 * steps an effect ladder down (bloom → IBL/cosmic → shadows → frame cap) and back up as headroom
 * returns. Renders nothing; owns no React state (the level lives in FightReplay3D so the scene reads
 * it). See utils/qualityGovernor for the pure hysteresis. Inert on capable hardware — if DPR never
 * hits its floor (there was headroom), the escalate path never fires and quality stays full.
 */
export const QualityGovernor: React.FC<QualityGovernorProps> = ({
  timeRef,
  dprExhaustedRef,
  paintedRef,
  level,
  onLevelChange,
  disabled = false,
}) => {
  const samplesRef = useRef<number[]>([]);
  // No initial cooldown — the SAMPLE_WINDOW itself enforces "sustained", so the first decision lands
  // after one window (~5–8s on a struggling device). The cooldown only spaces out SUBSEQUENT steps.
  const cooldownRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const idleSamplesRef = useRef<number[]>([]);
  // Consecutive frames the playhead has not advanced (settled-pause detector).
  const framesSinceAdvanceRef = useRef(0);
  // The degraded level to snap back to on RESUME after a pause restored full effects (null = none).
  const playbackLevelRef = useRef<number | null>(null);
  // Read the latest requested level synchronously in the frame loop without it being a hook dep.
  const levelRef = useRef(level);
  levelRef.current = level;

  // Re-learn the display interval after a resize / visibility flip (same rationale as AdaptiveResolution).
  useEffect(() => {
    const reset = (): void => {
      idleSamplesRef.current.length = 0;
    };
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);

  // Bootstrap the refresh estimate with a short mount rAF burst (mirrors AdaptiveResolution). The
  // frame loop only learns the interval from UN-painted frames, but a session that goes straight into
  // uninterrupted playback (forced-autoplay / continuous deep link) never produces one — paintedRef
  // is true every frame while playing — so without a seed the governor would fall back to the lenient
  // absolute 20ms (<50fps) bar and never engage on the 120/144Hz weak-GPU band (12–19ms) it targets.
  // Only seed deltas at/below the 120fps cadence (a slower mount delta is ambiguous, see constant).
  useEffect(() => {
    let raf = 0;
    let count = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const d = now - last;
      last = now;
      if (d >= 3 && d <= BOOTSTRAP_MAX_REFRESH_MS) {
        const idle = idleSamplesRef.current;
        idle.push(d);
        if (idle.length > IDLE_WINDOW) idle.shift();
      }
      count += 1;
      if (count < 40) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useFrame((_state, delta) => {
    if (disabled) {
      // Stand down AND drop any pending pause-restore: when the user enters manual performance mode
      // or forces full quality, the parent resets autoQualityLevel — a level we had latched in
      // playbackLevelRef must not be reapplied on the next advancing frame and contradict that reset.
      playbackLevelRef.current = null;
      framesSinceAdvanceRef.current = 0;
      samplesRef.current.length = 0;
      return;
    }

    const ms = delta * 1000;
    const t = timeRef.current;
    const advanced = t !== lastTimeRef.current;
    lastTimeRef.current = t;

    // Pause-restore (mirrors AdaptiveResolution). A settled pause / end-of-fight has no frame
    // pressure, so restore full effects for inspection + screenshots; remember the degraded playback
    // level and snap straight back to it on resume so a weak device doesn't re-escalate from scratch.
    if (advanced) {
      framesSinceAdvanceRef.current = 0;
      if (playbackLevelRef.current != null) {
        const resume = playbackLevelRef.current;
        playbackLevelRef.current = null;
        if (resume !== levelRef.current) {
          onLevelChange(resume);
          levelRef.current = resume;
        }
        samplesRef.current.length = 0;
        cooldownRef.current = COOLDOWN_FRAMES;
      }
    } else {
      framesSinceAdvanceRef.current += 1;
      if (
        framesSinceAdvanceRef.current >= PAUSE_RESTORE_FRAMES &&
        levelRef.current > 0 &&
        playbackLevelRef.current == null
      ) {
        playbackLevelRef.current = levelRef.current;
        onLevelChange(0);
        levelRef.current = 0;
        samplesRef.current.length = 0;
      }
    }

    if (!paintedRef.current) {
      // Idle (un-painted, vsync-paced) frame → a clean display-interval sample.
      if (ms > 0 && ms < MAX_PLAUSIBLE_FRAME_MS) {
        const idle = idleSamplesRef.current;
        idle.push(ms);
        if (idle.length > IDLE_WINDOW) idle.shift();
      }
      return;
    }
    // Painted but the playhead didn't advance (paused while following/selected) → not playback workload.
    if (!advanced) return;
    if (ms <= 0 || ms > MAX_PLAUSIBLE_FRAME_MS) return;

    const samples = samplesRef.current;
    samples.push(ms);
    if (samples.length > SAMPLE_WINDOW) samples.shift();

    if (cooldownRef.current > 0) {
      cooldownRef.current -= 1;
      return;
    }
    if (samples.length < SAMPLE_WINDOW) return;

    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i];
    const avg = sum / samples.length;

    const displayInterval = estimateDisplayIntervalMs(idleSamplesRef.current);
    const targetMs = computeTargetMs(displayInterval);
    // Escalate effects only once AdaptiveResolution reports DPR EXHAUSTED — at its floor, or its
    // effectiveness guard has fired (lowering DPR stopped buying framerate because the bottleneck
    // isn't pixel fill). This guarantees resolution scaling fully runs its course before we drop a
    // visible effect. On a capable machine DPR never exhausts → this stays false → governor inert.
    const dprExhausted = dprExhaustedRef.current === true;

    const next = decideNextQualityLevel(avg, levelRef.current, {
      maxLevel: AUTO_MAX_LEVEL,
      targetMs,
      displayIntervalMs: displayInterval,
      dprExhausted,
    });
    if (next == null || next === levelRef.current) return;

    onLevelChange(next);
    levelRef.current = next; // optimistic — avoids re-firing the same step before the prop round-trips
    samples.length = 0;
    cooldownRef.current = COOLDOWN_FRAMES;
  }, RenderPriority.EFFECTS);

  return null;
};
