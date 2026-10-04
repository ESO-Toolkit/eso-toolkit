import { Box3, PerspectiveCamera, Vector3 } from 'three';

import { fitDraftModelCamera } from './draftModelCamera';

describe('fitDraftModelCamera', () => {
  const directions = [
    new Vector3(0, 0.1, 1),
    new Vector3(0, 0.1, -1),
    new Vector3(1, 0.1, 0),
    new Vector3(1, 0.25, 1),
  ];
  it.each([0.45, 1, 1.8])('keeps wide and deep models inside both axes at aspect %s', (aspect) => {
    for (const size of [new Vector3(12, 2, 1), new Vector3(2, 2, 12)]) {
      const bounds = new Box3(new Vector3(-3, 0, 7), new Vector3(-3, 0, 7).add(size));
      for (const direction of directions) {
        const fit = fitDraftModelCamera(bounds, aspect, direction);
        const camera = new PerspectiveCamera(40, aspect, fit.near, fit.far);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld();
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              const projected = new Vector3(x, y, z).project(camera);
              expect(Math.abs(projected.x)).toBeLessThanOrEqual(1 / 1.18 + 1e-8);
              expect(Math.abs(projected.y)).toBeLessThanOrEqual(1 / 1.18 + 1e-8);
              expect(projected.z).toBeGreaterThan(-1);
              expect(projected.z).toBeLessThan(1);
            }
          }
        }
      }
    }
  });
  it('moves farther away on narrow screens for a wide silhouette', () => {
    const bounds = new Box3(new Vector3(-6, 0, -0.5), new Vector3(6, 2, 0.5));
    expect(fitDraftModelCamera(bounds, 0.5, directions[0]).distance).toBeGreaterThan(
      fitDraftModelCamera(bounds, 1.8, directions[0]).distance,
    );
  });
  it('rejects non-finite or empty bounds and invalid projections', () => {
    expect(() => fitDraftModelCamera(new Box3(), 1, directions[0])).toThrow();
    const bounds = new Box3(new Vector3(), new Vector3(1, 1, 1));
    expect(() => fitDraftModelCamera(bounds, 0, directions[0])).toThrow();
    expect(() => fitDraftModelCamera(bounds, 1, new Vector3())).toThrow();
  });
});
