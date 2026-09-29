import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { settle, tween } from '../lib/anim';
import { color, display } from '../theme';

type Props = {
  text: string;
  /** Frame the first word starts rising. */
  start: number;
  /** Frame the line starts leaving; omit to hold. */
  end?: number;
  size: number;
  weight?: number;
  stagger?: number;
  align?: 'left' | 'center';
  maxWidth?: number;
  textColor?: string;
  lineHeight?: number;
  letterSpacing?: string;
};

/**
 * Headline that rises word by word from behind a mask, then lifts out the same way.
 */
export const KineticText: React.FC<Props> = ({
  text,
  start,
  end,
  size,
  weight = 600,
  stagger = 3,
  align = 'left',
  maxWidth,
  textColor = color.text,
  lineHeight = 1.08,
  letterSpacing = '-0.025em',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <div
      style={{
        fontFamily: display,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing,
        color: textColor,
        textAlign: align,
        maxWidth,
        textWrap: 'balance',
      }}
    >
      {words.map((word, i) => {
        const inP = settle(frame, start + i * stagger, fps, 34);
        const outP =
          end === undefined ? 0 : tween(frame, [end + i * 1.5, end + i * 1.5 + 16], [0, 1]);
        const y = (1 - inP) * 105 - outP * 105;
        const blur = (1 - inP) * 6 + outP * 6;
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'top',
              paddingBottom: '0.14em',
              marginBottom: '-0.14em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                translate: `0 ${y}%`,
                filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                opacity: Math.min(1, inP * 1.6) * (1 - outP),
              }}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Supporting line: a soft rise with blur, no per-word choreography. */
export const SubText: React.FC<{
  text: string;
  start: number;
  end?: number;
  size: number;
  maxWidth?: number;
  align?: 'left' | 'center';
  textColor?: string;
}> = ({ text, start, end, size, maxWidth, align = 'left', textColor = color.muted }) => {
  const frame = useCurrentFrame();
  const inP = tween(frame, [start, start + 26], [0, 1]);
  const outP = end === undefined ? 0 : tween(frame, [end, end + 14], [0, 1]);
  if (inP <= 0.001 || outP >= 0.999) return null;
  return (
    <div
      style={{
        fontFamily: display,
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1.4,
        color: textColor,
        maxWidth,
        textAlign: align,
        textWrap: 'balance',
        opacity: inP * (1 - outP),
        translate: `0 ${(1 - inP) * 18 - outP * 10}px`,
        filter: inP < 0.98 || outP > 0.02 ? `blur(${(1 - inP) * 5 + outP * 4}px)` : undefined,
      }}
    >
      {text}
    </div>
  );
};
