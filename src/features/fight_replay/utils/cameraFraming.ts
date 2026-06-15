/**
 * Robust camera framing for the fight replay.
 *
 * The initial replay view is framed around the actors at fight start. Using the raw min/max
 * bounding box makes a SINGLE stray position dominate the framing — a pet/add spawned at the zone
 * edge, a player mid-teleport, or a glitched/origin sample — pushing the camera far out so the real
 * action reads tiny. This computes a bounding box that ignores such extreme outliers while keeping
 * legitimately spread-out raids intact (a wide mechanic must still frame everyone).
 *
 * Method: take the median X/Z as a robust center, then drop only the points whose distance from that
 * center is BOTH beyond a generous absolute floor AND a large multiple of the median spread — i.e.
 * only true "off in the zone" outliers, never a boss or a spread player. With too few points to
 * judge (≤3) or if rejection would leave fewer than two, the full set is used unchanged, so normal
 * fights are unaffected.
 *
 * @module features/fight_replay/utils/cameraFraming
 */

/** A robust XZ-plane framing of a set of actor positions. */
export interface ActorFraming {
  /** Center of the (outlier-trimmed) bounding box. */
  centerX: number;
  centerY: number;
  centerZ: number;
  /** Diagonal of the trimmed XZ extent — a size measure for the camera distance calc. */
  diagonalXZ: number;
}

/**
 * A point within an absolute `OUTLIER_DISTANCE_FLOOR` of the robust center is ALWAYS kept (covers a
 * boss + any normal spread), so rejection only ever fires for genuinely distant strays. In scene
 * units a real arena radius is well under this.
 */
const OUTLIER_DISTANCE_FLOOR = 50;
/** …and a point is only rejected if it's also this many times beyond the MEDIAN spread (so a wide
 * but legitimate raid, where the median spread is already large, is never trimmed). */
const OUTLIER_DISTANCE_MULTIPLIER = 6;

/** Median of a numeric array (0 for empty). Does not mutate the input. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute an outlier-robust framing of actor positions (each `[x, y, z]` in scene units).
 * Returns null when there are no finite positions to frame.
 */
export function computeRobustActorFraming(
  positions: ReadonlyArray<readonly number[]>,
): ActorFraming | null {
  // Keep only fully-finite positions — a NaN/Infinity sample must never reach the camera math.
  const pts = positions.filter(
    (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]),
  );
  if (pts.length === 0) return null;

  let used = pts;
  // Need a few points before outlier rejection is meaningful; below that, frame everyone.
  if (pts.length >= 4) {
    const medX = median(pts.map((p) => p[0]));
    const medZ = median(pts.map((p) => p[2]));
    const dists = pts.map((p) => Math.hypot(p[0] - medX, p[2] - medZ));
    const medDist = median(dists);
    const threshold = Math.max(OUTLIER_DISTANCE_FLOOR, medDist * OUTLIER_DISTANCE_MULTIPLIER);
    const kept = pts.filter((_, i) => dists[i] <= threshold);
    // Never over-trim: only adopt the trimmed set if it still has something to frame.
    if (kept.length >= 2) used = kept;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of used) {
    const [x, y, z] = p;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const rangeX = maxX - minX;
  const rangeZ = maxZ - minZ;
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    diagonalXZ: Math.hypot(rangeX, rangeZ),
  };
}
