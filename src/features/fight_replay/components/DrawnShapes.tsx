/**
 * Container that renders the esotk-native drawn shapes (polyline / polygon / circle / rect / ruler)
 * for a fight, mirroring how <MapMarkers> renders markers: resolve the map's scale data, filter
 * shapes to the current floor's bounds, transform each vertex world->arena, and hand the arena
 * geometry to <DrawnShape3D>.
 */
import React, { useMemo } from 'react';

import { FightFragment } from '@/graphql/gql/graphql';

import { MapMarkersState } from '../types/mapMarkers';
import {
  computeUnitScale,
  isWithinMapBounds,
  resolveZoneScaleData,
  worldToArena,
} from '../utils/mapTransform';
import {
  isClosedKind,
  pathLengthMeters,
  shapeAnchor,
  shapeOutlineWorld,
} from '../utils/shapeGeometry';

import { DrawnShape3D } from './DrawnShape3D';

/** Label sprite height, in metres of map space (map-faithful, like marker sizes). */
const LABEL_METERS = 6;
/** Base height above the floor; each shape is nudged up slightly to avoid coplanar fill flicker. */
const SHAPE_BASE_Y = 0.03;
const SHAPE_Y_STEP = 0.004;
/** Safety cap (raid sets are tiny; this only guards against a pathological import). */
const MAX_SHAPES = 100;

interface DrawnShapesProps {
  markersState?: MapMarkersState | null;
  fight: FightFragment;
  timeRef?: React.RefObject<number> | { current: number };
  markDirty?: () => void;
}

function formatMeters(meters: number): string {
  return `${meters.toFixed(1)}m`;
}

export const DrawnShapes: React.FC<DrawnShapesProps> = ({
  markersState,
  fight,
  timeRef,
  markDirty,
}) => {
  const shapes = markersState?.shapes;

  const mapData = useMemo(() => {
    if (!markersState || !shapes || shapes.length === 0) {
      return null;
    }
    const sample = shapeAnchor(shapes[0]);
    return resolveZoneScaleData(fight, markersState.zoneId, { x: sample[0], z: sample[1] });
  }, [fight, markersState, shapes]);

  const unitScale = useMemo(() => (mapData ? computeUnitScale(mapData) : null), [mapData]);

  const rendered = useMemo(() => {
    if (!shapes || !mapData || !unitScale) {
      return [];
    }

    const dashSize = unitScale.unitsPerMeter * 1.2;
    const gapSize = unitScale.unitsPerMeter * 0.8;
    const labelSize = unitScale.unitsPerMeter * LABEL_METERS;

    const items: React.ReactNode[] = [];
    for (const shape of shapes) {
      if (items.length >= MAX_SHAPES) break;

      const anchorWorld = shapeAnchor(shape);
      if (!isWithinMapBounds(mapData, anchorWorld[0], anchorWorld[1], shape.worldY)) {
        continue;
      }

      const outlineWorld = shapeOutlineWorld(shape);
      if (outlineWorld.length < 2) {
        continue;
      }

      const points = outlineWorld.map(([x, z]) => {
        const a = worldToArena(mapData, x, z);
        return [a.x, a.z] as [number, number];
      });
      const anchorArena = worldToArena(mapData, anchorWorld[0], anchorWorld[1]);

      const distanceLabel =
        shape.kind === 'ruler' ? formatMeters(pathLengthMeters(shape.vertices)) : undefined;
      const label =
        shape.kind === 'ruler'
          ? shape.label
            ? `${shape.label} · ${distanceLabel}`
            : distanceLabel
          : shape.label;

      const closed = isClosedKind(shape.kind);

      items.push(
        <DrawnShape3D
          key={shape.id}
          points={points}
          closed={closed}
          fill={shape.style.fill && closed}
          colour={shape.style.colour}
          width={shape.style.width}
          dashed={shape.style.dashed}
          dashSize={dashSize}
          gapSize={gapSize}
          label={label}
          labelPoint={[anchorArena.x, anchorArena.z]}
          labelSize={labelSize}
          y={SHAPE_BASE_Y + items.length * SHAPE_Y_STEP}
          timeRef={timeRef}
          time={shape.time}
          markDirty={markDirty}
        />,
      );
    }

    return items;
  }, [shapes, mapData, unitScale, timeRef, markDirty]);

  if (rendered.length === 0) {
    return null;
  }

  return <group>{rendered}</group>;
};
