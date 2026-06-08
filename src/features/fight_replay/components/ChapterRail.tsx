/**
 * ChapterRail
 *
 * The trial chapter navigator for the fight replay. Renders the current run's
 * boss encounters as a horizontal strip of "stops" — each with a kill ✓ / wipe-%
 * checkmark — that jump the replay to that boss without leaving the page. An
 * optional "Show trash" toggle interleaves the connective trash fights so a
 * viewer can follow the run-up (and watch the map transition) into a boss.
 *
 * This lives in the page shell (not inside the 3D canvas / transport), so it is
 * off the per-frame playback path and re-renders only when the run or the active
 * fight changes — no playback-perf concern.
 *
 * @module features/fight_replay/components/ChapterRail
 */

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import HeartBrokenRoundedIcon from '@mui/icons-material/HeartBrokenRounded';
import { Box, Chip, FormControlLabel, Switch, Typography, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BossAvatar } from '../../report_details/BossAvatar';
import { TRANSPORT_MOTION } from '../constants/replayDesign';
import type { TrialChapter } from '../trial_chapters/types';

interface ChapterRailProps {
  /** All segments (bosses + trash) of the current run, in play order. */
  segments: TrialChapter[];
  /** Boss-only chapters of the current run (the primary skip targets). */
  bossChapters: TrialChapter[];
  /** The fight id currently loaded in the replay. */
  currentFightId: string | undefined;
  /** Display name of the current trial run. */
  trialName?: string;
  /** Invoked when a stop is chosen. */
  onSelect: (chapter: TrialChapter) => void;
}

/** m:ss for a duration in ms. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Human-readable status for the stop's badge + aria label. */
function statusLabel(chapter: TrialChapter): string {
  if (chapter.kind === 'trash') {
    return chapter.isWipe ? 'Wipe' : 'Cleared';
  }
  if (chapter.isKill) return 'Kill';
  if (chapter.bossPercentage != null) return `${chapter.bossPercentage}% left`;
  return 'Wipe';
}

interface ChapterStopProps {
  chapter: TrialChapter;
  active: boolean;
  /** Whether this stop is the single roving tab stop for the rail. */
  tabbable: boolean;
  onSelect: (chapter: TrialChapter) => void;
  registerRef: (el: HTMLButtonElement | null, index: number) => void;
  index: number;
  onKeyNav: (event: React.KeyboardEvent, index: number) => void;
}

