import * as THREE from 'three';

// Geometry constants - Base sizes for full-arena (100x100) scale
// These will be scaled down automatically for smaller fight areas
const VISION_CONE_LENGTH = 0.75;
const VISION_CONE_ANGLE = Math.PI / 6;
const PUCK_RADIUS = 0.15;
const PUCK_HEIGHT = 0.1;
const TAUNT_RING_INNER_RADIUS = PUCK_RADIUS + 0.05;
const TAUNT_RING_OUTER_RADIUS = PUCK_RADIUS + 0.1;
const PUCK_RADIAL_SEGMENTS = 16;

/**
 * Shared geometries for all actor instances
 * This significantly reduces memory usage and improves performance by sharing
 * geometry objects across all actor meshes instead of creating duplicates
 */
class SharedActor3DGeometries {
  private static instance: SharedActor3DGeometries;
  private geometries: Map<
    number,
    {
      puckGeometry: THREE.CylinderGeometry;
      visionConeGeometry: THREE.BufferGeometry;
      tauntRingGeometry: THREE.RingGeometry;
    }
  > = new Map();

  private constructor() {}

  static getInstance(): SharedActor3DGeometries {
    if (!SharedActor3DGeometries.instance) {
      SharedActor3DGeometries.instance = new SharedActor3DGeometries();
    }
    return SharedActor3DGeometries.instance;
  }

  /**
   * Get or create geometries for a specific scale
   * Caches geometries per scale to avoid recreation
   */
  getGeometries(scale = 1): {
    puckGeometry: THREE.CylinderGeometry;
    visionConeGeometry: THREE.BufferGeometry;
    tauntRingGeometry: THREE.RingGeometry;
  } {
    const scaleKey = Math.round(scale * 100); // Round to avoid floating point issues

    const cached = this.geometries.get(scaleKey);
    if (cached) {
      return cached;
    }

    // Create new geometries for this scale
    const geometries = this.createGeometries(scale);
    this.geometries.set(scaleKey, geometries);
    return geometries;
  }

  private createGeometries(scale: number): {
    puckGeometry: THREE.CylinderGeometry;
    visionConeGeometry: THREE.BufferGeometry;
    tauntRingGeometry: THREE.RingGeometry;
  } {
    // Puck geometry (cylinder)
    const puckGeometry = new THREE.CylinderGeometry(
      PUCK_RADIUS * scale,
      PUCK_RADIUS * scale,
      PUCK_HEIGHT * scale,
      PUCK_RADIAL_SEGMENTS,
    );

    // Vision cone geometry
    const visionConeGeometry = new THREE.BufferGeometry();
    const coneRadius = VISION_CONE_LENGTH * scale * Math.tan(VISION_CONE_ANGLE);
    const coneLength = VISION_CONE_LENGTH * scale;

    const vertices = new Float32Array([
      0,
      0,
      -PUCK_RADIUS * scale,
      -coneRadius,
      0,
      coneLength - PUCK_RADIUS * scale,
      coneRadius,
      0,
      coneLength - PUCK_RADIUS * scale,
      0,
      0,
      -PUCK_RADIUS * scale,
      coneRadius,
      0,
      coneLength - PUCK_RADIUS * scale,
      -coneRadius,
      0,
      coneLength - PUCK_RADIUS * scale,
    ]);

    const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);

    visionConeGeometry.setIndex(Array.from(indices));
    visionConeGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    visionConeGeometry.computeVertexNormals();

    // Taunt ring geometry
    const tauntRingGeometry = new THREE.RingGeometry(
      TAUNT_RING_INNER_RADIUS * scale,
      TAUNT_RING_OUTER_RADIUS * scale,
      16,
    );

    return {
      puckGeometry,
      visionConeGeometry,
      tauntRingGeometry,
    };
  }

  /**
   * Dispose of all cached geometries
   * Call this when the component unmounts or when clearing cache
   */
  dispose(): void {
    for (const geometrySet of this.geometries.values()) {
      geometrySet.puckGeometry.dispose();
      geometrySet.visionConeGeometry.dispose();
      geometrySet.tauntRingGeometry.dispose();
    }
    this.geometries.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    totalCacheEntries: number;
    memoryEstimate: string;
    cachedScales: number[];
  } {
    return {
      totalCacheEntries: this.geometries.size,
      memoryEstimate: `~${this.geometries.size * 10}KB`,
      cachedScales: Array.from(this.geometries.keys()),
    };
  }
}

// Export singleton instance
export const sharedActor3DGeometries = SharedActor3DGeometries.getInstance();

/**
 * Hook to get shared geometries for actor components
 * This replaces individual useMemo geometry creation with shared instances
 */
export function useSharedActor3DGeometries(scale = 1): {
  puckGeometry: THREE.CylinderGeometry;
  visionConeGeometry: THREE.BufferGeometry;
  tauntRingGeometry: THREE.RingGeometry;
} {
  return sharedActor3DGeometries.getGeometries(scale);
}
