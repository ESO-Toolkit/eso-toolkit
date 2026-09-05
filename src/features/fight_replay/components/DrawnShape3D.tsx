/**
 * Renders one drawn shape (polyline / polygon / circle / rect / ruler) flat on the arena floor.
 *
 * - The outline uses drei <Line> (Line2/LineMaterial) so width is real screen pixels and dashes
 *   work — plain THREE.Line linewidth is ignored by WebGL.
 * - Closed, fill-eligible shapes get a translucent THREE.ShapeGeometry fill, authored in (x, z)
 *   and laid flat by a +90deg X rotation so local (x, z) maps to world (x, z) at a fixed height.
 * - An optional label (or the ruler's measured distance) renders as a camera-facing sprite.
 * - When the shape carries a time window it is shown only while playback time is inside it; the
 *   visibility flip is driven imperatively in useFrame (reading the shared timeRef) and pokes the
 *   on-demand render loop via markDirty so it repaints while paused.
 */
import { Line } from '@react-three/drei/core/Line.js';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { RenderPriority } from '../constants/renderPriorities';
import { createShapeLabelTexture } from '../utils/shapeLabelTexture';

// tsc still resolves THREE.Shape / THREE.ShapeGeometry to divergent identities under this
// tsconfig (verified 2026-09, three 0.185.4 + @types/three 0.185.4) — the cast is load-bearing,
// not stale. Re-verify when upgrading either package or moduleResolution.
type CompatibleShape = THREE.Shape;
/* eslint-disable @typescript-eslint/no-explicit-any */
const toGeometryShape = (shape: CompatibleShape): any => shape;
/* eslint-enable @typescript-eslint/no-explicit-any */

type ArenaPoint = [number, number];

export interface DrawnShape3DProps {
  /** Arena-space outline points [x, z], in draw order. */
  points: ArenaPoint[];
  /** Whether the outline closes into a loop (polygon / rect / circle). */
  closed: boolean;
  /** Draw a translucent fill (closed shapes only). */
  fill: boolean;
  /** RGBA 0-1. */
  colour: [number, number, number, number];
  /** Outline width in screen pixels. */
  width: number;
  dashed: boolean;
  /** Dash + gap length in arena units (only used when dashed). */
  dashSize: number;
  gapSize: number;
  /** Optional label text; for a ruler the caller passes the measured distance (e.g. "12.4m"). */
  label?: string;
  /** Arena-space anchor for the label. */
  labelPoint: ArenaPoint;
  /** Label sprite height in arena units. */
  labelSize: number;
  /** Base arena Y for this shape (fill sits here, outline + label stack just above). */
  y: number;
  timeRef?: React.RefObject<number> | { current: number };
  /** [startMs, endMs] relative to fight start — when set, shape only shows inside the window. */
  time?: [number, number];
  markDirty?: () => void;
}

function inWindow(time: [number, number] | undefined, t: number): boolean {
  if (!time) return true;
  return t >= time[0] && t <= time[1];
}

/** Per-shape visibility subscriber, mounted only while the shape carries a time window. */
const TimedReveal = ({
  groupRef,
  timeRef,
  time,
  markDirty,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  timeRef?: React.RefObject<number> | { current: number };
  time: [number, number];
  markDirty?: () => void;
}): null => {
  useFrame(() => {
    if (!groupRef.current) {
      return;
    }
    const visible = inWindow(time, timeRef ? timeRef.current : 0);
    if (groupRef.current.visible !== visible) {
      groupRef.current.visible = visible;
      markDirty?.();
    }
  }, RenderPriority.EFFECTS);
  return null;
};

export const DrawnShape3D: React.FC<DrawnShape3DProps> = ({
  points,
  closed,
  fill,
  colour,
  width,
  dashed,
  dashSize,
  gapSize,
  label,
  labelPoint,
  labelSize,
  y,
  timeRef,
  time,
  markDirty,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const color = useMemo(() => new THREE.Color(colour[0], colour[1], colour[2]), [colour]);
  const opacity = colour[3];

  const fillY = y;
  const lineY = y + 0.02;
  const labelY = y + 0.06;

  // Outline as 3D points; closed shapes repeat the first vertex so the loop visibly closes.
  const linePoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = points.map(([x, z]) => [x, lineY, z]);
    if (closed && points.length > 2) {
      pts.push([points[0][0], lineY, points[0][1]]);
    }
    return pts;
  }, [points, closed, lineY]);

  // Translucent fill geometry for closed shapes (authored in x/z, laid flat by the parent rotation).
  const fillGeometry = useMemo<THREE.ShapeGeometry | null>(() => {
    if (!fill || !closed || points.length < 3) {
      return null;
    }
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    return new THREE.ShapeGeometry(toGeometryShape(shape));
  }, [fill, closed, points]);

  useEffect(() => {
    return () => {
      fillGeometry?.dispose();
    };
  }, [fillGeometry]);

  const labelTexture = useMemo(
    () => (label && label.trim().length > 0 ? createShapeLabelTexture(label) : null),
    [label],
  );
  useEffect(() => {
    return () => {
      labelTexture?.dispose();
    };
  }, [labelTexture]);

  // Timed reveal: gate visibility on the live playback clock without re-rendering React.
  // The subscriber only exists while a time window is set — untimed shapes are always visible,
  // so mounting a per-shape useFrame for them would wake JS every rAF for zero work.
  const initialVisible = inWindow(time, timeRef ? timeRef.current : 0);
  const timedReveal = time ? (
    <TimedReveal groupRef={groupRef} timeRef={timeRef} time={time} markDirty={markDirty} />
  ) : null;

  if (linePoints.length < 2) {
    return null;
  }

  return (
    <group ref={groupRef} visible={initialVisible}>
      {timedReveal}
      {fillGeometry && (
        <mesh geometry={fillGeometry} rotation={[Math.PI / 2, 0, 0]} position={[0, fillY, 0]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={Math.min(1, opacity) * 0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <Line
        points={linePoints}
        color={color}
        lineWidth={width}
        dashed={dashed}
        dashSize={dashSize}
        gapSize={gapSize}
        transparent
        opacity={Math.min(1, opacity)}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />

      {labelTexture && (
        <sprite
          position={[labelPoint[0], labelY, labelPoint[1]]}
          scale={[labelSize * 2, labelSize, 1]}
        >
          <spriteMaterial map={labelTexture} transparent depthTest={false} />
        </sprite>
      )}
    </group>
  );
};
