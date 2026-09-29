import { noise2D } from '@remotion/noise';
import React, { useMemo } from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { color } from '../theme';

// The site's nebula background (NebulaBackground.tsx), rebuilt deterministically: a dark
// diagonal base, three slow colour clouds, a faint 50px grid and a twinkling star field.
const clouds = [
  { rgb: '120, 60, 230', alpha: 0.2, size: 0.95, x: 0.2, y: 0.25, seed: 'a' },
  { rgb: '0, 217, 255', alpha: 0.13, size: 0.85, x: 0.82, y: 0.7, seed: 'b' },
  { rgb: '180, 60, 200', alpha: 0.1, size: 0.7, x: 0.6, y: 0.15, seed: 'c' },
];

const STAR_COUNT = 150;

export const Background: React.FC<{ tint?: string; tintAlpha?: number }> = ({
  tint,
  tintAlpha = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 60;

  const stars = useMemo(
    () =>
      new Array(STAR_COUNT).fill(0).map((_, i) => ({
        x: random(`sx${i}`) * width,
        y: random(`sy${i}`) * height,
        r: 0.6 + random(`sr${i}`) ** 3 * 2.2,
        phase: random(`sp${i}`) * Math.PI * 2,
        speed: 0.6 + random(`sv${i}`) * 1.6,
        glow: random(`sg${i}`) > 0.9,
      })),
    [width, height],
  );

  const gridOffset = (frame * 0.12) % 50;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${color.void} 0%, ${color.deep} 50%, ${color.void} 100%)`,
      }}
    >
      {clouds.map((c) => {
        const dx = noise2D(`${c.seed}x`, t * 0.05, 0) * 0.08;
        const dy = noise2D(`${c.seed}y`, 0, t * 0.05) * 0.08;
        const size = Math.max(width, height) * c.size;
        return (
          <div
            key={c.seed}
            style={{
              position: 'absolute',
              left: (c.x + dx) * width - size / 2,
              top: (c.y + dy) * height - size / 2,
              width: size,
              height: size,
              background: `radial-gradient(closest-side, rgba(${c.rgb}, ${c.alpha}), rgba(${c.rgb}, 0))`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          backgroundPosition: `${gridOffset}px ${gridOffset}px`,
          maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
        }}
      />
      {stars.map((s, i) => {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: '50%',
              background: '#ffffff',
              opacity: twinkle * (s.glow ? 0.9 : 0.55),
              boxShadow: s.glow ? '0 0 8px 2px rgba(160, 220, 255, 0.55)' : undefined,
            }}
          />
        );
      })}
      {tint && tintAlpha > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${tint} 0%, transparent 70%)`,
            opacity: tintAlpha,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// Animated film grain from a cached SVG turbulence tile, cycled through a few seeds.
const grainTile = (seed: number): string =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;

const GRAIN_TILES = new Array(6).fill(0).map((_, i) => grainTile(i + 1));

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const tile = GRAIN_TILES[Math.floor(frame / 2) % GRAIN_TILES.length];
  return (
    <AbsoluteFill
      style={{
        backgroundImage: tile,
        backgroundSize: '256px 256px',
        mixBlendMode: 'overlay',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(2, 4, 10, 0.72) 100%)',
      pointerEvents: 'none',
    }}
  />
);
