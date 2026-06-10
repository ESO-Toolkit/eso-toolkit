/**
 * ChapterRail
 *
 * The trial chapter navigator for the fight replay. Renders the current run's
 * boss encounters as a horizontal strip of "stops" — each with a kill ✓ / wipe-%
 * checkmark — that jump the replay to that boss without leaving the page. The
 * shared, persisted "Include trash" preference (also surfaced in the transport)
 * interleaves the connective trash fights so a viewer can follow the run-up
 * (and watch the map transition) into a boss.
 *
 * This lives in the page shell (not inside the 3D canvas / transport), so it is
 * off the per-frame playback path and re-renders only when the run or the active
 * fight changes — no playback-perf concern.
 *
 * @module features/fight_replay/components/ChapterRail
 */

import { Box, Chip, FormControlLabel, Switch, Typography, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { TRANSPORT_MOTION } from '../constants/replayDesign';
import type { TrialChapter } from '../trial_chapters/types';

import { chapterAriaLabel, ChapterGlyph, ChapterStatusLine } from './ChapterList';

interface ChapterRailProps {
  /** All segments (bosses + trash) of the current run, in play order. */
  segments: TrialChapter[];
  /** Boss-only chapters of the current run (the primary skip targets). */
  bossChapters: TrialChapter[];
  /** The fight id currently loaded in the replay. */
  currentFightId: string | undefined;
  /** Display name of the current trial run. */
  trialName?: string;
  /**
   * Hide the visible run title (when the page header already states it) while
   * keeping it in the group's accessible name.
   */
  hideTitle?: boolean;
  /** Whether trash fights are shown/included — the shared, persisted preference. */
  includeTrash: boolean;
  /** Toggle the shared include-trash preference. */
  onToggleIncludeTrash: () => void;
  /** Optional controls rendered at the right edge of the rail header. */
  headerActions?: React.ReactNode;
  /** Invoked when a stop is chosen. */
  onSelect: (chapter: TrialChapter) => void;
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

  return (
    <Box
      component="button"
      type="button"
      ref={(el: HTMLButtonElement | null) => registerRef(el, index)}
      onClick={() => onSelect(chapter)}
      onKeyDown={(e: React.KeyboardEvent) => onKeyNav(e, index)}
      aria-label={chapterAriaLabel(chapter, active)}
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
      <ChapterGlyph chapter={chapter} size={isBoss ? 36 : 28} />

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

        <ChapterStatusLine chapter={chapter} />
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
  hideTitle = false,
  includeTrash,
  onToggleIncludeTrash,
  headerActions,
  onSelect,
}) => {
  const hasTrash = useMemo(() => segments.some((s) => s.kind === 'trash'), [segments]);

  // If the active fight is a trash segment, reveal trash so it can be highlighted
  // and brought into view — derived, never flipping the persisted preference.
  const currentIsTrash = useMemo(
    () => segments.some((s) => s.fightId === currentFightId && s.kind === 'trash'),
    [segments, currentFightId],
  );

  // The stops shown: bosses only by default; all segments when trash is included.
  // A trash-only run (no bosses) always shows its segments so it stays navigable.
  const stops = useMemo(() => {
    if (bossChapters.length === 0) return segments;
    return includeTrash || currentIsTrash ? segments : bossChapters;
  }, [segments, bossChapters, includeTrash, currentIsTrash]);

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

  // Center the active stop when it changes — scrolling ONLY the horizontal rail container.
  // (scrollIntoView scrolls every ancestor including the document, which yanked the page
  // vertically on each continuous-play auto-advance.)
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = stopRefs.current[activeIndex];
    const container = scrollRef.current;
    if (!el || !container || typeof container.scrollTo !== 'function') return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const left = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
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
          {!hideTitle && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {trialName || 'Chapters'}
            </Typography>
          )}
          {bossChapters.length > 0 && (
            <Chip
              size="small"
              variant="outlined"
              color={killedBosses === bossChapters.length ? 'success' : 'default'}
              label={`${killedBosses} / ${bossChapters.length} bosses`}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasTrash && bossChapters.length > 0 && (
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  size="small"
                  checked={includeTrash}
                  onChange={onToggleIncludeTrash}
                  slotProps={{ input: { 'aria-label': 'Include trash fights' } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Include trash
                </Typography>
              }
            />
          )}
          {headerActions}
        </Box>
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
