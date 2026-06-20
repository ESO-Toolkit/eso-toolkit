/**
 * Pure geometry helpers for drawn shapes. All inputs/outputs that name "world" are ESO world
 * centimetres ([x, z] pairs); metres are the human-scale unit used in labels and the ruler.
 */
import { ReplayShape } from '../types/mapMarkers';

type Point = [number, number];

/** Straight-line distance in METRES between two world-cm points. */
export function worldDistanceMeters(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 100;
}

/** Total length in METRES along a path of world-cm vertices (0 for < 2 points). */
export function pathLengthMeters(vertices: Point[]): number {
  let total = 0;
  for (let i = 1; i < vertices.length; i++) {
    total += worldDistanceMeters(vertices[i - 1], vertices[i]);
  }
  return total;
}

/** A representative world-cm point for bounds/floor filtering and label anchoring. */
export function shapeAnchor(shape: Pick<ReplayShape, 'kind' | 'vertices'>): Point {
  const v = shape.vertices;
  if (v.length === 0) return [0, 0];

  if (shape.kind === 'circle') {
    return v[0];
  }
  if (shape.kind === 'rect' || shape.kind === 'ruler') {
    return [(v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2];
  }
  // polyline / polygon: centroid of the vertices.
  let sx = 0;
  let sz = 0;
  for (const [x, z] of v) {
    sx += x;
    sz += z;
  }
  return [sx / v.length, sz / v.length];
}

/**
 * Sample `segments` world-cm points around a circle (centre world-cm, radius metres). Returned as
 * an open ring (the renderer/encoder closes it). Sampling in WORLD space then transforming each
 * point per-vertex makes the rendered circle map-faithful even on non-square maps (no ellipse vs
 * sqrt-mean ambiguity).
 */
export function sampleCircleWorld(center: Point, radiusMeters: number, segments = 64): Point[] {
  return sampleCircle(center, radiusMeters * 100, segments);
}

/** Sample `segments` points around a circle in WHATEVER unit `radius` is given (world cm or arena). */
export function sampleCircle(center: Point, radius: number, segments = 64): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]);
  }
  return points;
}

/** Axis-aligned rectangle (world-cm) from two opposite corners → a 4-point ring. */
export function rectRingWorld(a: Point, b: Point): Point[] {
  return [
    [a[0], a[1]],
    [b[0], a[1]],
    [b[0], b[1]],
    [a[0], b[1]],
  ];
}

/**
 * The world-cm outline points to render for a shape, in draw order:
 * - polyline / ruler → the vertices as-is (open path)
 * - polygon          → the vertex ring (open; caller closes)
 * - rect             → 4 corners from the two stored corners
 * - circle           → a sampled ring around the centre
 */
export function shapeOutlineWorld(shape: ReplayShape, circleSegments = 64): Point[] {
  switch (shape.kind) {
    case 'circle':
      return shape.radius && shape.radius > 0
        ? sampleCircleWorld(shape.vertices[0], shape.radius, circleSegments)
        : [];
    case 'rect':
      return rectRingWorld(shape.vertices[0], shape.vertices[1]);
    default:
      return shape.vertices.map(([x, z]) => [x, z] as Point);
  }
}

/** Whether a shape kind forms a closed loop (and is fill-eligible). */
export function isClosedKind(kind: ReplayShape['kind']): boolean {
  return kind === 'polygon' || kind === 'rect' || kind === 'circle';
}
