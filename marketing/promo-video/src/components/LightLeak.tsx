import { lightLeak } from '@remotion/effects';
import React from 'react';
import { AbsoluteFill, Solid, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * A WebGL light leak screened over the frame. Reserved for the two biggest beats: the
 * Legendary upgrade (warm) and the logo landing (cool).
 */
export const LightLeak: React.FC<{
  at: number;
  duration: number;
  hueShift?: number;
  seed?: number;
  strength?: number;
}> = ({ at, duration, hueShift = 0, seed = 0, strength = 0.85 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = frame - at;
  if (local < 0 || local > duration) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: strength, pointerEvents: 'none' }}>
      <Solid
        width={width}
        height={height}
        color="#000000"
        effects={[lightLeak({ seed, hueShift, progress: local / duration })]}
      />
    </AbsoluteFill>
  );
};
