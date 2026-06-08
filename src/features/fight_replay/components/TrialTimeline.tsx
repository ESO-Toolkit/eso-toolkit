/**
 * TrialTimeline
 *
 * The continuous, trial-wide scrubber. Presents a whole trial run — bosses and
 * (optionally) the trash between them — as one gapless timeline with a single
 * global playhead, so the replay reads like one continuous video even though the
 * underlying fights load individually. Click, drag, or arrow-key anywhere to seek
 * across the entire run; seeking that lands in a different fight is committed on
 * release (never mid-drag) so it loads exactly once.
 *
 * Pure presentation + interaction over the {@link TrialTimeline} model; it owns
 * no playback state and lives in the transport (so it's visible in fullscreen).
 *
 * @module features/fight_replay/components/TrialTimeline
 */

import { Box, Typography, useTheme } from '@mui/material';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { TrialTimeline as TrialTimelineModel } from '../trial_chapters/trialTimeline';
import { globalToLocal, localToGlobal } from '../trial_chapters/trialTimeline';

export interface TrialTimelineSeekTarget {
  fightId: string;
  localMs: number;
  /** True when the seek stays within the currently-loaded fight (instant, no reload). */
  sameFight: boolean;
}

interface TrialTimelineProps {
  /** The run's continuous timeline (already filtered by include-trash). */
  timeline: TrialTimelineModel;
  /** The fight currently loaded in the replay. */
  currentFightId: string | undefined;
  /** Current playhead position within the loaded fight (ms). */
  currentLocalMs: number;
  /** Commit a seek to a (possibly different) fight + local offset. */
  onSeek: (target: TrialTimelineSeekTarget) => void;
  /** Tighter rendering for narrow/mobile transports. */
  compact?: boolean;
}

/** m:ss for a duration in ms. */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const TrialTimelineComponent: React.FC<TrialTimelineProps> = ({
  timeline,
  currentFightId,
  currentLocalMs,
  onSeek,
  compact = false,
}) => {
  const theme = useTheme();
  const railRef = useRef<HTMLDivElement>(null);
  // While dragging we hold a preview fraction [0,1] and defer the actual seek to release. A ref
  // tracks the press synchronously (state isn't guaranteed to flush between down and up).
  const draggingRef = useRef(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const total = timeline.totalDurationMs;

  // Live global playhead position (fraction of the whole run), from the loaded fight + local time.
  const playheadFraction = useMemo(() => {
    if (total <= 0) return 0;
    const global = localToGlobal(timeline, currentFightId, currentLocalMs);
    if (global == null) return 0;
    return Math.max(0, Math.min(1, global / total));
  }, [timeline, currentFightId, currentLocalMs, total]);

  const shownFraction = dragFraction ?? playheadFraction;

  // The segment + label the preview is hovering (during a drag) for the floating bubble.
  const previewPos = useMemo(() => {
    if (dragFraction == null || total <= 0) return null;
    return globalToLocal(timeline, dragFraction * total);
  }, [dragFraction, timeline, total]);

  const fractionFromClientX = useCallback((clientX: number): number => {
    const el = railRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const commitSeek = useCallback(
    (fraction: number) => {
      if (total <= 0) return;
      const pos = globalToLocal(timeline, fraction * total);
      if (!pos) return;
      onSeek({
        fightId: pos.chapter.fightId,
        localMs: pos.localMs,
        sameFight: pos.chapter.fightId === currentFightId,
      });
    },
    [timeline, total, onSeek, currentFightId],
  );

  // Pointer drag: preview while moving, commit on release. Capture the pointer so a drag that
  // leaves the rail still tracks.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (total <= 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      draggingRef.current = true;
      setDragFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX, total],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      setDragFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const fraction = fractionFromClientX(event.clientX);
      setDragFraction(null);
      commitSeek(fraction);
    },
    [fractionFromClientX, commitSeek],
  );

  // Keyboard: arrows nudge by ~5s of global time, Home/End jump to the ends.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (total <= 0) return;
      const stepMs = 5000;
      const current = shownFraction * total;
      let next: number | null = null;
      if (event.key === 'ArrowRight') next = current + stepMs;
      else if (event.key === 'ArrowLeft') next = current - stepMs;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = total;
      if (next == null) return;
      event.preventDefault();
      commitSeek(Math.max(0, Math.min(1, next / total)));
    },
    [shownFraction, total, commitSeek],
  );

  if (timeline.entries.length === 0) return null;

  const railHeight = compact ? 16 : 22;
  const ariaNow = Math.round(shownFraction * total);

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <Box
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="Trial timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={ariaNow}
        aria-valuetext={
          previewPos
            ? `${previewPos.chapter.name} ${formatTime(previewPos.localMs)}`
            : formatTime(ariaNow)
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        sx={{
          position: 'relative',
          width: '100%',
          height: railHeight,
          display: 'flex',
          alignItems: 'stretch',
          gap: '2px',
          cursor: 'pointer',
          borderRadius: 1,
          overflow: 'hidden',
          touchAction: 'none',
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        {timeline.entries.map((entry) => {
          const { chapter } = entry;
          const widthPct = (entry.endFraction - entry.startFraction) * 100;
          const isBoss = chapter.kind === 'boss';
          const isCurrent = chapter.fightId === currentFightId;
          const tint = chapter.isKill
            ? theme.palette.success.main
            : chapter.isWipe
              ? theme.palette.warning.main
              : theme.palette.text.disabled;
          return (
            <Box
              key={chapter.fightId}
              title={`${chapter.name} · ${formatTime(chapter.durationMs)}`}
              sx={{
                position: 'relative',
                flex: `0 0 ${widthPct}%`,
                minWidth: 2,
                backgroundColor: isBoss
                  ? `${tint}${isCurrent ? '88' : '55'}`
                  : theme.palette.action.disabledBackground,
                borderBottom: isBoss ? `2px solid ${tint}` : `2px solid ${theme.palette.divider}`,
                opacity: isBoss ? 1 : 0.7,
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {!compact && isBoss && widthPct > 8 && (
                <Typography
                  component="span"
                  sx={{
                    px: 0.5,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: theme.palette.getContrastText(theme.palette.background.paper),
                    pointerEvents: 'none',
                  }}
                >
                  {chapter.name}
                </Typography>
              )}
            </Box>
          );
        })}

        {/* Global playhead */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -2,
            bottom: -2,
            left: `${shownFraction * 100}%`,
            width: 2,
            backgroundColor: '#fff',
            boxShadow: `0 0 6px ${theme.palette.primary.main}, 0 0 2px rgba(0,0,0,0.6)`,
            transform: 'translateX(-1px)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </Box>

      {/* Drag preview bubble — segment + local time at the dragged position. */}
      {previewPos && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -28,
            left: `${shownFraction * 100}%`,
            transform: 'translateX(-50%)',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[3],
            fontSize: '0.7rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          {previewPos.chapter.name} · {formatTime(previewPos.localMs)}
        </Box>
      )}
    </Box>
  );
};

/**
 * Memoized so the bar only re-renders when the timeline / playhead / current fight
 * change — not on every unrelated transport re-render.
 */
export const TrialTimeline = React.memo(TrialTimelineComponent);
