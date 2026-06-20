import { MorMarker } from '@/types/mapMarkers';

export type MarkerFormat = 'elms' | 'mor';

export type MarkerSource = 'imported' | 'manual';

export interface ReplayMarker extends MorMarker {
  id: string;
  /** Origin of the marker to help with future workflows */
  source: MarkerSource;
}

/**
 * The drawable shape primitives. These are an esotk-native extension — neither M0RMarkers nor
 * Elms can carry them, so they get their own share code (see shapeShareCodec.ts) and persist
 * alongside markers in the same per-zone slot.
 *
 * - `polyline` — an open multi-point path (lanes, kite routes, dividers). `vertices` = all points.
 * - `polygon`  — a closed multi-point region that "sections off" an area. `vertices` = the ring
 *                (not repeated; the renderer closes it). Optional translucent fill.
 * - `rect`     — an axis-aligned (in world space) box. `vertices` = two opposite corners.
 * - `circle`   — a stack/AoE radius. `vertices` = [centre]; `radius` = metres.
 * - `ruler`    — a distance measurement between two points. `vertices` = [a, b]; renders the
 *                length in metres. Never filled.
 */
export type ShapeKind = 'polyline' | 'polygon' | 'circle' | 'rect' | 'ruler';

/** Visual style shared by every shape kind. */
export interface ShapeStyle {
  /** RGBA, 0-1 — matches the marker colour convention. */
  colour: [number, number, number, number];
  /** Outline width in SCREEN pixels (drei <Line> is screen-space). */
  width: number;
  /** Dashed vs solid outline. */
  dashed: boolean;
  /** Draw a translucent fill (polygon/circle/rect only; ignored for polyline/ruler). */
  fill: boolean;
}

export interface ReplayShape {
  id: string;
  /** Origin of the shape (imported via share code vs drawn manually). */
  source: MarkerSource;
  kind: ShapeKind;
  /**
   * Geometry in ESO WORLD space (centimetres), stored as [x, z] pairs so the shape round-trips
   * across maps/scales exactly like markers. Meaning depends on `kind` (see ShapeKind docs).
   */
  vertices: Array<[number, number]>;
  /** World Y (centimetres) of the whole shape — used to assign/filter it to the right floor. */
  worldY: number;
  /** Circle radius in METRES (only when kind === 'circle'). */
  radius?: number;
  style: ShapeStyle;
  /** Optional text label rendered near the shape's centroid / midpoint. */
  label?: string;
  /**
   * Optional fight time window [startMs, endMs] RELATIVE to fight start. When set, the shape is
   * only visible during that window of playback; when undefined it shows for the whole fight.
   */
  time?: [number, number];
}

/** A shape's geometry + style, without identity — what the share codec encodes/decodes. */
export type ShapeData = Omit<ReplayShape, 'id' | 'source'>;

export interface MapMarkersState {
  format: MarkerFormat;
  zoneId: number;
  markers: ReplayMarker[];
  /** Esotk-native drawn shapes (lines/zones/circles/rects/rulers). Optional for back-compat. */
  shapes?: ReplayShape[];
  /** Preserve the original encoded string when markers were loaded */
  originalEncodedString?: string;
}
