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
  /** Optional Elms icon key when marker originated from Elms marker set */
  elmsIconKey?: number;
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
  // ^9-^21 are the rest of M0RMarkers' built-in texture list (verified from the addon source,
  // main.lua builtInTextureList). Including them means alliance/role/class icons round-trip
  // losslessly through M0R import/export and transfer correctly in-game.
  '9': 'esoui/art/stats/alliancebadge_aldmeri.dds',
  '10': 'esoui/art/stats/alliancebadge_ebonheart.dds',
  '11': 'esoui/art/stats/alliancebadge_daggerfall.dds',
  '12': 'esoui/art/lfg/gamepad/lfg_roleicon_dps.dds',
  '13': 'esoui/art/lfg/gamepad/lfg_roleicon_tank.dds',
  '14': 'esoui/art/lfg/gamepad/lfg_roleicon_healer.dds',
  '15': 'esoui/art/icons/class/gamepad/gp_class_dragonknight.dds',
  '16': 'esoui/art/icons/class/gamepad/gp_class_sorcerer.dds',
  '17': 'esoui/art/icons/class/gamepad/gp_class_nightblade.dds',
  '18': 'esoui/art/icons/class/gamepad/gp_class_warden.dds',
  '19': 'esoui/art/icons/class/gamepad/gp_class_necromancer.dds',
  '20': 'esoui/art/icons/class/gamepad/gp_class_templar.dds',
  '21': 'esoui/art/icons/class/gamepad/gp_class_arcanist.dds',
  // NOTE: the esotk-native directional arrow ("M0RMarkers/textures/arrow.dds") is intentionally
  // NOT in this table. It is not a real M0R built-in texture, so M0R export must emit its full
  // path (which still round-trips here) rather than a fake lookup id that real M0R can't read.
};

/**
 * ESO class -> its M0RMarkers built-in class-icon texture path (^15-^21). These markers render in
 * the editor via the bundled class glyphs (resolveMarkerIconUrl) and transfer in-game as the M0R
 * built-in class icon. Keep these paths identical to TEXTURE_LOOKUP ^15-^21 so they reverse-map.
 */
export const ESO_CLASS_TEXTURES: Record<string, string> = {
  dragonknight: 'esoui/art/icons/class/gamepad/gp_class_dragonknight.dds',
  sorcerer: 'esoui/art/icons/class/gamepad/gp_class_sorcerer.dds',
  nightblade: 'esoui/art/icons/class/gamepad/gp_class_nightblade.dds',
  warden: 'esoui/art/icons/class/gamepad/gp_class_warden.dds',
  necromancer: 'esoui/art/icons/class/gamepad/gp_class_necromancer.dds',
  templar: 'esoui/art/icons/class/gamepad/gp_class_templar.dds',
  arcanist: 'esoui/art/icons/class/gamepad/gp_class_arcanist.dds',
};
