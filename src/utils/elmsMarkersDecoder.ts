/**
 * Decoder for Elms Markers format
 * Format: /zone//x,y,z,iconKey/
 * Based on Elms Markers addon and M0RMarkers conversion logic
 */

import { MorMarker } from '../types/mapMarkers';

import { Logger, LogLevel } from './logger';

// Create logger instance for Elms decoder
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'ElmsDecoder',
});

/**
 * Icon mapping from Elms to M0RMarkers style
 * Based on M0RMarkers/elmsConvert.lua
 */
const ELMS_ICON_MAP: Record<number, Partial<MorMarker>> = {
  // Numbers 1-12
  1: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '1', size: 1.5 },
  2: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '2', size: 1.5 },
  3: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '3', size: 1.5 },
  4: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '4', size: 1.5 },
  5: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '5', size: 1.5 },
  6: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '6', size: 1.5 },
  7: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '7', size: 1.5 },
  8: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '8', size: 1.5 },
  9: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '9', size: 1.5 },
  10: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '10', size: 1.5 },
  11: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '11', size: 1.5 },
  12: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '12', size: 1.5 },

  // White arrow
  13: { bgTexture: 'M0RMarkers/textures/blank.dds', text: '↓', size: 1.5 },

  // Chevron (lime green)
  14: { bgTexture: 'M0RMarkers/textures/chevron.dds', colour: [0, 1, 0.65, 1] },

  // Squares
  15: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [0, 0, 1, 1] }, // blue
  16: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [0, 1, 0, 1] }, // green
  17: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [1, 0.5, 0, 1] }, // orange
  18: { bgTexture: 'M0RMarkers/textures/hexagon.dds', colour: [1, 0.5, 0, 1], text: 'OT' }, // orange hexagon OT
  19: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [1, 0, 0.9, 1] }, // pink
  20: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [1, 0, 0, 1] }, // red
  21: { bgTexture: 'M0RMarkers/textures/hexagon.dds', colour: [1, 0, 0, 1], text: 'MT' }, // red hexagon MT
  22: { bgTexture: 'M0RMarkers/textures/square.dds', colour: [1, 0.8, 0, 1] }, // yellow

  // Diamond (squaretwo) - Blue
  23: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 0, 1, 1] },
  24: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 0, 1, 1], text: '1' },
  25: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 0, 1, 1], text: '2' },
  26: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 0, 1, 1], text: '3' },
  27: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 0, 1, 1], text: '4' },

  // Diamond - Green
  28: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 1, 0, 1] },
  29: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 1, 0, 1], text: '1' },
  30: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 1, 0, 1], text: '2' },
  31: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 1, 0, 1], text: '3' },
  32: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [0, 1, 0, 1], text: '4' },

  // Diamond - Orange
  33: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.5, 0, 1] },
  34: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.5, 0, 1], text: '1' },
  35: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.5, 0, 1], text: '2' },
  36: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.5, 0, 1], text: '3' },
  37: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.5, 0, 1], text: '4' },

  // Diamond - Pink
  38: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0.9, 1] },

  // Diamond - Red
  39: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0, 1] },
  40: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0, 1], text: '1' },
  41: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0, 1], text: '2' },
  42: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0, 1], text: '3' },
  43: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0, 0, 1], text: '4' },

  // Diamond - Yellow
  44: { bgTexture: 'M0RMarkers/textures/diamond.dds', colour: [1, 0.8, 0, 1] },

  // Letters a-z
  45: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'a', size: 1.5 },
  46: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'b', size: 1.5 },
  47: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'c', size: 1.5 },
  48: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'd', size: 1.5 },
  49: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'e', size: 1.5 },
  50: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'f', size: 1.5 },
  51: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'g', size: 1.5 },
  52: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'h', size: 1.5 },
  53: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'i', size: 1.5 },
  54: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'j', size: 1.5 },
  55: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'k', size: 1.5 },
  56: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'l', size: 1.5 },
  57: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'm', size: 1.5 },
  58: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'n', size: 1.5 },
  59: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'o', size: 1.5 },
  60: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'p', size: 1.5 },
  61: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'q', size: 1.5 },
  62: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'r', size: 1.5 },
  63: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 's', size: 1.5 },
  64: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 't', size: 1.5 },
  65: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'u', size: 1.5 },
  66: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'v', size: 1.5 },
  67: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'w', size: 1.5 },
  68: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'x', size: 1.5 },
  69: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'y', size: 1.5 },
  70: { bgTexture: 'M0RMarkers/textures/blank.dds', text: 'z', size: 1.5 },

  // SharkPog equivalent
  71: { bgTexture: 'M0RMarkers/textures/sharkpog.dds', colour: [1, 1, 1, 1] },
};

