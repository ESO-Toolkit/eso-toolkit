import { decideFrameCapPaint, FrameCapState, SEEK_JUMP_MS } from './frameCap';

/**
 * Fold the decision over a synthetic rAF stream at a given refresh rate.
 * Returns the timestamps of painted frames.
 */
function simulate(
  refreshHz: number,
  durationMs: number,
  capFps: number,
  opts: { jitterMs?: number; bypassAt?: number[]; gap?: { at: number; ms: number } } = {},
): number[] {
  const intervalMs = 1000 / capFps;
  const frameMs = 1000 / refreshHz;
  const painted: number[] = [];
  let state: FrameCapState = { nextDeadlineMs: null };
  let now = 0;
  // Deterministic pseudo-jitter (no Math.random — reproducible).
  let seed = 12345;
  const jitter = (): number => {
    if (!opts.jitterMs) return 0;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return ((seed / 2147483648) * 2 - 1) * opts.jitterMs;
  };

  let last = 0;
  while (now <= durationMs) {
    const delta = now - last;
    const bypass = (opts.bypassAt ?? []).some((t) => Math.abs(t - now) < frameMs / 2);
    const d = decideFrameCapPaint(now, delta, state, intervalMs, bypass);
    state = d.state;
    if (d.paint) painted.push(now);
    last = now;
    let step = frameMs + jitter();
    if (opts.gap && Math.abs(opts.gap.at - now) < frameMs / 2) step += opts.gap.ms;
    now += Math.max(1, step);
  }
  return painted;
}

describe('decideFrameCapPaint', () => {
  it.each([60, 90, 120, 144, 240])('holds ~30fps average on a %dHz stream', (hz) => {
    const painted = simulate(hz, 10_000, 30);
    // 10s at 30fps = ~300 paints (first paint anchors, so ±2 tolerance).
    expect(painted.length).toBeGreaterThanOrEqual(298);
    expect(painted.length).toBeLessThanOrEqual(302);
  });

  it('does not beat against a 144Hz refresh (mean interval ≈ 33.33ms)', () => {
    const painted = simulate(144, 10_000, 30);
    const intervals: number[] = [];
    for (let i = 1; i < painted.length; i++) intervals.push(painted[i] - painted[i - 1]);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    // The naive now-last>=interval gate lands at ~34.7ms (28.8fps) on 144Hz.
    expect(mean).toBeGreaterThan(33.0);
    expect(mean).toBeLessThan(33.7);
  });

  it('paints exactly every 2nd frame at 60Hz and every 8th at 240Hz', () => {
    for (const [hz, everyN] of [
      [60, 2],
      [240, 8],
    ] as const) {
      const painted = simulate(hz, 3_000, 30);
      const frameMs = 1000 / hz;
      const intervals = painted.slice(1).map((t, i) => Math.round((t - painted[i]) / frameMs));
      // After the anchor settles, every interval is exactly N display frames.
      expect(new Set(intervals.slice(2))).toEqual(new Set([everyN]));
    }
  });

  it('tolerates rAF jitter without dropping below the cap cadence', () => {
    const painted = simulate(120, 10_000, 30, { jitterMs: 1.5 });
    expect(painted.length).toBeGreaterThanOrEqual(296);
    expect(painted.length).toBeLessThanOrEqual(304);
    const intervals = painted.slice(1).map((t, i) => t - painted[i]);
    // Never two paints closer than half the cap interval.
    expect(Math.min(...intervals)).toBeGreaterThan(1000 / 30 / 2);
  });

  it('re-anchors after a long gap instead of burst catching up', () => {
    const painted = simulate(60, 10_000, 30, { gap: { at: 5_000, ms: 2_000 } });
    const intervals = painted.slice(1).map((t, i) => t - painted[i]);
    // Exactly one long interval (the gap), no cluster of rapid paints after it.
    const short = intervals.filter((iv) => iv < 1000 / 30 / 2);
    expect(short).toHaveLength(0);
  });

  it('bypass paints immediately and re-anchors (no double paint after)', () => {
    const intervalMs = 1000 / 30;
    let state: FrameCapState = { nextDeadlineMs: null };
    // Anchor with a first paint at t=0.
    let d = decideFrameCapPaint(0, 8.33, state, intervalMs, false);
    expect(d.paint).toBe(true);
    state = d.state;
    // t=8.33: capped out.
    d = decideFrameCapPaint(8.33, 8.33, state, intervalMs, false);
    expect(d.paint).toBe(false);
    // t=16.7 with bypass: paints despite the deadline...
    d = decideFrameCapPaint(16.7, 8.33, state, intervalMs, true);
    expect(d.paint).toBe(true);
    state = d.state;
    // ...and the next non-bypass tick shortly after does NOT paint again.
    d = decideFrameCapPaint(25, 8.33, state, intervalMs, false);
    expect(d.paint).toBe(false);
    // A full interval after the bypass, painting resumes.
    d = decideFrameCapPaint(16.7 + intervalMs, 8.33, state, intervalMs, false);
    expect(d.paint).toBe(true);
  });

  it('first-ever call paints and anchors', () => {
    const d = decideFrameCapPaint(1000, 8.33, { nextDeadlineMs: null }, 1000 / 30, false);
    expect(d.paint).toBe(true);
    expect(d.state.nextDeadlineMs).toBeCloseTo(1000 + 1000 / 30, 3);
  });

  it('SEEK_JUMP_MS clears the worst legitimate per-rAF playhead advance', () => {
    // 50ms hitch frame × 5x max playback speed = 250ms of playhead advance.
    const worstLegitimateAdvance = 50 * 5;
    expect(SEEK_JUMP_MS).toBeGreaterThan(worstLegitimateAdvance);
  });
});
