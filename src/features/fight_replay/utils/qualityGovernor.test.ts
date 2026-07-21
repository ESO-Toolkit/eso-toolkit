import {
  decideNextQualityLevel,
  qualityFlagsForLevel,
  manualLevelForPreset,
  QUALITY_LEVEL,
  MAX_QUALITY_LEVEL,
  FRAME_CAP_FPS,
  BAREBONES_NAME_TAG_BUDGET,
  BAREBONES_MAX_DPR,
} from './qualityGovernor';

const TARGET = 1000 / 120; // ~8.33ms, matches the 120fps target
const REFRESH_120 = 1000 / 120;

describe('qualityFlagsForLevel', () => {
  it('full quality at level 0', () => {
    expect(qualityFlagsForLevel(QUALITY_LEVEL.FULL)).toEqual({
      bloom: true,
      environment: true,
      cosmic: true,
      shadows: true,
      frameCapFps: null,
      richMaterials: true,
      detailedFigures: true,
      figureAccents: true,
      floorEnhancements: true,
      nameTagBudget: null,
      maxDpr: null,
    });
  });

  it('levels 0-4 keep every barebones-only flag at full value (regression lock)', () => {
    for (const l of [
      QUALITY_LEVEL.FULL,
      QUALITY_LEVEL.NO_BLOOM,
      QUALITY_LEVEL.NO_ENV,
      QUALITY_LEVEL.NO_SHADOWS,
      QUALITY_LEVEL.FRAME_CAP,
    ]) {
      const f = qualityFlagsForLevel(l);
      expect(f.richMaterials).toBe(true);
      expect(f.detailedFigures).toBe(true);
      expect(f.figureAccents).toBe(true);
      expect(f.floorEnhancements).toBe(true);
      expect(f.nameTagBudget).toBeNull();
      expect(f.maxDpr).toBeNull();
    }
  });

  it('barebones drops everything and inherits the frame cap', () => {
    expect(qualityFlagsForLevel(QUALITY_LEVEL.BAREBONES)).toEqual({
      bloom: false,
      environment: false,
      cosmic: false,
      shadows: false,
      frameCapFps: FRAME_CAP_FPS,
      richMaterials: false,
      detailedFigures: false,
      figureAccents: false,
      floorEnhancements: false,
      nameTagBudget: BAREBONES_NAME_TAG_BUDGET,
      maxDpr: BAREBONES_MAX_DPR,
    });
  });

  it('the ladder is monotonic — each rung only ever turns things OFF', () => {
    const asBits = (l: number): number[] => {
      const f = qualityFlagsForLevel(l);
      return [
        f.bloom,
        f.environment,
        f.cosmic,
        f.shadows,
        f.frameCapFps === null,
        f.richMaterials,
        f.detailedFigures,
        f.figureAccents,
        f.floorEnhancements,
        f.nameTagBudget === null,
        f.maxDpr === null,
      ].map((b) => (b ? 1 : 0));
    };
    for (let l = 1; l <= MAX_QUALITY_LEVEL; l++) {
      const prev = asBits(l - 1);
      const cur = asBits(l);
      for (let i = 0; i < prev.length; i++) {
        expect(cur[i]).toBeLessThanOrEqual(prev[i]);
      }
    }
  });

  it('drops effects in ladder order', () => {
    expect(qualityFlagsForLevel(QUALITY_LEVEL.NO_BLOOM).bloom).toBe(false);
    expect(qualityFlagsForLevel(QUALITY_LEVEL.NO_BLOOM).shadows).toBe(true);

    const noEnv = qualityFlagsForLevel(QUALITY_LEVEL.NO_ENV);
    expect(noEnv.environment).toBe(false);
    expect(noEnv.cosmic).toBe(false);
    expect(noEnv.shadows).toBe(true);

    expect(qualityFlagsForLevel(QUALITY_LEVEL.NO_SHADOWS).shadows).toBe(false);
    expect(qualityFlagsForLevel(QUALITY_LEVEL.NO_SHADOWS).frameCapFps).toBeNull();

    expect(qualityFlagsForLevel(QUALITY_LEVEL.FRAME_CAP).frameCapFps).toBe(FRAME_CAP_FPS);
  });

  it('clamps out-of-range levels', () => {
    expect(qualityFlagsForLevel(-3)).toEqual(qualityFlagsForLevel(0));
    expect(qualityFlagsForLevel(99)).toEqual(qualityFlagsForLevel(QUALITY_LEVEL.BAREBONES));
  });
});

