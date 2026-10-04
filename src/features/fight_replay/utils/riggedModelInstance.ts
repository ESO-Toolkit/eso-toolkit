import * as THREE from 'three';
import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { prepareReconstructedModelMaterial } from './reconstructedModelMaterial';
import type { RiggedModelAnimationSample } from './riggedModelAnimation';

const CLIP_NAMES = ['idle', 'walk', 'cast'] as const;
type ClipName = (typeof CLIP_NAMES)[number];

/** Optional skeletal upgrade; the static catalog remains the fallback and source of transforms. */
export const RIGGED_REPLAY_MODEL_ASSETS: ReadonlyMap<
  string,
  { readonly path: string; readonly walkDistance: number }
> = new Map([
  [
    'yandir-the-butcher-overview-v2',
    {
      path: 'models/fight-replay/npcs/yandir-the-butcher-rigged-v2.glb',
      // Model-space travel per cycle, measured by the authoring script. Runtime applies catalog scale.
      walkDistance: 0.6310190558433533,
    },
  ],
]);

export interface RiggedModelTemplate {
  readonly scene: THREE.Group;
  readonly clips: Readonly<Record<ClipName, THREE.AnimationClip>>;
  readonly rawBox: THREE.Box3;
}

export interface RiggedModelInstance {
  readonly root: THREE.Group;
  readonly mixer: THREE.AnimationMixer;
  readonly actions: Readonly<Record<ClipName, THREE.AnimationAction>>;
  readonly materials: readonly THREE.Material[];
  readonly baseColors: readonly (THREE.Color | null)[];
}

/** Dispose only resources owned by a parsed GLB, including textures and any bone textures. */
export function disposeRiggedModelTemplate(scene: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value: unknown) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

/** Reject unusable rigs before they can replace the actor's visible fallback. */
export function prepareRiggedModelTemplate(gltf: GLTF): RiggedModelTemplate {
  let hasSkin = false;
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    hasSkin = true;
    if (
      !object.skeleton.bones.length ||
      !object.geometry.getAttribute('skinIndex') ||
      !object.geometry.getAttribute('skinWeight')
    ) {
      throw new Error('Replay model has an incomplete skin');
    }
  });
  if (!hasSkin) throw new Error('Replay model has no skin');
  const clips = {} as Record<ClipName, THREE.AnimationClip>;
  CLIP_NAMES.forEach((name) => {
    const clip = gltf.animations.find((candidate) => candidate.name === name);
    if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0 || !clip.tracks.length) {
      throw new Error(`Replay model is missing a usable ${name} clip`);
    }
    // Root translation belongs to the combat log; authored clips may animate bones only.
    clip.tracks.forEach((track) => {
      const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
      const target = THREE.PropertyBinding.findNode(gltf.scene, nodeName) as THREE.Object3D | null;
      if (!(target instanceof THREE.Bone)) throw new Error('Replay clip animates a non-bone node');
    });
    clips[name] = clip;
  });
  gltf.scene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltf.scene);
  if (rawBox.isEmpty() || !Number.isFinite(rawBox.min.y + rawBox.max.y)) {
    throw new Error('Replay model has invalid bounds');
  }
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.transparent = true;
      prepareReconstructedModelMaterial(material, { doubleSided: false });
    });
  });
  return { scene: gltf.scene, clips, rawBox };
}

export function loadRiggedModelTemplate(
  loader: GLTFLoader,
  url: string,
): Promise<RiggedModelTemplate> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        try {
          resolve(prepareRiggedModelTemplate(gltf));
        } catch (error) {
          disposeRiggedModelTemplate(gltf.scene);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
      undefined,
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}

/** Shared geometry/textures, independent bones, mixer, and material state for every actor. */
export function createRiggedModelInstance(template: RiggedModelTemplate): RiggedModelInstance {
  const scene = clone(template.scene);
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  root.visible = false;
  root.add(scene);
  const clonedMaterials = new Map<THREE.Material, THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const copyMaterial = (material: THREE.Material): THREE.Material => {
      let result = clonedMaterials.get(material);
      if (!result) {
        result = material.clone();
        clonedMaterials.set(material, result);
      }
      return result;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(copyMaterial)
      : copyMaterial(object.material);
    // The existing actor hit proxy handles selection; skinned triangles add no pointer work.
    object.raycast = () => {};
    object.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(scene);
  const actions = {} as Record<ClipName, THREE.AnimationAction>;
  CLIP_NAMES.forEach((name) => {
    const action = mixer.clipAction(template.clips[name]);
    action.play();
    action.paused = true;
    action.setEffectiveWeight(name === 'idle' ? 1 : 0);
    actions[name] = action;
  });
  const materials = [...clonedMaterials.values()];
  const baseColors = materials.map((material) =>
    material instanceof THREE.MeshStandardMaterial ? material.color.clone() : null,
  );
  return { root, mixer, actions, materials, baseColors };
}

export function applyRiggedModelAnimation(
  instance: RiggedModelInstance,
  sample: RiggedModelAnimationSample,
): void {
  instance.actions.idle.time = sample.idleTime;
  instance.actions.walk.time = sample.walkTime;
  instance.actions.cast.time = sample.castTime;
  instance.actions.idle.setEffectiveWeight(sample.idleWeight);
  instance.actions.walk.setEffectiveWeight(sample.walkWeight);
  instance.actions.cast.setEffectiveWeight(sample.castWeight);
  // Evaluate assigned action times without advancing an independent wall clock.
  instance.mixer.update(0);
}

export function setRiggedModelAppearance(
  instance: RiggedModelInstance,
  tint: THREE.Color,
  opacity: number,
): void {
  instance.materials.forEach((material, index) => {
    const baseColor = instance.baseColors[index];
    if (material instanceof THREE.MeshStandardMaterial && baseColor) {
      material.color.copy(baseColor).multiply(tint);
    }
    material.opacity = opacity;
  });
}

export function disposeRiggedModelInstance(instance: RiggedModelInstance): void {
  instance.mixer.stopAllAction();
  instance.mixer.uncacheRoot(instance.mixer.getRoot());
  instance.materials.forEach((material) => material.dispose());
  instance.root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
  });
}
