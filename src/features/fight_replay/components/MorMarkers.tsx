/**
 * Container component for rendering all M0RMarkers in the fight replay
 */
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { ZONE_SCALE_DATA, ZoneScaleData } from '../../../types/zoneScaleData';
import { decodeElmsMarkersString, isElmsMarkersFormat } from '../../../utils/elmsMarkersDecoder';
import { Logger, LogLevel } from '../../../utils/logger';
import { decodeMorMarkersString } from '../../../utils/morMarkersDecoder';

import { Marker3D } from './Marker3D';

// Create logger instance for MorMarkers
const logger = new Logger({
  level: LogLevel.INFO,
  contextPrefix: 'MorMarkers',
});

interface MorMarkersProps {
  /** Encoded M0RMarkers string */
  encodedString: string;
  /** Fight data for zone/map information */
  fight: FightFragment;
  /** Scale factor for marker sizes (default: 1) */
  scale?: number;
}

/**
 * Renders decoded M0RMarkers in 3D space using zone scale data
 *
 * Uses the zone scale data from elmseditor to properly transform M0R marker
 * coordinates (ESO world space in centimeters) to arena coordinates, preserving
 * the relative sizes between zones while keeping everything within safe WebGL bounds.
 *
 * The transformation works as follows:
 * 1. Find the appropriate zone scale data based on fight's gameZone and map
 * 2. Calculate the actual zone size in meters
 * 3. Use the scale factor to determine the relative arena size
 * 4. Clamp the maximum arena size to prevent WebGL issues (max 400 meters)
 * 5. Transform coordinates maintaining proper aspect ratios
 */
