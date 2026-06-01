import * as THREE from 'three';

/**
 * Per-instance opacity for InstancedMesh.
 *
 * `InstancedMesh.instanceColor` (set via `setColorAt`) is RGB-only — three.js has no built-in
 * per-instance alpha. The figure actor-marker design encodes opacity per instance in several
 * transparent layers (anchor ring 0.35/0.7/0.95 by dead/player/threat, vision cone 0.12/0.42 by
 * dead, body/cap 0.4/1 by dead). Flattening that to a single material-level opacity would change
 * how the markers look — the one invariant we must preserve. So we add a custom
 * `instanceOpacity` InstancedBufferAttribute and patch the material via `onBeforeCompile` to
 * multiply it into the fragment alpha.
 *
 * This is the contained complexity delta vs the old instanced puck, which dodged per-instance
 * alpha by using constant material opacity and encoding "dead" via scale instead.
 */

const ATTRIBUTE_NAME = 'instanceOpacity';

/**
 * Attach a per-instance opacity attribute to an InstancedMesh's geometry and patch its material
 * so each instance's alpha is multiplied by its `instanceOpacity` value. Idempotent: safe to call
 * on every geometry/material (re)creation. The mesh's material MUST be `transparent: true`.
 *
 * Returns the Float32Array backing the attribute so callers can write per-instance values and
 * flag `attribute.needsUpdate = true` (the array is also reachable via
 * `geometry.getAttribute('instanceOpacity')`).
 */
export function enablePerInstanceOpacity(
  geometry: THREE.InstancedBufferGeometry | THREE.BufferGeometry,
  material: THREE.Material,
  instanceCount: number,
): Float32Array {
  const existing = geometry.getAttribute(ATTRIBUTE_NAME) as
    | THREE.InstancedBufferAttribute
    | undefined;
  let array: Float32Array;
  if (existing && existing.array instanceof Float32Array && existing.count === instanceCount) {
    array = existing.array;
  } else {
    array = new Float32Array(instanceCount).fill(1);
    const attribute = new THREE.InstancedBufferAttribute(array, 1);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(ATTRIBUTE_NAME, attribute);
  }

  patchMaterial(material);
  return array;
}

/**
 * Patch a material's shader so it reads the `instanceOpacity` attribute and multiplies it into
 * the final fragment alpha. Guarded so it patches exactly once per material.
 */
function patchMaterial(material: THREE.Material): void {
  const patchable = material as THREE.Material & {
    onBeforeCompile: (shader: THREE.WebGLProgramParametersWithUniforms) => void;
    __instanceOpacityPatched?: boolean;
  };
  if (patchable.__instanceOpacityPatched) {
    return;
  }
  patchable.__instanceOpacityPatched = true;

  const previousOnBeforeCompile = patchable.onBeforeCompile?.bind(patchable);

  patchable.onBeforeCompile = (shader) => {
    previousOnBeforeCompile?.(shader);

    // Vertex: declare the attribute, pass it to the fragment shader as a varying.
    shader.vertexShader =
      `attribute float ${ATTRIBUTE_NAME};\nvarying float vInstanceOpacity;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vInstanceOpacity = instanceOpacity;',
      );

    // Fragment: multiply the varying into the output alpha. `dithering_fragment` is the last
    // chunk that touches gl_FragColor, so multiplying after it covers every material type
    // (basic, standard, etc.) without depending on diffuse/opacity chunk internals.
    shader.fragmentShader = `varying float vInstanceOpacity;\n${shader.fragmentShader}`.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n  gl_FragColor.a *= vInstanceOpacity;',
    );
  };

  // Force a recompile if the material was already used before patching.
  material.needsUpdate = true;
}

/** The attribute name, exported for callers that prefer `geometry.getAttribute(...)`. */
export const INSTANCE_OPACITY_ATTRIBUTE = ATTRIBUTE_NAME;
