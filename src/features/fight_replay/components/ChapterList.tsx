/**
 * ChapterList
 *
 * A vertical, tappable list of a run's chapters (bosses + trash) — the Netflix
 * "episodes" surface. Used by the desktop transport's Chapters popover (the
 * fullscreen-reachable chapter navigation) and the mobile Chapters sheet, so a
 * viewer can always answer "what's in this run?" and jump anywhere with one
 * press. Rows are ≥56px for comfortable touch.
 *
 * Mount-gated by its hosts (popover/sheet open) so it stays entirely off the
 * per-frame playback path.
 *
 * @module features/fight_replay/components/ChapterList
 */

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import HeartBrokenRoundedIcon from '@mui/icons-material/HeartBrokenRounded';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useRef } from 'react';

import { BossAvatar } from '../../report_details/BossAvatar';
import { chapterStatusLabel, formatChapterDuration } from '../trial_chapters/chapterDisplay';
import type { TrialChapter } from '../trial_chapters/types';

interface ChapterListProps {
  /** Chapters to list, in play order (already filtered by the trash toggle). */
  chapters: TrialChapter[];
  /** The fight currently loaded in the replay (highlighted + aria-current). */
  currentFightId: string | undefined;
  /** Invoked when a chapter row is chosen. */
  onSelect: (chapter: TrialChapter) => void;
}

/** Leading visual for a chapter row: the boss portrait, or a neutral trash disc. */
export const ChapterGlyph: React.FC<{ chapter: TrialChapter; size?: number }> = ({
  chapter,
  size = 36,
}) => {
  if (chapter.kind === 'boss') {
    return <BossAvatar bossName={chapter.name} size={size} />;
  }
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        color: 'text.secondary',
        backgroundColor: 'action.hover',
        flex: '0 0 auto',
      }}
    >
      <DeleteSweepRoundedIcon fontSize="small" />
    </Box>
  );
};

/** Status icon + caption (Kill / Wipe / % left / Cleared · duration) for a chapter. */
export const ChapterStatusLine: React.FC<{ chapter: TrialChapter }> = ({ chapter }) => {
  const theme = useTheme();
  const status = chapterStatusLabel(chapter);
  const statusColor = chapter.isKill
    ? theme.palette.success.main
    : chapter.isWipe
      ? theme.palette.warning.main
      : theme.palette.text.secondary;
  return (
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
        · {formatChapterDuration(chapter.durationMs)}
      </Typography>
      {chapter.kind === 'boss' && chapter.difficultyLabel && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          · {chapter.difficultyLabel}
        </Typography>
      )}
    </Box>
  );
};

/** Accessible name for a chapter row/stop (shared with ChapterRail). */
export function chapterAriaLabel(chapter: TrialChapter, active: boolean): string {
  return `${chapter.kind === 'boss' ? 'Boss' : 'Trash'}: ${chapter.name}${
    chapter.attempt > 1 ? `, pull ${chapter.attempt}` : ''
  }${chapter.difficultyLabel ? `, ${chapter.difficultyLabel}` : ''}, ${chapterStatusLabel(
    chapter,
  )}, ${formatChapterDuration(chapter.durationMs)}${active ? ', currently playing' : ''}`;
}

const ChapterListComponent: React.FC<ChapterListProps> = ({
  chapters,
  currentFightId,
  onSelect,
}) => {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Bring the active row into view when the list opens (reduced-motion aware).
  useEffect(() => {
    const el = activeRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {chapters.map((chapter) => {
        const active = chapter.fightId === currentFightId;
        const isBoss = chapter.kind === 'boss';
        return (
          <Box
            key={chapter.fightId}
            component="button"
            type="button"
            ref={active ? activeRef : undefined}
            onClick={() => onSelect(chapter)}
            aria-label={chapterAriaLabel(chapter, active)}
            aria-current={active ? 'true' : undefined}
            sx={(theme) => ({
              appearance: 'none',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              minHeight: 56,
              px: 1.5,
              py: 1,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: active ? alpha(theme.palette.primary.main, 0.5) : 'transparent',
              backgroundColor: active
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1)
                : 'transparent',
              transition: 'background-color 120ms ease, border-color 120ms ease',
              '&:hover': { backgroundColor: 'action.hover' },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            })}
          >
            <ChapterGlyph chapter={chapter} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: active ? 700 : 600,
                  lineHeight: 1.25,
                  color: isBoss ? 'text.primary' : 'text.secondary',
                }}
              >
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
      })}
    </Box>
  );
};

export const ChapterList = React.memo(ChapterListComponent);
