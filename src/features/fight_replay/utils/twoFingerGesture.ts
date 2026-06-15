/**
 * Pure decomposition of a two-finger touch move into the two independent camera actions it drives:
 * a pinch (distance change → zoom) and a centroid drag (midpoint movement → pan).
 *
 * Mobile 3D-viewer convention (Sketchfab / Google Maps): with two fingers down, spreading/closing the
 * fingers zooms while sliding both fingers together pans — simultaneously, in one gesture. One finger
 * stays rotate (owned by OrbitControls). Splitting the math out here keeps it unit-testable: the
 * failure mode is cross-talk (a pure pan leaking a spurious zoom, or vice-versa from sampling jitter),
 * which a live touch can't be driven to in the test browser, but a pure function pins exactly.
 *
 * Coordinates are raw client px from the TouchEvent; the caller maps `panDelta` px → world units.
 */

export interface TouchPoint {
  x: number;
  y: number;
}

export interface TwoFingerSample {
  a: TouchPoint;
  b: TouchPoint;
}

export interface TwoFingerDelta {
  /**
   * Multiply the current camera→target distance by this to apply the pinch. >1 = fingers closed
   * (zoom out / move away), <1 = fingers spread (zoom in). 1 = no distance change. Matches the
   * existing CanvasWheelZoom pinch convention (`len * prevDist / currDist`).
   */
  zoomRatio: number;
  /** Centroid (midpoint) movement in client px from the previous sample to the current one. */
  panDelta: TouchPoint;
}

/** Euclidean distance between the two fingers in a sample. */
export function fingerDistance(s: TwoFingerSample): number {
  return Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y);
}

/** Midpoint (centroid) of the two fingers in a sample. */
export function fingerCentroid(s: TwoFingerSample): TouchPoint {
  return { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
}

/**
 * Decompose the change between two successive two-finger samples into an independent zoom ratio and
 * pan delta. The two are orthogonal by construction: zoom reads ONLY the finger-distance ratio and pan
 * reads ONLY the centroid translation, so a pure pan (fingers rigid, both sliding) yields zoomRatio≈1
 * and a pure pinch (centroid fixed, fingers spreading) yields panDelta≈0 — no cross-talk.
 *
 * A degenerate current distance (fingers coincident) can't define a ratio, so it falls back to 1
 * (no zoom) while still reporting the pan, rather than dividing by zero.
 */
export function decomposeTwoFinger(prev: TwoFingerSample, curr: TwoFingerSample): TwoFingerDelta {
  const prevDist = fingerDistance(prev);
  const currDist = fingerDistance(curr);
  const zoomRatio = currDist > 0 ? prevDist / currDist : 1;

  const prevC = fingerCentroid(prev);
  const currC = fingerCentroid(curr);
  return {
    zoomRatio,
    panDelta: { x: currC.x - prevC.x, y: currC.y - prevC.y },
  };
}
