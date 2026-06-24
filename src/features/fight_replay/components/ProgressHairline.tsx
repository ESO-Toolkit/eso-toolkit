/**
 * ProgressHairline
 *
 * The thin elapsed-progress line shown while the transport bar is auto-hidden (fullscreen cinema
 * mode + the mobile restore handle). It reads the high-frequency playback `timeRef` on its own rAF
 * and updates ONLY a child fill element's width via direct DOM writes — no React state — so the
 * playhead stays legible while the bar is hidden without re-rendering any transport chrome per tick.
 * (Replaces passing a per-tick `progressPct` prop down, which would defeat the transport's memo.)
 *
 * Visually equivalent to the `transportHairline` token: a brand cyan→magenta fill up to the
 * playhead over a faint primary remainder.
 *
 * @module ProgressHairline
 */

import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useRef } from 'react';

import { HAIRLINE_H } from '../constants/replayDesign';

interface ProgressHairlineProps {
  /** High-frequency playhead (ms into the fight). */
  timeRef?: React.RefObject<number> | { current: number };
  /** Total fight duration (ms). */
  duration: number;
}

export const ProgressHairline: React.FC<ProgressHairlineProps> = ({ timeRef, duration }) => {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastPct = -1;
    const tick = (): void => {
      const el = fillRef.current;
      if (el && duration > 0) {
        const pct = Math.max(0, Math.min(100, ((timeRef?.current ?? 0) / duration) * 100));
        // Round to 0.1% so we only touch the DOM on a visible change (a paused scene is free).
        const rounded = Math.round(pct * 10) / 10;
        if (rounded !== lastPct) {
          lastPct = rounded;
          el.style.width = `${rounded}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeRef, duration]);

  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: `${HAIRLINE_H}px`,
        backgroundColor: alpha(theme.palette.primary.main, 0.18),
        pointerEvents: 'none',
        overflow: 'hidden',
      })}
    >
      <Box
        ref={fillRef}
        sx={(theme) => ({
          height: '100%',
          width: '0%',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        })}
      />
    </Box>
  );
};