/**
 * Parsed Elms marker entry
 */
interface _ElmsMarkerEntry {
  zone: number;
  x: number;
  y: number;
  z: number;
  iconKey: number;
}

/**
 * Result of decoding an Elms markers string
 */
export interface DecodedElmsMarkers {
  /** Zone ID (all markers should be from same zone) */
  zone: number;
  /** Array of decoded markers */
  markers: MorMarker[];
}

/**
 * Detects if a string is in Elms Markers format
 * @param input - Input string to check
 * @returns True if string appears to be Elms format
 */
export function isElmsMarkersFormat(input: string): boolean {
  // Elms format: /zone//x,y,z,iconKey/
  // Should have multiple occurrences of /number//number,number,number,number/
  const elmsPattern = /\/\d+\/\/\d+,\d+,\d+,\d+\//;
  return elmsPattern.test(input);
}

/**
 * Decodes an Elms Markers string into MorMarker format
 * @param elmsString - Elms markers string (format: /zone//x,y,z,iconKey/)
 * @returns Decoded markers in MorMarker format
 * @throws Error if string cannot be parsed
 */
export function decodeElmsMarkersString(elmsString: string): DecodedElmsMarkers {
  if (!elmsString || elmsString.trim() === '') {
    throw new Error('Empty Elms markers string');
  }

  const markers: MorMarker[] = [];
  let detectedZone: number | null = null;

  // Parse format: /zone//x,y,z,iconKey/
  // Using regex to extract all markers
  const markerPattern = /\/(\d+)\/\/(\d+),(\d+),(\d+),(\d+)\//g;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(elmsString)) !== null) {
    const [, zoneStr, xStr, yStr, zStr, iconKeyStr] = match;

    const zone = parseInt(zoneStr, 10);
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    const z = parseInt(zStr, 10);
    const iconKey = parseInt(iconKeyStr, 10);

    // Set zone from first marker
    if (detectedZone === null) {
      detectedZone = zone;
    }

    // Only include markers from the detected zone
    if (zone !== detectedZone) {
      continue;
    }

    // Look up icon mapping
    const iconTemplate = ELMS_ICON_MAP[iconKey];
    if (!iconTemplate) {
      logger.warn('Unknown Elms icon key, using default circle', { iconKey });
    }

    // Create marker with defaults
    const marker: MorMarker = {
      x,
      y: y + (iconTemplate?.size ? 50 * iconTemplate.size : 50), // Offset Y by half size (Elms convention)
      z,
      size: iconTemplate?.size || 1.0,
      bgTexture: iconTemplate?.bgTexture || 'M0RMarkers/textures/circle.dds',
      colour: iconTemplate?.colour || [1, 1, 1, 1],
      text: iconTemplate?.text,
      orientation: undefined, // Elms markers are floating (no orientation)
    };

    markers.push(marker);
  }

  if (markers.length === 0) {
    throw new Error('No valid Elms markers found in string');
  }

  if (detectedZone === null) {
    throw new Error('Could not detect zone from Elms markers');
  }

  return {
    zone: detectedZone,
    markers,
  };
}

/**
 * Converts Elms markers to M0RMarkers format string
 * @param elmsString - Elms markers string
 * @returns M0RMarkers format string
 * @throws Error if conversion fails
 */
export function convertElmsToMorMarkers(elmsString: string): string {
  const decoded = decodeElmsMarkersString(elmsString);

  // For simplicity, we'll just return a pseudo-M0RMarkers string
  // In practice, the UI will use decodeElmsMarkersString directly
  const timestamp = Math.floor(Date.now() / 1000);

  // Calculate bounds
  const minX = Math.min(...decoded.markers.map((m) => m.x));
  const minY = Math.min(...decoded.markers.map((m) => m.y));
  const minZ = Math.min(...decoded.markers.map((m) => m.z));

  // Build basic M0R format (simplified)
  return `<${decoded.zone}]${timestamp}]${minX.toString(16)}:${minY.toString(16)}:${minZ.toString(16)}]...(converted from Elms)>`;
}
