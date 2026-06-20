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

import {
  MapMarkersState,
  MarkerFormat,
  MarkerSource,
  ReplayMarker,
  ReplayShape,
  ShapeData,
  ShapeStyle,
} from '../types/mapMarkers';

import { shapeOutlineLengthMeters, shapeSampleWorld } from './shapeGeometry';

const COLOR_TOLERANCE = 0.05;
const SIZE_TOLERANCE = 0.05;

export const COMMON_ELMS_ICON_KEYS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 18, 72, 73, 74, 75, 76, 77, 14, 15, 16, 17, 20, 22,
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
  // Key 13 (the legacy single down-arrow glyph) was retired in favour of the rotatable
  // directional arrows (keys 74-77); it is no longer offered in the add-marker menu. Its
  // ELMS_ICON_MAP entry is kept only so old imported strings referencing it still decode.
  14: 'Chevron',
  15: 'Blue Square',
  16: 'Green Square',
  17: 'Orange Square',
  18: 'OT (Off Tank)',
  20: 'Red Square',
  21: 'MT (Main Tank)',
  22: 'Yellow Square',
  72: 'H1 (Healer 1)',
  73: 'H2 (Healer 2)',
  74: 'Arrow North',
  75: 'Arrow East',
  76: 'Arrow South',
  77: 'Arrow West',
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

export type MarkerGroupKey = 'numbers' | 'roles' | 'arrows' | 'shapes' | 'squares';

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
  roles: 'Roles (Tanks & Healers)',
  arrows: 'Directional Arrows',
  shapes: 'Shapes',
  squares: 'Squares',
};

