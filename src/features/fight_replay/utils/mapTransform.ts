/**
 * Shared world<->arena transform for everything anchored to the map (markers and drawn shapes).
 *
 * Two coordinate systems are in play:
 *  - WORLD: ESO coordinates in centimetres (what markers/shapes store and what zoneScaleData bounds
 *    are in).
 *  - ARENA: the fixed 0-100 box that IS the three.js scene space (actors, map plane, markers).
 *
 * The forward transform normalises a world point to the map's bounding box then flips BOTH axes
 * (the map plane is X-mirrored and the Z is flipped to fix north/south) — see MapMarkers/MapTexture.
 * Keeping this in one module means markers and shapes can never drift apart.
 */
import { FightFragment } from '@/graphql/gql/graphql';
import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';

/** Multi-floor disambiguation tolerance (cm): a marker/shape belongs to a floor within +/- this. */
export const MAP_Y_TOLERANCE = 2000;

export interface MapUnitScale {
  /** Geometric-mean arena-units per metre (matches marker sizing). */
  unitsPerMeter: number;
  unitsPerMeterX: number;
  unitsPerMeterZ: number;
}

/**
 * Resolve the ZoneScaleData for a fight. Mirrors MapMarkers: the marker/shape set's zone must match
 * the fight's zone; the fight's own map id is preferred, falling back to the map whose bounding box
 * contains the supplied sample world point (so a set authored on a different floor still resolves).
 */
export function resolveZoneScaleData(
  fight: Pick<FightFragment, 'gameZone' | 'maps'>,
  contentZoneId: number,
  sample?: { x: number; z: number },
): ZoneScaleData | null {
  if (!fight.gameZone || !fight.maps || fight.maps.length === 0) {
    return null;
  }
  const zoneId = fight.gameZone.id;
  if (zoneId !== contentZoneId) {
    return null;
  }

  const zoneMaps = ZONE_SCALE_DATA[zoneId];
  if (!zoneMaps) {
    return null;
  }

  const fightMapId = fight.maps[0]?.id;
  let mapData = fightMapId ? (zoneMaps.find((map) => map.mapId === fightMapId) ?? null) : null;

  if (!mapData && sample) {
    mapData =
      zoneMaps.find(
        (map) =>
          sample.x >= map.minX &&
          sample.x <= map.maxX &&
          sample.z >= map.minZ &&
          sample.z <= map.maxZ,
      ) ?? null;
  }

  return mapData;
}

/** Arena-units-per-metre for a map, or null when the map has a degenerate range. */
export function computeUnitScale(mapData: ZoneScaleData): MapUnitScale | null {
  const rangeX = mapData.maxX - mapData.minX;
  const rangeZ = mapData.maxZ - mapData.minZ;
  if (rangeX <= 0 || rangeZ <= 0) {
    return null;
  }
  const unitsPerMeterX = 10000 / rangeX;
  const unitsPerMeterZ = 10000 / rangeZ;
  return {
    unitsPerMeterX,
    unitsPerMeterZ,
    unitsPerMeter: Math.sqrt(unitsPerMeterX * unitsPerMeterZ),
  };
}

/** Forward transform: world cm -> arena (0-100), flipping both X and Z. */
export function worldToArena(
  mapData: ZoneScaleData,
  x: number,
  z: number,
): { x: number; z: number } {
  const normalizedX = (x - mapData.minX) / (mapData.maxX - mapData.minX);
  const normalizedZ = (z - mapData.minZ) / (mapData.maxZ - mapData.minZ);
  return {
    x: 100 - normalizedX * 100,
    z: 100 - normalizedZ * 100,
  };
}

/** True when a world point lies inside the map's XZ box (and, for multi-floor maps, its Y band). */
export function isWithinMapBounds(
  mapData: ZoneScaleData,
  x: number,
  z: number,
  y?: number,
): boolean {
  const inXZ = x >= mapData.minX && x <= mapData.maxX && z >= mapData.minZ && z <= mapData.maxZ;
  if (!inXZ) {
    return false;
  }
  if (mapData.y !== undefined && y !== undefined) {
    return Math.abs(y - mapData.y) <= MAP_Y_TOLERANCE;
  }
  return true;
}
