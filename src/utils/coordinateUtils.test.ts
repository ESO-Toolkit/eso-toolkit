import { convertCoordinatesWithBottomLeft } from './coordinateUtils';

/**
 * COORDINATE CONTRACT REGRESSION GUARD.
 *
 * Actor/marker world positions and the floor MAP texture are aligned by a PAIR of X-flips that
 * cancel each other:
 *   1. the floor mesh is mirrored on X via `scale={[-1, 1, 1]}` (DynamicMapTexture.tsx), and
 *   2. `convertCoordinatesWithBottomLeft` flips X back with `x3D = 100 - x / 100`.
 * Together they put a game-space actor on the correct spot of the map image. Remove or change
 * EITHER one alone and the map silently mirrors under the actors with no runtime error — the exact
 * failure mode this file exists to catch. If you intentionally change the floor transform or this
 * conversion, update BOTH and re-derive the expectations below.
 */
describe('convertCoordinatesWithBottomLeft — map/actor alignment contract', () => {
  it('flips X (100 - x/100) so it cancels the floor mesh scale.x = -1', () => {
    // x in game-cm/100 units; the function divides by 100 then subtracts from 100.
    const [x3D] = convertCoordinatesWithBottomLeft(2500, 0);
    expect(x3D).toBeCloseTo(100 - 25, 5); // 75
  });

  it('maps game Y straight to +Z (no flip on that axis)', () => {
    const [, , z3D] = convertCoordinatesWithBottomLeft(0, 3000);
    expect(z3D).toBeCloseTo(30, 5);
  });

  it('keeps Y (height) at 0 — actors are grounded on the floor plane', () => {
    const [, y3D] = convertCoordinatesWithBottomLeft(1234, 5678);
    expect(y3D).toBe(0);
  });

  it('places the X-origin at the far edge (100) and large X near 0 — the mirror direction', () => {
    const [originX] = convertCoordinatesWithBottomLeft(0, 0);
    const [bigX] = convertCoordinatesWithBottomLeft(10000, 0);
    expect(originX).toBeCloseTo(100, 5); // game x=0 → arena x=100 (far side, because of the flip)
    expect(bigX).toBeCloseTo(0, 5); // game x=10000 → arena x=0 (near side)
    expect(originX).toBeGreaterThan(bigX); // the flip is what makes this ordering hold
  });

  it('maps arena center (5000, 5000) to the arena center (50, _, 50)', () => {
    const [x3D, , z3D] = convertCoordinatesWithBottomLeft(5000, 5000);
    expect(x3D).toBeCloseTo(50, 5);
    expect(z3D).toBeCloseTo(50, 5);
  });
});
