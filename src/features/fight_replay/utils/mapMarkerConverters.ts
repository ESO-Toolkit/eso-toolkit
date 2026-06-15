import { v4 as uuidv4 } from 'uuid';

import { MorMarker, TEXTURE_LOOKUP } from '@/types/mapMarkers';
import { ZoneScaleData } from '@/types/zoneScaleData';
import {
  DecodedElmsMarkers,
  ELMS_ICON_MAP,
  isElmsMarkersFormat,
  decodeElmsMarkersString,
} from '@/utils/elmsMarkersDecoder';
import { decodeMorMarkersString } from '@/utils/morMarkersDecoder';

import { MapMarkersState, MarkerFormat, ReplayMarker } from '../types/mapMarkers';

const COLOR_TOLERANCE = 0.05;
const SIZE_TOLERANCE = 0.05;

export const COMMON_ELMS_ICON_KEYS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 21, 22,
];

const ICON_LABEL_OVERRIDES: Record<number, string> = {
  1: 'Number 1',
  2: 'Number 2',
  3: 'Number 3',
  4: 'Number 4',
  5: 'Number 5',
  6: 'Number 6',
  7: 'Number 7',
  8: 'Number 8',
  9: 'Number 9',
  10: 'Number 10',
  13: 'Arrow',
  14: 'Chevron',
  15: 'Blue Square',
  16: 'Green Square',
  17: 'Orange Square',
  18: 'OT Hex',
  20: 'Red Square',
  21: 'MT Hex',
  22: 'Yellow Square',
};

function deriveLabel(iconKey: number): string {
  if (ICON_LABEL_OVERRIDES[iconKey]) {
    return ICON_LABEL_OVERRIDES[iconKey];
  }

  const template = ELMS_ICON_MAP[iconKey];
  if (!template) {
    return `Icon ${iconKey}`;
  }

  if (template.text) {
    return `Marker ${template.text}`;
  }

  if (template.bgTexture) {
    const parts = template.bgTexture.split('/');
    const last = parts[parts.length - 1] ?? `icon-${iconKey}`;
    return last.replace('.dds', '').replace(/[-_]/g, ' ');
  }

  return `Icon ${iconKey}`;
}

export interface MarkerMenuOption {
  iconKey: number;
  label: string;
  sample?: string;
}

export type MarkerGroupKey = 'numbers' | 'arrows' | 'squares' | 'hexes';

interface MarkerGroupDefinition {
  key: MarkerGroupKey;
  iconKeys: number[];
}

export interface MarkerGroup {
  key: MarkerGroupKey;
  label: string;
  options: MarkerMenuOption[];
}

const GROUP_LABEL_OVERRIDES: Partial<Record<MarkerGroupKey, string>> = {
  numbers: 'Numbers',
  arrows: 'Arrows & Chevron',
  squares: 'Squares',
  hexes: 'Hexagons',
};

const MARKER_GROUPS: MarkerGroupDefinition[] = [
  {
    key: 'numbers',
    iconKeys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    key: 'arrows',
    iconKeys: [13, 14],
  },
  {
    key: 'squares',
    iconKeys: [15, 16, 17, 20, 22],
  },
  {
    key: 'hexes',
    iconKeys: [18, 21],
  },
];

export const COMMON_MARKER_OPTIONS: MarkerMenuOption[] = COMMON_ELMS_ICON_KEYS.map((iconKey) => ({
  iconKey,
  label: deriveLabel(iconKey),
  sample: ELMS_ICON_MAP[iconKey]?.text,
}));

function deriveGroupLabel(definition: MarkerGroupDefinition): string {
  const [first, ...rest] = definition.key;
  if (!first) {
    return 'Markers';
  }

  return `${first.toUpperCase()}${rest.join('')}`;
}

export const COMMON_MARKER_GROUPS: MarkerGroup[] = MARKER_GROUPS.map((definition) => ({
  key: definition.key,
  label: GROUP_LABEL_OVERRIDES[definition.key] ?? deriveGroupLabel(definition),
  options: definition.iconKeys
    .map((iconKey: number) => COMMON_MARKER_OPTIONS.find((option) => option.iconKey === iconKey))
    .filter((option): option is MarkerMenuOption => Boolean(option)),
}));

