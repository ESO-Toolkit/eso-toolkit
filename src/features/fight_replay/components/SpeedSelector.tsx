/**
 * SpeedSelector Component
 *
 * Inline playback-speed control for fight replay. A segmented chip group of the common
 * speeds (a 1-tap toggle, like a pro VOD/esports player) rather than a form-field dropdown,
 * so it reads as a media control instead of a settings input. The full speed list is still
 * reachable via the overflow menu so power users keep 0.25×/3×/5× without cluttering the bar.
 *
 * @module SpeedSelector
 */

import SpeedIcon from '@mui/icons-material/Speed';
import {
  Box,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';

import { TRANSPORT_MOTION } from '../constants/replayDesign';

interface SpeedSelectorProps {
  /** Current playback speed multiplier */
  playbackSpeed: number;
  /** Callback when speed changes */
  onSpeedChange: (speed: number) => void;
  /** Available playback speeds (default: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5]) */
  speeds?: number[];
}

const DEFAULT_PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

/** The speeds surfaced as inline chips — the common ones people actually toggle between. */
const QUICK_SPEEDS = [0.5, 1, 2, 4];

const formatSpeed = (speed: number): string => `${speed}×`;

/**
 * Speed Selector Component
 *
 * A segmented control of quick speeds plus an overflow menu for the full range. The active
 * speed is always shown: if it isn't one of the quick chips (e.g. 1.25×) the overflow
 * trigger displays it so the current speed is never hidden.
 */
export const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  playbackSpeed,
  onSpeedChange,
  speeds = DEFAULT_PLAYBACK_SPEEDS,
}) => {
  const theme = useTheme();
  // On narrow screens the segmented chips don't fit alongside the transport cluster, so the
  // whole control collapses to just the overflow trigger (which always shows current speed).
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const quickSpeeds = useMemo(() => QUICK_SPEEDS.filter((s) => speeds.includes(s)), [speeds]);

  const isQuickSpeed = quickSpeeds.includes(playbackSpeed);

  const handleQuickChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, value: number | null) => {
      // ToggleButtonGroup passes null when the active button is re-clicked; ignore that so
      // a speed is always selected.
      if (value !== null) {
        onSpeedChange(value);
      }
    },
    [onSpeedChange],
  );

  const handleMenuSelect = useCallback(
    (speed: number) => {
      onSpeedChange(speed);
      setMenuAnchor(null);
    },
    [onSpeedChange],
  );

  const segmentSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '11px',
    overflow: 'hidden',
    bgcolor: 'action.hover',
    height: 34,
    '& .MuiToggleButton-root': {
      border: 0,
      px: '11px',
      py: 0,
      minWidth: 38,
      height: '100%',
      fontSize: '13px',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1,
      color: 'text.secondary',
      // Hairline divider between chips (the proto's connected-segment look).
      borderRight: '1px solid',
      borderRightColor: 'divider',
      '&:last-of-type': { borderRight: 0 },
      transition: `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}, color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
      '&:hover': { bgcolor: 'action.selected', color: 'text.primary' },
      '&.Mui-selected': {
        backgroundImage: (t: Theme) =>
          `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
        // Match the proto: the active chip uses the dark page-bg as its text color (reads on
        // the bright cyan gradient) with the proto's stronger glow.
        color: (t: Theme) => (t.palette.mode === 'dark' ? t.palette.background.default : '#fff'),
        boxShadow: (t: Theme) => `0 0 14px ${t.palette.primary.main}66`,
        '&:hover': {
          backgroundImage: (t: Theme) =>
            `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
          filter: 'brightness(1.05)',
        },
      },
    },
  } as const;

  // The overflow trigger doubles as the current-speed readout when the active speed isn't a
  // quick chip, and as a "more speeds" affordance otherwise.
  const triggerLabel = compact || !isQuickSpeed ? formatSpeed(playbackSpeed) : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {!compact && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={isQuickSpeed ? playbackSpeed : null}
          onChange={handleQuickChange}
          aria-label="Playback speed"
          sx={segmentSx}
        >
          {quickSpeeds.map((speed) => (
            <ToggleButton key={speed} value={speed} aria-label={`${speed} times speed`}>
              {formatSpeed(speed)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Tooltip title="Playback speed">
        <ToggleButton
          value="more"
          size="small"
          selected={!compact && !isQuickSpeed}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-label="Choose playback speed"
          aria-haspopup="true"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '11px',
            height: 34,
            px: triggerLabel ? '11px' : '8px',
            py: 0,
            gap: 0.5,
            color: 'text.secondary',
            fontSize: '13px',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            bgcolor: 'action.hover',
            transition: `background-color ${TRANSPORT_MOTION.tap} ${TRANSPORT_MOTION.ease}`,
            '&:hover': { bgcolor: 'action.selected', color: 'text.primary' },
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            },
          }}
        >
          <SpeedIcon sx={{ fontSize: '1.05rem' }} />
          {triggerLabel}
        </ToggleButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {speeds.map((speed) => (
          <MenuItem
            key={speed}
            selected={speed === playbackSpeed}
            onClick={() => handleMenuSelect(speed)}
            sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 96 }}
          >
            {formatSpeed(speed)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
