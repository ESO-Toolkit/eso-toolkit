/**
 * ContinuousReplayBar
 *
 * The trial-wide control strip that sits above the per-fight transport: the
 * unified {@link TrialTimeline} scrubber plus the "play the whole trial"
 * (auto-advance) toggle, the trash include/exclude toggle, a run indicator (for
 * logs with more than one trial/dungeon), and an "up next" hint. Rendered inside
 * the replay container so it's available in fullscreen.
 *
 * @module features/fight_replay/components/ContinuousReplayBar
 */

import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import {
  Box,
  Chip,
  FormControlLabel,
  Switch,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import type { TrialTimeline as TrialTimelineModel } from '../trial_chapters/trialTimeline';

import { TrialTimeline, type TrialTimelineSeekTarget } from './TrialTimeline';

interface ContinuousReplayBarProps {
  timeline: TrialTimelineModel;
  currentFightId: string | undefined;
  currentLocalMs: number;
  onSeek: (target: TrialTimelineSeekTarget) => void;
  continuousEnabled: boolean;
  onToggleContinuous: () => void;
  includeTrash: boolean;
  onToggleIncludeTrash: () => void;
  hasTrash: boolean;
  runName: string;
  runIndex: number;
  runCount: number;
  nextUpLabel: string | null;
  compact?: boolean;
}

const ContinuousReplayBarComponent: React.FC<ContinuousReplayBarProps> = ({
  timeline,
  currentFightId,
  currentLocalMs,
  onSeek,
  continuousEnabled,
  onToggleContinuous,
  includeTrash,
  onToggleIncludeTrash,
  hasTrash,
  runName,
  runIndex,
  runCount,
  nextUpLabel,
  compact = false,
}) => {
  if (timeline.entries.length === 0) return null;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: compact ? 0.75 : 1 }}>
      {/* Control row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
          <Tooltip title="Play the whole trial — automatically continue into the next fight">
            <ToggleButton
              value="continuous"
              selected={continuousEnabled}
              onChange={onToggleContinuous}
              size="small"
              aria-label="Play whole trial"
              sx={{
                textTransform: 'none',
                gap: 0.5,
                px: 1,
                py: 0.25,
                border: '1px solid',
                borderColor: continuousEnabled ? 'primary.main' : 'divider',
                color: continuousEnabled ? 'primary.main' : 'text.secondary',
              }}
            >
              <PlaylistPlayRoundedIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Play trial
              </Typography>
            </ToggleButton>
          </Tooltip>

          {hasTrash && (
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  size="small"
                  checked={includeTrash}
                  onChange={onToggleIncludeTrash}
                  slotProps={{ input: { 'aria-label': 'Include trash in continuous play' } }}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Trash
                </Typography>
              }
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
          {nextUpLabel && continuousEnabled && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
              noWrap
            >
              Up next:{' '}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {nextUpLabel}
              </Box>
            </Typography>
          )}
          <Chip
            size="small"
            variant="outlined"
            label={runCount > 1 ? `${runName} · ${runIndex + 1}/${runCount}` : runName}
            sx={{ maxWidth: 220 }}
          />
        </Box>
      </Box>

      {/* The unified trial scrubber */}
      <TrialTimeline
        timeline={timeline}
        currentFightId={currentFightId}
        currentLocalMs={currentLocalMs}
        onSeek={onSeek}
        compact={compact}
      />
    </Box>
  );
};

export const ContinuousReplayBar = React.memo(ContinuousReplayBarComponent);
