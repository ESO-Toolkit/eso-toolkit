/**
 * ReplayDisplaySettingsMenu
 *
 * The desktop transport's settings control: one gear button in the control row that opens a
 * popover grouping the replay's modes and preferences — Autoplay, name tags, the locked-player
 * stats toggle, the replay-quality preset, and the keyboard-shortcuts panel. The Display grouping
 * mirrors the mobile Settings sheet (see `mobile/MobileReplayDock.tsx`'s "Display" section).
 * Before this, those lived as separate always-visible floating circles stacked down the right edge
 * of the 3D canvas (Arena3D), each hardcoding its own `bottom` offset — this ports the mobile
 * grouping to desktop instead of inventing a new one, and collapses three magic-numbered buttons
 * into one.
 *
 * Autoplay and the keyboard-help trigger moved in here afterwards, from the transport row itself:
 * Autoplay was a labelled `Switch` (the only one in a row of icon buttons, and wide enough to
 * crowd the cluster) and help was a permanently-parked `?` circle. Both are set-once preferences
 * rather than per-moment playback actions, which is exactly what a settings menu is for.
 *
 * Follows the same popover skeleton as {@link ChaptersPopoverButton}: a menu-labelled trigger,
 * body mounted only while open (off the per-frame playback path), and an optional portal target
 * so it survives native fullscreen.
 *
 * The name-tags and player-stats rows are kept as `aria-pressed` icon toggles (not native
 * `Switch`/`aria-checked` controls) with the EXACT SAME `aria-label` strings the old floating
 * buttons used — they're the toggles the a11y pass in 86edf986 added focus rings and a WCAG-safe
 * inactive contrast to, so relocating them must not silently swap their accessible name or state
 * exposure out from under that fix.
 *
 * @module features/fight_replay/components/ReplayDisplaySettingsMenu
 */

import Insights from '@mui/icons-material/Insights';
import KeyboardOutlined from '@mui/icons-material/KeyboardOutlined';
import Label from '@mui/icons-material/Label';
import LabelOff from '@mui/icons-material/LabelOff';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import type { ReplayQualityPreset } from '../../../hooks/useReplayPrefs';
import { QUALITY_PRESET_OPTIONS } from '../constants/qualityPresets';

interface ReplayDisplaySettingsMenuProps {
  namesEnabled: boolean;
  onToggleNames: () => void;
  /**
   * Autoplay ("continue into the next fight when this one ends") — multi-fight trial runs only.
   * Omit both to hide the Playback section entirely, as an isolated fight has nothing to advance to.
   */
  autoplayEnabled?: boolean;
  onToggleAutoplay?: () => void;
  /**
   * Opens the keyboard-shortcuts panel. Omitted on touch (no keyboard). The row hides while the
   * panel is already open, matching the old inline `?` button's visibility rule.
   */
  onToggleKeyboardHelp?: () => void;
  showKeyboardHelp?: boolean;
  qualityPreset: ReplayQualityPreset;
  onQualityPresetChange: (preset: ReplayQualityPreset) => void;
  /** Only rendered while following someone — mirrors the old floating button's visibility rule. */
  showStatsRow: boolean;
  statsPanelEnabled: boolean;
  onToggleStats: () => void;
  /** Popover portal target — the fullscreen replay block, so it stays visible in native fullscreen. */
  portalContainer?: () => HTMLElement | null;
}

/** A compact toggle row: label on the left, an `aria-pressed` icon button on the right. */
const ToggleRow: React.FC<{
  label: string;
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  ariaLabelOn: string;
  ariaLabelOff: string;
  shortcutHint: string;
  onToggle: () => void;
}> = ({
  label,
  active,
  activeIcon,
  inactiveIcon,
  ariaLabelOn,
  ariaLabelOff,
  shortcutHint,
  onToggle,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5,
      px: 1.5,
      py: 0.5,
    }}
  >
    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
      {label}
    </Typography>
    <Tooltip
      title={active ? `${ariaLabelOn} (${shortcutHint})` : `${ariaLabelOff} (${shortcutHint})`}
    >
      <IconButton
        aria-label={active ? ariaLabelOn : ariaLabelOff}
        aria-pressed={active}
        size="small"
        onClick={onToggle}
        sx={{
          color: active ? 'primary.main' : 'text.secondary',
          '&:hover': { color: 'text.primary' },
        }}
      >
        {active ? activeIcon : inactiveIcon}
      </IconButton>
    </Tooltip>
  </Box>
);

/**
 * A mode row: label on the left, a native `Switch` on the right. Used for Autoplay — a persistent
 * on/off mode, so it keeps `Switch`'s `aria-checked` semantics rather than borrowing
 * {@link ToggleRow}'s `aria-pressed` icon button (which exists to preserve the accessible names
 * the old floating canvas buttons had).
 */
const SwitchRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  ariaLabel: string;
  onToggle: () => void;
}> = ({ label, description, checked, ariaLabel, onToggle }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5,
      px: 1.5,
      py: 0.5,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {description}
      </Typography>
    </Box>
    <Switch
      size="small"
      checked={checked}
      onChange={onToggle}
      slotProps={{ input: { 'aria-label': ariaLabel } }}
    />
  </Box>
);

/** The popover's section heading — one style, so the groupings read as a single system. */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="overline"
    sx={{ px: 1.5, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}
  >
    {children}
  </Typography>
);

const ReplayDisplaySettingsMenuComponent: React.FC<ReplayDisplaySettingsMenuProps> = ({
  namesEnabled,
  onToggleNames,
  autoplayEnabled,
  onToggleAutoplay,
  onToggleKeyboardHelp,
  showKeyboardHelp = false,
  qualityPreset,
  onQualityPresetChange,
  showStatsRow,
  statsPanelEnabled,
  onToggleStats,
  portalContainer,
}) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="Settings">
        <IconButton
          aria-label="Settings"
          aria-haspopup="menu"
          aria-expanded={open}
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            color: open ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <TuneRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        container={portalContainer ? (portalContainer() ?? undefined) : undefined}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 260, maxWidth: 'calc(100vw - 32px)', py: 1 } } }}
      >
        {/* Mount the body only while open — keeps this off the per-frame playback path. */}
        {open && (
          <>
            {/* Playback — trial runs only (an isolated fight has no next fight to advance to). */}
            {autoplayEnabled != null && onToggleAutoplay && (
              <>
                <SectionLabel>Playback</SectionLabel>
                <SwitchRow
                  label="Autoplay"
                  description="Continue into the next fight"
                  checked={autoplayEnabled}
                  ariaLabel="Autoplay the whole trial"
                  onToggle={onToggleAutoplay}
                />
                <Divider sx={{ my: 1 }} />
              </>
            )}

            <SectionLabel>Display</SectionLabel>

            <ToggleRow
              label="Name tags"
              active={namesEnabled}
              activeIcon={<Label fontSize="small" />}
              inactiveIcon={<LabelOff fontSize="small" />}
              ariaLabelOn="Hide actor name tags"
              ariaLabelOff="Show actor name tags"
              shortcutHint="N"
              onToggle={onToggleNames}
            />

            {showStatsRow && (
              <ToggleRow
                label="Player stats"
                active={statsPanelEnabled}
                activeIcon={<Insights fontSize="small" />}
                inactiveIcon={<Insights fontSize="small" />}
                ariaLabelOn="Hide locked-player stats"
                ariaLabelOff="Show locked-player stats"
                shortcutHint="J"
                onToggle={onToggleStats}
              />
            )}

            <Divider sx={{ my: 1 }} />

            <SectionLabel>Replay quality</SectionLabel>
            {/* Same 4-way pill grid as the mobile Settings sheet (QUALITY_PRESET_OPTIONS) — one
                grammar for the same choice on both form factors. */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 0.75,
                px: 1.5,
                pt: 0.75,
              }}
            >
              {QUALITY_PRESET_OPTIONS.map(({ value, label }) => {
                const active = value === qualityPreset;
                return (
                  <Box
                    key={value}
                    component="button"
                    type="button"
                    onClick={() => onQualityPresetChange(value)}
                    aria-pressed={active}
                    aria-label={`Replay quality: ${label}`}
                    sx={(theme) => ({
                      appearance: 'none',
                      cursor: 'pointer',
                      height: 32,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      backgroundColor: active
                        ? alpha(theme.palette.primary.main, 0.16)
                        : 'transparent',
                      color: active ? 'primary.main' : 'text.primary',
                      fontWeight: active ? 700 : 600,
                      fontSize: '0.72rem',
                      transition: 'background-color 120ms ease, border-color 120ms ease',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    })}
                  >
                    {label}
                  </Box>
                );
              })}
            </Box>

            {/* Keyboard shortcuts — an action, not a setting, so it sits last behind a rule.
                Hidden while the panel is already open (the panel's own close control takes over),
                mirroring the inline `?` button this replaced. */}
            {onToggleKeyboardHelp && !showKeyboardHelp && (
              <>
                <Divider sx={{ mt: 1.5, mb: 0.5 }} />
                <Button
                  fullWidth
                  size="small"
                  color="inherit"
                  startIcon={<KeyboardOutlined fontSize="small" />}
                  onClick={onToggleKeyboardHelp}
                  aria-label="Show keyboard controls"
                  sx={{ justifyContent: 'flex-start', px: 1.5, color: 'text.secondary' }}
                >
                  Keyboard shortcuts
                </Button>
              </>
            )}
          </>
        )}
      </Popover>
    </>
  );
};

export const ReplayDisplaySettingsMenu = React.memo(ReplayDisplaySettingsMenuComponent);
