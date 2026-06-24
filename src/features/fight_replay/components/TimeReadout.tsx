/**
 * TimeReadout
 *
 * A self-updating timecode `<span>` that reads the high-frequency playback `timeRef` on its OWN
 * requestAnimationFrame loop and writes the formatted time straight to the DOM (textContent) —
 * NEVER through React state. This is the same "rAF + direct DOM write" pattern the boss-health and
 * locked-player-stats panels use, and it exists for the same reason: syncing the playhead through
 * React state forced the entire transport subtree to re-render on every tick, and on a slow / power-
 * constrained device (where a frame can exceed the ~100ms state-sync gate) that re-render fired
 * EVERY frame and spiralled playback down to single-digit fps. Reading the ref here keeps the
 * timecode perfectly live with zero per-tick React work.
 *
 * The rAF only touches the DOM when the formatted string actually changes (≈ once per second), so a
 * paused scene costs nothing.
 *
 * @module TimeReadout
 */

import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React, { useEffect, useRef } from 'react';

const defaultFormat = (timeMs: number): string => {
  const totalSeconds = Math.floor(Math.max(0, timeMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface TimeReadoutProps {
  /** High-frequency playhead (ms into the fight). Read every frame; never re-renders this component. */
  timeRef?: React.RefObject<number> | { current: number };
  /** ms → label. Defaults to m:ss. */
  format?: (timeMs: number) => string;
  sx?: SxProps<Theme>;
  className?: string;
}

export const TimeReadout: React.FC<TimeReadoutProps> = ({
  timeRef,
  format = defaultFormat,
  sx,
  className,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  // Keep the formatter in a ref so changing it (parents pass inline fns) never re-subscribes the rAF.
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    let raf = 0;
    let lastText = '';
    const tick = (): void => {
      const el = spanRef.current;
      if (el) {
        const next = formatRef.current(timeRef?.current ?? 0);
        if (next !== lastText) {
          lastText = next;
          el.textContent = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeRef]);

  return (
    <Box component="span" ref={spanRef} className={className} sx={sx}>
      {format(timeRef?.current ?? 0)}
    </Box>
  );
};
