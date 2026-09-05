import {
  computeMinDpr,
  computeTargetMs,
  decideNextDpr,
  estimateDisplayIntervalMs,
  isFastDecline,
} from './adaptiveResolution';

describe('estimateDisplayIntervalMs', () => {
  it('returns Infinity until enough samples are collected', () => {
    expect(estimateDisplayIntervalMs([16.7, 16.7, 16.7], 10)).toBe(Infinity);
  });

  it('estimates the refresh interval from clean vsync-paced idle deltas', () => {
    const hz60 = new Array(30).fill(16.7);
    expect(estimateDisplayIntervalMs(hz60, 10)).toBeCloseTo(16.7, 5);
    const hz240 = new Array(30).fill(4.17);
    expect(estimateDisplayIntervalMs(hz240, 10)).toBeCloseTo(4.17, 5);
  });

  it('ignores a single anomalously-short fluke (low percentile, not raw min)', () => {
    // 29 clean 16.7ms samples + one 2ms fluke: a raw min would return 2ms (→ wrong 120Hz target),
    // but the 20th percentile stays at the true ~16.7ms interval.
    const samples = [2, ...new Array(29).fill(16.7)];
    expect(estimateDisplayIntervalMs(samples, 10, 0.2)).toBeCloseTo(16.7, 5);
  });
});

describe('computeTargetMs', () => {
  it('targets 120fps (8.33ms) when the display can present faster', () => {
    // 240Hz panel: fastest frame ~4.17ms -> target stays at the 120fps ideal.
    expect(computeTargetMs(4.17)).toBeCloseTo(1000 / 120, 5);
  });

  it('floors the target at the display interval on a slow panel', () => {
    // 60Hz panel: vsync-paced frames are ~16.7ms even with headroom -> do not chase 120fps.
    expect(computeTargetMs(16.7)).toBeCloseTo(16.7, 5);
  });

  it('falls back to the ideal for a non-positive/NaN display interval', () => {
    expect(computeTargetMs(0)).toBeCloseTo(1000 / 120, 5);
    expect(computeTargetMs(NaN)).toBeCloseTo(1000 / 120, 5);
  });

  it('honors a custom desired fps', () => {
    expect(computeTargetMs(4, 60)).toBeCloseTo(1000 / 60, 5);
  });
});

describe('computeMinDpr', () => {
  it('allows scaling down to ~60% of full quality', () => {
    expect(computeMinDpr(2)).toBeCloseTo(1.2, 5);
    expect(computeMinDpr(1.75)).toBeCloseTo(1.05, 5);
  });

  it('never drops below 0.75 even for a low starting DPR', () => {
    expect(computeMinDpr(1.25)).toBeCloseTo(0.75, 5);
  });

  it('holds native resolution on 1x panels (no headroom to trade)', () => {
    expect(computeMinDpr(1)).toBe(1);
    expect(computeMinDpr(0.8)).toBe(0.8);
  });
});

