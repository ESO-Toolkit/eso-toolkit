/**
 * Share codec for esotk-native drawn shapes (polyline / polygon / circle / rect / ruler).
 *
 * Neither M0RMarkers (`<...>`) nor Elms (`/zone//...`) can carry these shapes, so they get their
 * own wrapper: a `(...)`-delimited string. A reader dispatches by the first character:
 *   `<` -> M0R,  `/` -> Elms,  `(` -> shapes.
 *
 * Grammar (mirrors M0R conventions — uppercase hex coords offset from a per-export minimum, and
 * private-use-area escapes for free text):
 *
 *   (VERSION]ZONE]minXHex:minZHex]BLOCK;BLOCK;...)
 *
 *   BLOCK = KIND|FLAGS|WIDTHhex|COLOURhex|YHex|RADIUShex|TIME|VERTS|LABEL
 *     KIND    P=polyline G=polygon C=circle R=rect M=ruler(measure)
 *     FLAGS   subset of "d" (dashed) and "f" (fill)
 *     WIDTH   outline width in screen px (hex int)
 *     COLOUR  rrggbb or rrggbbaa hex (uppercase)
 *     Y       world Y in cm (hex int) — floor assignment
 *     RADIUS  circle radius in cm (hex int), "" for non-circles
 *     TIME    "startHex:endHex" ms relative to fight start, "" for whole-fight
 *     VERTS   "xHex:zHex,xHex:zHex,..." world-cm offsets from minX/minZ
 *     LABEL   free text, escaped (optional — block may omit the trailing field)
 *
 * Coordinates are world centimetres (rounded to int) so a code round-trips across maps/scales.
 * `decodeShapes` NEVER throws: a malformed wrapper yields [], and a malformed single block is
 * skipped while the rest decode — so a corrupt share link degrades gracefully (like the
 * localStorage path) rather than erroring the whole import.
 */

import { ReplayShape, ShapeData, ShapeKind } from '../types/mapMarkers';

const VERSION = '1';

/** kind <-> single-char tag */
const KIND_TO_TAG: Record<ShapeKind, string> = {
  polyline: 'P',
  polygon: 'G',
  circle: 'C',
  rect: 'R',
  ruler: 'M',
};
const TAG_TO_KIND: Record<string, ShapeKind> = {
  P: 'polyline',
  G: 'polygon',
  C: 'circle',
  R: 'rect',
  M: 'ruler',
};

/** Minimum vertices required for a well-formed shape of each kind. */
const MIN_VERTICES: Record<ShapeKind, number> = {
  polyline: 2,
  polygon: 3,
  circle: 1,
  rect: 2,
  ruler: 2,
};

const DEFAULT_WIDTH = 4;

// --- low-level hex + colour helpers (kept local so the codec is self-contained) ---

function toHex(value: number): string {
  return Math.max(0, Math.round(value)).toString(16).toUpperCase();
}

function fromHex(value: string): number {
  return parseInt(value, 16);
}

/**
 * Signed hex for values that can legitimately be negative — the per-export coordinate base and a
 * shape's world Y. Some ESO maps have negative world bounds (e.g. Halls of Fabrication), so a
 * clamped-to-0 base would shift the whole shape on decode. Vertex offsets stay unsigned (they are
 * always >= the min base) as do radius/time.
 */
function toSignedHex(value: number): string {
  const v = Math.round(value);
  return v < 0 ? `-${Math.abs(v).toString(16).toUpperCase()}` : v.toString(16).toUpperCase();
}

function fromSignedHex(value: string): number {
  return value.startsWith('-') ? -parseInt(value.slice(1), 16) : parseInt(value, 16);
}

function rgbaToHex([r, g, b, a]: [number, number, number, number]): string {
  const byte = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  const rgb = `${byte(r)}${byte(g)}${byte(b)}`;
  return (a >= 1 ? rgb : `${rgb}${byte(a)}`).toUpperCase();
}

