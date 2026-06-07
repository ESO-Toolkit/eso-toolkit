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
