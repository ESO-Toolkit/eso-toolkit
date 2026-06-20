import { ReplayShape } from '../types/mapMarkers';

import {
  decodeShapes,
  decodeShapesZone,
  encodeShapes,
  isShapeShareFormat,
} from './shapeShareCodec';

const ZONE = 1263; // Rockgrove

function shape(overrides: Partial<ReplayShape>): ReplayShape {
  return {
    id: 'x',
    source: 'manual',
    kind: 'polyline',
    vertices: [
      [100000, 200000],
      [110000, 210000],
    ],
    worldY: 8000,
    style: { colour: [1, 0, 0, 1], width: 4, dashed: false, fill: false },
    ...overrides,
  };
}

/** Colour channels round-trip through 8-bit quantization, so compare with tolerance. */
function expectColourClose(
  actual: [number, number, number, number],
  expected: [number, number, number, number],
): void {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 2));
}

describe('shapeShareCodec', () => {
  describe('format detection', () => {
    it('recognizes a shapes wrapper and rejects M0R / Elms', () => {
      expect(isShapeShareFormat('(1]1263]0:0]P|||FF0000|0||0:0,1:1|)')).toBe(true);
      expect(isShapeShareFormat('  (1]...)  ')).toBe(true);
      expect(isShapeShareFormat('<1263]...>')).toBe(false);
      expect(isShapeShareFormat('/1263//1,2,3,4/')).toBe(false);
      expect(isShapeShareFormat('')).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('round-trips every shape kind with geometry, style, label and time', () => {
      const shapes: ReplayShape[] = [
        shape({
          kind: 'polyline',
          vertices: [
            [100000, 200000],
            [105000, 205000],
            [110000, 200000],
          ],
          style: { colour: [1, 1, 1, 1], width: 3, dashed: true, fill: false },
          label: 'kite path',
        }),
        shape({
          kind: 'polygon',
          vertices: [
            [120000, 220000],
            [130000, 220000],
            [130000, 230000],
            [120000, 230000],
          ],
          style: { colour: [0, 1, 0, 1], width: 2, dashed: false, fill: true },
          label: 'safe',
          time: [10000, 45000],
        }),
        shape({
          kind: 'circle',
          vertices: [[140000, 240000]],
          radius: 12.5,
          style: { colour: [1, 0, 0, 1], width: 5, dashed: false, fill: true },
          label: 'stack',
        }),
        shape({
          kind: 'rect',
          vertices: [
            [150000, 250000],
            [160000, 260000],
          ],
          style: { colour: [0, 0, 1, 1], width: 4, dashed: true, fill: false },
        }),
        shape({
          kind: 'ruler',
          vertices: [
            [170000, 270000],
            [175000, 270000],
          ],
          style: { colour: [1, 1, 1, 1], width: 2, dashed: true, fill: false },
        }),
      ];

      const code = encodeShapes(shapes, ZONE);
      expect(isShapeShareFormat(code)).toBe(true);
      expect(decodeShapesZone(code)).toBe(ZONE);

      const decoded = decodeShapes(code);
      expect(decoded).toHaveLength(shapes.length);

      shapes.forEach((original, i) => {
        const got = decoded[i];
        expect(got.kind).toBe(original.kind);
        expect(got.vertices).toEqual(original.vertices);
        expect(got.worldY).toBe(original.worldY);
        expect(got.style.width).toBe(original.style.width);
        expect(got.style.dashed).toBe(original.style.dashed);
        expect(got.style.fill).toBe(original.style.fill);
        expectColourClose(got.style.colour, original.style.colour);
        expect(got.label).toBe(original.label);
        expect(got.time).toEqual(original.time);
        if (original.kind === 'circle') {
          expect(got.radius).toBeCloseTo(original.radius as number, 2);
        }
      });
    });

    it('round-trips an alpha (rrggbbaa) colour', () => {
      const code = encodeShapes(
        [shape({ style: { colour: [1, 0, 0, 0x80 / 255], width: 4, dashed: false, fill: true } })],
        ZONE,
      );
      const [got] = decodeShapes(code);
      expectColourClose(got.style.colour, [1, 0, 0, 0x80 / 255]);
    });

    it('round-trips labels containing every reserved delimiter and newlines', () => {
      const nasty = 'a:b,c]d;e>f|g)h(i\njkl';
      const code = encodeShapes([shape({ label: nasty })], ZONE);
      // The raw code must not leak any delimiter from the label that would break parsing.
      const [got] = decodeShapes(code);
      expect(got.label).toBe(nasty);
      // Exactly one block decoded (the label did not introduce a spurious `;` split).
      expect(decodeShapes(code)).toHaveLength(1);
    });
  });

  describe('graceful degradation (never throws)', () => {
    it('returns [] for empty / non-wrapper / truncated input', () => {
      expect(decodeShapes('')).toEqual([]);
      expect(decodeShapes('<1263]>')).toEqual([]);
      expect(decodeShapes('(garbage')).toEqual([]);
      expect(decodeShapes('(1]1263)')).toEqual([]); // too few header sections
      expect(decodeShapesZone('nope')).toBeNull();
    });

    it('drops only the malformed block and keeps the valid ones', () => {
      const good = encodeShapes(
        [
          shape({ kind: 'polyline', label: 'one' }),
          shape({ kind: 'circle', vertices: [[100000, 200000]], radius: 5, label: 'two' }),
        ],
        ZONE,
      );
      // Corrupt the FIRST block's kind tag to an unknown letter.
      const corrupted = good.replace('(1]1263]', '(1]1263]').replace(/\]P\|/, ']Z|');
      const decoded = decodeShapes(corrupted);
      expect(decoded).toHaveLength(1);
      expect(decoded[0].kind).toBe('circle');
      expect(decoded[0].label).toBe('two');
    });

    it('drops shapes with too few vertices for their kind', () => {
      // A polygon needs >= 3 vertices; hand-build a 2-vertex polygon block.
      const code = `(1]${ZONE}]0:0]G||4|FF0000|0||0:0,1:1|)`;
      expect(decodeShapes(code)).toEqual([]);
    });

    it('drops a circle with no/zero radius', () => {
      const code = `(1]${ZONE}]0:0]C||4|FF0000|0||0:0|)`;
      expect(decodeShapes(code)).toEqual([]);
    });
  });

  describe('encodeShapes edge cases', () => {
    it('returns "" for an empty shape list', () => {
      expect(encodeShapes([], ZONE)).toBe('');
    });

    it('omits radius/time fields when absent and still decodes', () => {
      const code = encodeShapes([shape({ kind: 'polyline' })], ZONE);
      const [got] = decodeShapes(code);
      expect(got.radius).toBeUndefined();
      expect(got.time).toBeUndefined();
      expect(got.label).toBeUndefined();
    });
  });
});
