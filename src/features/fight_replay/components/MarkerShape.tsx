/**
 * Marker shape geometries based on M0RMarkers texture types.
 *
 * Shapes are authored in local XY space with +Y pointing "up"/forward (this matters for the
 * directional arrow: after the parent group applies pitch = -90°, local +Y lays flat on the
 * floor and yaw rotates the heading). Every shape is rendered with a thin dark outline behind
 * the fill so markers stay legible on a same-colour floor.
 */
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// THREE.Shape is missing from @types/three 0.183.x (packaging bug — the class exists at runtime).
// This local interface provides the minimum surface needed by the shape factory functions below.
/* eslint-disable no-redeclare, @typescript-eslint/no-explicit-any */
interface ThreeShape {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
}
const ThreeShape = (THREE as any).Shape as new () => ThreeShape;
/* eslint-enable no-redeclare, @typescript-eslint/no-explicit-any */

interface MarkerShapeProps {
  /** Texture path from M0RMarkers (e.g., "M0RMarkers/textures/circle.dds") */
  texturePath: string;
  /** Size (diameter) in meters */
  size: number;
  /** RGBA color */
  color: THREE.Color;
  /** Alpha (transparency) value */
  opacity: number;
}

/** Fraction of the radius used for the outline ring thickness. */
const OUTLINE_SCALE = 1.14;
/** Dark, semi-opaque outline that reads against bright and dark floors alike. */
const OUTLINE_COLOR = new THREE.Color(0.04, 0.05, 0.08);

/**
 * Extracts the shape type from a texture path
 * @param texturePath - Full texture path (e.g., "M0RMarkers/textures/circle.dds")
 * @returns Shape name (e.g., "circle", "hexagon", etc.)
 */
function getShapeFromTexture(texturePath: string): string {
  // Extract filename from path: "M0RMarkers/textures/circle.dds" -> "circle"
  const match = texturePath.match(/\/([^/]+)\.dds$/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  // Default to circle if we can't parse
  return 'circle';
}

/**
 * Creates a regular polygon shape with `sides` vertices, first vertex pointing up (+Y).
 */
function createPolygonShape(radius: number, sides: number): ThreeShape {
  const shape = new ThreeShape();
  const angleStep = (Math.PI * 2) / sides;

  shape.moveTo(0, radius);
  for (let i = 1; i <= sides; i++) {
    const angle = angleStep * i - Math.PI / 2;
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return shape;
}

/**
 * Creates a diamond (45-degree rotated square) shape
 */
function createDiamondShape(radius: number): ThreeShape {
  const shape = new ThreeShape();
  shape.moveTo(0, radius);
  shape.lineTo(radius, 0);
  shape.lineTo(0, -radius);
  shape.lineTo(-radius, 0);
  shape.lineTo(0, radius);
  return shape;
}

/**
 * Creates a square shape
 */
function createSquareShape(radius: number): ThreeShape {
  const shape = new ThreeShape();
  const halfSize = radius * 0.85; // Slightly smaller to match visual size

  shape.moveTo(-halfSize, halfSize);
  shape.lineTo(halfSize, halfSize);
  shape.lineTo(halfSize, -halfSize);
  shape.lineTo(-halfSize, -halfSize);
  shape.lineTo(-halfSize, halfSize);
  return shape;
}

/**
 * Creates a chevron (arrow/V shape) pointing up (+Y)
 */
function createChevronShape(radius: number): ThreeShape {
  const shape = new ThreeShape();

  // Outer V shape
  shape.moveTo(0, radius); // Top point
  shape.lineTo(radius * 0.8, -radius * 0.4); // Right outer point
  shape.lineTo(radius * 0.5, -radius * 0.1); // Right inner point
  shape.lineTo(0, radius * 0.5); // Top inner point
  shape.lineTo(-radius * 0.5, -radius * 0.1); // Left inner point
  shape.lineTo(-radius * 0.8, -radius * 0.4); // Left outer point
  shape.lineTo(0, radius); // Back to top

  return shape;
}

/**
 * Creates a directional arrow pointing up (+Y): a triangular head over a rectangular shaft.
 * Proportioned so the head stays readable even when the marker is rendered small.
 */
function createArrowShape(radius: number): ThreeShape {
  const shape = new ThreeShape();

  const headHalfWidth = radius * 0.62;
  const headBaseY = radius * 0.12; // where the triangular head meets the shaft
  const shaftHalfWidth = radius * 0.26;
  const shaftBottomY = -radius * 0.92;

  // Arrowhead (tip at top, +Y)
  shape.moveTo(0, radius); // tip
  shape.lineTo(headHalfWidth, headBaseY); // right corner of head
  shape.lineTo(shaftHalfWidth, headBaseY); // step in to shaft (right)
  shape.lineTo(shaftHalfWidth, shaftBottomY); // shaft right-bottom
  shape.lineTo(-shaftHalfWidth, shaftBottomY); // shaft left-bottom
  shape.lineTo(-shaftHalfWidth, headBaseY); // step out to head (left)
  shape.lineTo(-headHalfWidth, headBaseY); // left corner of head
  shape.lineTo(0, radius); // back to tip

  return shape;
}

type ShapeFactory = (radius: number) => ThreeShape;

/**
 * Resolves the geometry factory for a given marker shape type. Non-circular shapes return a
 * factory; circle/blank/sharkpog/unknown return null (rendered as a CircleGeometry instead).
 */
function getShapeFactory(shapeType: string): ShapeFactory | null {
  switch (shapeType) {
    case 'hexagon':
      return (r) => createPolygonShape(r, 6);
    case 'octagon':
      return (r) => createPolygonShape(r, 8);
    case 'diamond':
      return createDiamondShape;
    case 'square':
      return createSquareShape;
    case 'chevron':
      return createChevronShape;
    case 'arrow':
      return createArrowShape;
    default:
      return null;
  }
}

function buildGeometry(factory: ShapeFactory | null, radius: number): THREE.BufferGeometry {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  if (factory) {
    return new THREE.ShapeGeometry(factory(radius) as any);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new THREE.CircleGeometry(radius, 48);
}

/**
 * Renders the appropriate marker shape based on texture type, with a dark outline backing for
 * contrast against any floor colour.
 */
export const MarkerShape: React.FC<MarkerShapeProps> = ({ texturePath, size, color, opacity }) => {
  const radius = size / 2;
  const shapeType = getShapeFromTexture(texturePath);

  const factory = useMemo(() => getShapeFactory(shapeType), [shapeType]);

  // Fill geometry (foreground).
  const geometry = useMemo(() => buildGeometry(factory, radius), [factory, radius]);

  // Outline geometry: same shape, slightly larger, rendered behind the fill.
  const outlineGeometry = useMemo(
    () => buildGeometry(factory, radius * OUTLINE_SCALE),
    [factory, radius],
  );

  // Dispose geometries on unmount or when shape/radius changes.
  useEffect(() => {
    return () => {
      geometry.dispose();
      outlineGeometry.dispose();
    };
  }, [geometry, outlineGeometry]);

  return (
    <group>
      {/* Outline (slightly behind the fill on the local +Z axis so it never z-fights). */}
      <mesh geometry={outlineGeometry} position={[0, 0, -0.002]}>
        <meshBasicMaterial
          color={OUTLINE_COLOR}
          opacity={Math.min(1, opacity) * 0.85}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Fill */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={color}
          opacity={opacity}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
