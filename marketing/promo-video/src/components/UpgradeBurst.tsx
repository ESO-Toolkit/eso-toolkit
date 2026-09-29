import React, { useMemo } from 'react';
import { interpolate, random } from 'remotion';
import { clamp, easeOut } from '../lib/anim';

type Props = {
  /** Burst center in stage pixels. */
  x: number;
  y: number;
  /** Frames since the upgrade hit. */
  since: number;
  hex: string;
  rgb: string;
  /** 1 for a regular upgrade, larger for the Legendary finale. */
  intensity?: number;
  seed: string;
};

/**
 * The upgrade impact around the tooltip: a shock ring, a soft bloom and a spray of diamond
 * sparks (the diamond is the mark at the heart of the ESO Toolkit logo).
 */
export const UpgradeBurst: React.FC<Props> = ({ x, y, since, hex, rgb, intensity = 1, seed }) => {
  const count = Math.round(20 * intensity);
  const sparks = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        angle: (i / count) * Math.PI * 2 + (random(`${seed}a${i}`) - 0.5) * 0.5,
        dist: (170 + random(`${seed}d${i}`) * 260) * (0.8 + intensity * 0.2),
        size: 5 + random(`${seed}s${i}`) * 10,
        spin: (random(`${seed}r${i}`) - 0.5) * 540,
        delay: random(`${seed}t${i}`) * 5,
      })),
    [count, intensity, seed],
  );

  if (since < 0 || since > 90) return null;

  const ringP = interpolate(since, [0, 42], [0, 1], { ...clamp, easing: easeOut });
  const ringR = 40 + ringP * 460 * (0.85 + intensity * 0.15);
  const bloom = interpolate(since, [0, 4, 60], [0, 0.85, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        translate: `${x}px ${y}px`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 900 * intensity,
          height: 900 * intensity,
          left: -450 * intensity,
          top: -450 * intensity,
          background: `radial-gradient(closest-side, rgba(${rgb}, 0.55), rgba(${rgb}, 0.12) 45%, rgba(${rgb}, 0))`,
          opacity: bloom,
          mixBlendMode: 'screen',
        }}
      />
      {[0, 1].map((ring) => {
        const p = interpolate(since - ring * 7, [0, 46], [0, 1], { ...clamp, easing: easeOut });
        const r = ring === 0 ? ringR : 30 + p * 330;
        return (
          <div
            key={ring}
            style={{
              position: 'absolute',
              left: -r,
              top: -r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${Math.max(0.5, (1 - p) * (ring === 0 ? 7 : 3))}px solid ${hex}`,
              boxShadow: `0 0 24px rgba(${rgb}, 0.6), inset 0 0 24px rgba(${rgb}, 0.35)`,
              opacity: (1 - p) * (ring === 0 ? 0.9 : 0.6) * (since - ring * 7 > 0 ? 1 : 0),
            }}
          />
        );
      })}
      {sparks.map((sp, i) => {
        const t = since - sp.delay;
        if (t < 0) return null;
        const p = interpolate(t, [0, 48], [0, 1], { ...clamp, easing: easeOut });
        const fade = interpolate(t, [18, 56], [1, 0], clamp);
        const d = sp.dist * p;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: Math.cos(sp.angle) * d - sp.size / 2,
              top: Math.sin(sp.angle) * d - sp.size / 2,
              width: sp.size,
              height: sp.size,
              rotate: `${45 + sp.spin * p}deg`,
              background: i % 3 === 0 ? '#ffffff' : hex,
              boxShadow: `0 0 12px rgba(${rgb}, 0.9)`,
              opacity: fade,
            }}
          />
        );
      })}
    </div>
  );
};
