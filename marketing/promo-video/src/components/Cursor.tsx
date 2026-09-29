import React from 'react';
import { interpolate } from 'remotion';
import { clamp, easeInOut, easeOut } from '../lib/anim';

type Props = {
  frame: number;
  /** Path keyframes in stage pixels. */
  path: { at: number; x: number; y: number }[];
  /** Frame of the click, if any. */
  clickAt?: number;
  appearAt?: number;
  scale?: number;
};

/** A plain arrow pointer that glides between keyframes and ripples on click. */
export const Cursor: React.FC<Props> = ({
  frame,
  path,
  clickAt,
  appearAt = path[0].at,
  scale = 1,
}) => {
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.at) {
      const t = interpolate(frame, [a.at, b.at], [0, 1], { ...clamp, easing: easeInOut });
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    }
  }
  const show = interpolate(frame, [appearAt, appearAt + 10], [0, 1], clamp);
  const press =
    clickAt === undefined
      ? 0
      : interpolate(frame, [clickAt - 4, clickAt, clickAt + 8], [0, 1, 0], clamp);
  const ripple = clickAt === undefined ? -1 : frame - clickAt;
  const rp = interpolate(ripple, [0, 26], [0, 1], { ...clamp, easing: easeOut });

  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: show, pointerEvents: 'none' }}>
      {ripple >= 0 && ripple < 30 ? (
        <div
          style={{
            position: 'absolute',
            left: -40 * rp,
            top: -40 * rp,
            width: 80 * rp,
            height: 80 * rp,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            opacity: 1 - rp,
          }}
        />
      ) : null}
      <svg
        width={26 * scale}
        height={34 * scale}
        viewBox="0 0 26 34"
        style={{
          scale: `${1 - press * 0.14}`,
          transformOrigin: '0 0',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        }}
        aria-hidden
      >
        <path
          d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z"
          fill="#ffffff"
          stroke="#0b1220"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
