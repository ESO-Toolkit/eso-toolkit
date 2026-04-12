import CheckIcon from '@mui/icons-material/Check';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { selectPerfTier, selectPerfTierOverride } from '../store/ui/uiSelectors';
import { setPerfTierOverride, type PerfTier, type PerfTierOverride } from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

// Lets the user pin a performance tier or trust auto-detection. Auto is the
// default — a manual override is for users whose device was misclassified
// (e.g. Chromebook reporting low GPU tier but rendering comfortably, or the
// reverse: a new laptop that thermally throttles).
type OptionValue = PerfTierOverride;
const OPTIONS: ReadonlyArray<{ value: OptionValue; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TIER_LABEL: Record<PerfTier, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export type PerfTierTriggerProps = {
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  menuOpen: boolean;
  override: PerfTierOverride;
  detected: PerfTier;
  isOverridden: boolean;
  // Short user-facing label for the current effective setting, e.g.
  // "Auto · High" when auto-detecting or "Low" when an override is pinned.
  currentLabel: string;
  detectedLabel: string;
};

type PerfTierToggleProps = {
  size?: 'small' | 'medium';
  // Lets consumers render their own trigger (mobile sheet row, settings card,
  // etc). When omitted, the default IconButton renders. The provided element
  // should wire the supplied onClick — the Menu anchors to the click's
  // currentTarget.
  renderTrigger?: (props: PerfTierTriggerProps) => React.ReactElement;
};

export const PerfTierToggle: React.FC<PerfTierToggleProps> = ({
  size = 'medium',
  renderTrigger,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const override = useSelector(selectPerfTierOverride);
  const detected = useSelector(selectPerfTier);

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleClose = (): void => setAnchorEl(null);
  const handleSelect = (value: OptionValue): void => {
    dispatch(setPerfTierOverride(value));
    setAnchorEl(null);
  };

  const isOverridden = override !== 'auto';
  const accent = isOverridden ? theme.palette.warning.main : theme.palette.text.secondary;
  const detectedLabel = TIER_LABEL[detected];
  const currentLabel = isOverridden ? TIER_LABEL[override as PerfTier] : `Auto · ${detectedLabel}`;
  const ariaLabel = isOverridden
    ? `Performance: ${override} (pinned) — change`
    : `Performance: Auto (detected ${detected}) — change`;

  const trigger = renderTrigger ? (
    renderTrigger({
      onClick: handleOpen,
      menuOpen: open,
      override,
      detected,
      isOverridden,
      currentLabel,
      detectedLabel,
    })
  ) : (
    <IconButton
      onClick={handleOpen}
      color="inherit"
      size={size}
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : undefined}
      sx={{
        color: accent,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          color: theme.palette.primary.main,
          transform: 'scale(1.1)',
        },
      }}
    >
      <SpeedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
    </IconButton>
  );

  return (
    <>
      {trigger}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        <MenuItem disabled sx={{ opacity: 1, py: 0.5 }}>
          <ListItemText
            primary={
              <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                PERFORMANCE
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                Detected: {TIER_LABEL[detected]}
              </Typography>
            }
          />
        </MenuItem>
        {OPTIONS.map(({ value, label }) => {
          const selected = override === value;
          return (
            <MenuItem key={value} selected={selected} onClick={() => handleSelect(value)} dense>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {selected ? <CheckIcon fontSize="small" /> : null}
              </ListItemIcon>
              <ListItemText primary={label} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
