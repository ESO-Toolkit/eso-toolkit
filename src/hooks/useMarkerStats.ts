/**
 * Hook to decode M0RMarkers or Elms Markers and get statistics about marker loading
 */
import { useMemo } from 'react';

import { FightFragment } from '../graphql/generated';
import { ZONE_SCALE_DATA } from '../types/zoneScaleData';
import { decodeElmsMarkersString, isElmsMarkersFormat } from '../utils/elmsMarkersDecoder';
import { decodeMorMarkersString } from '../utils/morMarkersDecoder';

export interface MarkerStats {
  /** Total number of markers decoded from the string */
  totalDecoded: number;
  /** Number of markers that passed the bounding box filter */
  filtered: number;
  /** Number of markers removed by filter */
  removed: number;
  /** Zone ID from the marker string */
  zoneId: number | null;
  /** Map name being used for filtering */
  mapName: string | null;
  /** Map ID being used for filtering */
  mapId: number | null;
  /** Whether 3D (X,Y,Z) filtering was used */
  is3D: boolean;
  /** Whether decoding was successful */
  success: boolean;
  /** Error message if decoding failed */
  error: string | null;
}

export function useMarkerStats(
  encodedString: string | undefined,
  fight: FightFragment,
): MarkerStats {
  return useMemo(() => {
    // Default stats for no markers
    if (!encodedString || encodedString.trim() === '') {
      return {
        totalDecoded: 0,
        filtered: 0,
        removed: 0,
        zoneId: null,
        mapName: null,
        mapId: null,
        is3D: false,
        success: true,
        error: null,
      };
    }

    // Try to decode markers (auto-detect format)
    let decoded;
    try {
      const isElms = isElmsMarkersFormat(encodedString);
      decoded = isElms
        ? decodeElmsMarkersString(encodedString)
        : decodeMorMarkersString(encodedString);
    } catch (error) {
      return {
        totalDecoded: 0,
        filtered: 0,
        removed: 0,
        zoneId: null,
        mapName: null,
        mapId: null,
        is3D: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decode markers',
      };
    }

    if (!decoded) {
      return {
        totalDecoded: 0,
        filtered: 0,
        removed: 0,
        zoneId: null,
        mapName: null,
        mapId: null,
        is3D: false,
        success: false,
        error: 'Invalid marker format',
      };
    }

    const totalDecoded = decoded.markers.length;
    const zoneId = decoded.zone;

    // Check if we have fight zone data
    if (!fight.gameZone || !fight.maps || fight.maps.length === 0) {
      return {
        totalDecoded,
        filtered: 0,
        removed: totalDecoded,
        zoneId,
        mapName: null,
        mapId: null,
        is3D: false,
        success: false,
        error: 'Fight missing zone or map data',
      };
    }

    const fightZoneId = fight.gameZone.id;
    const fightMapId = fight.maps[0]?.id;

    // Check for zone mismatch
    if (zoneId !== fightZoneId) {
      return {
        totalDecoded,
        filtered: 0,
        removed: totalDecoded,
        zoneId,
        mapName: fight.gameZone.name || 'Unknown',
        mapId: fightMapId || null,
        is3D: false,
        success: false,
        error: `Zone mismatch: markers for zone ${zoneId}, fight is in zone ${fightZoneId}`,
      };
    }

    // Find zone scale data
    const zoneMaps = ZONE_SCALE_DATA[fightZoneId];
    if (!zoneMaps) {
      return {
        totalDecoded,
        filtered: 0,
        removed: totalDecoded,
        zoneId,
        mapName: fight.gameZone.name || 'Unknown',
        mapId: fightMapId || null,
        is3D: false,
        success: false,
        error: `No scale data for zone ${fightZoneId}`,
      };
    }

    // Try to find map data - first exact match, then coordinate-based
    let mapData = zoneMaps.find((map) => map.mapId === fightMapId);

    if (!mapData && decoded.markers.length > 0) {
      // Try coordinate-based detection
      const firstMarker = decoded.markers[0];
      mapData = zoneMaps.find(
        (map) =>
          firstMarker.x >= map.minX &&
          firstMarker.x <= map.maxX &&
          firstMarker.z >= map.minZ &&
          firstMarker.z <= map.maxZ,
      );
    }

    if (!mapData) {
      return {
        totalDecoded,
        filtered: 0,
        removed: totalDecoded,
        zoneId,
        mapName: fight.gameZone.name || 'Unknown',
        mapId: fightMapId || null,
        is3D: false,
        success: false,
        error: `No map data found for map ${fightMapId} in zone ${fightZoneId}`,
      };
    }

    // Filter markers by bounding box
    const { minX, maxX, minZ, maxZ, y: mapY } = mapData;
    const is3D = mapY !== undefined;
    const Y_TOLERANCE = 2000;

    const filtered = decoded.markers.filter((marker) => {
      const inXZBounds =
        marker.x >= minX && marker.x <= maxX && marker.z >= minZ && marker.z <= maxZ;

      if (inXZBounds && mapY !== undefined) {
        return Math.abs(marker.y - mapY) <= Y_TOLERANCE;
      }

      return inXZBounds;
    });

    return {
      totalDecoded,
      filtered: filtered.length,
      removed: totalDecoded - filtered.length,
      zoneId,
      mapName: mapData.name,
      mapId: mapData.mapId,
      is3D,
      success: true,
      error: null,
    };
  }, [encodedString, fight]);
}