const ChapterStop: React.FC<ChapterStopProps> = ({
  chapter,
  active,
  tabbable,
  onSelect,
  registerRef,
  index,
  onKeyNav,
}) => {
  const theme = useTheme();
  const isBoss = chapter.kind === 'boss';
  const status = statusLabel(chapter);

  // Status colour: green for a kill/clear, a warning/error tone for a wipe.
  const statusColor = chapter.isKill
    ? theme.palette.success.main
    : chapter.isWipe
      ? theme.palette.warning.main
      : theme.palette.text.secondary;

  const ariaLabel = `${isBoss ? 'Boss' : 'Trash'}: ${chapter.name}${
    chapter.attempt > 1 ? `, pull ${chapter.attempt}` : ''
  }${chapter.difficultyLabel ? `, ${chapter.difficultyLabel}` : ''}, ${status}, ${formatDuration(
    chapter.durationMs,
  )}${active ? ', currently playing' : ''}`;

  return (
    <Box
      component="button"
      type="button"
      ref={(el: HTMLButtonElement | null) => registerRef(el, index)}
      onClick={() => onSelect(chapter)}
      onKeyDown={(e: React.KeyboardEvent) => onKeyNav(e, index)}
      aria-label={ariaLabel}
      aria-current={active ? 'true' : undefined}
      tabIndex={tabbable ? 0 : -1}
      sx={{
        // Reset native button chrome.
        appearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        flex: '0 0 auto',
        scrollSnapAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: isBoss ? 1.25 : 0.75,
        px: isBoss ? 1.25 : 1,
        py: isBoss ? 1 : 0.75,
        minWidth: isBoss ? 168 : 120,
        maxWidth: 240,
        borderRadius: 2,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        backgroundColor: active ? 'action.selected' : 'background.paper',
        boxShadow:
          active && theme.palette.mode === 'dark'
            ? `0 0 12px ${theme.palette.primary.main}55`
            : 'none',
        transition: `border-color ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, background-color ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}, box-shadow ${TRANSPORT_MOTION.settle} ${TRANSPORT_MOTION.ease}`,
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'action.hover',
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      {isBoss ? (
        <BossAvatar bossName={chapter.name} size={36} />
      ) : (
        <Box
          aria-hidden
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'text.secondary',
            backgroundColor: 'action.hover',
          }}
        >
          <DeleteSweepRoundedIcon fontSize="small" />
        </Box>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: active ? 700 : 600, lineHeight: 1.2 }}>
          {chapter.name}
          {chapter.attempt > 1 && (
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {' '}
              · #{chapter.attempt}
            </Box>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          {chapter.isKill ? (
            <CheckCircleRoundedIcon sx={{ fontSize: 14, color: statusColor }} aria-hidden />
          ) : chapter.isWipe ? (
            <HeartBrokenRoundedIcon sx={{ fontSize: 14, color: statusColor }} aria-hidden />
          ) : null}
          <Typography
            variant="caption"
            sx={{ color: statusColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
          >
            {status}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
          >
            · {formatDuration(chapter.durationMs)}
          </Typography>
        </Box>

        {isBoss && chapter.difficultyLabel && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            {chapter.difficultyLabel}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * The trial chapter rail. Memoized so it only re-renders when the run/active
 * fight changes (its props are stable across playback ticks).
 */
const ChapterRailComponent: React.FC<ChapterRailProps> = ({
  segments,
  bossChapters,
  currentFightId,
  trialName,
  onSelect,
}) => {
  const hasTrash = useMemo(() => segments.some((s) => s.kind === 'trash'), [segments]);
  const [showTrash, setShowTrash] = useState(false);

  // If the active fight is a trash segment, reveal trash so it can be highlighted
  // and brought into view (otherwise the rail would have no "current" stop).
  const currentIsHiddenTrash = useMemo(
    () =>
      segments.some((s) => s.fightId === currentFightId && s.kind === 'trash') &&
      bossChapters.length > 0,
    [segments, currentFightId, bossChapters.length],
  );
  useEffect(() => {
    if (currentIsHiddenTrash) setShowTrash(true);
  }, [currentIsHiddenTrash]);

  // The stops shown: bosses only by default; all segments when trash is revealed.
  // A trash-only run (no bosses) always shows its segments so it stays navigable.
  const stops = useMemo(() => {
    if (bossChapters.length === 0) return segments;
    return showTrash ? segments : bossChapters;
  }, [segments, bossChapters, showTrash]);

  const killedBosses = useMemo(() => bossChapters.filter((b) => b.isKill).length, [bossChapters]);

  // Roving focus across the stops + auto-scroll the active stop into view.
  const stopRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const registerRef = useCallback((el: HTMLButtonElement | null, index: number) => {
    stopRefs.current[index] = el;
  }, []);

  const activeIndex = useMemo(
    () => stops.findIndex((s) => s.fightId === currentFightId),
    [stops, currentFightId],
  );

  // Bring the active stop into view when it changes (centered, reduced-motion aware).
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = stopRefs.current[activeIndex];
    // Guard scrollIntoView: not implemented in jsdom, and absent in some embedded webviews.
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeIndex, stops.length]);

  const onKeyNav = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        const next = Math.min(stops.length - 1, Math.max(0, index + dir));
        stopRefs.current[next]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        stopRefs.current[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        stopRefs.current[stops.length - 1]?.focus();
      }
    },
    [stops.length],
  );

  if (stops.length === 0) return null;

  return (
    <Box
      sx={{ mb: 2 }}
      role="group"
      aria-label={trialName ? `${trialName} chapters` : 'Trial chapters'}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {trialName || 'Chapters'}
          </Typography>
          {bossChapters.length > 0 && (
            <Chip
              size="small"
              variant="outlined"
              color={killedBosses === bossChapters.length ? 'success' : 'default'}
              label={`${killedBosses} / ${bossChapters.length} bosses`}
            />
          )}
        </Box>

        {hasTrash && bossChapters.length > 0 && (
          <FormControlLabel
            sx={{ mr: 0 }}
            control={
              <Switch
                size="small"
                checked={showTrash}
                onChange={(e) => setShowTrash(e.target.checked)}
                slotProps={{ input: { 'aria-label': 'Show trash' } }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Show trash
              </Typography>
            }
          />
        )}
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1,
          scrollSnapType: 'x proximity',
          // Slim, theme-friendly scrollbar.
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 4,
          },
        }}
      >
        {stops.map((chapter, index) => (
          <ChapterStop
            key={chapter.fightId}
            chapter={chapter}
            index={index}
            active={chapter.fightId === currentFightId}
            // Exactly one roving tab stop: the active stop, else the first.
            tabbable={index === (activeIndex >= 0 ? activeIndex : 0)}
            onSelect={onSelect}
            registerRef={registerRef}
            onKeyNav={onKeyNav}
          />
        ))}
      </Box>
    </Box>
  );
};

export const ChapterRail = React.memo(ChapterRailComponent);
