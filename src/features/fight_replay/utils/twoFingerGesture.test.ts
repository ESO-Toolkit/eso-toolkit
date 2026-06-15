import {
  decomposeTwoFinger,
  fingerCentroid,
  fingerDistance,
  TwoFingerSample,
} from './twoFingerGesture';

describe('fingerDistance / fingerCentroid', () => {
  it('measures distance and midpoint of the two fingers', () => {
    const s: TwoFingerSample = { a: { x: 0, y: 0 }, b: { x: 6, y: 8 } };
    expect(fingerDistance(s)).toBe(10); // 3-4-5 ×2
    expect(fingerCentroid(s)).toEqual({ x: 3, y: 4 });
  });
});

describe('decomposeTwoFinger', () => {
  it('pure pinch (fingers spread, centroid fixed) → zoom only, no pan', () => {
    // Centroid stays at (50,50); fingers spread from 20px apart to 40px apart.
    const prev: TwoFingerSample = { a: { x: 40, y: 50 }, b: { x: 60, y: 50 } };
    const curr: TwoFingerSample = { a: { x: 30, y: 50 }, b: { x: 70, y: 50 } };
    const { zoomRatio, panDelta } = decomposeTwoFinger(prev, curr);
    // Spreading → currDist > prevDist → ratio < 1 (zoom IN).
    expect(zoomRatio).toBeCloseTo(20 / 40);
    expect(panDelta.x).toBeCloseTo(0);
    expect(panDelta.y).toBeCloseTo(0);
  });

  it('pure pan (fingers rigid, both slide) → pan only, no zoom cross-talk', () => {
    // Both fingers translate by (+15,-25); their separation is unchanged.
    const prev: TwoFingerSample = { a: { x: 40, y: 50 }, b: { x: 60, y: 50 } };
    const curr: TwoFingerSample = { a: { x: 55, y: 25 }, b: { x: 75, y: 25 } };
    const { zoomRatio, panDelta } = decomposeTwoFinger(prev, curr);
    expect(zoomRatio).toBeCloseTo(1); // THE cross-talk guard: a slide must not register as zoom
    expect(panDelta.x).toBeCloseTo(15);
    expect(panDelta.y).toBeCloseTo(-25);
  });

  it('combined pan + pinch decomposes into both, independently', () => {
    // Fingers spread 20→40 (zoom in) AND centroid slides (+10,+10).
    const prev: TwoFingerSample = { a: { x: 40, y: 50 }, b: { x: 60, y: 50 } };
    const curr: TwoFingerSample = { a: { x: 40, y: 60 }, b: { x: 80, y: 60 } };
    const { zoomRatio, panDelta } = decomposeTwoFinger(prev, curr);
    expect(zoomRatio).toBeCloseTo(20 / 40); // distance 20 → 40
    expect(panDelta.x).toBeCloseTo(10); // centroid 50 → 60
    expect(panDelta.y).toBeCloseTo(10); // centroid 50 → 60
  });

  it('no movement → identity (ratio 1, zero pan)', () => {
    const s: TwoFingerSample = { a: { x: 10, y: 10 }, b: { x: 30, y: 30 } };
    const { zoomRatio, panDelta } = decomposeTwoFinger(s, s);
    expect(zoomRatio).toBeCloseTo(1);
    expect(panDelta).toEqual({ x: 0, y: 0 });
  });

  it('degenerate current distance (fingers coincident) → no zoom, still pans', () => {
    const prev: TwoFingerSample = { a: { x: 0, y: 0 }, b: { x: 20, y: 0 } };
    const curr: TwoFingerSample = { a: { x: 50, y: 50 }, b: { x: 50, y: 50 } };
    const { zoomRatio, panDelta } = decomposeTwoFinger(prev, curr);
    expect(zoomRatio).toBe(1); // would be div-by-zero; falls back to no-zoom
    expect(panDelta.x).toBeCloseTo(40); // prev centroid (10,0) → curr (50,50)
    expect(panDelta.y).toBeCloseTo(50);
  });
});