describe('manualLevelForPreset', () => {
  it('maps each preset to its pinned level', () => {
    expect(manualLevelForPreset('auto')).toBe(QUALITY_LEVEL.FULL);
    expect(manualLevelForPreset('high')).toBe(QUALITY_LEVEL.FULL);
    expect(manualLevelForPreset('performance')).toBe(QUALITY_LEVEL.NO_SHADOWS);
    expect(manualLevelForPreset('barebones')).toBe(QUALITY_LEVEL.BAREBONES);
  });
});

describe('decideNextQualityLevel', () => {
  const cfg = { targetMs: TARGET, displayIntervalMs: REFRESH_120, dprExhausted: true };

  it('does NOT escalate while DPR still has range (mild shortfall absorbed by resolution)', () => {
    // Sustained slow but DPR not exhausted → governor holds, lets DPR scale first.
    expect(decideNextQualityLevel(40, 0, { ...cfg, dprExhausted: false })).toBeNull();
  });

  it('escalates one tier when sustained-slow AND DPR is exhausted', () => {
    // avg 40ms ≫ target*1.4 (~11.7ms) → drop a tier.
    expect(decideNextQualityLevel(40, 0, cfg)).toBe(1);
    expect(decideNextQualityLevel(40, 1, cfg)).toBe(2);
    expect(decideNextQualityLevel(40, 2, cfg)).toBe(3);
    expect(decideNextQualityLevel(40, 3, cfg)).toBe(4);
  });

  it('never escalates past the max level', () => {
    expect(decideNextQualityLevel(200, MAX_QUALITY_LEVEL, cfg)).toBeNull();
  });

  it('holds in the dead zone (between recover and escalate thresholds)', () => {
    // 10ms: above incline (target*0.6 ≈ 5ms) and below decline (target*1.4 ≈ 11.7ms) → no change.
    expect(decideNextQualityLevel(10, 2, cfg)).toBeNull();
  });

  it('recovers one tier on clear sustained headroom (regardless of DPR state)', () => {
    // 4ms ≪ target → restore a tier, even though dprExhausted is false.
    expect(decideNextQualityLevel(4, 3, { ...cfg, dprExhausted: false })).toBe(2);
    expect(decideNextQualityLevel(4, 1, cfg)).toBe(0);
  });

  it('recovers when KEEPING PACE with a vsync-capped refresh (avg ≈ target, the stuck-degraded fix)', () => {
    // On a 120Hz panel the frame floor is ~8.33ms ≈ target, so a scene with headroom still measures
    // ~target. A recover threshold ≥ target (1.1×) must still restore quality here, or the governor
    // would never climb back. 8.5ms is just over target but under target*1.1 (~9.16ms) → recover.
    expect(decideNextQualityLevel(8.5, 2, cfg)).toBe(1);
    // ...but a clear shortfall (in the dead zone, ≥ target*1.1) does NOT recover.
    expect(decideNextQualityLevel(10, 2, cfg)).toBeNull();
  });

  it('does not recover below 0', () => {
    expect(decideNextQualityLevel(1, 0, cfg)).toBeNull();
  });

  it('without a known display interval, uses the absolute fallback floor', () => {
    const noRefresh = { targetMs: TARGET, dprExhausted: true };
    // 30ms > 20ms fallback → escalate.
    expect(decideNextQualityLevel(30, 0, noRefresh)).toBe(1);
    // 18ms < 20ms decline but > 17ms recover → dead zone, hold.
    expect(decideNextQualityLevel(18, 1, noRefresh)).toBeNull();
    // 10ms ≪ 17ms → recover.
    expect(decideNextQualityLevel(10, 1, noRefresh)).toBe(0);
  });

  it('recovers a vsync-limited 60Hz device even when the refresh is unknown (~16.7ms < ~17ms)', () => {
    // A 60Hz panel floors at ~16.7ms; the unknown-refresh recover threshold (0.85 × 20ms = 17ms)
    // must be reachable there, or effects would stay stuck off on smooth 60Hz playback.
    const noRefresh = { targetMs: TARGET, dprExhausted: true };
    expect(decideNextQualityLevel(16.7, 2, noRefresh)).toBe(1);
  });

  it('ignores non-finite / non-positive averages', () => {
    expect(decideNextQualityLevel(NaN, 1, cfg)).toBeNull();
    expect(decideNextQualityLevel(0, 1, cfg)).toBeNull();
    expect(decideNextQualityLevel(-5, 1, cfg)).toBeNull();
  });
});
