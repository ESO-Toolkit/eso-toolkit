import * as THREE from 'three';

import { prepareReconstructedModelMaterial } from './reconstructedModelMaterial';

describe('prepareReconstructedModelMaterial', () => {
  it('keeps the baked atlas and applies non-metal reconstruction defaults', () => {
    const map = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({
      map,
      metalness: 1,
      roughness: 0.2,
    });

    prepareReconstructedModelMaterial(material);

    expect(material.map).toBe(map);
    expect(material.metalness).toBe(0);
    expect(material.roughness).toBe(0.82);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.emissive.getHex()).toBe(0xffffff);
    expect(material.emissiveMap).toBe(map);
    expect(material.emissiveIntensity).toBe(0.08);
    expect(map.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(map.anisotropy).toBe(16);
  });

  it('also makes non-PBR reconstruction materials two-sided', () => {
    const material = new THREE.MeshBasicMaterial();

    expect(() => prepareReconstructedModelMaterial(material)).not.toThrow();
    expect(material.side).toBe(THREE.DoubleSide);
  });

  it('keeps a reviewed closed mesh single-sided', () => {
    const material = new THREE.MeshStandardMaterial();

    prepareReconstructedModelMaterial(material, { doubleSided: false });

    expect(material.side).toBe(THREE.FrontSide);
  });
});
