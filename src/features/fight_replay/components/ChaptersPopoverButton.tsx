/**
 * ChaptersPopoverButton
 *
 * The transport's "Chapters" control: a button in the control row that opens a
 * popover listing the run's chapters (boss avatars, pull #, kill/wipe, duration)
 * with the include-trash toggle and the run identity. This is the chapter
 * navigation that survives fullscreen — the page-shell ChapterRail lives outside
 * the fullscreen target, so without this a fullscreen viewer had only the
 * anonymous mini-map strip and the undocumented [ ] keys.
 *
 * The popover body (the chapter list) mounts only while open, keeping it off the
 * per-frame playback path. It portals into the replay container (when provided)
 * so it stays visible in native fullscreen.
 *
 * @module features/fight_replay/components/ChaptersPopoverButton
 */

import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import {
  Box,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import type { TrialChapter } from '../trial_chapters/types';

import { ChapterList } from './ChapterList';

interface ChaptersPopoverButtonProps {
  /** Chapters to list (already filtered by the trash toggle), in play order. */
  chapters: TrialChapter[];
  currentFightId: string | undefined;
  onSelectChapter: (chapter: TrialChapter) => void;
  /** Run identity for the popover header. */
  runName: string;
  runIndex: number;
  runCount: number;
  /** e.g. "9 / 12 bosses" — omitted when the run has no bosses. */
  bossSummary: string | null;
  includeTrash: boolean;
  onToggleIncludeTrash: () => void;
  hasTrash: boolean;
  /**
   * Container for the popover portal — the fullscreen replay block. Without it a
   * body-portaled popover is invisible in native fullscreen.
   */
  portalContainer?: () => HTMLElement | null;
}

const ChaptersPopoverButtonComponent: React.FC<ChaptersPopoverButtonProps> = ({
  chapters,
  currentFightId,
  onSelectChapter,
  runName,
  runIndex,
  runCount,
  bossSummary,
  includeTrash,
  onToggleIncludeTrash,
  hasTrash,
  portalContainer,
}) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const handleSelect = React.useCallback(
    (chapter: TrialChapter) => {
      setAnchor(null);
      onSelectChapter(chapter);
    },
    [onSelectChapter],
  );

  return (
    <>
      <Tooltip title="Chapters — jump to any boss ( [ and ] skip )">
        <IconButton
          aria-label="Chapters"
          // It opens a non-modal Popover (no role=dialog / focus trap), so announce it as a
          // menu, not a dialog — "dialog" would mislead assistive tech into expecting modality.
          aria-haspopup="menu"
          aria-expanded={open}
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            color: open ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <TimelineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        container={portalContainer ? (portalContainer() ?? undefined) : undefined}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 340,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'min(60vh, 480px)',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Mount the body only while open (off the playback path while closed). */}
        {open && (
          <>
            <Box
              sx={{
                px: 2,
                pt: 1.5,
                pb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                  {runCount > 1 ? `${runName} · ${runIndex + 1}/${runCount}` : runName}
                </Typography>
              </Box>
              {bossSummary && <Chip size="small" variant="outlined" label={bossSummary} />}
            </Box>

            {hasTrash && (
              <Box sx={{ px: 2, pb: 0.5 }}>
                <FormControlLabel
                  sx={{ m: 0 }}
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
              </Box>
            )}

            <Divider />

            <Box sx={{ overflowY: 'auto', px: 1, py: 1 }}>
              <ChapterList
                chapters={chapters}
                currentFightId={currentFightId}
                onSelect={handleSelect}
              />
            </Box>
          </>
        )}
      </Popover>
    </>
  );
};

export const ChaptersPopoverButton = React.memo(ChaptersPopoverButtonComponent);
