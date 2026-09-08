/**
 * Camera framing for the replay NPC model viewer.
 *
 * Kept separate from the page component so the framing can be unit-tested without pulling in a
 * WebGL canvas or the page's `import.meta.env` asset-URL handling.
 */

/** Named camera angles the asset acceptance gate requires a reviewer to check. */
export const VIEWS = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  'three-quarter': [0.85, 0.25, 0.85],
} as const;

export type ViewName = keyof typeof VIEWS;

/** Height up the model the camera aims at, as a fraction of its total height. */
export const REVIEW_TARGET_HEIGHT_RATIO = 0.5;
const REVIEW_DISTANCE_RATIO = 2.2;
const REVIEW_EYE_LIFT_RATIO = 0.55;

/**
 * Where the camera sits for a named review angle, given the model's height.
 *
 * Distance and eye height both scale with the model, so a taller asset frames the same way a
 * shorter one does. The eye is lifted above the floor so the model is never reviewed from below,
 * which would flatter its silhouette.
 */
export function getReviewCameraPosition(view: ViewName, radius: number): [number, number, number] {
  const [x, y, z] = VIEWS[view];
  const length = Math.hypot(x, y, z) || 1;
  const scale = (radius * REVIEW_DISTANCE_RATIO) / length;
  return [x * scale, Math.max(y * scale, 0) + radius * REVIEW_EYE_LIFT_RATIO, z * scale];
}
