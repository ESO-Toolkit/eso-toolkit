import { useThree } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * A manually-driven bloom post-processing composer that respects the replay's on-demand render gate.
 *
 * The scene uses a manual `gl.render` inside RenderLoop behind a frame budget (static work is free,
 * per-frame work only paints while something changed). A library composer (@react-three/postprocessing)
 * installs its OWN render loop and would fight that gate, so we build a bare three.js EffectComposer and
 * hand its `render()` to RenderLoop via `composerRef` — bloom then runs ONLY on frames already painting,
 * keeping idle cost at zero.
 *
 * Pipeline: RenderPass (full scene) → UnrealBloomPass (luminance-thresholded, so only the brightest
 * pixels — stars, the lit moon faces, additive glows — bloom; the map floor stays below threshold and is
 * left crisp) → OutputPass (carries tone mapping + sRGB, replacing the renderer's own output conversion
 * which the composer bypasses). The renderer keeps NeutralToneMapping + exposure so colours match the
 * non-bloom path.
 */
export interface BloomComposerHandle {
  render: () => void;
  setSize: (width: number, height: number) => void;
}

interface BloomComposerProps {
  composerRef: React.MutableRefObject<BloomComposerHandle | null>;
  strength?: number;
  radius?: number;
  threshold?: number;
}

export const BloomComposer: React.FC<BloomComposerProps> = ({
  composerRef,
  strength = 0.85,
  radius = 0.5,
  // Threshold sits above the brightest the tone-mapped map floor can reach (incl. bright snow/white
  // zones), so only the un-tonemapped celestials (stars, lit moon faces, additive glows) bloom and the
  // floor never blooms to mush regardless of which map this ships to.
  threshold = 0.9,
}) => {
  const { gl, scene, camera, size } = useThree();

  const { composer, bloomPass } = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold,
    );
    c.addPass(bloom);
    // OutputPass applies the renderer's tone mapping + sRGB encoding (the composer renders to a linear
    // target and would otherwise output un-tonemapped/linear colour).
    c.addPass(new OutputPass());
    return { composer: c, bloomPass: bloom };
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep bloom params live-tunable without rebuilding the composer.
  useEffect(() => {
    bloomPass.strength = strength;
    bloomPass.radius = radius;
    bloomPass.threshold = threshold;
  }, [bloomPass, strength, radius, threshold]);

  // Track canvas size (incl. fullscreen transitions) — a hand-built composer does not auto-resize.
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);

  // Publish the render handle for RenderLoop to call in place of gl.render.
  useEffect(() => {
    composerRef.current = {
      render: () => composer.render(),
      setSize: (w, h) => composer.setSize(w, h),
    };
    return () => {
      if (composerRef.current?.render === composer.render) {
        composerRef.current = null;
      }
    };
  }, [composer, composerRef]);

  useEffect(() => () => composer.dispose(), [composer]);

  return null;
};