const REVERSE_TEXTURE_LOOKUP: Record<string, string> = Object.entries(TEXTURE_LOOKUP).reduce(
  (acc, [key, value]) => {
    acc[value] = `^${key}`;
    return acc;
  },
  {} as Record<string, string>,
);

function generateMarkerId(prefix: string, index: number): string {
  return `${prefix}-${index}-${uuidv4()}`;
}

function cloneMarker(marker: MorMarker): MorMarker {
  return {
    ...marker,
    colour: [...marker.colour] as [number, number, number, number],
    orientation: marker.orientation ? ([...marker.orientation] as [number, number]) : undefined,
  };
}

function buildReplayMarker(
  marker: MorMarker,
  source: 'imported' | 'manual',
  index: number,
): ReplayMarker {
  return {
    ...cloneMarker(marker),
    id: generateMarkerId('marker', index),
    source,
  };
}

export function createMarkerFromElmsIcon(
  iconKey: number,
  position: { x: number; y: number; z: number },
): MorMarker {
  const template = ELMS_ICON_MAP[iconKey];

  if (!template) {
    throw new Error(`Unknown Elms icon key: ${iconKey}`);
  }

  const colour: [number, number, number, number] = template.colour
    ? ([...template.colour] as [number, number, number, number])
    : [1, 1, 1, 1];

  return {
    x: position.x,
    y: position.y,
    z: position.z,
    size: template.size ?? 1,
    bgTexture: template.bgTexture,
    colour,
    text: template.text,
    orientation: undefined,
    elmsIconKey: iconKey,
  };
}

function markersFromElms(decoded: DecodedElmsMarkers): ReplayMarker[] {
  return decoded.markers.map((marker, index) => buildReplayMarker(marker, 'imported', index));
}

export function parseMarkersInput(encoded: string): MapMarkersState {
  const trimmed = encoded.trim();

  if (!trimmed) {
    throw new Error('Markers string cannot be empty.');
  }

  if (isElmsMarkersFormat(trimmed)) {
    const decoded = decodeElmsMarkersString(trimmed);
    return {
      format: 'elms',
      zoneId: decoded.zone,
      markers: markersFromElms(decoded),
      originalEncodedString: trimmed,
    };
  }

  const decodedMor = decodeMorMarkersString(trimmed);
  if (!decodedMor) {
    throw new Error('Unable to decode markers string.');
  }

  const replayMarkers = decodedMor.markers.map((marker, index) =>
    buildReplayMarker(marker, 'imported', index),
  );

  return {
    format: 'mor',
    zoneId: decodedMor.zone,
    markers: replayMarkers,
    originalEncodedString: trimmed,
  };
}

function coloursMatch(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a.every((value, idx) => Math.abs(value - b[idx]) <= COLOR_TOLERANCE);
}

function sizesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= SIZE_TOLERANCE;
}

function findElmsIconKeyForMarker(marker: MorMarker): number | null {
  if (typeof marker.elmsIconKey === 'number') {
    return marker.elmsIconKey;
  }

  for (const [key, definition] of Object.entries(ELMS_ICON_MAP)) {
    const iconKey = Number(key);
    if (Number.isNaN(iconKey)) continue;

    if (definition.bgTexture) {
      if (!marker.bgTexture) continue;
      if (marker.bgTexture !== definition.bgTexture) continue;
    }

    if (definition.text !== undefined) {
      if (marker.text !== definition.text) continue;
    } else if (marker.text !== undefined) {
      continue;
    }

    if (definition.size !== undefined) {
      if (!sizesMatch(marker.size, definition.size)) continue;
    }

    if (definition.colour) {
      if (!marker.colour) continue;
      if (!coloursMatch(marker.colour, definition.colour as [number, number, number, number]))
        continue;
    }

    return iconKey;
  }

  return null;
}

