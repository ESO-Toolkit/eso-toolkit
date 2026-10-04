import { Box3, MathUtils, Vector3 } from 'three';

/** Fits every bounding-box corner, including depth, to both perspective axes. */
export function fitDraftModelCamera(
  bounds: Box3,
  aspect: number,
  direction: Vector3,
  fov = 40,
  padding = 1.18,
): { position: Vector3; target: Vector3; distance: number; near: number; far: number } {
  const values = [...bounds.min.toArray(), ...bounds.max.toArray(), aspect, fov, padding];
  if (
    bounds.isEmpty() ||
    !values.every(Number.isFinite) ||
    aspect <= 0 ||
    fov <= 0 ||
    fov >= 180 ||
    padding < 1 ||
    !direction.toArray().every(Number.isFinite) ||
    direction.lengthSq() === 0
  ) {
    throw new Error('Invalid model camera bounds or projection');
  }
  const target = bounds.getCenter(new Vector3());
  const forward = direction.clone().normalize();
  const referenceUp = Math.abs(forward.y) > 0.99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const right = referenceUp.cross(forward).normalize();
  const up = forward.clone().cross(right).normalize();
  const tangentY = Math.tan(MathUtils.degToRad(fov / 2));
  const tangentX = tangentY * aspect;
  let distance = 0;
  let nearestDepth = -Infinity;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const relative = new Vector3(x, y, z).sub(target);
        const depth = relative.dot(forward);
        nearestDepth = Math.max(nearestDepth, depth);
        distance = Math.max(
          distance,
          depth + (padding * Math.abs(relative.dot(right))) / tangentX,
          depth + (padding * Math.abs(relative.dot(up))) / tangentY,
        );
      }
    }
  }
  distance = Math.max(distance, nearestDepth + 0.01);
  return {
    target,
    position: target.clone().addScaledVector(forward, distance),
    distance,
    // Keep close inspection possible after fitting a very wide mobile silhouette.
    near: Math.min(0.05, Math.max(0.001, (distance - nearestDepth) * 0.1)),
    far: distance * 20 + bounds.getSize(new Vector3()).length() * 2,
  };
}
