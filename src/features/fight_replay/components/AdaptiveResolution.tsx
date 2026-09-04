import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';

import { RenderPriority } from '../constants/renderPriorities';
import {
  computeMinDpr,
  computeTargetMs,
  decideNextDpr,
  estimateDisplayIntervalMs,
  isFastDecline,
} from '../utils/adaptiveResolution';

interface AdaptiveResolutionProps {
  /** Live playhead. Only frames where this advanced are measured (a paused/idle scene renders
   *  nothing, so its fast rAF cadence must not be read as "tons of headroom" and inflate DPR). */
  timeRef: React.RefObject<number> | { current: number };
  /** The current perf-tier render-resolution cap (the Canvas `dpr` ceiling, e.g. 1.5 low / 2 else).
   *  Reactive: if the tier changes (async GPU detection / user override) this updates, and the
   *  scaler's ceiling follows so it never inclines past — or gets stuck below — the new cap. */
  dprCap: number;
  /** True when the RenderLoop painted the previous frame. Lets us learn the display interval ONLY
   *  from genuinely idle (un-painted) frames and measure workload ONLY from painted playback frames
   *  — a paused-but-painted frame (following an actor / `?actorId=` link) is neither. */
  paintedRef: React.RefObject<boolean>;
  /** Refill the render budget + flag the shadow dirty so a restored-resolution frame actually
   *  repaints crisp while paused / after a cap change / re-assert (routed to markSceneDirty). */
  markDirty: () => void;
  /**
   * Optional status output the quality governor reads to know when DPR is EXHAUSTED — i.e. it has
   * driven the pixel ratio to its floor, OR its effectiveness guard has fired (a downscale didn't
   * buy framerate, so the bottleneck isn't pixel fill and lowering DPR further won't help). The
   * governor only drops a visible effect once this is true, so resolution scaling always gets the
   * first crack at a shortfall. Pure status write — does not affect any DPR decision.
   */
  exhaustedRef?: React.RefObject<boolean>;
  /**
   * True while the 30fps frame cap is active (FRAME_CAP / BAREBONES rungs).
   * Freezes ALL measurement — workload sampling, display-interval learning,
   * and DPR decisions — because capped painted cadence (~33ms) would read as
   * "device is slow" and drive DPR to the floor, and capped-idle deltas would
   * poison the refresh-rate learner. DPR holds its current value (the 33ms
   * budget has ~4× the headroom of 120fps; the barebones preset separately
   * pins DPR via its maxDpr flag). The authority re-assert, exhaustion status,
   * and pause-restore stay live. Windows reset on engage AND lift so no stale
   * samples are ever acted on.
   */
  frameCapActive?: boolean;
}

// Rolling window of measured playback frame times before a decision is made (~0.6–0.7s at 120fps).
// Long enough that a brief burst on a capable GPU never trips a downscale — only a SUSTAINED
// shortfall does — so a strong machine stays at full quality (no visible degradation).
const SAMPLE_WINDOW = 90;
// Frames to wait after an adjustment before measuring again — lets the new resolution settle and
// prevents hunting/oscillation.
const COOLDOWN_FRAMES = 120;
// Guard against clock hitches / tab-switch gaps polluting the average.
const MAX_PLAUSIBLE_FRAME_MS = 250;
// Consecutive non-advancing frames after which a downscaled scene is treated as PAUSED and restored
// to full quality. A static scene has no framerate pressure, so paused inspection should never be
// blurry; ~12 frames is a fraction of a second at any refresh, short enough to feel instant but long
// enough not to fire on a momentary playback stall.
const PAUSE_RESTORE_FRAMES = 12;
// Bounded window of idle-frame deltas used to estimate the display refresh interval. Bounded (not
// all-time) so the estimate can rise again when the panel changes; estimateDisplayIntervalMs takes a
// robust low percentile of it (ignoring single flukes) and requires a minimum sample count first.
const IDLE_WINDOW = 60;
// Float compare tolerance for detecting an external DPR drift.
const DPR_EPSILON = 0.001;
// Bootstrap only accepts deltas this fast or faster (~105Hz+) as a refresh sample. A delta at/below
// the 120fps cadence proves the display can present faster than our target, so adapting toward 120 is
// meaningful. SLOWER deltas at mount are ambiguous — a genuine 60Hz panel OR a load-contaminated
// high-refresh one — so they are NOT seeded (which would risk locking in a wrong/slow refresh that
// never adapts); those cases fall through to idle-frame learning or the absolute fallback instead.
const BOOTSTRAP_MAX_REFRESH_MS = 1000 / 120 + 1.2; // ≈ 9.5ms

