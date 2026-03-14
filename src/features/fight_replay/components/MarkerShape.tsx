/**
 * Marker shape geometries based on M0RMarkers texture types
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

// @types/three 0.183.x is missing extras/core/Shape.d.ts — Shape exists at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ThreeShape = (THREE as any).Shape as new () => {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
};

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
 * Creates a hexagon shape
 */
function createHexagonShape(radius: number): InstanceType<typeof ThreeShape> {
  const shape = new ThreeShape();
  const sides = 6;
  const angleStep = (Math.PI * 2) / sides;

  shape.moveTo(0, radius);
  for (let i = 1; i <= sides; i++) {
    const angle = angleStep * i - Math.PI / 2;
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return shape;
}

/**
 * Creates an octagon shape
 */
function createOctagonShape(radius: number): InstanceType<typeof ThreeShape> {
  const shape = new ThreeShape();
  const sides = 8;
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
function createDiamondShape(radius: number): InstanceType<typeof ThreeShape> {
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
function createSquareShape(radius: number): InstanceType<typeof ThreeShape> {
  const shape = new ThreeShape();
  const halfSize = radius * 0.85;

  shape.moveTo(-halfSize, halfSize);
  shape.lineTo(halfSize, halfSize);
  shape.lineTo(halfSize, -halfSize);
  shape.lineTo(-halfSize, -halfSize);
  shape.lineTo(-halfSize, halfSize);
  return shape;
}

/**
 * Creates a chevron (arrow/V shape) pointing up
 */
function createChevronShape(radius: number): InstanceType<typeof ThreeShape> {
  const shape = new ThreeShape();
  shape.moveTo(0, radius);
  shape.lineTo(radius * 0.8, -radius * 0.4);
  shape.lineTo(radius * 0.5, -radius * 0.1);
  shape.lineTo(0, radius * 0.5);
  shape.lineTo(-radius * 0.5, -radius * 0.1);
  shape.lineTo(-radius * 0.8, -radius * 0.4);
  shape.lineTo(0, radius);
  return shape;
}

/**
 * Renders the appropriate marker shape based on texture type
 */
export const MarkerShape: React.FC<MarkerShapeProps> = ({ texturePath, size, color, opacity }) => {
  const radius = size / 2;
  const shapeType = getShapeFromTexture(texturePath);

  const geometry = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    switch (shapeType) {
      case 'hexagon':
        return new THREE.ShapeGeometry(createHexagonShape(radius) as any);
      case 'octagon':
        return new THREE.ShapeGeometry(createOctagonShape(radius) as any);
      case 'diamond':
        return new THREE.ShapeGeometry(createDiamondShape(radius) as any);
      case 'square':
        return new THREE.ShapeGeometry(createSquareShape(radius) as any);
      case 'chevron':
        return new THREE.ShapeGeometry(createChevronShape(radius) as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      case 'circle':
      case 'blank':
      case 'sharkpog':
      default:
        return new THREE.CircleGeometry(radius, 32);
    }
  }, [shapeType, radius]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        opacity={opacity}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
