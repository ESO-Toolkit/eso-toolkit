// Constants for coordinate conversion (matching CalculateActorPositions.ts)
const ROTATION_SCALE = 100;
const ROTATION_OFFSET = Math.PI / 2;

// Constants for arena sizing
export const DEFAULT_UNITS_PER_PIXEL = 0.018; // 3D world units per image pixel

// Hardcoded arena constants
export const HARDCODED_ARENA_WIDTH = 100; // Arena width in 3D units
export const HARDCODED_ARENA_HEIGHT = 100; // Arena height in 3D units

/**
 * Interface representing arena dimensions in 3D space
 */
export interface ArenaDimensions {
  width: number;
  height: number;
}

/**
 * Interface representing arena bottom-left corner in game coordinates
 */
export interface ArenaBottomLeftGameCoords {
  x: number;
  y: number;
}

/**
 * Interface representing a bounding box from the API
 */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Get the bottom-left corner coordinates in game space (before 3D conversion)
 * For the hardcoded 100x100 arena, this always returns (0,0) as the bottom-left
 * is fixed at the origin.
 *
 * @param boundingBox - The bounding box from fight data (ignored, for compatibility)
 * @returns Bottom-left coordinates in game space (always 0,0 for hardcoded arena)
 */
export function getArenaBottomLeftGameCoords(): ArenaBottomLeftGameCoords {
  // For hardcoded 100x100 arena, bottom-left is always at origin
  return {
    x: 0,
    y: 0,
  };
}

/**
 * Convert game coordinates to 3D space coordinates
 * Maps coordinates to a hardcoded 100x100 arena with bottom-left at (0,0)
 *
 * @param x - Game X coordinate
 * @param y - Game Y coordinate
 * @param boundingBox - Bounding box to determine coordinate mapping
 * @returns Tuple of [x, y, z] coordinates in 3D space (y is always 0 for ground level)
 */
export function convertCoordinates(x: number, y: number): [number, number, number] {
  // Direct scaling: divide game coordinates by 100 to get arena coordinates
  // This maps game coordinate 5482 to arena coordinate 54.82
  const x3D = x / 100;
  // Negate Y coordinate because ESO Y increases north but 3D Z increases away from camera
  const z3D = -(y / 100);

  return [x3D, 0, z3D];
}

/**
 * Convert game coordinates to 3D space coordinates using bottom-left as origin
 * Maps coordinates to the hardcoded 100x100 arena with bottom-left at (0,0)
 *
 * @param x - Game X coordinate (raw coordinate from events, e.g., 5235)
 * @param y - Game Y coordinate (raw coordinate from events, e.g., 5410)
 * @returns Tuple of [x, y, z] coordinates in 3D space (y is always 0 for ground level)
 */
export function convertCoordinatesWithBottomLeft(x: number, y: number): [number, number, number] {
  // Scale down game coordinates by dividing by 100
  // Map texture is positioned at [50, -0.02, 50] with size 100, covering 0-100 range
  // Map texture has scale={[-1, 1, 1]} which flips it, so we need to flip X coordinate
  const x3D = 100 - x / 100; // Flip X to match the flipped map texture
  // Map Y coordinate to Z, but keep it positive since map covers 0-100 range
  const z3D = y / 100;

  return [x3D, 0, z3D];
}

/**
 * Convert game rotation/facing to 3D space rotation
 * This function matches the rotation conversion used in CalculateActorPositions.ts
 * Since we negate the Y coordinate in coordinate conversion, we also need to negate rotation
 *
 * @param facing - Game facing/rotation value
 * @returns Rotation in radians for 3D space
 */
export function convertRotation(facing: number): number {
  return -(facing / ROTATION_SCALE + ROTATION_OFFSET);
}