function hexToRgba(hex: string): [number, number, number, number] | null {
  if (hex.length !== 6 && hex.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

// --- free-text escaping (PUA scheme, extended with the block delimiters this grammar adds) ---
// Each delimiter that could appear in a label is swapped for an unused Unicode Private-Use-Area
// codepoint (U+E000 + index), mirroring the M0R marker text escaper. Computing the PUA char with
// String.fromCharCode keeps the source pure ASCII (no literal PUA bytes), and split/join sidesteps
// having to regex-escape the special characters themselves.

// The real newline is included as a delimiter so it gets its own PUA codepoint — that way a
// backslash is never a special character and a literal "\n" typed in a label can't collide with
// an escape token.
const LABEL_DELIMITERS = [':', ',', ']', ';', '>', '|', ')', '(', '\n'] as const;
const PUA_BASE = 0xe000;

function escapeLabel(text: string): string {
  let out = text;
  LABEL_DELIMITERS.forEach((literal, index) => {
    out = out.split(literal).join(String.fromCharCode(PUA_BASE + index));
  });
  return out;
}

function unescapeLabel(text: string): string {
  let out = text;
  LABEL_DELIMITERS.forEach((literal, index) => {
    out = out.split(String.fromCharCode(PUA_BASE + index)).join(literal);
  });
  return out;
}

/** True when a string looks like a shapes share code (vs M0R `<...>` / Elms `/...`). */
export function isShapeShareFormat(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')');
}

/**
 * Encode a set of shapes to a shareable `(...)` string. Returns '' when there are no shapes
 * (callers guard on that). `id`/`source` are ignored — only geometry + style + label + time
 * are serialized.
 */
export function encodeShapes(
  shapes: ReadonlyArray<ReplayShape | ShapeData>,
  zoneId: number,
): string {
  if (!shapes.length) {
    return '';
  }

  // Per-export minimum across every vertex (and circle centre) keeps offsets small.
  let minX = Infinity;
  let minZ = Infinity;
  for (const shape of shapes) {
    for (const [x, z] of shape.vertices) {
      if (x < minX) minX = x;
      if (z < minZ) minZ = z;
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return '';
  }
  const baseX = Math.round(minX);
  const baseZ = Math.round(minZ);

  const blocks = shapes.map((shape) => {
    const flags = `${shape.style.dashed ? 'd' : ''}${shape.style.fill ? 'f' : ''}`;
    const width = toHex(shape.style.width);
    const colour = rgbaToHex(shape.style.colour);
    const y = toSignedHex(shape.worldY);
    const radius = shape.kind === 'circle' && shape.radius ? toHex(shape.radius * 100) : '';
    const time = shape.time ? `${toHex(shape.time[0])}:${toHex(shape.time[1])}` : '';
    const verts = shape.vertices
      .map(([x, z]) => `${toHex(x - baseX)}:${toHex(z - baseZ)}`)
      .join(',');
    const label = shape.label ? escapeLabel(shape.label) : '';

    return [KIND_TO_TAG[shape.kind], flags, width, colour, y, radius, time, verts, label].join('|');
  });

  return `(${VERSION}]${zoneId}]${toSignedHex(baseX)}:${toSignedHex(baseZ)}]${blocks.join(';')})`;
}

/** Parse one `|`-delimited block into ShapeData, or null when malformed. */
function decodeBlock(block: string, baseX: number, baseZ: number): ShapeData | null {
  const fields = block.split('|');
  // kind|flags|width|colour|y|radius|time|verts[|label] -> 8 required fields.
  if (fields.length < 8) return null;

  const [tag, flags, widthStr, colourStr, yStr, radiusStr, timeStr, vertsStr, labelStr] = fields;

  const kind = TAG_TO_KIND[tag];
  if (!kind) return null;

  const colour = hexToRgba(colourStr);
  if (!colour) return null;

  const width = fromHex(widthStr);
  const worldY = fromSignedHex(yStr);
  if (!Number.isFinite(worldY)) return null;

  const vertices: Array<[number, number]> = [];
  for (const pair of vertsStr.split(',')) {
    if (!pair) continue;
    const [xHex, zHex] = pair.split(':');
    const x = fromHex(xHex) + baseX;
    const z = fromHex(zHex) + baseZ;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    vertices.push([x, z]);
  }
  if (vertices.length < MIN_VERTICES[kind]) return null;

  let radius: number | undefined;
  if (kind === 'circle') {
    const r = fromHex(radiusStr);
    if (!Number.isFinite(r) || r <= 0) return null;
    radius = r / 100;
  }

  let time: [number, number] | undefined;
  if (timeStr) {
    const [sHex, eHex] = timeStr.split(':');
    const start = fromHex(sHex);
    const end = fromHex(eHex);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      time = [start, end];
    }
  }

  const shape: ShapeData = {
    kind,
    vertices,
    worldY,
    style: {
      colour,
      width: Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH,
      dashed: flags.includes('d'),
      fill: flags.includes('f'),
    },
  };
  if (radius !== undefined) shape.radius = radius;
  if (time) shape.time = time;
  if (labelStr) shape.label = unescapeLabel(labelStr);

  return shape;
}

/** The zone a shapes code belongs to, or null if unparseable (used to gate import by fight zone). */
export function decodeShapesZone(code: string): number | null {
  if (!isShapeShareFormat(code)) return null;
  const sections = code.trim().slice(1, -1).split(']');
  if (sections.length < 4) return null;
  const zone = parseInt(sections[1], 10);
  return Number.isFinite(zone) ? zone : null;
}

/**
 * Decode a shapes share code into ShapeData[]. NEVER throws: returns [] for a malformed wrapper,
 * and silently drops any individual block that fails to parse.
 */
export function decodeShapes(code: string): ShapeData[] {
  if (!isShapeShareFormat(code)) return [];

  const sections = code.trim().slice(1, -1).split(']');
  if (sections.length < 4) return [];

  // sections[0] = version (reserved for future grammar changes), [1] = zone, [2] = min, rest = blocks
  const minParts = sections[2].split(':');
  if (minParts.length !== 2) return [];
  const baseX = fromSignedHex(minParts[0]);
  const baseZ = fromSignedHex(minParts[1]);
  if (!Number.isFinite(baseX) || !Number.isFinite(baseZ)) return [];

  const blocksStr = sections.slice(3).join(']');
  const out: ShapeData[] = [];
  for (const block of blocksStr.split(';')) {
    if (!block.trim()) continue;
    const shape = decodeBlock(block, baseX, baseZ);
    if (shape) out.push(shape);
  }
  return out;
}
