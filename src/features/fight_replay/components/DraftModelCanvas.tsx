import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
import { Canvas, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Box3,
  BufferGeometry,
  Group,
  Line,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  Skeleton,
  Texture,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';

import { fitDraftModelCamera } from './draftModelCamera';

export interface DraftModelCanvasProps {
  modelUrl: string;
  name: string;
  posterUrl: string;
}

type View = 'Front' | 'Back' | 'Side' | 'Three-quarter';
const directions: Record<View, Vector3> = {
  Front: new Vector3(0, 0.1, 1),
  Back: new Vector3(0, 0.1, -1),
  Side: new Vector3(1, 0.1, 0),
  'Three-quarter': new Vector3(1, 0.25, 1),
};

interface LoadedModel {
  url: string;
  group: Group;
  bounds: Box3;
}

// Capture original resources before the optional clay override changes mesh materials.
function captureDisposal(scenes: Object3D[]): () => void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const images = new Set<ImageBitmap>();
  const skeletons = new Set<Skeleton>();
  const collectTexture = (value: unknown): void => {
    if (value instanceof Texture) {
      textures.add(value);
      const image: unknown = value.source.data;
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) images.add(image);
    }
  };
  for (const scene of scenes) {
    scene.traverse((object) => {
      if (!(object instanceof Mesh || object instanceof Line || object instanceof Points)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        Object.values(material).forEach(collectTexture);
        // GLTF extensions can supply shader uniforms in custom materials.
        const uniforms: unknown = Reflect.get(material, 'uniforms');
        if (uniforms && typeof uniforms === 'object') {
          for (const uniform of Object.values(uniforms) as unknown[]) {
            if (uniform && typeof uniform === 'object') {
              const value: unknown = Reflect.get(uniform, 'value');
              if (Array.isArray(value)) value.forEach(collectTexture);
              else collectTexture(value);
            }
          }
        }
      }
      const skeleton: unknown = Reflect.get(object, 'skeleton');
      if (skeleton instanceof Skeleton) skeletons.add(skeleton);
    });
  }
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    // A renderer can create a bone texture after the original resource snapshot.
    skeletons.forEach((skeleton) => skeleton.dispose());
    images.forEach((image) => image.close());
  };
}

