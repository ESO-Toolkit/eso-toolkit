/**
 * Decoder for M0RMarkers encoded strings
 * Based on the format from https://github.com/M0RGaming/M0RMarkers/blob/main/main.lua#L318
 *
 * Format: <zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions>
 *
 * Example breakdown:
 * - zone: Zone ID where markers belong
 * - timestamp: Unix timestamp of last edit
 * - minX:minY:minZ: Minimum coordinates (hex) for relative positioning
 * - sizes: Size overrides "size:index1,index2;size2:index3"
 * - pitches: Pitch angles in degrees "pitch:index1,index2"
 * - yaws: Yaw angles in degrees "yaw:index1,index2"
 * - colours: Hex colors "rrggbb:index1,index2;aabbcc:index3"
 * - textures: Texture paths or lookup refs "^1:index1;path.dds:index2"
 * - positions: Hex coords with optional text "x:y:z:text,x2:y2:z2:text2"
 */

import { DecodedMorMarkers, MorMarker, TEXTURE_LOOKUP } from '../types/mapMarkers';

/**
 * Convert hex color string (e.g., "ff0000") to RGBA array with alpha 1
 */
function hexToRGBA(hex: string): [number, number, number, number] {
  // Handle with or without alpha channel
  if (hex.length === 8) {
    // RRGGBBAA format
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = parseInt(hex.substring(6, 8), 16) / 255;
    return [r, g, b, a];
  } else {
    // RRGGBB format (assume full opacity)
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return [r, g, b, 1];
  }
}

/**
 * Convert degrees to radians
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Unescape text that was encoded for transmission
 * - \\n → newline
 * - \uE000 → :
 * - \uE001 → ,
 * - \uE002 → ]
 * - \uE003 → ;
 * - \uE004 → >
 */
function unescapeText(text: string): string {
  let result = text;

  // Replace literal \\n with newline
  result = result.replace(/\\n/g, '\n');

  // Replace Unicode private use area characters
  result = result.replace(/\uE000/g, ':');
  result = result.replace(/\uE001/g, ',');
  result = result.replace(/\uE002/g, ']');
  result = result.replace(/\uE003/g, ';');
  result = result.replace(/\uE004/g, '>');

  return result;
}

/**
 * Parse a section like "value:index1,index2;value2:index3,index4"
 * Returns a Map of index -> value
 */
function parseIndexedSection<T>(
  section: string,
  valueParser: (value: string) => T,
): Map<number, T> {
  const result = new Map<number, T>();

  if (!section || section.trim() === '') {
    return result;
  }

  const groups = section.split(';');
  for (const group of groups) {
    if (!group.trim()) continue;

    const parts = group.split(':');
    if (parts.length < 2) continue;

    const value = valueParser(parts[0]);
    const indicesStr = parts.slice(1).join(':'); // In case there are colons in the indices
    const indices = indicesStr.split(',').filter((s) => s.trim() !== '');

    for (const indexStr of indices) {
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        result.set(index, value);
      }
    }
  }

  return result;
}

/**
 * Decode a M0RMarkers encoded string
 *
 * @param encodedString - The encoded marker string from M0RMarkers
 * @returns Decoded markers data or null if invalid
 */
export function decodeMorMarkersString(encodedString: string): DecodedMorMarkers | null {
  // Validate format: should start with < and end with >
  if (!encodedString || !encodedString.startsWith('<') || !encodedString.endsWith('>')) {
    return null;
  }

  // Remove < and > brackets
  const content = encodedString.substring(1, encodedString.length - 1);

  // Split by ] to get sections
  // Format: zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions
  // We need to be careful as the positions section can contain ] in escaped text
  // Strategy: Take first 8 sections normally, rest is positions
  const sections = content.split(']');

  // We need at least 9 sections
  if (sections.length < 9) {
    return null;
  }

  const zoneStr = sections[0];
  const timestampStr = sections[1];
  const minsStr = sections[2];
  const sizesStr = sections[3];
  const pitchesStr = sections[4];
  const yawsStr = sections[5];
  const coloursStr = sections[6];
  const texturesStr = sections[7];
  // Everything from index 8 onwards is positions (may contain ] in escaped text)
  const positionsStr = sections.slice(8).join(']');

  // Parse zone and timestamp
  const zone = parseInt(zoneStr, 10);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(zone) || isNaN(timestamp)) {
    return null;
  }

  // Parse minimum coordinates (hex format)
  const minParts = minsStr.split(':');
  if (minParts.length !== 3) {
    return null;
  }

  const minX = parseInt(minParts[0], 16);
  const minY = parseInt(minParts[1], 16);
  const minZ = parseInt(minParts[2], 16);

  if (isNaN(minX) || isNaN(minY) || isNaN(minZ)) {
    return null;
  }

  // Parse indexed sections
  const sizes = parseIndexedSection(sizesStr, (s) => parseFloat(s));
  const pitches = parseIndexedSection(pitchesStr, (s) => degreesToRadians(parseFloat(s)));
  const yaws = parseIndexedSection(yawsStr, (s) => degreesToRadians(parseFloat(s)));
  const colours = parseIndexedSection(coloursStr, (s) => hexToRGBA(s));
  const textureLookup = parseIndexedSection(texturesStr, (s) => {
    // Check if it's a texture lookup reference (starts with ^)
    if (s.startsWith('^')) {
      const lookupKey = s.substring(1);
      return TEXTURE_LOOKUP[lookupKey] || s;
    }
    return s;
  });

  // Parse positions
  const markers: MorMarker[] = [];
  const positionEntries = positionsStr.split(',').filter((s) => s.trim() !== '');

  for (let i = 0; i < positionEntries.length; i++) {
    const entry = positionEntries[i];
    const parts = entry.split(':');

    if (parts.length < 3) continue;

    // Parse hex coordinates
    const xOffset = parseInt(parts[0], 16);
    const yOffset = parseInt(parts[1], 16);
    const zOffset = parseInt(parts[2], 16);

    if (isNaN(xOffset) || isNaN(yOffset) || isNaN(zOffset)) continue;

    // Calculate absolute position
    const x = xOffset + minX;
    const y = yOffset + minY;
    const z = zOffset + minZ;

    // Get text (if any) - everything after the third colon
    const text = parts.length > 3 ? unescapeText(parts.slice(3).join(':')) : '';

    // Marker index is 1-based in the encoding
    const markerIndex = i + 1;

    // Build marker with defaults
    const marker: MorMarker = {
      x,
      y,
      z,
      size: sizes.get(markerIndex) ?? 1, // default size is 1 meter
      bgTexture: textureLookup.get(markerIndex) ?? '',
      colour: colours.get(markerIndex) ?? [1, 1, 1, 1], // default white
      text,
    };

    // Set orientation if pitch or yaw is specified
    const pitch = pitches.get(markerIndex);
    const yaw = yaws.get(markerIndex);

    if (pitch !== undefined || yaw !== undefined) {
      marker.orientation = [pitch ?? 0, yaw ?? 0];
    }

    markers.push(marker);
  }

  return {
    zone,
    timestamp,
    markers,
  };
}
