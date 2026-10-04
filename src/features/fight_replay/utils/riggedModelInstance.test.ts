import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { createRiggedModelAnimationSample } from './riggedModelAnimation';
import {
  applyRiggedModelAnimation,
  createRiggedModelInstance,
  disposeRiggedModelInstance,
  disposeRiggedModelTemplate,
  prepareRiggedModelTemplate,
  setRiggedModelAppearance,
  type RiggedModelInstance,
} from './riggedModelInstance';

/** Real skin, bones, clips, and mixer: no mocks of THREE or SkeletonUtils. */
function fixture(): GLTF {
  const scene = new THREE.Group();
  scene.name = 'replayScene';
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const material = new THREE.MeshStandardMaterial({ color: 0x99ccff, map: new THREE.Texture() });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'body';
  const hip = new THREE.Bone();
  hip.name = 'hip';
  const knee = new THREE.Bone();
  knee.name = 'knee';
  knee.position.y = 1;
  hip.add(knee);
  mesh.add(hip);
  scene.add(mesh);
  scene.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hip, knee]));
  const animations = ['idle', 'walk', 'cast'].map((name, index) => {
    const end = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      (index + 1) * 0.4,
    );
    return new THREE.AnimationClip(name, 1, [
      new THREE.QuaternionKeyframeTrack('hip.quaternion', [0, 1], [0, 0, 0, 1, ...end.toArray()]),
    ]);
  });
  return {
    scene,
    scenes: [scene],
    animations,
    cameras: [],
    asset: { version: '2.0' },
    userData: {},
    parser: {} as GLTF['parser'],
  };
}

function skin(
  root: THREE.Object3D,
): THREE.SkinnedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  const mesh = root.getObjectByName('body');
  if (
    !(mesh instanceof THREE.SkinnedMesh) ||
    !(mesh.material instanceof THREE.MeshStandardMaterial)
  )
    throw new Error('Missing fixture skin');
  return mesh as THREE.SkinnedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
}

function pose(instance: RiggedModelInstance, time: number): void {
  const sample = createRiggedModelAnimationSample();
  sample.idleWeight = 0;
  sample.walkWeight = 1;
  sample.walkTime = time;
  applyRiggedModelAnimation(instance, sample);
}

