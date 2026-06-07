import { ZoneScaleData } from '../../../types/zoneScaleData';

import {
  DEFAULT_ACTOR_SCALE,
  MIN_FRAME_DIAGONAL_UNITS,
  computeActorScaleFromMapData,
  computeInitialViewDistance,
  computeUnitsPerMeter,
} from './mapScaling';

/**
 * Helper to build a minimal ZoneScaleData with the bounds we care about for scaling.
 * Extra fields are filled with reasonable defaults so the object satisfies the type.
 */
function makeMapData(overrides: Partial<ZoneScaleData>): ZoneScaleData {
  return {
    name: 'Test Map',
    mapId: 1,
    zoneId: 1,
    scaleFactor: 1,
    minX: 0,
    maxX: 10000,
    minZ: 0,
    maxZ: 10000,
    ...overrides,
  };
}

describe('computeUnitsPerMeter', () => {
  it('returns a positive finite number for valid square bounds', () => {
    const result = computeUnitsPerMeter(
      makeMapData({ minX: 0, maxX: 10000, minZ: 0, maxZ: 10000 }),
    );
    expect(result).not.toBeNull();
    expect(Number.isFinite(result as number)).toBe(true);
    expect(result as number).toBeGreaterThan(0);
  });

  it('computes the geometric mean of per-axis units when axes differ', () => {
    // rangeX = 10000 -> unitsPerMeterX = (100 * 100) / 10000 = 1
    // rangeZ = 5000  -> unitsPerMeterZ = (100 * 100) / 5000  = 2
    // geometric mean = sqrt(1 * 2) = sqrt(2)
    const result = computeUnitsPerMeter(makeMapData({ minX: 0, maxX: 10000, minZ: 0, maxZ: 5000 }));
    expect(result).toBeCloseTo(Math.sqrt(2), 6);
  });

  it('returns null when X range is zero', () => {
    expect(computeUnitsPerMeter(makeMapData({ minX: 50, maxX: 50 }))).toBeNull();
  });

  it('returns null when Z range is zero', () => {
    expect(computeUnitsPerMeter(makeMapData({ minZ: 50, maxZ: 50 }))).toBeNull();
  });

  it('returns null when bounds are inverted (min > max)', () => {
    expect(computeUnitsPerMeter(makeMapData({ minX: 10000, maxX: 0 }))).toBeNull();
    expect(computeUnitsPerMeter(makeMapData({ minZ: 10000, maxZ: 0 }))).toBeNull();
  });
});

describe('computeActorScaleFromMapData', () => {
  it('returns null when unitsPerMeter cannot be computed (invalid bounds)', () => {
    expect(computeActorScaleFromMapData(makeMapData({ minX: 0, maxX: 0 }))).toBeNull();
  });

  it('returns a value within the clamp range [0.05, 4.0] for valid data', () => {
    const result = computeActorScaleFromMapData(
      makeMapData({ minX: 0, maxX: 10000, minZ: 0, maxZ: 10000 }),
    );
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThanOrEqual(0.05);
    expect(result as number).toBeLessThanOrEqual(4.0);
  });

  it('clamps to the maximum scale (4.0) for very small maps (large units-per-meter)', () => {
    // Tiny ranges -> huge unitsPerMeter -> rawScale well above 4.0 -> clamped to 4.0
    const result = computeActorScaleFromMapData(
      makeMapData({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }),
    );
    expect(result).toBe(4.0);
  });

  it('clamps to the minimum scale (0.05) for very large maps (small units-per-meter)', () => {
    // Huge ranges -> tiny unitsPerMeter -> rawScale well below 0.05 -> clamped to 0.05
    const result = computeActorScaleFromMapData(
      makeMapData({ minX: 0, maxX: 100_000_000, minZ: 0, maxZ: 100_000_000 }),
    );
    expect(result).toBe(0.05);
  });
});

describe('DEFAULT_ACTOR_SCALE', () => {
  it('is a sane default within the supported scale range', () => {
    expect(DEFAULT_ACTOR_SCALE).toBeGreaterThanOrEqual(0.05);
    expect(DEFAULT_ACTOR_SCALE).toBeLessThanOrEqual(4.0);
  });
});

describe('computeInitialViewDistance', () => {
  // Distance for a diagonal exactly at the floor — the value every small fight collapses to.
  const floorDistance = computeInitialViewDistance(MIN_FRAME_DIAGONAL_UNITS);

  it('floors tiny fights at the minimum framing window (RG Xalvakka ≈ 18-unit diagonal)', () => {
    // A tiny fight diagonal is clamped UP to MIN_FRAME_DIAGONAL_UNITS, so it frames the same window
    // as a fight exactly at the floor — this is the fix for "too small / zoomed-in".
    expect(computeInitialViewDistance(18.1)).toBeCloseTo(floorDistance, 5);
  });

  it('treats a zero/degenerate diagonal as the minimum window (never zero distance)', () => {
    expect(computeInitialViewDistance(0)).toBeCloseTo(floorDistance, 5);
    expect(computeInitialViewDistance(Number.NaN)).toBeCloseTo(floorDistance, 5);
    expect(computeInitialViewDistance(-50)).toBeCloseTo(floorDistance, 5);
  });

  it('scales the distance up for large fights above the floor (DSR Taleria ≈ 74-unit diagonal)', () => {
    // A genuinely large fight is NOT clamped — it frames its real (bigger) area, so it pulls the
    // camera farther out than the floor. This is why large fights are unaffected by the fix.
    expect(computeInitialViewDistance(73.6)).toBeGreaterThan(floorDistance);
  });

  it('is monotonic in the diagonal once above the floor', () => {
    const d40 = computeInitialViewDistance(40);
    const d80 = computeInitialViewDistance(80);
    const d160 = computeInitialViewDistance(160);
    expect(d80).toBeGreaterThan(d40);
    expect(d160).toBeGreaterThan(d80);
  });

  it('returns a positive finite distance for all inputs', () => {
    for (const diag of [0, 1, 18.1, 35, 73.6, 141, 1000]) {
      const d = computeInitialViewDistance(diag);
      expect(Number.isFinite(d)).toBe(true);
      expect(d).toBeGreaterThan(0);
    }
  });
});
