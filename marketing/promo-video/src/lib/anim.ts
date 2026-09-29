import { Easing, interpolate, spring } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** Clamped interpolation with an ease-out curve by default. */
export const tween = (
  frame: number,
  range: [number, number],
  output: [number, number],
  easing: (t: number) => number = easeOut,
): number => interpolate(frame, range, output, { ...clamp, easing });

/** Critically damped spring that starts at `start`; 0 before, settling at 1. */
export const settle = (
  frame: number,
  start: number,
  fps: number,
  durationInFrames?: number,
): number => spring({ frame: frame - start, fps, config: { damping: 200 }, durationInFrames });

/** Springy pop with a small overshoot, for the upgrade moments only. */
export const pop = (frame: number, start: number, fps: number): number =>
  spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });

export type Rect = { x: number; y: number; w: number; h: number };

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});
