import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';

import { arenaPointToWorld } from './mapMarkerConverters';
import { computeUnitScale, isWithinMapBounds, worldToArena } from './mapTransform';

// Real fixtures: Hel Ra Citadel (positive, non-square) and HoF Abanabi Cave (negative bounds).
const HEL_RA: ZoneScaleData = ZONE_SCALE_DATA[636][0];
const HOF: ZoneScaleData = ZONE_SCALE_DATA[975][0];

describe('mapTransform round-trips (world <-> arena)', () => {
  it.each([
    ['positive bounds', HEL_RA],
    ['negative bounds', HOF],
  ])('world -> arena -> world is identity in-bounds (%s)', (_label, map) => {
    const pts: Array<[number, number]> = [
      [map.minX, map.minZ],
      [map.maxX, map.maxZ],
      [(map.minX + map.maxX) / 2, (map.minZ + map.maxZ) / 2],
      [map.minX + 1, map.maxZ - 1],
    ];
    for (const [x, z] of pts) {
      const arena = worldToArena(map, x, z);
      expect(arena.x).toBeGreaterThanOrEqual(0);
      expect(arena.x).toBeLessThanOrEqual(100);
      const back = arenaPointToWorld(map, arena);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.z).toBeCloseTo(z, 6);
    }
  });

  it('documents the clamp: out-of-bounds arena points snap to the map edge', () => {
    const snapped = arenaPointToWorld(HEL_RA, { x: 150, z: -20 });
    const corner = arenaPointToWorld(HEL_RA, { x: 100, z: 0 });
    expect(snapped.x).toBeCloseTo(corner.x, 9);
    expect(snapped.z).toBeCloseTo(corner.z, 9);
  });

  it('rejects non-finite input instead of propagating NaN', () => {
    expect(() => arenaPointToWorld(HEL_RA, { x: NaN, z: 0 })).toThrow(TypeError);
    expect(() => arenaPointToWorld(HEL_RA, { x: 0, z: Infinity })).toThrow(TypeError);
  });

  it('computeUnitScale handles non-square and degenerate maps', () => {
    // Real ESO maps are square; synthesize a wide one for the per-axis assertion
    // (ellipse-safe sizing consumes both axes independently).
    const wide = { ...HEL_RA, maxZ: HEL_RA.minZ + (HEL_RA.maxX - HEL_RA.minX) * 2 };
    const scale = computeUnitScale(wide)!;
    expect(scale.unitsPerMeterX).not.toBeCloseTo(scale.unitsPerMeterZ, 2);
    expect(scale.unitsPerMeter).toBeCloseTo(
      Math.sqrt(scale.unitsPerMeterX * scale.unitsPerMeterZ),
      9,
    );
    expect(computeUnitScale({ ...HEL_RA, minX: 0, maxX: 0, minZ: 0, maxZ: 10 })).toBeNull();
  });

  it('isWithinMapBounds gates XZ and the Y band', () => {
    expect(isWithinMapBounds(HEL_RA, 80000, 70000)).toBe(true);
    expect(isWithinMapBounds(HEL_RA, 0, 0)).toBe(false);
    const floored = { ...HEL_RA, y: 15000 };
    expect(isWithinMapBounds(floored, 80000, 70000, 15000)).toBe(true);
    expect(isWithinMapBounds(floored, 80000, 70000, 15000 + 2001)).toBe(false);
  });
});