describe('riggedModelInstance', () => {
  it('gives actors independent bones, mixers and materials while sharing geometry and textures', () => {
    const template = prepareRiggedModelTemplate(fixture());
    const first = createRiggedModelInstance(template);
    const second = createRiggedModelInstance(template);
    const source = skin(template.scene);
    const a = skin(first.root);
    const b = skin(second.root);
    expect(a.skeleton).not.toBe(b.skeleton);
    expect(a.skeleton.bones[0]).not.toBe(b.skeleton.bones[0]);
    expect(a.skeleton.bones[0]).not.toBe(source.skeleton.bones[0]);
    expect(a.skeleton.bones[1].parent).toBe(a.skeleton.bones[0]);
    expect(first.mixer).not.toBe(second.mixer);
    expect(first.actions.walk).not.toBe(second.actions.walk);
    expect(a.geometry).toBe(source.geometry);
    expect(b.geometry).toBe(source.geometry);
    expect(a.material).not.toBe(source.material);
    expect(a.material).not.toBe(b.material);
    expect(a.material.map).toBe(source.material.map);
    expect(b.material.map).toBe(source.material.map);
    const originalColor = source.material.color.clone();
    setRiggedModelAppearance(first, new THREE.Color(0.5, 1, 0.25), 0.4);
    expect(a.material.color).toEqual(originalColor.clone().multiply(new THREE.Color(0.5, 1, 0.25)));
    expect(a.material.opacity).toBe(0.4);
    expect(b.material.color).toEqual(originalColor);
    expect(b.material.opacity).toBe(1);
    expect(source.material.color).toEqual(originalColor);
    setRiggedModelAppearance(first, new THREE.Color(0.5, 1, 0.25), 0.4);
    expect(a.material.color).toEqual(originalColor.clone().multiply(new THREE.Color(0.5, 1, 0.25)));
    pose(first, 0.5);
    expect(a.skeleton.bones[0].quaternion.y).toBeGreaterThan(0);
    expect(b.skeleton.bones[0].quaternion.y).toBe(0);
    expect(source.skeleton.bones[0].quaternion.y).toBe(0);
    disposeRiggedModelInstance(first);
    disposeRiggedModelInstance(second);
    disposeRiggedModelTemplate(template.scene);
  });

  it('evaluates explicit clip times deterministically across pauses and backward seeks without root translation', () => {
    const template = prepareRiggedModelTemplate(fixture());
    const instance = createRiggedModelInstance(template);
    instance.root.matrix.makeTranslation(7, 0, 11);
    const rootMatrix = instance.root.matrix.clone();
    pose(instance, 0.25);
    const expected = skin(instance.root).skeleton.bones[0].quaternion.clone();
    expect(expected.y).toBeCloseTo(Math.sin(0.1));
    for (const time of [0.8, 0.25, 0.25, 0.9, 0.1, 0.25]) pose(instance, time);
    expect(skin(instance.root).skeleton.bones[0].quaternion.toArray()).toEqual(expected.toArray());
    expect(instance.root.matrix).toEqual(rootMatrix);
    expect(instance.root.children[0].position.toArray()).toEqual([0, 0, 0]);
    expect(instance.mixer.time).toBe(0);
    expect(instance.actions.walk.paused).toBe(true);
    disposeRiggedModelInstance(instance);
    disposeRiggedModelTemplate(template.scene);
  });

  it.each(['missing', 'empty', 'zero', 'infinite', 'root'])(
    'rejects a %s invalid clip before replacing the fallback',
    (invalid) => {
      const gltf = fixture();
      if (invalid === 'missing')
        gltf.animations = gltf.animations.filter((clip) => clip.name !== 'walk');
      if (invalid === 'empty') gltf.animations[1].tracks = [];
      if (invalid === 'zero') gltf.animations[1].duration = 0;
      if (invalid === 'infinite') gltf.animations[1].duration = Infinity;
      if (invalid === 'root')
        gltf.animations[1].tracks = [
          new THREE.VectorKeyframeTrack('replayScene.position', [0, 1], [0, 0, 0, 10, 0, 0]),
        ];
      expect(() => prepareRiggedModelTemplate(gltf)).toThrow(/clip|bone/);
      disposeRiggedModelTemplate(gltf.scene);
    },
  );

  it.each(['noSkin', 'noBones', 'noWeights', 'noIndices'])(
    'rejects %s instead of hiding the fallback',
    (invalid) => {
      const gltf = fixture();
      const mesh = skin(gltf.scene);
      if (invalid === 'noSkin') gltf.scene.remove(mesh);
      if (invalid === 'noBones') mesh.skeleton.bones = [];
      if (invalid === 'noWeights') mesh.geometry.deleteAttribute('skinWeight');
      if (invalid === 'noIndices') mesh.geometry.deleteAttribute('skinIndex');
      expect(() => prepareRiggedModelTemplate(gltf)).toThrow(/skin/);
      disposeRiggedModelTemplate(mesh);
    },
  );

  it('disposes actor-owned resources without destroying geometry/textures shared with the template', () => {
    const template = prepareRiggedModelTemplate(fixture());
    const instance = createRiggedModelInstance(template);
    const source = skin(template.scene);
    const actor = skin(instance.root);
    source.skeleton.computeBoneTexture();
    actor.skeleton.computeBoneTexture();
    const geometryDispose = jest.spyOn(source.geometry, 'dispose');
    const textureDispose = jest.spyOn(source.material.map!, 'dispose');
    const sourceMaterialDispose = jest.spyOn(source.material, 'dispose');
    const actorMaterialDispose = jest.spyOn(actor.material, 'dispose');
    const sourceBoneTextureDispose = jest.spyOn(source.skeleton.boneTexture!, 'dispose');
    const actorBoneTextureDispose = jest.spyOn(actor.skeleton.boneTexture!, 'dispose');
    const uncache = jest.spyOn(instance.mixer, 'uncacheRoot');
    disposeRiggedModelInstance(instance);
    expect(uncache).toHaveBeenCalledWith(instance.mixer.getRoot());
    expect(actorMaterialDispose).toHaveBeenCalledTimes(1);
    expect(actorBoneTextureDispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    expect(sourceBoneTextureDispose).not.toHaveBeenCalled();
    disposeRiggedModelTemplate(template.scene);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(sourceMaterialDispose).toHaveBeenCalledTimes(1);
    expect(sourceBoneTextureDispose).toHaveBeenCalledTimes(1);
  });
});