export function encodeMarkersToElms(state: MapMarkersState): string {
  if (!state.markers.length) {
    throw new Error('No markers available to convert to Elms format.');
  }

  const failedMarkers: ReplayMarker[] = [];

  const segments = state.markers.map((marker) => {
    const iconKey = findElmsIconKeyForMarker(marker);

    if (iconKey === null) {
      failedMarkers.push(marker);
      return '';
    }

    const x = Math.round(marker.x);
    const y = Math.round(marker.y);
    const z = Math.round(marker.z);

    return `/${state.zoneId}//${x},${y},${z},${iconKey}/`;
  });

  if (failedMarkers.length > 0) {
    const example = failedMarkers[0];
    const descriptionParts: string[] = [];

    if (example.text) {
      descriptionParts.push(`text "${example.text}"`);
    }

    if (example.bgTexture) {
      descriptionParts.push(`texture ${example.bgTexture}`);
    }

    const description = descriptionParts.length
      ? descriptionParts.join(', ')
      : 'unknown marker style';

    throw new Error(
      `Unable to convert ${failedMarkers.length} marker${failedMarkers.length === 1 ? '' : 's'} to Elms format (${description}). ` +
        'Add markers using the context menu or ensure they originate from Elms markers.',
    );
  }

  return segments.join('');
}

function formatHex(value: number): string {
  return Math.max(0, Math.round(value)).toString(16).toUpperCase();
}

function formatDegrees(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  const rounded = Number(degrees.toFixed(3));
  return rounded.toString();
}

function escapeMarkerText(text: string): string {
  let result = text.replace(/\n/g, '\\n');
  result = result.replace(/:/g, '\uE000');
  result = result.replace(/,/g, '\uE001');
  result = result.replace(/\]/g, '\uE002');
  result = result.replace(/;/g, '\uE003');
  result = result.replace(/>/g, '\uE004');
  return result;
}