describe('decideNextDpr', () => {
  // High-refresh panel (240Hz): ideal 8.33ms target, display interval 4.17ms (known).
  const cfg = { minDpr: 1.0, maxDpr: 2.0, targetMs: 1000 / 120, displayIntervalMs: 1000 / 240 };

  it('returns null (no change) when frame time is in the dead zone', () => {
    // Mid-range DPR so a null result reflects the dead zone, not the floor/ceiling clamp.
    // ~125fps (8.0ms): under target but inside the dead zone between incline (0.85) and decline (1.4).
    expect(decideNextDpr(8.0, 1.5, cfg)).toBeNull();
    // ~95fps (10.5ms): over target but still inside the dead zone (a capable GPU's transient dips
    // must NOT downscale — the decline threshold sits at ~86fps, well past this).
    expect(decideNextDpr(10.5, 1.5, cfg)).toBeNull();
  });

  it('steps DOWN only when sustained avg is well over target (~<86fps)', () => {
    // ~80fps (12.5ms) > 8.33 * 1.4 = 11.66 -> decline by one step.
    const next = decideNextDpr(12.5, 2.0, cfg);
    expect(next).toBeCloseTo(1.85, 5);
  });

  it('steps UP toward full quality when there is clear headroom', () => {
    // ~160fps (6.25ms) < 8.33 * 0.85 = 7.08 -> incline by one step.
    const next = decideNextDpr(6.25, 1.5, cfg);
    expect(next).toBeCloseTo(1.65, 5);
  });

  it('never declines below minDpr', () => {
    expect(decideNextDpr(50, 1.0, cfg)).toBeNull(); // already at floor
    expect(decideNextDpr(50, 1.05, cfg)).toBe(1.0); // clamps to floor, not 0.9
  });

  it('never inclines above maxDpr (no supersampling past full quality)', () => {
    expect(decideNextDpr(1, 2.0, cfg)).toBeNull(); // already at ceiling
    expect(decideNextDpr(1, 1.95, cfg)).toBe(2.0); // clamps to ceiling
  });

  it('does not act on a non-positive average', () => {
    expect(decideNextDpr(0, 1.5, cfg)).toBeNull();
    expect(decideNextDpr(NaN, 1.5, cfg)).toBeNull();
  });

  it('with an unknown display interval, downscales only on a clearly-bad absolute frame time', () => {
    const unknown = { minDpr: 1.0, maxDpr: 2.0, targetMs: 1000 / 120 }; // no displayIntervalMs
    // A smooth low-refresh scene (60fps, 16.7ms < 20ms fallback) must NOT be blurred.
    expect(decideNextDpr(16.7, 2.0, unknown)).toBeNull();
    // Genuinely bad (40fps, 25ms > 20ms) downscales even without a learned interval (safety net).
    expect(decideNextDpr(25, 2.0, unknown)).toBeCloseTo(1.85, 5);
    // Incline still works (so a capable panel reaches/keeps full quality).
    expect(decideNextDpr(5, 1.5, unknown)).toBeCloseTo(1.65, 5);
    // RECOVERY on a recovered 60Hz panel with no idle samples: a downscaled scene now smooth at
    // ~60fps (16ms < 20*0.85=17) climbs back up instead of staying stuck blurry.
    expect(decideNextDpr(16, 1.5, unknown)).toBeCloseTo(1.65, 5);
    // Dead zone between the fallback incline (17ms) and decline (20ms) — no oscillation.
    expect(decideNextDpr(18, 1.5, unknown)).toBeNull();
  });

  describe('display-limited (60Hz) panel', () => {
    // 60Hz: ideal floored at the 16.7ms display interval, so targetMs === displayInterval.
    const hz60 = {
      minDpr: 1.0,
      maxDpr: 2.0,
      targetMs: computeTargetMs(1000 / 60),
      displayIntervalMs: 1000 / 60,
    };

    it('recovers (inclines) when frames keep pace with vsync', () => {
      // ~60fps (16.7ms) is the panel maximum: the plain 0.85 floor (14.2ms) is unreachable, but the
      // display-limited path (interval * 1.12 = 18.7ms) lets a downscaled scene step back up.
      const next = decideNextDpr(16.7, 1.5, hz60);
      expect(next).toBeCloseTo(1.65, 5);
    });

    it('does not downscale a smooth 60fps scene', () => {
      expect(decideNextDpr(16.7, 2.0, hz60)).toBeNull(); // 16.7 < 16.7*1.4=23.3 -> no decline
    });

    it('downscales only when frames clearly miss vsync', () => {
      // ~30fps (33ms) > 16.7 * 1.4 = 23.3 -> decline.
      const next = decideNextDpr(33, 2.0, hz60);
      expect(next).toBeCloseTo(1.85, 5);
    });
  });

  describe('isFastDecline', () => {
    it('fires past twice the applicable decline bar', () => {
      // Known 60Hz: bar is 16.7*2 ≈ 33.3.
      expect(isFastDecline(40, 1000 / 60, 1000 / 60)).toBe(true);
      expect(isFastDecline(30, 1000 / 60, 1000 / 60)).toBe(false);
      // Unknown refresh: bar is 20*2 = 40.
      expect(isFastDecline(50, 1000 / 120)).toBe(true);
      expect(isFastDecline(30, 1000 / 120)).toBe(false);
    });

    it('rejects non-finite input', () => {
      expect(isFastDecline(NaN, 16.7, 16.7)).toBe(false);
      expect(isFastDecline(-5, 16.7, 16.7)).toBe(false);
    });
  });
});
