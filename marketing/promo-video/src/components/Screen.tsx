import React from 'react';
import { Video } from '@remotion/media';
import { Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { clamp, easeInOut, easeOut, lerpRect, type Rect } from '../lib/anim';
import { color, display } from '../theme';

export type Callout = { from: number; to: number; rect: Rect; tint?: string };

export type Shot = {
  src: string;
  /** Source size in pixels (stills are captured at 2x). */
  size: [number, number];
  kind?: 'image' | 'video';
  /** Local frame at which this shot takes over. */
  from: number;
  /** Address shown in the frame's URL bar. */
  url: string;
  /** Crop keyframes in source pixels; eased between. */
  keys: { at: number; crop: Rect }[];
  /** Optional crop keyframes for 9:16, where the frame is much taller. */
  portraitKeys?: { at: number; crop: Rect }[];
  /** How a crop fills a 9:16 frame: 'width' reveals more of the page above and below. */
  portraitFit?: 'cover' | 'width';
  callouts?: Callout[];
  /** Video only: source frames to skip. */
  trimBefore?: number;
  /** Extra layers positioned in source coordinates (typing, cursor). */
  overlay?: (map: (r: Rect) => Rect, localFrame: number) => React.ReactNode;
};

const BAR = 40;

const cropAt = (keys: Shot['keys'], f: number): Rect => {
  if (f <= keys[0].at) return keys[0].crop;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.at) {
      const t = interpolate(f, [a.at, b.at], [0, 1], { ...clamp, easing: easeInOut });
      return lerpRect(a.crop, b.crop, t);
    }
  }
  return keys[keys.length - 1].crop;
};

const ShotLayer: React.FC<{
  shot: Shot;
  w: number;
  h: number;
  frame: number;
  portrait: boolean;
}> = ({ shot, w, h, frame, portrait }) => {
  const local = frame - shot.from;
  const crop = cropAt(portrait && shot.portraitKeys ? shot.portraitKeys : shot.keys, local);
  const fitWidth = portrait && (shot.portraitFit ?? 'width') === 'width';
  const s = fitWidth ? Math.max(w / crop.w, h / shot.size[1]) : Math.max(w / crop.w, h / crop.h);
  const ox = (w - crop.w * s) / 2 - crop.x * s;
  // Width-fit shows more of the page vertically; keep the image covering the frame.
  const rawOy = (h - crop.h * s) / 2 - crop.y * s;
  const oy = fitWidth ? Math.min(0, Math.max(h - shot.size[1] * s, rawOy)) : rawOy;
  const map = (r: Rect): Rect => ({ x: ox + r.x * s, y: oy + r.y * s, w: r.w * s, h: r.h * s });
  const inP = interpolate(local, [0, 14], [0, 1], { ...clamp, easing: easeOut });

  const media: React.CSSProperties = {
    position: 'absolute',
    left: ox,
    top: oy,
    width: shot.size[0] * s,
    height: shot.size[1] * s,
    maxWidth: 'none',
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: inP,
        scale: `${1.035 - 0.035 * inP}`,
        filter: inP < 0.98 ? `blur(${(1 - inP) * 10}px)` : undefined,
      }}
    >
      {shot.kind === 'video' ? (
        <Sequence from={shot.from} layout="none">
          <Video
            src={staticFile(shot.src)}
            trimBefore={shot.trimBefore}
            muted
            objectFit="fill"
            disallowFallbackToOffthreadVideo
            style={media}
          />
        </Sequence>
      ) : (
        <Img src={staticFile(shot.src)} style={media} />
      )}
      {shot.callouts?.map((c, i) => {
        const r = map(c.rect);
        const on = interpolate(local, [c.from, c.from + 16], [0, 1], { ...clamp, easing: easeOut });
        const off = interpolate(local, [c.to, c.to + 12], [0, 1], clamp);
        const v = on * (1 - off);
        if (v <= 0) return null;
        const tint = c.tint ?? color.sky;
        const grow = (1 - on) * 14;
        // Alpha is baked into the colours rather than layer opacity (see the replay scrim note).
        const alpha = (a: number) =>
          Math.round(Math.min(1, Math.max(0, a)) * 255)
            .toString(16)
            .padStart(2, '0');
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x - 6 - grow,
              top: r.y - 6 - grow,
              width: r.w + 12 + grow * 2,
              height: r.h + 12 + grow * 2,
              borderRadius: 14,
              border: `2px solid ${tint}${alpha(v)}`,
              boxShadow: `0 0 0 4000px rgba(3, 6, 14, ${0.5 * v}), 0 0 28px ${tint}${alpha(0.67 * v)}, inset 0 0 20px ${tint}${alpha(0.2 * v)}`,
            }}
          />
        );
      })}
      {shot.overlay?.(map, local)}
    </div>
  );
};

export const Screen: React.FC<{
  box: Rect;
  shots: Shot[];
  appear?: number;
  portrait?: boolean;
}> = ({ box, shots, appear = 1, portrait = false }) => {
  const frame = useCurrentFrame();
  const visible = shots.filter(
    (sh, i) => frame >= sh.from && (i === shots.length - 1 || frame < shots[i + 1].from + 16),
  );
  const current = [...shots].reverse().find((sh) => frame >= sh.from) ?? shots[0];
  const w = box.w;
  const h = box.h - BAR;

  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        perspective: 1600,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 16,
          overflow: 'hidden',
          background: color.void,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow:
            '0 40px 110px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.55), 0 0 80px rgba(56, 189, 248, 0.08)',
          opacity: Math.min(1, appear * 1.3),
          translate: `0 ${(1 - appear) * 60}px`,
          rotate: `x ${(1 - appear) * 14}deg`,
          transformOrigin: '50% 100%',
        }}
      >
        <div
          style={{
            height: BAR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(22, 30, 48, 0.98), rgba(13, 19, 33, 0.98))',
            borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 26,
              padding: '0 16px',
              borderRadius: 13,
              background: 'rgba(2, 6, 14, 0.6)',
              fontFamily: display,
              fontSize: 15,
              color: color.muted,
              letterSpacing: '0.01em',
            }}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden>
              <rect
                x="0.5"
                y="5.5"
                width="10"
                height="7"
                rx="1.5"
                fill="none"
                stroke={color.muted}
              />
              <path d="M2.8 5.5V3.8a2.7 2.7 0 0 1 5.4 0v1.7" fill="none" stroke={color.muted} />
            </svg>
            <span style={{ color: color.text }}>esotk.com</span>
            <span>{current.url}</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: BAR,
            width: w,
            height: h,
            overflow: 'hidden',
          }}
        >
          {visible.map((sh) => (
            <ShotLayer
              key={sh.src + sh.from}
              shot={sh}
              w={w}
              h={h}
              frame={frame}
              portrait={portrait}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(160deg, rgba(255,255,255,0.05), transparent 28%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