function rgbaToHex([r, g, b, a]: [number, number, number, number]): string {
  const toHex = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value * 255)))
      .toString(16)
      .padStart(2, '0');
  const alpha = toHex(a);
  const rgb = `${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a >= 1 ? rgb.toUpperCase() : `${rgb}${alpha}`.toUpperCase();
}

function isDefaultSize(size: number): boolean {
  return Math.abs(size - 1) < 0.0001;
}

function isDefaultColour(colour: [number, number, number, number]): boolean {
  const [r, g, b, a] = colour;
  return (
    Math.abs(r - 1) < 0.0001 &&
    Math.abs(g - 1) < 0.0001 &&
    Math.abs(b - 1) < 0.0001 &&
    Math.abs(a - 1) < 0.0001
  );
}

function formatTexture(texture: string | undefined): string | null {
  if (!texture) {
    return null;
  }

  return REVERSE_TEXTURE_LOOKUP[texture] ?? texture;
}

function buildSectionFromGroups<T>(
  markers: ReplayMarker[],
  valueResolver: (marker: ReplayMarker) => T | null | undefined,
  valueFormatter: (value: T) => string,
): string {
  const groups = new Map<string, number[]>();

  markers.forEach((marker, index) => {
    const value = valueResolver(marker);
    if (value === null || value === undefined) {
      return;
    }

    const formatted = valueFormatter(value);
    if (!formatted) {
      return;
    }

    const indices = groups.get(formatted) ?? [];
    indices.push(index + 1);
    groups.set(formatted, indices);
  });

  return Array.from(groups.entries())
    .map(([value, indices]) => `${value}:${indices.join(',')}`)
    .join(';');
}

function buildPitchSection(markers: ReplayMarker[]): string {
  return buildSectionFromGroups<number>(
    markers,
    (marker) => {
      if (!marker.orientation) {
        return null;
      }

      const [pitch] = marker.orientation;
      return Math.abs(pitch) < 0.0001 ? null : pitch;
    },
    (value) => formatDegrees(value),
  );
}

function buildYawSection(markers: ReplayMarker[]): string {
  return buildSectionFromGroups<number>(
    markers,
    (marker) => {
      if (!marker.orientation) {
        return null;
      }

      const [, yaw] = marker.orientation;
      return Math.abs(yaw) < 0.0001 ? null : yaw;
    },
    (value) => formatDegrees(value),
  );
}

function buildSizeSection(markers: ReplayMarker[]): string {
  return buildSectionFromGroups<number>(
    markers,
    (marker) => (isDefaultSize(marker.size) ? null : marker.size),
    (value) => Number(value.toFixed(3)).toString(),
  );
}

function buildColourSection(markers: ReplayMarker[]): string {
  return buildSectionFromGroups<[number, number, number, number]>(
    markers,
    (marker) => (isDefaultColour(marker.colour) ? null : marker.colour),
    (value) => rgbaToHex(value),
  );
}

function buildTextureSection(markers: ReplayMarker[]): string {
  return buildSectionFromGroups<string>(
    markers,
    (marker) => formatTexture(marker.bgTexture),
    (value) => value,
  );
}

export function encodeMarkersToMor(state: MapMarkersState): string {
  if (!state.markers.length) {
    throw new Error('No markers available to convert to M0R format.');
  }

  const markers = state.markers.map((marker) => ({
    ...marker,
    x: Math.round(marker.x),
    y: Math.round(marker.y),
    z: Math.round(marker.z),
  }));

  const minX = Math.min(...markers.map((marker) => marker.x));
  const minY = Math.min(...markers.map((marker) => marker.y));
  const minZ = Math.min(...markers.map((marker) => marker.z));

  const timestamp = Math.floor(Date.now() / 1000);

  const positions = markers
    .map((marker) => {
      const xOffset = formatHex(marker.x - minX);
      const yOffset = formatHex(marker.y - minY);
      const zOffset = formatHex(marker.z - minZ);
      const text =
        marker.text && marker.text.trim().length > 0 ? `:${escapeMarkerText(marker.text)}` : '';
      return `${xOffset}:${yOffset}:${zOffset}${text}`;
    })
    .join(',');

  const sections = [
    state.zoneId.toString(),
    timestamp.toString(),
    `${formatHex(minX)}:${formatHex(minY)}:${formatHex(minZ)}`,
    buildSizeSection(markers),
    buildPitchSection(markers),
    buildYawSection(markers),
    buildColourSection(markers),
    buildTextureSection(markers),
    positions,
  ];

  return `<${sections.join(']')}>`;
}

/**
 * Convert an arena-space point (the 0-100 coordinate system the 3D scene uses) back into
 * world-space centimeters for the given map. Exact inverse of the transform MapMarkers applies
 * when rendering, so a marker dropped/dragged at an arena point round-trips to the same spot.
 */
export function arenaPointToWorld(
  mapData: ZoneScaleData,
  arenaPoint: { x: number; z: number },
): { x: number; z: number } {
  const clamp = (value: number): number => Math.min(100, Math.max(0, value));

  const normalizedX = (100 - clamp(arenaPoint.x)) / 100;
  const normalizedZ = (100 - clamp(arenaPoint.z)) / 100;

  return {
    x: normalizedX * (mapData.maxX - mapData.minX) + mapData.minX,
    z: normalizedZ * (mapData.maxZ - mapData.minZ) + mapData.minZ,
  };
}

/**
 * Re-skin an existing marker with a different Elms icon template (shape/text/colour/size),
 * keeping its position and identity. Used by the marker edit dialog's icon picker.
 */
export function applyElmsIconTemplate(marker: ReplayMarker, iconKey: number): ReplayMarker {
  const template = ELMS_ICON_MAP[iconKey];

  if (!template) {
    throw new Error(`Unknown Elms icon key: ${iconKey}`);
  }

  const colour: [number, number, number, number] = template.colour
    ? ([...template.colour] as [number, number, number, number])
    : [1, 1, 1, 1];

  return {
    ...marker,
    size: template.size ?? 1,
    bgTexture: template.bgTexture,
    colour,
    text: template.text,
    elmsIconKey: iconKey,
  };
}

/** Fields of a marker the edit dialog can change. */
export interface MarkerEditPatch {
  text?: string;
  colour?: [number, number, number, number];
  size?: number;
}

/** One edit-dialog submission: optional icon re-skin plus field overrides, applied atomically. */
export interface MarkerEdit extends MarkerEditPatch {
  /** When set, re-skin from this Elms template first; patch fields then override the template. */
  iconKey?: number;
}

/**
 * Apply a partial edit (label/colour/size) to one marker by id. Clearing the label and diverging
 * from the icon template drops `elmsIconKey` so stats/exports stop claiming template fidelity.
 */
export function withMarkerPatch(
  state: MapMarkersState,
  markerId: string,
  patch: MarkerEditPatch,
): MapMarkersState {
  return {
    ...state,
    markers: state.markers.map((marker) => {
      if (marker.id !== markerId) {
        return marker;
      }

      const next: ReplayMarker = { ...cloneMarker(marker), id: marker.id, source: marker.source };

      if (patch.text !== undefined) {
        next.text = patch.text.trim().length > 0 ? patch.text : undefined;
      }
      if (patch.colour !== undefined) {
        next.colour = [...patch.colour] as [number, number, number, number];
      }
      if (patch.size !== undefined && Number.isFinite(patch.size) && patch.size > 0) {
        next.size = patch.size;
      }

      // If the marker no longer matches its Elms template, it can only round-trip via M0R.
      if (typeof next.elmsIconKey === 'number') {
        const template = ELMS_ICON_MAP[next.elmsIconKey];
        const stillMatches =
          template !== undefined &&
          next.text === template.text &&
          sizesMatch(next.size, template.size ?? 1) &&
          coloursMatch(
            next.colour,
            (template.colour ?? [1, 1, 1, 1]) as [number, number, number, number],
          );

        if (!stillMatches) {
          next.elmsIconKey = undefined;
        }
      }

      return next;
    }),
  };
}

/**
 * Apply one edit-dialog submission to a marker in the state: optional icon template re-skin,
 * then label/colour/size overrides — as a SINGLE state transition (one undo step).
 */
export function withMarkerEdit(
  state: MapMarkersState,
  markerId: string,
  edit: MarkerEdit,
): MapMarkersState {
  const target = state.markers.find((marker) => marker.id === markerId);
  if (!target) {
    return state;
  }

  let base = state;
  if (edit.iconKey !== undefined && edit.iconKey !== target.elmsIconKey) {
    base = updateMarker(state, applyElmsIconTemplate(target, edit.iconKey));
  }

  const { iconKey: _iconKey, ...patch } = edit;
  return withMarkerPatch(base, markerId, patch);
}

/** Move one marker to new world-space coordinates (drag-to-move commit). */
export function withMarkerPosition(
  state: MapMarkersState,
  markerId: string,
  position: { x: number; z: number; y?: number },
): MapMarkersState {
  return {
    ...state,
    markers: state.markers.map((marker) =>
      marker.id === markerId
        ? {
            ...marker,
            x: position.x,
            z: position.z,
            y: position.y ?? marker.y,
          }
        : marker,
    ),
  };
}

export function withNewMarker(
  state: MapMarkersState,
  marker: MorMarker,
  source: MarkerFormat,
): MapMarkersState {
  const replayMarker = buildReplayMarker(marker, 'manual', state.markers.length);
  return {
    ...state,
    format: source,
    markers: [...state.markers, replayMarker],
  };
}

export function withoutMarker(state: MapMarkersState, markerId: string): MapMarkersState {
  return {
    ...state,
    markers: state.markers.filter((marker) => marker.id !== markerId),
  };
}

export function updateMarker(state: MapMarkersState, updatedMarker: ReplayMarker): MapMarkersState {
  const nextMarkers = state.markers.map((marker) =>
    marker.id === updatedMarker.id ? { ...updatedMarker } : marker,
  );

  return {
    ...state,
    markers: nextMarkers,
  };
}

export function ensureFormat(state: MapMarkersState, format: MarkerFormat): MapMarkersState {
  if (state.format === format) {
    return state;
  }

  return {
    ...state,
    format,
  };
}
