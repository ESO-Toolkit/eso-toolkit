import Bolt from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

import type { ReplayQualityPreset } from '../../../hooks/useReplayPrefs';

/** Menu copy per preset — labels are user-facing, keep them short. */
export const QUALITY_PRESET_OPTIONS: ReadonlyArray<{
  value: ReplayQualityPreset;
  label: string;
  description: string;
}> = [
  { value: 'auto', label: 'Auto', description: 'Full quality; reduces automatically if needed' },
  { value: 'high', label: 'High', description: 'Always full quality' },
  { value: 'performance', label: 'Performance', description: 'No shadows or effects' },
  {
    value: 'barebones',
    label: 'Barebones',
    description: 'Minimal drawing, 30 fps — for weak devices',
  },
];

export const QUALITY_PRESET_LABEL: Record<ReplayQualityPreset, string> = {
  auto: 'Auto',
  high: 'High',
  performance: 'Performance',
  barebones: 'Barebones',
};

/** Trigger tint communicates state at a glance (matches the old Bolt grammar: amber = reduced). */
const PRESET_COLOR: Record<ReplayQualityPreset, string> = {
  auto: 'rgba(255, 255, 255, 0.55)',
  high: '#7dd3fc',
  performance: '#fcd34d',
  barebones: '#fb923c',
};

interface ReplayQualityMenuProps {
  qualityPreset: ReplayQualityPreset;
  onQualityPresetChange: (preset: ReplayQualityPreset) => void;
  /** Positioning styles for the trigger button (the caller owns the overlay slot). */
  triggerSx?: SxProps<Theme>;
}

/**
 * Desktop replay-quality selector — replaces the old two-state Bolt toggle in
 * the right-edge control stack. Same Bolt trigger (state-tinted), now opening
 * a 4-option menu (Auto / High / Performance / Barebones). Menu-per-option
 * structure mirrors PerfTierToggle for a consistent settings grammar.
 */
export const ReplayQualityMenu: React.FC<ReplayQualityMenuProps> = ({
  qualityPreset,
  onQualityPresetChange,
  triggerSx,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleClose = (): void => setAnchorEl(null);
  const handleSelect = (preset: ReplayQualityPreset): void => {
    onQualityPresetChange(preset);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={`Replay quality (${QUALITY_PRESET_LABEL[qualityPreset]})`}>
        <IconButton
          aria-label={`Replay quality: ${QUALITY_PRESET_LABEL[qualityPreset]} — change`}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          size="small"
          onClick={handleOpen}
          // Array form (not an object spread) — triggerSx is itself an SxProps<Theme>, which can be
          // an array or a theme function, so spreading it into a plain object breaks under strict
          // typing. MUI merges array entries in order; triggerSx (position/offset only) is listed
          // last so the caller's placement still wins over nothing here, while our color/background/
          // focus-ring styles apply first without being clobbered (no overlapping keys either way).
          sx={[
            (theme) => ({
              color: PRESET_COLOR[qualityPreset],
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
              // Visible keyboard-focus ring — this trigger had none, leaving a keyboard user with no
              // indication of focus while tabbing the right-edge overlay stack. Matches the
              // convention used across the replay feature (PlayerListPanel): 2px solid primary,
              // positive offset.
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }),
            ...(Array.isArray(triggerSx) ? triggerSx : [triggerSx]),
          ]}
        >
          <Bolt fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 250 } } }}
      >
        <MenuItem disabled sx={{ opacity: 1, py: 0.5 }}>
          <ListItemText
            primary={
              <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                REPLAY QUALITY
              </Typography>
            }
          />
        </MenuItem>
        {QUALITY_PRESET_OPTIONS.map(({ value, label, description }) => {
          const selected = qualityPreset === value;
          return (
            <MenuItem key={value} selected={selected} onClick={() => handleSelect(value)} dense>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {selected ? <CheckIcon fontSize="small" /> : null}
              </ListItemIcon>
              <ListItemText primary={label} secondary={description} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