class RendererBoundary extends React.Component<
  { children: React.ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    this.props.onFailure();
  }
  render(): React.ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function ModelScene({
  model,
  view,
  reset,
  clay,
  clayColor,
  onFailure,
}: {
  model: LoadedModel;
  view: View;
  reset: number;
  clay: boolean;
  clayColor: string;
  onFailure: () => void;
}): React.ReactElement {
  const { camera, size, invalidate, gl } = useThree();
  const controls = useRef<OrbitControlsInstance>(null);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || size.height <= 0 || size.width <= 0) return;
    const fit = fitDraftModelCamera(
      model.bounds,
      size.width / size.height,
      directions[view],
      camera.fov,
    );
    camera.aspect = size.width / size.height;
    camera.position.copy(fit.position);
    camera.near = fit.near;
    camera.far = fit.far;
    camera.lookAt(fit.target);
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.copy(fit.target);
      controls.current.maxDistance = fit.distance * 8;
      controls.current.update();
    }
    invalidate();
  }, [camera, size.width, size.height, model, view, reset, invalidate]);
  useLayoutEffect(() => {
    if (!clay) return;
    const material = new MeshStandardMaterial({ color: clayColor, roughness: 0.85, metalness: 0 });
    const originals = new Map<Mesh, Material | Material[]>();
    model.group.traverse((object) => {
      if (object instanceof Mesh) {
        originals.set(object, object.material);
        object.material = material;
      }
    });
    invalidate();
    return () => {
      originals.forEach((original, mesh) => {
        mesh.material = original;
      });
      material.dispose();
      invalidate();
    };
  }, [model, clay, clayColor, invalidate]);
  useEffect(() => {
    const lost = (event: Event): void => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return (
    <>
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#ffffff', '#64748b', 1.2]} />
      <directionalLight position={[4, 6, 5]} intensity={2.5} />
      <directionalLight position={[-4, 3, -5]} intensity={1.5} />
      {/* Resources belong to the loader effect, including successful stale requests. */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={model.group} dispose={null} />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        minDistance={0.2}
        onChange={() => invalidate()}
      />
    </>
  );
}

export function DraftModelCanvas({
  modelUrl,
  name,
  posterUrl,
}: DraftModelCanvasProps): React.ReactElement {
  const theme = useTheme();
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webGL, setWebGL] = useState<boolean | null>(null);
  const [rendererFailed, setRendererFailed] = useState(false);
  const [view, setView] = useState<View>('Three-quarter');
  const [reset, setReset] = useState(0);
  const [clay, setClay] = useState(false);
  const failRenderer = useCallback(() => setRendererFailed(true), []);

  useEffect(() => {
    setClay(false);
  }, [modelUrl]);

  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
      setWebGL(Boolean(context));
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setWebGL(false);
    }
  }, []);

  useEffect(() => {
    if (!webGL || rendererFailed) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setModel(null);
    setLoadError(null);
    setProgress(null);
    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        const release = captureDisposal(gltf.scenes.length ? gltf.scenes : [gltf.scene]);
        if (cancelled) {
          release();
          return;
        }
        dispose = release;
        try {
          gltf.scene.updateMatrixWorld(true);
          const bounds = new Box3().setFromObject(gltf.scene, true);
          const size = bounds.getSize(new Vector3());
          if (
            bounds.isEmpty() ||
            ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite) ||
            size.y <= 0
          ) {
            throw new Error('Model has no finite visible bounds');
          }
          const center = bounds.getCenter(new Vector3());
          const scale = 2 / size.y;
          const group = new Group();
          group.scale.setScalar(scale);
          group.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
          group.add(gltf.scene);
          group.updateMatrixWorld(true);
          setModel({ url: modelUrl, group, bounds: new Box3().setFromObject(group, true) });
        } catch {
          release();
          setLoadError('The 3D model could not be displayed.');
        }
      },
      (event) => {
        if (!cancelled)
          setProgress(event.total > 0 ? Math.min(100, (event.loaded / event.total) * 100) : null);
      },
      () => {
        if (!cancelled) setLoadError('The 3D model could not be loaded.');
      },
    );
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [modelUrl, webGL, rendererFailed]);

  const activeModel = model?.url === modelUrl ? model : null;
  const unavailable = webGL === false || rendererFailed;
  const ready = Boolean(activeModel && !unavailable && !loadError);
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderRadius: '14px',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        role="group"
        aria-label={`${name} 3D preview`}
        sx={{
          position: 'relative',
          height: { xs: 360, sm: 480, md: 560 },
          background: alpha(theme.palette.background.default, 0.65),
        }}
      >
        {!ready && (
          <Box
            component="img"
            src={posterUrl}
            alt={`${name} draft preview`}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )}
        {ready && activeModel && (
          <RendererBoundary onFailure={failRenderer}>
            <Canvas
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{ fov: 40, position: [0, 2, 8] }}
              fallback={null}
            >
              <ModelScene
                model={activeModel}
                view={view}
                reset={reset}
                clay={clay}
                clayColor={theme.palette.mode === 'dark' ? '#cbd5e1' : '#94a3b8'}
                onFailure={failRenderer}
              />
            </Canvas>
          </RendererBoundary>
        )}
        {!ready && (
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 16,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.94),
            }}
          >
            <Typography
              role={loadError || unavailable ? 'alert' : 'status'}
              aria-live="polite"
              variant="body2"
            >
              {unavailable
                ? '3D preview unavailable. Reference image remains available.'
                : (loadError ?? `Loading ${name} 3D preview…`)}
            </Typography>
            {!unavailable && !loadError && (
              <LinearProgress
                aria-label="Loading 3D model"
                variant={progress === null ? 'indeterminate' : 'determinate'}
                value={progress ?? undefined}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        )}
      </Box>
      <Stack
        direction="row"
        useFlexGap
        spacing={0.5}
        sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}
      >
        {(Object.keys(directions) as View[]).map((option) => (
          <Button
            key={option}
            size="small"
            disabled={!ready}
            aria-pressed={view === option}
            variant={view === option ? 'contained' : 'text'}
            onClick={() => {
              setView(option);
              setReset((value) => value + 1);
            }}
          >
            {option}
          </Button>
        ))}
        <Button
          size="small"
          disabled={!ready}
          onClick={() => {
            setView('Three-quarter');
            setReset((value) => value + 1);
          }}
        >
          Reset view
        </Button>
        <Button
          size="small"
          disabled={!ready}
          aria-pressed={clay}
          onClick={() => setClay((value) => !value)}
        >
          {clay ? 'Original materials' : 'Clay'}
        </Button>
      </Stack>
    </Paper>
  );
}
