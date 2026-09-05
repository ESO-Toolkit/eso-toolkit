import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { prepareReconstructedModelMaterial } from '../features/fight_replay/utils/reconstructedModelMaterial';
import {
  STATIC_REPLAY_ACTOR_MODEL_ASSETS,
  type StaticReplayActorModelAsset,
  resolveReplayModelUrl,
} from '../features/fight_replay/utils/replayActorModelRegistry';

import {
  REVIEW_TARGET_HEIGHT_RATIO,
  VIEWS,
  getReviewCameraPosition,
  type ViewName,
} from './replayModelViewerCamera';

/** Only the bit of the OrbitControls instance this page drives. */
type OrbitControlsHandle = { update: () => void };

interface LoadedModel {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  box: THREE.Box3;
  triangles: number;
  vertices: number;
}

/**
 * A reviewer-facing viewer for the reconstructed fight-replay NPC assets.
 *
 * The replay itself only ever shows one boss at a time, at a small on-screen size, inside a live
 * encounter — which makes it a poor place to judge whether an asset is actually acceptable. This
 * page loads the same registry entries through the same material normalization as the replay, so
 * what you see here is what the replay renders, but from any angle and at any zoom.
 */
function ModelScene({
  asset,
  onLoaded,
  onError,
}: {
  asset: StaticReplayActorModelAsset;
  onLoaded: (model: LoadedModel) => void;
  onError: (message: string) => void;
}): React.ReactElement | null {
  const [model, setModel] = useState<LoadedModel | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    let cancelled = false;
    setModel(null);
    const loader = new GLTFLoader();
    loader.load(
      resolveReplayModelUrl(asset.path, import.meta.env.BASE_URL),
      (gltf) => {
        let found: THREE.Mesh | null = null;
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh && mesh.geometry && !found) found = mesh;
        });
        if (!found) {
          onError('The GLB contained no mesh.');
          return;
        }
        const mesh = found as THREE.Mesh;
        const geometry = mesh.geometry as THREE.BufferGeometry;
        geometry.applyMatrix4(mesh.matrixWorld);
        const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(
          (m): m is THREE.Material => !!m,
        );
        if (cancelled) {
          geometry.dispose();
          materials.forEach((m) => m.dispose());
          return;
        }
        // Same normalization the replay applies, so this preview cannot flatter the asset.
        materials.forEach((m) => prepareReconstructedModelMaterial(m, { doubleSided: false }));
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        const index = geometry.getIndex();
        const loaded: LoadedModel = {
          geometry,
          materials,
          box: new THREE.Box3().setFromBufferAttribute(position),
          triangles: (index ? index.count : position.count) / 3,
          vertices: position.count,
        };
        setModel(loaded);
        onLoaded(loaded);
      },
      undefined,
      () =>
        onError('The GLB failed to load. In the replay this leaves the capsule marker visible.'),
    );
    return () => {
      cancelled = true;
    };
  }, [asset, onLoaded, onError]);

  if (!model) return null;

  // Ground the model the same way the replay does: re-centre on X/Z and put min Y at the floor.
  const center = model.box.getCenter(new THREE.Vector3());
  const offset: [number, number, number] = [-center.x, -model.box.min.y, -center.z];

  return (
    <mesh ref={meshRef} geometry={model.geometry} material={model.materials[0]} position={offset} />
  );
}

/**
 * Snap the camera to a named review angle.
 *
 * This deliberately writes the camera once per view change rather than every frame: OrbitControls
 * also owns the camera, so a per-frame lerp fights it and the model drifts off-centre and never
 * settles. Setting the position and letting the controls re-sync leaves the user free to orbit.
 */
function CameraRig({
  view,
  radius,
  controlsRef,
}: {
  view: ViewName;
  radius: number;
  controlsRef: React.RefObject<OrbitControlsHandle | null>;
}): null {
  const { camera } = useThree();

  useEffect(() => {
    const [ex, ey, ez] = getReviewCameraPosition(view, radius);
    camera.position.set(ex, ey, ez);
    camera.lookAt(0, radius * REVIEW_TARGET_HEIGHT_RATIO, 0);
    controlsRef.current?.update();
  }, [view, radius, camera, controlsRef]);

  return null;
}

export function ReplayModelViewerPage(): React.ReactElement {
  const assets = STATIC_REPLAY_ACTOR_MODEL_ASSETS;
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '');
  const [view, setView] = useState<ViewName>('three-quarter');
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);

  const asset = assets.find((a) => a.id === assetId) ?? assets[0];
  const height = model ? model.box.max.y - model.box.min.y : 2;

  useEffect(() => {
    setModel(null);
    setError(null);
  }, [assetId]);

  if (!asset) {
    return <main style={{ padding: 24 }}>No reconstructed replay models are registered.</main>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Replay NPC model viewer</h1>
      <p style={{ opacity: 0.75, marginTop: 0 }}>
        Review-only. These are project-authorized fan reconstructions built from published reference
        screenshots, rendered through the same material setup the fight replay uses.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {assets.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAssetId(a.id)}
            aria-pressed={a.id === assetId}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: a.id === assetId ? 700 : 400,
            }}
          >
            {a.id}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {(Object.keys(VIEWS) as ViewName[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setView(name)}
            aria-pressed={name === view}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: name === view ? 700 : 400,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={{ height: 560, border: '1px solid rgba(128,128,128,0.35)', borderRadius: 8 }}>
        <Canvas
          camera={{ fov: 40, near: 0.05, far: 100 }}
          shadows={false}
          onCreated={({ scene }) => {
            scene.background = new THREE.Color('#12161c');
          }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 6, 4]} intensity={1.5} />
          <directionalLight position={[-4, 3, -3]} intensity={0.5} />
          <gridHelper args={[8, 16, '#39424f', '#232a33']} />
          <Suspense fallback={null}>
            <ModelScene asset={asset} onLoaded={setModel} onError={setError} />
          </Suspense>
          <CameraRig view={view} radius={height} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef as React.Ref<never>}
            target={[0, height * 0.5, 0]}
            enablePan
          />
        </Canvas>
      </div>

      {error ? (
        <p role="alert" style={{ color: '#ff8080' }}>
          {error}
        </p>
      ) : null}

      <section style={{ marginTop: 16, lineHeight: 1.7 }}>
        <strong>{asset.id}</strong>
        <div>
          {model
            ? `${model.triangles.toLocaleString()} triangles · ${model.vertices.toLocaleString()} vertices · ${model.materials.length} material${model.materials.length === 1 ? '' : 's'}`
            : 'Loading…'}
        </div>
        <div>
          Bounds{' '}
          {model
            ? `${(model.box.max.x - model.box.min.x).toFixed(3)} x ${height.toFixed(3)} x ${(model.box.max.z - model.box.min.z).toFixed(3)}`
            : '—'}{' '}
          · replay scale {asset.transform.scale}x
        </div>
        <div>
          Reference:{' '}
          <a href={asset.provenance.sourceUrl} target="_blank" rel="noreferrer noopener">
            {asset.provenance.sourceUrl}
          </a>
        </div>
        <div style={{ opacity: 0.75 }}>Provenance: {asset.provenance.attributionFile}</div>
      </section>
    </main>
  );
}
