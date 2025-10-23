/**
 * Container component for rendering map markers (M0R and Elms formats) in the fight replay
 */
import React, { useMemo } from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { ZONE_SCALE_DATA, ZoneScaleData } from '../../../types/zoneScaleData';
import { Logger, LogLevel } from '../../../utils/logger';
import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';

import { Marker3D, MarkerContextMenuPayload } from './Marker3D';

// Create logger instance for MapMarkers
const logger = new Logger({
  level: LogLevel.INFO,
  contextPrefix: 'MapMarkers',
});

interface MapMarkersProps {
  /** Resolved markers state (already decoded) */
  markersState?: MapMarkersState | null;
  /** Fight data for scale lookup */
  fight: FightFragment;
  /** Optional scale factor for marker sizing */
  scale?: number;
  /** Callback when a marker context menu is requested */
  onMarkerContextMenu?: (payload: MarkerContextMenuPayload) => void;
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  markersState,
  fight,
  scale = 1,
  onMarkerContextMenu,
}) => {
  const resolvedMarkers = useMemo<MapMarkersState | null>(() => {
    if (!markersState || markersState.markers.length === 0) {
      logger.debug('No markers state provided');
      return null;
    }

    return markersState;
  }, [markersState]);

  const zoneScaleData = useMemo((): ZoneScaleData | null => {
    if (!resolvedMarkers) {
      return null;
    }

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
    const markerZoneId = resolvedMarkers.zoneId;

    if (zoneId !== markerZoneId) {
      logger.warn('Marker zone mismatch', { markerZoneId, fightZoneId: zoneId });
      return null;
    }

    const zoneMaps = ZONE_SCALE_DATA[zoneId];
    if (!zoneMaps) {
      logger.warn('No zone scale data found for zoneId', { zoneId });
      return null;
    }

    const fightMapId = fight.maps[0]?.id;
    let mapData = fightMapId ? zoneMaps.find((map) => map.mapId === fightMapId) : null;

    if (!mapData && resolvedMarkers.markers.length > 0) {
      const firstMarker = resolvedMarkers.markers[0];
      mapData =
        zoneMaps.find(
          (map) =>
            firstMarker.x >= map.minX &&
            firstMarker.x <= map.maxX &&
            firstMarker.z >= map.minZ &&
            firstMarker.z <= map.maxZ,
        ) ?? null;

      if (mapData) {
        logger.warn('Markers appear to be for different map', {
          detectedMapId: mapData.mapId,
          detectedMapName: mapData.name,
          fightMapId,
        });
        logger.info('Using detected map data instead of fight map for coordinate transformation');
      }
    }

    if (!mapData) {
      logger.warn('No map data found for mapId', { fightMapId, zoneId });
      logger.info('Available maps in this zone', {
        maps: zoneMaps.map((m) => ({
          mapId: m.mapId,
          name: m.name,
          bounds: { x: [m.minX, m.maxX], z: [m.minZ, m.maxZ] },
        })),
      });
      return null;
    }

    logger.debug('Found zone scale data', { zoneName: mapData.name, zoneId, mapId: mapData.mapId });
    return mapData;
  }, [fight.gameZone, fight.maps, fight.name, resolvedMarkers]);

  const transformedMarkers = useMemo(() => {
    if (!resolvedMarkers || !zoneScaleData) {
      return null;
    }

    const markers: ReplayMarker[] = resolvedMarkers.markers;
    if (markers.length === 0) {
      return null;
    }

    const { minX, maxX, minZ, maxZ, y: mapY } = zoneScaleData;
    const Y_TOLERANCE = 2000; // centimeters

    const markersInBounds = markers.filter((marker) => {
      const inXZBounds =
        marker.x >= minX && marker.x <= maxX && marker.z >= minZ && marker.z <= maxZ;

      if (inXZBounds && mapY !== undefined) {
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

    const unitsPerMeterX = 10000 / rangeX;
    const unitsPerMeterZ = 10000 / rangeZ;
    const unitsPerMeter = Math.sqrt(unitsPerMeterX * unitsPerMeterZ);

    const transformed = markersInBounds.map((marker) => {
      const normalizedX = (marker.x - minX) / (maxX - minX);
      const normalizedZ = (marker.z - minZ) / (maxZ - minZ);

      const arenaX = 100 - normalizedX * 100;
      const arenaZ = 100 - normalizedZ * 100;

      const normalizedSize = marker.size * unitsPerMeter;
      const arenaY = (normalizedSize * scale) / 2 + 0.01;

      return {
        ...marker,
        x: arenaX,
        y: arenaY,
        z: arenaZ,
        size: normalizedSize,
      };
    });

    logger.info('Transformed markers', {
      count: markersInBounds.length,
      zoneName: zoneScaleData.name,
      unitsPerMeter: unitsPerMeter.toFixed(5),
      visualScale: scale.toFixed(3),
      sample: transformed.slice(0, 3).map((m) => ({ x: m.x, y: m.y, z: m.z, text: m.text })),
    });

    return transformed;
  }, [resolvedMarkers, scale, zoneScaleData]);

  if (!transformedMarkers || transformedMarkers.length === 0) {
    logger.debug('Not rendering - no transformed markers', {
      hasState: !!resolvedMarkers,
      markersLength: transformedMarkers?.length || 0,
    });
    return null;
  }

  const effectiveScale = scale;
  const MAX_MARKERS = 200;
  const markersToRender = transformedMarkers.slice(0, MAX_MARKERS);

  if (transformedMarkers.length > MAX_MARKERS) {
    logger.warn('Limiting render to max markers', {
      maxMarkers: MAX_MARKERS,
      totalMarkers: transformedMarkers.length,
    });
  }

  logger.info('Rendering markers', {
    count: markersToRender.length,
    effectiveScale,
  });

  return (
    <group>
      {markersToRender.map((marker) => (
        <Marker3D
          key={`marker-${marker.id}-${marker.x}-${marker.y}-${marker.z}`}
          marker={marker}
          markerId={marker.id}
          scale={effectiveScale}
          onContextMenu={onMarkerContextMenu}
        />
      ))}
    </group>
  );
};
