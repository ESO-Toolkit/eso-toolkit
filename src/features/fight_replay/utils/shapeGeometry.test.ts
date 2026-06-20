import { ReplayShape } from '../types/mapMarkers';

import {
  isClosedKind,
  pathLengthMeters,
  rectRingWorld,
  sampleCircleWorld,
  shapeAnchor,
  shapeOutlineWorld,
  worldDistanceMeters,
} from './shapeGeometry';

function shape(overrides: Partial<ReplayShape>): ReplayShape {
  return {
    id: 'x',
    source: 'manual',
    kind: 'polyline',
    vertices: [
      [0, 0],
      [300, 400],
    ],
    worldY: 0,
    style: { colour: [1, 1, 1, 1], width: 4, dashed: false, fill: false },
    ...overrides,
  };
}

describe('shapeGeometry', () => {
  it('worldDistanceMeters converts cm to metres (3-4-5)', () => {
    expect(worldDistanceMeters([0, 0], [300, 400])).toBeCloseTo(5, 6);
  });

  it('pathLengthMeters sums segment lengths', () => {
    expect(
      pathLengthMeters([
        [0, 0],
        [300, 400],
        [300, 400],
        [600, 800],
      ]),
    ).toBeCloseTo(10, 6);
    expect(pathLengthMeters([[0, 0]])).toBe(0);
  });

  describe('shapeAnchor', () => {
    it('uses the centre for a circle', () => {
      expect(shapeAnchor(shape({ kind: 'circle', vertices: [[500, 700]] }))).toEqual([500, 700]);
    });
    it('uses the midpoint for rect and ruler', () => {
      expect(
        shapeAnchor(
          shape({
            kind: 'rect',
            vertices: [
              [0, 0],
              [100, 200],
            ],
          }),
        ),
      ).toEqual([50, 100]);
      expect(
        shapeAnchor(
          shape({
            kind: 'ruler',
            vertices: [
              [0, 0],
              [40, 60],
            ],
          }),
        ),
      ).toEqual([20, 30]);
    });
    it('uses the centroid for polyline/polygon', () => {
      expect(
        shapeAnchor(
          shape({
            kind: 'polygon',
            vertices: [
              [0, 0],
              [30, 0],
              [0, 30],
            ],
          }),
        ),
      ).toEqual([10, 10]);
    });
  });

  describe('sampleCircleWorld', () => {
    it('returns `segments` points all at radius from the centre', () => {
      const pts = sampleCircleWorld([1000, 2000], 5, 16); // radius 5m = 500cm
      expect(pts).toHaveLength(16);
      for (const [x, z] of pts) {
        expect(Math.hypot(x - 1000, z - 2000)).toBeCloseTo(500, 6);
      }
    });
  });

  it('rectRingWorld builds the 4 axis-aligned corners', () => {
    expect(rectRingWorld([0, 0], [100, 200])).toEqual([
      [0, 0],
      [100, 0],
      [100, 200],
      [0, 200],
    ]);
  });

  describe('shapeOutlineWorld', () => {
    it('samples a circle and returns [] when radius missing', () => {
      expect(
        shapeOutlineWorld(shape({ kind: 'circle', vertices: [[0, 0]], radius: 5 })).length,
      ).toBe(64);
      expect(shapeOutlineWorld(shape({ kind: 'circle', vertices: [[0, 0]] }))).toEqual([]);
    });
    it('expands a rect to 4 corners', () => {
      expect(
        shapeOutlineWorld(
          shape({
            kind: 'rect',
            vertices: [
              [0, 0],
              [10, 20],
            ],
          }),
        ),
      ).toHaveLength(4);
    });
    it('returns polyline vertices as-is', () => {
      const v: Array<[number, number]> = [
        [0, 0],
        [1, 1],
        [2, 0],
      ];
      expect(shapeOutlineWorld(shape({ kind: 'polyline', vertices: v }))).toEqual(v);
    });
  });

  it('isClosedKind marks polygon/rect/circle closed', () => {
    expect(isClosedKind('polygon')).toBe(true);
    expect(isClosedKind('rect')).toBe(true);
    expect(isClosedKind('circle')).toBe(true);
    expect(isClosedKind('polyline')).toBe(false);
    expect(isClosedKind('ruler')).toBe(false);
  });
});
