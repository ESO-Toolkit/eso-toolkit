import { ZoneScaleData } from '../../../types/zoneScaleData';

const ARENA_SIZE_UNITS = 100;
const CENTIMETERS_PER_METER = 100;
const BASE_ACTOR_DIAMETER_UNITS = 0.4; // 2 * active replay puck radius
const TARGET_ACTOR_DIAMETER_METERS = 1.35; // Readable marker diameter in world meters
const MIN_ACTOR_SCALE = 0.05;
const MAX_ACTOR_SCALE = 4.0;
export const DEFAULT_ACTOR_SCALE = 0.8;

/**
 * Minimum world-space window (in arena units = meters, since actor coords are world-cm ÷ 100)
 * that the initial camera fit and the "frame all" reset will frame, regardless of how small the
 * actual fight area is.
 *
 * WHY: every fight's map is the full zone JPG stretched over the same fixed 100×100 plane, but the
 * fight area itself varies hugely — a Dreadsail Reef boss spans ~45×58 m and naturally fills the
 * plane, while a Rockgrove boss spans only ~14×11 m (an ~18-unit diagonal). The camera fits to the
 * actor bounding box, so a tiny fight pinned the camera right down on the cluster and magnified a
 * blurry ~14 m patch of a map drawn at 100 m scale — the "too small / zoomed-in" report. Flooring
 * the fitted diagonal here gives small fights breathing room and surrounding map context while
 * leaving large fights (whose real diagonal already exceeds this floor) untouched.
 *
 * Tuned live against the real RG (Xalvakka) and DSR (Taleria) fights — see the before/after shots in
 * .scratch. The user chose the balanced ~35 m window.
 */
export const MIN_FRAME_DIAGONAL_UNITS = 35;

/**
 * Framing tightness applied after the FOV fit: <1 pulls the camera in for a closer crop, >1 pushes
 * it out for more margin. 0.65 leaves a comfortable margin of map around the framed diagonal (the
 * old initial fit used a much tighter 0.5, which — combined with a tiny fight diagonal — was part of
 * why small fights read as cramped). Kept here so the initial fit and "frame all" stay in agreement.
 */
const INITIAL_FRAME_FACTOR = 0.65;

/**
 * Camera vertical field of view (degrees) used by the replay <Canvas>. The fit distance depends on
 * it, so it lives next to the fit helper rather than being threaded through every call site.
 */
const REPLAY_CAMERA_FOV_DEGREES = 30;

/**
 * Compute the camera distance needed to frame a fight whose actor bounding box has the given XZ
 * diagonal (in arena units). The diagonal is floored at {@link MIN_FRAME_DIAGONAL_UNITS} so tiny
 * fights still show map context, then converted to a distance via the camera FOV and pulled in/out
 * by {@link INITIAL_FRAME_FACTOR}.
 *
 * Pure + shared by the initial camera fit (Arena3D) and the "frame all" reset (CameraResetControls)
 * so both frame a small fight identically. Returns a distance in world units (never below a tiny
 * floor so the camera can't land on the target).
 */
export function computeInitialViewDistance(boundingBoxDiagonalUnits: number): number {
  const safeDiagonal = Number.isFinite(boundingBoxDiagonalUnits)
    ? Math.max(0, boundingBoxDiagonalUnits)
    : 0;
  const framedDiagonal = Math.max(safeDiagonal, MIN_FRAME_DIAGONAL_UNITS);
  const fovRadians = (REPLAY_CAMERA_FOV_DEGREES * Math.PI) / 180;
  const distance = (framedDiagonal / 2 / Math.tan(fovRadians / 2)) * INITIAL_FRAME_FACTOR;
  return Math.max(2, distance);
}

/**
 * Bounding box of the fight's actors, in raw ESO world centimeters (matches GraphQL
 * `fight.boundingBox`). The actor coordinate transform divides these by 100 to reach arena units.
 */
