/**
 * Utility functions for working with Map Markers (M0R and Elms formats) and multi-map zones
 */

import { FightFragment } from '../graphql/generated';
import { ZONE_SCALE_DATA, ZoneScaleData } from '../types/zoneScaleData';

/**
 * Get all available maps for a fight's zone
 */
export function getAvailableMapsForZone(zoneId: number): ZoneScaleData[] {
  return ZONE_SCALE_DATA[zoneId] || [];
}

/**
 * Get all available maps from fight data
 */
export function getAvailableMapsFromFight(fight: FightFragment): Array<{
  mapId: number;
  mapName: string;
  scaleData: ZoneScaleData;
}> {
  if (!fight.gameZone) return [];

  const zoneId = fight.gameZone.id;
  const availableMaps = getAvailableMapsForZone(zoneId);

  return availableMaps.map((scaleData) => ({
    mapId: scaleData.mapId,
    mapName: scaleData.name,
    scaleData,
  }));
}

/**
 * Detect which map marker coordinates belong to based on bounding box
 */
export function detectMapFromCoordinates(
  zoneId: number,
  x: number,
  z: number,
): ZoneScaleData | null {
  const zoneMaps = ZONE_SCALE_DATA[zoneId];
  if (!zoneMaps) return null;

  return (
    zoneMaps.find((map) => x >= map.minX && x <= map.maxX && z >= map.minZ && z <= map.maxZ) || null
  );
}

/**
 * Check if a marker's coordinates fall within a map's bounding box
 */
export function isMarkerInMapBounds(marker: { x: number; z: number }, map: ZoneScaleData): boolean {
  return (
    marker.x >= map.minX && marker.x <= map.maxX && marker.z >= map.minZ && marker.z <= map.maxZ
  );
}

/**
 * Filter markers to only those within a map's bounding box
 */
export function filterMarkersByMapBounds<T extends { x: number; z: number }>(
  markers: T[],
  map: ZoneScaleData,
): T[] {
  return markers.filter((marker) => isMarkerInMapBounds(marker, map));
}

/**
 * Get map size in meters (approximate)
 */
export function getMapSize(map: ZoneScaleData): { width: number; height: number } {
  return {
    width: Math.round((map.maxX - map.minX) / 100), // Convert cm to meters
    height: Math.round((map.maxZ - map.minZ) / 100),
  };
}

/**
 * Format map information for display
 */
export function formatMapInfo(map: ZoneScaleData): string {
  const size = getMapSize(map);
  return `${map.name} (${size.width}m × ${size.height}m)`;
}
