/**
 * TrialTimeline
 *
 * The continuous, trial-wide scrubber. Presents a whole trial run — bosses and
 * (optionally) the trash between them — as one gapless mini-map with a single
 * global playhead, so the replay reads like one continuous video even though the
 * underlying fights load individually. Click, drag, or arrow-key anywhere to seek
 * across the entire run; seeking that lands in a different fight is committed on
 * release (never mid-drag) so it loads exactly once.
 *
 * Two variants:
 *  - `deck` — the slim strip docked inside the desktop transport, flush above the
 *    per-fight rail (YouTube-chapter mini-map). Grows slightly on hover/focus and
 *    shows a hover preview bubble naming the chapter under the cursor.
 *  - `sheet` — the taller touch variant used in the mobile Chapters sheet, with a
 *    ≥44px interactive band.
 *
 * Pure presentation + interaction over the {@link TrialTimeline} model; it owns
 * no playback state and lives in the transport (so it's visible in fullscreen).
 *
 * @module features/fight_replay/components/TrialTimeline
 */

import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TRANSPORT_MOTION } from '../constants/replayDesign';
import { chapterDisplayName } from '../trial_chapters/chapterDisplay';
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
  /**
   * Real start time of the loaded fight — anchors the playhead when the fight is NOT on the
   * filtered timeline (trash while include-trash is off, or a sub-threshold blip). Without it
   * the playhead fell back to 0 and a keyboard step committed a jump back to the run's start.
   */
  currentFightStartTime?: number;
  /** Current playhead position within the loaded fight (ms). */
  currentLocalMs: number;
  /** Commit a seek to a (possibly different) fight + local offset. */
  onSeek: (target: TrialTimelineSeekTarget) => void;
  /**
   * Reports drag state so hosts can pause idle auto-hide while the user is
   * holding the rail (mirrors the per-fight slider's onDraggingChange).
   */
  onDraggingChange?: (dragging: boolean) => void;
  /** `deck` = slim desktop transport strip (default); `sheet` = tall mobile touch rail. */
  variant?: 'deck' | 'sheet';
}

/** m:ss for a duration in ms. */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Shared styling for the floating chapter/time bubble (drag + hover). */
const bubbleSx = {
  position: 'absolute' as const,
  transform: 'translateX(-50%)',
  px: 1,
  py: 0.25,
  borderRadius: 1,
  fontSize: '0.7rem',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none' as const,
  zIndex: 3,
};

/**
 * Hover skim-preview for the deck variant — names the chapter + local time under
 * the cursor before the user commits to anything (the YouTube-chapter hover).
 *
 * A SIBLING of the segment strip that attaches its own imperative listeners to
 * the interactive surface, so its per-pointermove state churn never re-renders
 * the segment list. Mounted only on fine-pointer devices.
 */
const TrialHoverPreview: React.FC<{
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  railRef: React.RefObject<HTMLDivElement | null>;
  timeline: TrialTimelineModel;
  /** Suppressed while a drag is active (the drag bubble takes priority). */
  draggingRef: React.RefObject<boolean>;
}> = ({ surfaceRef, railRef, timeline, draggingRef }) => {
  const theme = useTheme();
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onMove = (event: PointerEvent): void => {
      // Only a true hover: no drag in flight, no buttons held.
      if (draggingRef.current || event.buttons !== 0) {
        setHoverFraction(null);
        return;
      }
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      if (rect.width <= 0) return;
      setHoverFraction(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
    };
    const onLeave = (): void => setHoverFraction(null);

    surface.addEventListener('pointermove', onMove, { passive: true });
    surface.addEventListener('pointerleave', onLeave, { passive: true });
    surface.addEventListener('pointercancel', onLeave, { passive: true });
    surface.addEventListener('pointerdown', onLeave, { passive: true });
    return () => {
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerleave', onLeave);
      surface.removeEventListener('pointercancel', onLeave);
      surface.removeEventListener('pointerdown', onLeave);
    };
  }, [surfaceRef, railRef, draggingRef]);

  const pos = useMemo(() => {
    if (hoverFraction == null || timeline.totalDurationMs <= 0) return null;
    return globalToLocal(timeline, hoverFraction * timeline.totalDurationMs);
  }, [hoverFraction, timeline]);

  if (pos == null || hoverFraction == null) return null;

  return (
    <Box
      aria-hidden
      sx={{
        ...bubbleSx,
        top: -26,
        left: `${hoverFraction * 100}%`,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[3],
        color: theme.palette.text.primary,
      }}
    >
      {chapterDisplayName(pos.chapter)} · {formatTime(pos.localMs)}
    </Box>
  );
};