export interface FightBoundingBoxCm {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Figure scale per unit of fight-area diagonal (arena units = meters). Tuned so the play area's
 * size, not a zone lookup, drives how big the actor figures read: a large arena (e.g. Dreadsail
 * Reef's Taleria, ~74-unit diagonal) keeps roughly its established figure size, while a tiny arena
 * (e.g. a Rockgrove boss, ~18-unit diagonal) gets proportionally smaller figures so the crowd reads
 * at the SAME fraction of the play area in every fight instead of looking oversized in a small one.
 *
 * Anchored on Taleria, which looked right at the previous map-based scale ≈1.25 for its ≈74-unit
 * diagonal → ≈0.017 scale per unit. Tuned live against the real RG/DSR fights (see .scratch shots).
 */
const ACTOR_SCALE_PER_FIGHT_DIAGONAL = 0.017;

/**
 * Clamp range for the fight-area-derived actor scale. The lower bound keeps figures on a very small
 * fight big enough to see and click; the upper bound stops a sprawling fight (or an outlier
 * coordinate that inflates the bounding box) from ballooning the figures.
 */
const MIN_FIGHT_AREA_ACTOR_SCALE = 0.55;
const MAX_FIGHT_AREA_ACTOR_SCALE = 1.4;

/**
 * Compute the actor figure scale from the fight's own actor bounding box so figures are a consistent
 * fraction of the play area across fights — the principled replacement for deriving scale from a
 * zone-map lookup (which mis-resolved for some zones via a numeric map-id collision and so sized a
 * small-arena fight's figures as if it were a large map, making them read oversized).
 *
 * Returns null when the bounding box is missing or degenerate so the caller can fall back.
 */
export function computeActorScaleFromFightArea(
  boundingBox: FightBoundingBoxCm | null | undefined,
): number | null {
  if (!boundingBox) {
    return null;
  }
  const { minX, maxX, minY, maxY } = boundingBox;
  if (![minX, maxX, minY, maxY].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return null;
  }

  // Arena units (= meters): the actor transform is world-cm ÷ 100.
  const rangeX = (maxX - minX) / CENTIMETERS_PER_METER;
  const rangeZ = (maxY - minY) / CENTIMETERS_PER_METER;
  const diagonal = Math.sqrt(rangeX * rangeX + rangeZ * rangeZ);
  if (!(diagonal > 0)) {
    return null;
  }

  const rawScale = diagonal * ACTOR_SCALE_PER_FIGHT_DIAGONAL;
  return Math.max(MIN_FIGHT_AREA_ACTOR_SCALE, Math.min(MAX_FIGHT_AREA_ACTOR_SCALE, rawScale));
}

/**
 * Calculates the number of arena units that represent one real-world meter for a given map.
 * Returns null when map bounds are invalid.
 */
export function computeUnitsPerMeter(mapData: ZoneScaleData): number | null {
  const rangeX = mapData.maxX - mapData.minX;
  const rangeZ = mapData.maxZ - mapData.minZ;

  if (rangeX <= 0 || rangeZ <= 0) {
    return null;
  }

  const unitsPerMeterX = (ARENA_SIZE_UNITS * CENTIMETERS_PER_METER) / rangeX;
  const unitsPerMeterZ = (ARENA_SIZE_UNITS * CENTIMETERS_PER_METER) / rangeZ;

  return Math.sqrt(unitsPerMeterX * unitsPerMeterZ);
}

/**
 * Converts the default actor geometry scale into a map-aware scale multiplier so that
 * actors maintain a consistent real-world footprint based on map dimensions.
 */
export function computeActorScaleFromMapData(mapData: ZoneScaleData): number | null {
  const unitsPerMeter = computeUnitsPerMeter(mapData);
  if (!unitsPerMeter) {
    return null;
  }

  const desiredDiameterUnits = TARGET_ACTOR_DIAMETER_METERS * unitsPerMeter;
  const rawScale = desiredDiameterUnits / BASE_ACTOR_DIAMETER_UNITS;

  if (!Number.isFinite(rawScale) || rawScale <= 0) {
    return null;
  }

  const clampedScale = Math.max(MIN_ACTOR_SCALE, Math.min(MAX_ACTOR_SCALE, rawScale));

  return clampedScale;
}
