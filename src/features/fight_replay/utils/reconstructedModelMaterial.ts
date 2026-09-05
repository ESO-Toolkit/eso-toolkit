import * as THREE from 'three';

const RECONSTRUCTED_MODEL_ANISOTROPY = 8;
const RECONSTRUCTED_MODEL_EMISSIVE_INTENSITY = 0.2;
const RECONSTRUCTED_MODEL_ROUGHNESS = 0.82;

/**
 * Normalize image-to-3D materials for the replay renderer.
 *
 * Reconstruction exports often omit metallicFactor. glTF defines an omitted metallic factor as
 * 1, which makes a baked photographic albedo behave like polished metal and can make large parts
 * of the texture appear dark or absent. These assets also commonly contain thin, single-sided
 * armor shells. Keep the authored color atlas, but apply predictable cloth/leather-oriented
 * defaults until the asset has dedicated PBR maps.
 */
export function prepareReconstructedModelMaterial(
  material: THREE.Material,
  { doubleSided = true }: { doubleSided?: boolean } = {},
): void {
  material.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;

  if (!(material instanceof THREE.MeshStandardMaterial)) {
    material.needsUpdate = true;
    return;
  }

  material.metalness = 0;
  material.roughness = RECONSTRUCTED_MODEL_ROUGHNESS;

  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.anisotropy = Math.max(material.map.anisotropy, RECONSTRUCTED_MODEL_ANISOTROPY);
    material.map.needsUpdate = true;

    // The replay's overhead lighting is deliberately dramatic, but baked reconstruction atlases
    // already contain their own light information. A small albedo-fed emissive contribution keeps
    // leather, fur, and cloth readable without making the asset look unlit.
    material.emissive.set(0xffffff);
    material.emissiveMap = material.map;
    material.emissiveIntensity = RECONSTRUCTED_MODEL_EMISSIVE_INTENSITY;
  }

  material.needsUpdate = true;
}