const TrialTimelineComponent: React.FC<TrialTimelineProps> = ({
  timeline,
  currentFightId,
  currentFightStartTime,
  currentLocalMs,
  onSeek,
  onDraggingChange,
  variant = 'deck',
}) => {
  const theme = useTheme();
  const railRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  // While dragging we hold a preview fraction [0,1] and defer the actual seek to release. A ref
  // tracks the press synchronously (state isn't guaranteed to flush between down and up).
  const draggingRef = useRef(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  // Cross-fight keyboard steps preview first and commit after a quiet period, so a held
  // arrow key can't thrash fight loads at every segment boundary.
  const kbCommitTimer = useRef<number | null>(null);
  const clearKbCommit = useCallback(() => {
    if (kbCommitTimer.current !== null) {
      window.clearTimeout(kbCommitTimer.current);
      kbCommitTimer.current = null;
    }
  }, []);

  // Any fight change — from THIS rail or any other navigation surface — invalidates a pending
  // keyboard commit and its preview: a 350ms timer left armed across a navigation re-fired a
  // stale seek that overrode the user's newer action (or double-navigated).
  useEffect(() => {
    clearKbCommit();
    setDragFraction((f) => (draggingRef.current ? f : null));
  }, [currentFightId, clearKbCommit]);

  // Hover preview only makes sense for fine pointers; touch keeps the press/drag bubble.
  const [hasHover, setHasHover] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setHasHover(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setHasHover(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const total = timeline.totalDurationMs;

  const setDragging = useCallback(
    (dragging: boolean) => {
      draggingRef.current = dragging;
      onDraggingChange?.(dragging);
    },
    [onDraggingChange],
  );

  // Live global playhead position (fraction of the whole run), from the loaded fight + local time.
  // A fight that's NOT on the filtered timeline anchors at the boundary where it would sit (by
  // real start time) instead of snapping to 0 — keyboard steps then move relative to the viewer's
  // actual position in the run rather than committing a jump back to chapter 1.
  const playheadFraction = useMemo(() => {
    if (total <= 0) return 0;
    const global = localToGlobal(timeline, currentFightId, currentLocalMs);
    if (global == null) {
      if (currentFightStartTime == null) return 0;
      const after = timeline.entries.find((e) => e.chapter.startTime > currentFightStartTime);
      return Math.max(0, Math.min(1, (after?.globalStart ?? total) / total));
    }
    return Math.max(0, Math.min(1, global / total));
  }, [timeline, currentFightId, currentFightStartTime, currentLocalMs, total]);

  const shownFraction = dragFraction ?? playheadFraction;

  // The position the rail currently represents (playhead, or the drag/keyboard preview) —
  // feeds both the drag bubble and the always-chapter-aware aria-valuetext.
  const shownPos = useMemo(() => {
    if (total <= 0) return null;
    return globalToLocal(timeline, shownFraction * total);
  }, [timeline, shownFraction, total]);

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
      // The pointer takes over: a pending deferred keyboard commit must not fire mid-drag
      // (it would navigate under the held pointer / override the upcoming release).
      clearKbCommit();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Inactive pointer ids (synthetic events) throw — capture is an enhancement, not a need.
      }
      setDragging(true);
      setDragFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX, total, setDragging, clearKbCommit],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      // Recover from a missed pointerup (mouse only — touch/pen report buttons=1 mid-drag).
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        setDragging(false);
        setDragFraction(null);
        return;
      }
      setDragFraction(fractionFromClientX(event.clientX));
    },
    [fractionFromClientX, setDragging],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      setDragging(false);
      const fraction = fractionFromClientX(event.clientX);
      setDragFraction(null);
      commitSeek(fraction);
    },
    [fractionFromClientX, commitSeek, setDragging],
  );

  // A cancelled pointer (gesture takeover, window switch) resets WITHOUT committing — otherwise
  // the rail wedges in preview mode and later hovers "scrub" it. lostpointercapture also fires
  // after every normal release; by then dragging is already false, so this harmlessly no-ops.
  const onPointerCancel = useCallback(() => {
    clearKbCommit();
    if (!draggingRef.current && dragFraction == null) return;
    setDragging(false);
    setDragFraction(null);
  }, [dragFraction, setDragging, clearKbCommit]);

  // Keyboard: arrows nudge global time (Shift for a big step), PageUp/Down jump chapters,
  // Home/End the run's ends. Same-fight steps commit instantly; a step landing in a DIFFERENT
  // fight previews and commits after a quiet pause (mirrors pointer commit-on-release, so a
  // held key can't thrash fight loads).
  const scheduleKeyboardCommit = useCallback(
    (fraction: number) => {
      const pos = globalToLocal(timeline, fraction * total);
      if (!pos) return;
      if (pos.chapter.fightId === currentFightId) {
        clearKbCommit();
        setDragFraction(null);
        commitSeek(fraction);
        return;
      }
      setDragFraction(fraction);
      clearKbCommit();
      kbCommitTimer.current = window.setTimeout(() => {
        kbCommitTimer.current = null;
        setDragFraction(null);
        commitSeek(fraction);
      }, 350);
    },
    [timeline, total, currentFightId, commitSeek, clearKbCommit],
  );

  useEffect(() => clearKbCommit, [clearKbCommit]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (total <= 0) return;
      const current = shownFraction * total;
      let next: number | null = null;
      if (event.key === 'ArrowRight') next = current + (event.shiftKey ? 30000 : 5000);
      else if (event.key === 'ArrowLeft') next = current - (event.shiftKey ? 30000 : 5000);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = total;
      else if (event.key === 'PageDown' || event.key === 'PageUp') {
        // Chapter skip: PageDown → next segment start; PageUp → current segment's start when
        // already a couple seconds in, else the previous segment (media prev-chapter convention).
        const pos = globalToLocal(timeline, current);
        if (pos) {
          const entries = timeline.entries;
          if (event.key === 'PageDown') {
            const target = entries[pos.entryIndex + 1];
            next = target ? target.globalStart : total;
          } else {
            const here = entries[pos.entryIndex];
            next =
              pos.localMs > 2000
                ? here.globalStart
                : (entries[pos.entryIndex - 1]?.globalStart ?? 0);
          }
        }
      }
      if (next == null) return;
      event.preventDefault();
      scheduleKeyboardCommit(Math.max(0, Math.min(1, next / total)));
    },
    [shownFraction, total, timeline, scheduleKeyboardCommit],
  );

  if (timeline.entries.length === 0) return null;

  const isSheet = variant === 'sheet';
  // Visual rail height; the interactive surface around it is padded to a comfortable target
  // (≥44px on the touch sheet, ≥28px on the desktop deck). The deck rail grows slightly on
  // hover/focus so the slim strip invites interaction without claiming arena space at rest.
  const railHeight = isSheet ? 24 : 12;
  const railHoverHeight = isSheet ? 24 : 18;
  const surfacePadY = isSheet ? '10px' : '6px';
  const ariaNow = Math.round(shownFraction * total);
  const ariaText = shownPos
    ? `${chapterDisplayName(shownPos.chapter)}, ${formatTime(shownPos.localMs)} (${formatTime(ariaNow)} of ${formatTime(total)})`
    : formatTime(ariaNow);

  const isDark = theme.palette.mode === 'dark';
  // Theme-aware playhead: white line + accent glow on dark glass; near-black line with a light
  // contrast outline on the light surface (a hardcoded white line vanishes in light mode).
  const playheadColor = isDark ? '#fff' : theme.palette.text.primary;
  const playheadShadow = isDark
    ? `0 0 6px ${theme.palette.primary.main}, 0 0 2px rgba(0,0,0,0.6)`
    : '0 0 0 1px rgba(255,255,255,0.8)';

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Interactive surface — owns the slider role, focus, pointer + key handlers. Wider than
          the visual rail (vertical padding) so the hit target is comfortable; the seek math reads
          the RAIL's rect, so the padding adds slop without changing the mapping. */}
      <Box
        ref={surfaceRef}
        role="slider"
        tabIndex={0}
        aria-label="Trial timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={ariaNow}
        aria-valuetext={ariaText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        sx={{
          position: 'relative',
          width: '100%',
          py: surfacePadY,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          touchAction: 'none',
          borderRadius: 1,
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
          // The deck strip relaxes taller while the pointer/focus is on it.
          '&:hover .trial-rail, &:focus-visible .trial-rail': {
            height: railHoverHeight,
          },
        }}
      >
        {/* Visual rail — the proportional segment strip. Clipped for the rounded corners; the
            playhead + bubbles render OUTSIDE it (siblings) so they never get cut off. */}
        <Box
          ref={railRef}
          className="trial-rail"
          sx={{
            position: 'relative',
            width: '100%',
            height: railHeight,
            display: 'flex',
            alignItems: 'stretch',
            gap: '1px',
            borderRadius: 1,
            overflow: 'hidden',
            transition: `height ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
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
                sx={{
                  position: 'relative',
                  flex: `0 0 ${widthPct}%`,
                  minWidth: 2,
                  // alpha() (not hex-suffix concat — palette strings can be rgba()) keeps the
                  // tint valid for every palette value. Trash gets a deliberate neutral ≥3:1
                  // treatment, visually quieter than the boss outcome tints.
                  backgroundColor: isBoss
                    ? alpha(tint, isCurrent ? 0.55 : 0.33)
                    : alpha(theme.palette.text.secondary, isCurrent ? 0.55 : 0.4),
                  borderBottom: isBoss
                    ? `2px solid ${tint}`
                    : `2px solid ${alpha(theme.palette.text.secondary, 0.7)}`,
                  transition: 'background-color 0.2s',
                }}
              />
            );
          })}
        </Box>

        {/* Global playhead — sibling of the clipped rail so its cap is never cut off. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: `${shownFraction * 100}%`,
            width: 2,
            backgroundColor: playheadColor,
            boxShadow: playheadShadow,
            transform: 'translateX(-1px)',
            pointerEvents: 'none',
            zIndex: 2,
            // A small cap matching the per-fight slider's thumb language, so the two playheads
            // read as siblings of one system (and stay visible on any background).
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -2,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: playheadColor,
              boxShadow: isDark
                ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`
                : `0 0 0 3px ${alpha(theme.palette.background.paper, 0.8)}`,
            },
          }}
        />

        {/* Drag / keyboard-preview bubble — chapter + local time at the previewed position. */}
        {dragFraction != null && shownPos && (
          <Box
            aria-hidden
            sx={{
              ...bubbleSx,
              top: isSheet ? -38 : -26,
              left: `${shownFraction * 100}%`,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[3],
            }}
          >
            {chapterDisplayName(shownPos.chapter)} · {formatTime(shownPos.localMs)}
          </Box>
        )}

        {/* Hover skim-preview (fine pointers only; suppressed while dragging). */}
        {hasHover && dragFraction == null && (
          <TrialHoverPreview
            surfaceRef={surfaceRef}
            railRef={railRef}
            timeline={timeline}
            draggingRef={draggingRef}
          />
        )}
      </Box>
    </Box>
  );
};

/**
 * Memoized so the strip only re-renders when the timeline / playhead / current fight
 * change — not on every unrelated transport re-render.
 */
export const TrialTimeline = React.memo(TrialTimelineComponent);
