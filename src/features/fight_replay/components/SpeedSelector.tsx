/**
 * SpeedSelector Component
 *
 * Playback speed selector for fight replay.
 *
 * @module SpeedSelector
 */

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React from 'react';

interface SpeedSelectorProps {
  /** Current playback speed multiplier */
  playbackSpeed: number;
  /** Callback when speed changes */
  onSpeedChange: (speed: number) => void;
  /** Available playback speeds (default: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5]) */
  speeds?: number[];
}

const DEFAULT_PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

/**
 * Speed Selector Component
 *
 * Provides a dropdown to select playback speed with common speed multipliers.
 * Supports custom speed arrays via props.
 */
export const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  playbackSpeed,
  onSpeedChange,
  speeds = DEFAULT_PLAYBACK_SPEEDS,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Speed</InputLabel>
        <Select
          value={playbackSpeed}
          label="Speed"
          onChange={(e) => onSpeedChange(e.target.value as number)}
        >
          {speeds.map((speed) => (
            <MenuItem key={speed} value={speed}>
              {speed}x
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="body2" color="text.secondary">
        Playback Speed
      </Typography>
    </Box>
  );
};