export const MorMarkers: React.FC<MorMarkersProps> = ({ encodedString, fight, scale = 1 }) => {
  // Decode the markers string with error handling (supports both M0R and Elms formats)
  const decodedMarkers = useMemo(() => {
    if (!encodedString || encodedString.trim() === '') {
      logger.debug('No encoded string provided');
      return null;
    }

    try {
      // Auto-detect format
      const isElms = isElmsMarkersFormat(encodedString);
      const decoded = isElms
        ? decodeElmsMarkersString(encodedString)
        : decodeMorMarkersString(encodedString);

      logger.info('Successfully decoded markers', {
        count: decoded?.markers?.length || 0,
        zone: decoded?.zone,
        format: isElms ? 'Elms' : 'M0R',
      });
      return decoded;
    } catch (error) {
      logger.error(
        'Failed to decode markers string',
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }, [encodedString]);

  // Find the appropriate zone scale data for this fight
  const zoneScaleData = useMemo((): ZoneScaleData | null => {
    if (!fight.gameZone || !fight.maps || fight.maps.length === 0) {
      logger.warn('Fight missing gameZone or maps data', {
        hasGameZone: !!fight.gameZone,
        hasMaps: !!fight.maps,
        mapsLength: fight.maps?.length || 0,
        fightName: fight.name,
      });
      return null;
    }

    const zoneId = fight.gameZone.id;
    const mapId = fight.maps[0]?.id; // Use primary map

    if (!zoneId || !mapId) {
      logger.warn('Missing zoneId or mapId', { zoneId, mapId });
      return null;
    }

    // Look up zone scale data
    const zoneMaps = ZONE_SCALE_DATA[zoneId];
    if (!zoneMaps) {
      logger.warn('No zone scale data found for zoneId', { zoneId });
      return null;
    }

    // Find the specific map within the zone
    const mapData = zoneMaps.find((map) => map.mapId === mapId);
    if (!mapData) {
      logger.warn('No map data found for mapId', { mapId, zoneId });
      logger.info('Available maps in this zone', {
        maps: zoneMaps.map((m) => ({
          mapId: m.mapId,
          name: m.name,
          bounds: { x: [m.minX, m.maxX], z: [m.minZ, m.maxZ] },
        })),
      });

      // Try to find a matching map based on marker coordinates
      if (decodedMarkers && decodedMarkers.markers.length > 0) {
        const firstMarker = decodedMarkers.markers[0];
        logger.info('First marker coordinates (raw)', {
          x: firstMarker.x,
          y: firstMarker.y,
          z: firstMarker.z,
        });

        // Try to find which map these coordinates belong to
        const matchingMap = zoneMaps.find(
          (map) =>
            firstMarker.x >= map.minX &&
            firstMarker.x <= map.maxX &&
            firstMarker.z >= map.minZ &&
            firstMarker.z <= map.maxZ,
        );

        if (matchingMap) {
          logger.warn('Markers appear to be for different map', {
            detectedMapId: matchingMap.mapId,
            detectedMapName: matchingMap.name,
            fightMapId: mapId,
          });
          logger.info('Using detected map data instead of fight map for coordinate transformation');
          return matchingMap;
        }
      }

      return null;
    }

    logger.debug('Found zone scale data', { zoneName: mapData.name, zoneId, mapId });
    return mapData;
  }, [fight.gameZone, fight.maps, fight.name, decodedMarkers]);

  // Transform markers using zone scale data with proper scaling
  const transformedMarkers = useMemo(() => {
    if (!decodedMarkers || decodedMarkers.markers.length === 0) {
      return null;
    }

    if (!zoneScaleData) {
      return null;
    }

    const markers = decodedMarkers.markers;
    const { minX, maxX, minZ, maxZ, scaleFactor: _scaleFactor, y: mapY } = zoneScaleData;

    // Filter markers to only those within this map's bounding box
    // This ensures markers from other maps in the same zone don't render
    // For maps with Y-coordinate (height-based separation), use 3D filtering
    const markersInBounds = markers.filter((marker) => {
      // 2D bounds check (X and Z)
      const inXZBounds =
        marker.x >= minX && marker.x <= maxX && marker.z >= minZ && marker.z <= maxZ;

      // If map has a Y coordinate (height-based separation), also check Y
      // This is needed for multi-floor dungeons where floors share X/Z bounds
      if (inXZBounds && mapY !== undefined) {
        // Use a tolerance for Y matching (e.g., within 2000cm = 20m of the floor)
        const Y_TOLERANCE = 2000; // centimeters
        const inYBounds = Math.abs(marker.y - mapY) <= Y_TOLERANCE;

        if (!inYBounds) {
          logger.debug('Filtered out marker outside Y bounds', {
            marker: { x: marker.x, y: marker.y, z: marker.z, text: marker.text },
            bounds: { minX, maxX, minZ, maxZ, mapY },
            yDifference: Math.abs(marker.y - mapY),
          });
        }

        return inYBounds;
      }

      if (!inXZBounds) {
        logger.debug('Filtered out marker outside X/Z bounds', {
          marker: { x: marker.x, z: marker.z, text: marker.text },
          bounds: { minX, maxX, minZ, maxZ },
        });
      }

      return inXZBounds;
    });

    if (markersInBounds.length === 0) {
      logger.warn('No markers found within map bounds', {
        totalMarkers: markers.length,
        bounds: { minX, maxX, minZ, maxZ, y: mapY },
        mapName: zoneScaleData.name,
        is3D: mapY !== undefined,
      });
      return null;
    }

    if (markersInBounds.length < markers.length) {
      logger.info('Filtered markers by bounding box', {
        original: markers.length,
        filtered: markersInBounds.length,
        removed: markers.length - markersInBounds.length,
        mapName: zoneScaleData.name,
        is3D: mapY !== undefined,
      });
    }

    // Calculate the range of the zone in centimeters
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;

    if (rangeX <= 0 || rangeZ <= 0) {
      logger.warn('Invalid zone ranges for marker transformation', {
        rangeX,
        rangeZ,
        zoneName: zoneScaleData.name,
        zoneId: zoneScaleData.zoneId,
        mapId: zoneScaleData.mapId,
      });
      return null;
    }

    // Convert marker sizes (meters) to arena units using geometric mean across X/Z axes
    const unitsPerMeterX = 10000 / rangeX;
    const unitsPerMeterZ = 10000 / rangeZ;
    const unitsPerMeter = Math.sqrt(unitsPerMeterX * unitsPerMeterZ);

    // Transform markers: map from ESO world space to arena space
    // Step 1: Normalize coordinates to map bounds (0-1 range)
    // Step 2: Scale to arena size (0-100)
    // Step 3: Apply X-flip to match flipped map texture
    const transformed = {
      ...decodedMarkers,
      markers: markersInBounds.map((marker) => {
        // Normalize marker coordinates relative to map bounds
        // This converts world space coordinates to normalized 0-1 range
        const normalizedX = (marker.x - minX) / (maxX - minX);
        const normalizedZ = (marker.z - minZ) / (maxZ - minZ);

        // Scale to arena size (0-100) and apply X-flip to match map texture
        // Map texture has scale={[-1, 1, 1]} which flips it, so we flip X coordinate
        const arenaX = 100 - normalizedX * 100; // Flip X to match the flipped map texture
        const arenaZ = 100 - normalizedZ * 100; // Flip Z to correct north/south orientation

        // Convert marker size (meters) to arena units, then lift above the floor by half height
        const normalizedSize = marker.size * unitsPerMeter;
        const arenaY = (normalizedSize * scale) / 2 + 0.01;

        return {
          ...marker,
          x: arenaX,
          y: arenaY,
          z: arenaZ,
          size: normalizedSize,
        };
      }),
    };

    logger.info('Transformed markers', {
      count: markersInBounds.length,
      zoneName: zoneScaleData.name,
      unitsPerMeter: unitsPerMeter.toFixed(5),
      visualScale: scale.toFixed(3),
      sample: transformed.markers
        .slice(0, 3)
        .map((m) => ({ x: m.x, y: m.y, z: m.z, text: m.text })),
    });

    return transformed;
  }, [decodedMarkers, scale, zoneScaleData]);

  // If decoding failed or no markers, don't render anything
  if (!transformedMarkers || transformedMarkers.markers.length === 0) {
    logger.debug('Not rendering - no transformed markers', {
      hasTransformedMarkers: !!transformedMarkers,
      markersLength: transformedMarkers?.markers?.length || 0,
    });
    return null;
  }

  const effectiveScale = scale;

  // Limit the number of markers to prevent WebGL crashes
  // Most raid encounters have <50 markers, so 200 is a safe upper limit
  const MAX_MARKERS = 200;
  const markersToRender = transformedMarkers.markers.slice(0, MAX_MARKERS);

  if (transformedMarkers.markers.length > MAX_MARKERS) {
    logger.warn('Limiting render to max markers', {
      maxMarkers: MAX_MARKERS,
      totalMarkers: transformedMarkers.markers.length,
    });
  }

  logger.info('Rendering markers', {
    count: markersToRender.length,
    effectiveScale,
  });

  return (
    <group>
      {markersToRender.map((marker, index) => (
        <Marker3D
          key={`marker-${index}-${marker.x}-${marker.y}-${marker.z}`}
          marker={marker}
          scale={effectiveScale}
        />
      ))}
    </group>
  );
};
