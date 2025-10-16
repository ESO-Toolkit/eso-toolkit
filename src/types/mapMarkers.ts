/**
 * Types for Map Markers (M0R and Elms formats)
 * Based on M0RMarkers: https://github.com/M0RGaming/M0RMarkers
 * And Elms Markers format
 */

/**
 * Represents a single marker in 3D space
 * Used by both M0R and Elms marker formats
 */
export interface MorMarker {
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space (height) */
  y: number;
  /** Z coordinate in world space */
  z: number;
  /** Size of the marker in meters */
  size: number;
  /** Background texture/shape identifier (optional - if not provided, only text will be shown) */
  bgTexture?: string;
  /** RGBA color values (0-1 range) */
  colour: [number, number, number, number];
  /** Optional text label on the marker */
  text?: string;
  /** Optional orientation [pitch, yaw] in radians. If undefined, marker is "floating" (always faces camera) */
  orientation?: [number, number];
}

/**
 * Decoded marker data from a M0RMarkers string
 */
export interface DecodedMorMarkers {
  /** Zone ID where these markers belong */
  zone: number;
  /** Unix timestamp of when markers were last edited */
  timestamp: number;
  /** Array of decoded markers */
  markers: MorMarker[];
}

/**
 * Built-in texture lookup table
 * Maps texture IDs (^1, ^2, etc.) to texture paths
 */
export const TEXTURE_LOOKUP: Record<string, string> = {
  '1': 'M0RMarkers/textures/circle.dds',
  '2': 'M0RMarkers/textures/hexagon.dds',
  '3': 'M0RMarkers/textures/square.dds',
  '4': 'M0RMarkers/textures/diamond.dds',
  '5': 'M0RMarkers/textures/octagon.dds',
  '6': 'M0RMarkers/textures/chevron.dds',
  '7': 'M0RMarkers/textures/blank.dds',
  '8': 'M0RMarkers/textures/sharkpog.dds',
};
