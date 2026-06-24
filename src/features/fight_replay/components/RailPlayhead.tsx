/**
 * RailPlayhead
 *
 * The live playback playhead (progress fill + thumb) drawn over the scrub rail and updated by its
 * OWN requestAnimationFrame via DIRECT DOM writes (style.width / style.left) — never through React
 * or MUI.
 *
 * WHY (the low-power fps fix, confirmed by profiling): driving the playhead through the MUI Slider's
 * `value` meant every playback tick re-rendered the Slider, and MUI/emotion re-serialized styles and
 * called `insertRule` — which invalidates the document stylesheet and forces a full style recalc
 * (`UpdateLayoutTree` was the single largest cost in a throttled trace, with `insertRule` + emotion
 * close behind). On a slow / power-constrained device that style-recalc storm — NOT the 3D scene —
 * is what collapsed playback to single-digit fps. Writing `style.left`/`style.width` on two plain
 * divs touches only those elements (no new CSS rules, no global invalidation), so the playhead stays
 * perfectly smooth at ~zero cost. The MUI Slider stays mounted underneath for interaction (drag /
 * click-seek / keyboard / a11y); its thumb + track are hidden while this overlay is live so there's
 * only ever one visible playhead.
 *
 * @module RailPlayhead
 */

import { Box } from '@mui/material';
import React, { useEffect, useRef } from 'react';

interface RailPlayheadProps {
  /** High-frequency playhead (ms into the fight). */
  timeRef?: React.RefObject<number> | { current: number };
  /** Total fight duration (ms). */
  duration: number;
  /** When false the overlay is hidden (the MUI thumb takes over for paused inspection / dragging). */
  visible: boolean;
}

export const RailPlayhead: React.FC<RailPlayheadProps> = ({ timeRef, duration, visible }) => {
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return undefined;
    let raf = 0;
    let lastPct = -1;
    const tick = (): void => {
      const fill = fillRef.current;
      const thumb = thumbRef.current;
      if (fill && thumb && duration > 0) {
        const pct = Math.max(0, Math.min(100, ((timeRef?.current ?? 0) / duration) * 100));
        const rounded = Math.round(pct * 100) / 100; // 0.01% — only write on a visible change
        if (rounded !== lastPct) {
          lastPct = rounded;
          fill.style.width = `${rounded}%`;
          thumb.style.left = `${rounded}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeRef, duration, visible]);

  if (!visible) return null;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 6,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {/* Progress fill — matches the MUI track gradient + glow. */}
      <Box
        ref={fillRef}
        sx={(theme) => ({
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '0%',
          borderRadius: 3,
          backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: `0 0 14px ${theme.palette.primary.main}99`,
        })}
      />
      {/* Thumb — matches the MUI thumb (white dot + cyan halo). */}
      <Box
        ref={thumbRef}
        sx={(theme) => ({
          position: 'absolute',
          left: '0%',
          top: '50%',
          width: 16,
          height: 16,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: `0 0 0 5px ${theme.palette.primary.main}40, 0 2px 6px rgba(0,0,0,0.5)`,
        })}
      />
    </Box>
  );
};