/**
 * Dynamic render-resolution controller. Measures the real playback frame time and scales the R3F
 * pixel ratio between a floor and the full-quality (perf-tier) cap, to hold ~120fps. Renders nothing.
 *
 * On a GPU with headroom the average frame time stays in the dead zone and the DPR never moves, so
 * the output is identical to having no controller at all. It only engages when a weaker GPU / 4K /
 * heavy fight would otherwise drop below ~120fps, trading a little sharpness to keep playback smooth,
 * and restores full resolution while paused and once the load eases.
 *
 * `dprRef` is AUTHORITATIVE: the controller owns the pixel ratio and re-asserts it if anything
 * external moves it (e.g. the Canvas `dpr` prop re-applying on a re-render), so a downscale is never
 * silently undone mid-playback. See utils/adaptiveResolution for the pure decision logic.
 */
export const AdaptiveResolution: React.FC<AdaptiveResolutionProps> = ({
  timeRef,
  dprCap,
  paintedRef,
  markDirty,
  exhaustedRef,
  frameCapActive = false,
}) => {
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  const viewportDpr = useThree((s) => s.viewport.dpr);

  // Full-quality ceiling = the live tier cap clamped to the device's pixel ratio (matching how R3F
  // clamps the Canvas `dpr={[1, cap]}`). Reactive to dprCap so a perf-tier change moves the ceiling;
  // the scaler never SUPERSAMPLES above this. The floor is derived from the ceiling.
  const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const maxDpr = Math.min(Math.max(1, deviceDpr), dprCap);
  const minDpr = computeMinDpr(maxDpr);

  // ---- Authoritative controller state (no React re-render per frame) ------------------------------
  // The pixel ratio the controller WANTS. Initialised to the canvas's starting DPR and changed only
  // by the controller (decline / incline / pause-restore / resume / cap clamp). It is NEVER blindly
  // synced to viewport.dpr — an external change is re-asserted away in the frame loop.
  const dprRef = useRef(viewportDpr);
  // Avg frame time at the most recent DOWNSCALE (null when not in a decline sequence). Stops further
  // declining when lowering resolution isn't actually buying framerate (CPU-bound) so we never blur
  // the scene to the floor for no gain. Cleared on any incline / cap change / pause-restore / resume.
  const lastDeclineAvgRef = useRef<number | null>(null);
  // True once the effectiveness guard has fired (a downscale didn't buy framerate → not pixel-fill
  // bound). Combined with "at floor" to publish `exhaustedRef`. Cleared whenever headroom returns
  // (an incline) or the controller resets (cap change / pause-restore / resume).
  const guardActiveRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const cooldownRef = useRef(0);
  // Consecutive frames the playhead has not advanced — detects a settled PAUSE.
  const framesSinceAdvanceRef = useRef(0);
  // The downscaled resolution to snap back to on RESUME after a pause-restore (null when none) — so a
  // weak GPU doesn't run at full DPR (and stutter) for a cooldown's worth of frames after every pause.
  const playbackDprRef = useRef<number | null>(null);
  // Bounded window of idle-frame deltas (see IDLE_WINDOW) for the display-interval estimate.
  const idleSamplesRef = useRef<number[]>([]);
  // The cap seen on the previous effect run — to tell a cap RAISE (tier got better) from a drop.
  const prevMaxDprRef = useRef(maxDpr);

  // React to a cap change (perf-tier change / user override). A RAISE (tier improved) restores full
  // quality and re-evaluates fresh — otherwise an old-cap value (e.g. 1.5) would linger as a phantom
  // "downscale" and even get snap-backed on resume. A DROP clamps the intended DPR down into range.
  // Any cap change resets the decline guard, sample window, and pending resume target, since they all
  // described the previous tier. Repaint at the new size.
  useEffect(() => {
    const raised = maxDpr > prevMaxDprRef.current + DPR_EPSILON;
    prevMaxDprRef.current = maxDpr;
    const target = raised ? maxDpr : Math.min(Math.max(dprRef.current, minDpr), maxDpr);
    if (Math.abs(target - dprRef.current) > DPR_EPSILON) {
      dprRef.current = target;
      setDpr(target);
      markDirty();
    }
    lastDeclineAvgRef.current = null;
    guardActiveRef.current = false;
    samplesRef.current.length = 0;
    cooldownRef.current = 0; // re-evaluate immediately at the new tier (no stale cooldown stutter)
    playbackDprRef.current = null;
  }, [maxDpr, minDpr, setDpr, markDirty]);

  // Frame-cap engage/lift: the measurement windows described a different regime — start fresh and
  // act on nothing stale (mirrors the cap-change reset above). idleSamplesRef is deliberately KEPT:
  // capped frames were never fed into it (the freeze below runs before the idle branch), the panel
  // didn't change, and the resize/visibility resets still cover real display changes.
  useEffect(() => {
    samplesRef.current.length = 0;
    cooldownRef.current = 0;
    lastDeclineAvgRef.current = null;
    guardActiveRef.current = false;
  }, [frameCapActive]);

  // Re-learn the display interval after events that can change the refresh rate or produce bogus
  // first deltas: a resize (incl. fullscreen / moving to another monitor / a devicePixelRatio
  // change) or a tab visibility flip. Clearing lets the rolling window repopulate from scratch.
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

  // Bootstrap the refresh estimate at mount with a short standalone rAF burst. The frame loop only
  // learns the interval from un-painted frames, but some sessions never produce one (a paused
  // `?actorId=` deep link the render loop paints continuously, then straight into playback) — without
  // a seed they'd fall back to the lenient absolute 20ms threshold and never adapt a 120/144Hz miss.
  // We only seed deltas at/below the 120fps cadence (BOOTSTRAP_MAX_REFRESH_MS): such a delta PROVES a
  // >=~120Hz display (so adapting toward 120 is meaningful), whereas a slower mount delta is ambiguous
  // (true 60Hz vs load-contaminated high-refresh) and is deliberately NOT seeded — better to leave the
  // interval unknown (idle-learning / absolute fallback handle it) than lock in a wrong slow refresh
  // that never adapts. A display change resets it (above); real idle frames refine it.
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
    // Re-assert authority: if the live renderer pixel ratio drifted from our intent (the Canvas dpr
    // prop re-applied on a re-render, etc.), set it back. Keeps a runtime downscale from being
    // silently undone mid-playback without any state to reconcile. (Cap/tier changes update dprRef
    // via the effect above first, so this enforces the already-correct intent.)
    if (Math.abs(gl.getPixelRatio() - dprRef.current) > DPR_EPSILON) {
      setDpr(dprRef.current);
      markDirty();
    }

    // Publish DPR exhaustion for the quality governor: at the floor, or the effectiveness guard has
    // fired (lowering DPR isn't buying framerate). Cheap status write; never gates a DPR decision.
    if (exhaustedRef) {
      exhaustedRef.current = dprRef.current <= minDpr + DPR_EPSILON || guardActiveRef.current;
    }

    const ms = delta * 1000;
    const t = timeRef.current;
    const advanced = t !== lastTimeRef.current;
    lastTimeRef.current = t;

    if (advanced) {
      framesSinceAdvanceRef.current = 0;
      // Resume from a pause-restore: snap straight back to the proven playback resolution so a weak
      // GPU doesn't run at full DPR (and stutter) through a cooldown before re-downscaling.
      if (playbackDprRef.current != null) {
        const resume = Math.min(Math.max(playbackDprRef.current, minDpr), maxDpr);
        playbackDprRef.current = null;
        if (resume < dprRef.current - DPR_EPSILON) {
          dprRef.current = resume;
          setDpr(resume);
          markDirty();
        }
        samplesRef.current.length = 0;
        cooldownRef.current = 0;
        lastDeclineAvgRef.current = null;
        guardActiveRef.current = false;
      }
    } else {
      framesSinceAdvanceRef.current += 1;
      // Settled pause: a static scene has no framerate pressure, so restore full quality (and repaint
      // crisp) rather than leaving inspection blurred from a prior playback downscale. Remember the
      // downscaled DPR to snap back to on resume.
      if (
        framesSinceAdvanceRef.current >= PAUSE_RESTORE_FRAMES &&
        dprRef.current < maxDpr - DPR_EPSILON
      ) {
        playbackDprRef.current = dprRef.current;
        dprRef.current = maxDpr;
        setDpr(maxDpr);
        lastDeclineAvgRef.current = null;
        guardActiveRef.current = false;
        samplesRef.current.length = 0;
        markDirty();
      }
    }

    // Frame cap active: freeze all measurement (workload AND idle-interval learning) — capped
    // cadence must never be read as slowness or learned as the panel refresh. Everything above
    // (authority re-assert, exhaustion status, pause-restore/resume) stays live.
    if (frameCapActive) return;

    if (!paintedRef.current) {
      // Render loop skipped this frame → genuinely idle → vsync-paced → a clean display-interval
      // sample (bounded rolling window so the estimate can rise again, not just fall).
      if (ms > 0 && ms < MAX_PLAUSIBLE_FRAME_MS) {
        const idle = idleSamplesRef.current;
        idle.push(ms);
        if (idle.length > IDLE_WINDOW) idle.shift();
      }
      return;
    }
    // Painted but the playhead didn't advance (paused while following/selected) → render-bound and
    // not representative of playback; ignore for both display-interval and workload measurement.
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

    // Robust display interval (Infinity until enough idle samples; low percentile, not raw min).
    const displayInterval = estimateDisplayIntervalMs(idleSamplesRef.current);
    // Target 120fps, floored at the display's own refresh interval (a 60Hz panel is vsync-capped at
    // ~16.7ms — chasing 120 there would downscale for nothing).
    const targetMs = computeTargetMs(displayInterval);
    const cfg = {
      minDpr,
      maxDpr,
      targetMs,
      displayIntervalMs: displayInterval,
    };
    let next = decideNextDpr(avg, dprRef.current, cfg);
    // Fast lane: a severe shortfall (>2× the decline bar) takes a second step now instead of
    // waiting out another ~90+120 frames. Same decision function, same floor clamp.
    if (next != null && next < dprRef.current && isFastDecline(avg, targetMs, displayInterval)) {
      const again = decideNextDpr(avg, next, cfg);
      if (again != null && again < next) {
        next = again;
      }
    }
    if (next == null || Math.abs(next - dprRef.current) <= DPR_EPSILON) return;

    const isDecline = next < dprRef.current;
    if (isDecline && lastDeclineAvgRef.current != null && avg > lastDeclineAvgRef.current * 0.94) {
      // The previous downscale didn't cut frame time by even ~6%, so pixel fill isn't the
      // bottleneck (CPU-bound). Hold the current resolution — blurring further wouldn't recover
      // framerate — and back off measuring for a while. An incline (headroom returning) resets this.
      // DPR is now effectively exhausted (lowering it won't help) — tell the governor it may act.
      guardActiveRef.current = true;
      cooldownRef.current = COOLDOWN_FRAMES * 3;
      samples.length = 0;
      return;
    }

    dprRef.current = next;
    setDpr(next);
    lastDeclineAvgRef.current = isDecline ? avg : null;
    // Reaching here means we made an effective change (an incline = headroom, or a decline that the
    // guard didn't block), so resolution scaling is NOT exhausted.
    guardActiveRef.current = false;
    samples.length = 0;
    cooldownRef.current = COOLDOWN_FRAMES;
  }, RenderPriority.EFFECTS);

  return null;
};
