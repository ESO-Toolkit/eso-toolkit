import { ZoneScaleData } from '../../../types/zoneScaleData';

const ARENA_SIZE_UNITS = 100;
const CENTIMETERS_PER_METER = 100;
const BASE_ACTOR_DIAMETER_UNITS = 0.3; // 2 * PUCK_RADIUS from SharedActor3DGeometries
const TARGET_ACTOR_DIAMETER_METERS = 1.1; // Approximate puck diameter in world meters
const MIN_ACTOR_SCALE = 0.05;
const MAX_ACTOR_SCALE = 4.0;
export const DEFAULT_ACTOR_SCALE = 0.8;

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