const MARKER_GROUPS: MarkerGroupDefinition[] = [
  {
    key: 'numbers',
    iconKeys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    // Tank + healer role markers as coloured hexagons: MT, OT, H1, H2.
    key: 'roles',
    iconKeys: [21, 18, 72, 73],
  },
  {
    // Rotatable directional arrows: North, East, South, West.
    key: 'arrows',
    iconKeys: [74, 75, 76, 77],
  },
  {
    // Standalone shape markers (the lime-green chevron). Kept exposed so the prior
    // "Arrow & Chevron" menu entry isn't silently dropped when arrows became directional.
    key: 'shapes',
    iconKeys: [14],
  },
  {
    key: 'squares',
    iconKeys: [15, 16, 17, 20, 22],
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
    // Carry a ground-facing heading when the template defines one (directional arrows);
    // everything else stays floating (undefined).
    orientation: template.orientation ? ([...template.orientation] as [number, number]) : undefined,
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

const ORIENTATION_TOLERANCE = 0.0001;

/** Smallest absolute angular difference between two angles, handling 2π wrap (e.g. 2π ≡ 0). */
function angularDelta(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function orientationsMatch(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  // pitch and yaw are angles, so compare modulo 2π — a yaw of 2π or -π must still match its
  // canonical preset (0 or π) so wrapped headings round-trip to the right arrow icon.
  return (
    angularDelta(a[0], b[0]) <= ORIENTATION_TOLERANCE &&
    angularDelta(a[1], b[1]) <= ORIENTATION_TOLERANCE
  );
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

    // Directional arrows share texture+colour and differ only by heading, so the orientation
    // must match for the marker to round-trip back to the correct arrow icon key.
    if (
      !orientationsMatch(marker.orientation, definition.orientation as [number, number] | undefined)
    ) {
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
    // Adopt the new template's orientation: re-skinning to a directional arrow must make the
    // marker ground-facing, and re-skinning away from one must clear the heading (back to floating).
    orientation: template.orientation ? ([...template.orientation] as [number, number]) : undefined,
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

// ---------------------------------------------------------------------------
// Drawn shapes (esotk-native: polyline / polygon / circle / rect / ruler)
// ---------------------------------------------------------------------------

function generateShapeId(index: number): string {
  return `shape-${index}-${uuidv4()}`;
}

/** Deep-clone a shape's mutable geometry/style so reducers never alias prior-state arrays. */
function cloneShapeData(data: ShapeData): ShapeData {
  const cloned: ShapeData = {
    kind: data.kind,
    vertices: data.vertices.map((vertex) => [vertex[0], vertex[1]] as [number, number]),
    worldY: data.worldY,
    style: {
      colour: [...data.style.colour] as [number, number, number, number],
      width: data.style.width,
      dashed: data.style.dashed,
      fill: data.style.fill,
    },
  };
  if (data.radius !== undefined) cloned.radius = data.radius;
  if (data.label !== undefined) cloned.label = data.label;
  if (data.time !== undefined) cloned.time = [data.time[0], data.time[1]];
  return cloned;
}

export function buildReplayShape(
  data: ShapeData,
  source: MarkerSource,
  index: number,
): ReplayShape {
  return {
    ...cloneShapeData(data),
    id: generateShapeId(index),
    source,
  };
}

/** Fields the shape edit UI can change. `null` clears an optional field; omit to leave unchanged. */
export interface ShapeEditPatch {
  style?: Partial<ShapeStyle>;
  label?: string | null;
  time?: [number, number] | null;
  /** Circle radius in metres. */
  radius?: number;
}

export function withNewShape(
  state: MapMarkersState,
  data: ShapeData,
  source: MarkerSource = 'manual',
): MapMarkersState {
  const shape = buildReplayShape(data, source, state.shapes?.length ?? 0);
  return {
    ...state,
    shapes: [...(state.shapes ?? []), shape],
  };
}

/** Replace the whole shapes set (used by share-code import). Keeps markers untouched. */
export function withShapesReplaced(
  state: MapMarkersState,
  datas: ShapeData[],
  source: MarkerSource = 'imported',
): MapMarkersState {
  return {
    ...state,
    shapes: datas.map((data, index) => buildReplayShape(data, source, index)),
  };
}

export function withoutShape(state: MapMarkersState, shapeId: string): MapMarkersState {
  if (!state.shapes?.some((shape) => shape.id === shapeId)) {
    return state;
  }
  return {
    ...state,
    shapes: state.shapes.filter((shape) => shape.id !== shapeId),
  };
}

/** Move a shape to new WORLD-space vertices (drag-to-move / vertex edit commit). */
export function withShapeVertices(
  state: MapMarkersState,
  shapeId: string,
  vertices: Array<[number, number]>,
): MapMarkersState {
  if (!state.shapes) return state;
  return {
    ...state,
    shapes: state.shapes.map((shape) =>
      shape.id === shapeId
        ? {
            ...shape,
            vertices: vertices.map((vertex) => [vertex[0], vertex[1]] as [number, number]),
          }
        : shape,
    ),
  };
}

/** Apply a style/label/time/radius edit to one shape as a single transition. */
export function withShapeEdit(
  state: MapMarkersState,
  shapeId: string,
  patch: ShapeEditPatch,
): MapMarkersState {
  if (!state.shapes) return state;

  return {
    ...state,
    shapes: state.shapes.map((shape) => {
      if (shape.id !== shapeId) {
        return shape;
      }

      const next: ReplayShape = {
        ...shape,
        style: {
          ...shape.style,
          colour: [...shape.style.colour] as [number, number, number, number],
        },
        vertices: shape.vertices.map((vertex) => [vertex[0], vertex[1]] as [number, number]),
      };

      if (patch.style) {
        next.style = {
          ...next.style,
          ...patch.style,
          colour: patch.style.colour
            ? ([...patch.style.colour] as [number, number, number, number])
            : next.style.colour,
        };
      }

      if (patch.label !== undefined) {
        next.label = patch.label && patch.label.trim().length > 0 ? patch.label : undefined;
      }

      if (patch.time !== undefined) {
        next.time = patch.time ? ([patch.time[0], patch.time[1]] as [number, number]) : undefined;
      }

      if (patch.radius !== undefined && Number.isFinite(patch.radius) && patch.radius > 0) {
        next.radius = patch.radius;
      }

      return next;
    }),
  };
}

// ---------------------------------------------------------------------------
// In-game export: bake markers + shapes into a real M0RMarkers string
// ---------------------------------------------------------------------------

/** Circle texture used for baked shape dots (built-in M0R ^1). */
const SHAPE_DOT_TEXTURE = 'M0RMarkers/textures/circle.dds';
/** Lay baked dots flat on the floor (pitch -90°), so a sampled line reads as a ground boundary. */
const GROUND_FLAT_ORIENTATION: [number, number] = [-Math.PI / 2, 0];

export interface InGameMorResult {
  /** The M0RMarkers `<...>` string to paste into the addon in-game. */
  code: string;
  /** Total markers in the export (real markers + baked shape dots). */
  markerCount: number;
  /** How many of those are baked shape dots. */
  dotCount: number;
  /** Effective spacing between dots in metres (auto-coarsened to fit the cap). */
  spacingMeters: number;
}

/**
 * Bake markers + drawn shapes into ONE M0RMarkers import string that renders IN THE GAME.
 *
 * ESO marker addons cannot draw lines/areas — only point markers — so each shape's OUTLINE is
 * sampled into a row of ground-flat circle dots in the shape's colour (fills can't transfer; only
 * the boundary does). Dot spacing is coarsened automatically so real markers + dots stay under
 * `maxMarkers` (the addon's storage ceiling is ~19k chars / a few hundred markers).
 */
export function encodeInGameMor(
  state: MapMarkersState,
  spacingMeters = 2,
  maxMarkers = 500,
): InGameMorResult {
  const realMarkers = state.markers ?? [];
  const shapes = state.shapes ?? [];

  // Coarsen spacing so real markers + baked dots fit the cap.
  const totalLenMeters = shapes.reduce((sum, shape) => sum + shapeOutlineLengthMeters(shape), 0);
  const budget = Math.max(0, maxMarkers - realMarkers.length);
  let spacing = Math.max(0.25, spacingMeters);
  if (budget > 0 && totalLenMeters / spacing > budget) {
    spacing = totalLenMeters / budget;
  }
  const spacingCm = spacing * 100;

  const dots: ReplayMarker[] = [];
  shapes.forEach((shape, shapeIndex) => {
    shapeSampleWorld(shape, spacingCm).forEach(([x, z], pointIndex) => {
      dots.push({
        id: `bake-${shapeIndex}-${pointIndex}`,
        source: 'manual',
        x,
        y: shape.worldY,
        z,
        size: 1,
        bgTexture: SHAPE_DOT_TEXTURE,
        colour: [...shape.style.colour] as [number, number, number, number],
        text: '',
        orientation: [...GROUND_FLAT_ORIENTATION] as [number, number],
      });
    });
  });

  const combined = [...realMarkers, ...dots];
  if (combined.length === 0) {
    throw new Error('No markers or shapes available to export.');
  }

  const code = encodeMarkersToMor({ ...state, markers: combined, shapes: undefined });
  return { code, markerCount: combined.length, dotCount: dots.length, spacingMeters: spacing };
}
