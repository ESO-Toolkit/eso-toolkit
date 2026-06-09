import Bolt from '@mui/icons-material/Bolt';
import CenterFocusStrong from '@mui/icons-material/CenterFocusStrong';
import Close from '@mui/icons-material/Close';
import EditLocationAlt from '@mui/icons-material/EditLocationAlt';
import Insights from '@mui/icons-material/Insights';
import Label from '@mui/icons-material/Label';
import LabelOff from '@mui/icons-material/LabelOff';
import People from '@mui/icons-material/People';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Route from '@mui/icons-material/Route';
import Tune from '@mui/icons-material/Tune';
import Undo from '@mui/icons-material/Undo';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useState } from 'react';

/**
 * Touch controls for the mobile pseudo-fullscreen replay overlay.
 *
 * The desktop replay drives almost everything from the keyboard (WASD/R/G/P/T/N/J/H/F/C) plus a
 * right-edge icon stack laid out for a wide viewport — none of which works on a phone. On mobile we
 * surface just the controls that matter, but DON'T cram them into the bottom: a 7-button strip docked
 * right above the transport made the bottom of the overlay read as a squished pile of bands. Instead a
 * single bottom-corner "tools" button opens a sheet of toggles, leaving the bottom edge as clean
 * playback (scrub rail + transport). Shown ONLY inside the immersive overlay.
 *
 * Camera reset (R) and frame-all (G) have no callable handle — they live as window keydown handlers
 * in CameraResetControls (they need the in-Canvas three camera). We bridge to them by dispatching a
 * synthetic keydown, which is exactly what those handlers consume (they key off event.key and don't
 * require a trusted event). This reuses the existing logic with no refactor.
 */
function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

export interface MobileReplayControlsProps {
  /** Close the overlay (back to the inline preview). */
  onClose: () => void;
  /** Player-paths HUD (the player list) — P on desktop. */
  showPlayerList: boolean;
  onTogglePlayerList: () => void;
  /** Player trails — T on desktop. */
  showTrails: boolean;
  onToggleTrails: () => void;
  /** Name tags — N on desktop. */
  namesEnabled: boolean;
  onToggleNames: () => void;
  /** Performance mode (drop figure shadows) — button-only on desktop. */
  performanceMode: boolean;
  onTogglePerformance: () => void;
  /** Locked-player stats panel — J on desktop. Only meaningful while following a player. */
  following: boolean;
  statsPanelEnabled: boolean;
  onToggleStats: () => void;
  /** Marker edit mode (long-press to place/edit, drag to move). Omitted = no markers row. */
  markersEditMode?: boolean;
  onToggleMarkersEditMode?: () => void;
  /** Undo the last marker change — only shown while edit mode is on. */
  canUndoMarkers?: boolean;
  onUndoMarkers?: () => void;
}

/** A row in the tools sheet. `closesOnTap` items open another on-screen panel, so the sheet dismisses
 *  itself after the tap (otherwise it would sit on top of the panel it just opened). */
interface ToolItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onTap: () => void;
  closesOnTap?: boolean;
  disabled?: boolean;
}

export const MobileReplayControls: React.FC<MobileReplayControlsProps> = ({
  onClose,
  showPlayerList,
  onTogglePlayerList,
  showTrails,
  onToggleTrails,
  namesEnabled,
  onToggleNames,
  performanceMode,
  onTogglePerformance,
  following,
  statsPanelEnabled,
  onToggleStats,
  markersEditMode = false,
  onToggleMarkersEditMode,
  canUndoMarkers = false,
  onUndoMarkers,
}) => {
  // The tools sheet anchor — null = closed.
  const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null);
  const toolsOpen = Boolean(toolsAnchor);

  // The toggles, in sheet order. Players (top-left list) and Stats (bottom-left panel) open other
  // surfaces, so tapping them dismisses the sheet so it doesn't cover what it opened.
  const items: ToolItem[] = [
    {
      key: 'players',
      label: showPlayerList ? 'Hide players' : 'Show players',
      icon: <People fontSize="small" />,
      active: showPlayerList,
      onTap: onTogglePlayerList,
      closesOnTap: true,
    },
    {
      key: 'trails',
      label: showTrails ? 'Hide trails' : 'Show trails',
      icon: <Route fontSize="small" />,
      active: showTrails,
      onTap: onToggleTrails,
    },
    {
      key: 'names',
      label: namesEnabled ? 'Hide name tags' : 'Show name tags',
      icon: namesEnabled ? <Label fontSize="small" /> : <LabelOff fontSize="small" />,
      active: namesEnabled,
      onTap: onToggleNames,
    },
    // Marker editing: the touch home for the desktop "Edit Markers" toggle. While on,
    // long-press the map to place a marker, drag a marker to move it, long-press a marker
    // to edit/remove it. Undo rides along for recovering from a mis-drag without leaving
    // the overlay.
    ...(onToggleMarkersEditMode
      ? [
          {
            key: 'editMarkers',
            label: markersEditMode ? 'Stop editing markers' : 'Edit markers',
            icon: <EditLocationAlt fontSize="small" />,
            active: markersEditMode,
            onTap: onToggleMarkersEditMode,
            closesOnTap: true,
          } as ToolItem,
        ]
      : []),
    ...(markersEditMode && onUndoMarkers
      ? [
          {
            key: 'undoMarkers',
            label: 'Undo marker change',
            icon: <Undo fontSize="small" />,
            active: false,
            onTap: onUndoMarkers,
            disabled: !canUndoMarkers,
          } as ToolItem,
        ]
      : []),
    {
      key: 'reset',
      label: 'Reset view',
      icon: <RestartAlt fontSize="small" />,
      active: false,
      onTap: () => pressKey('r'),
      closesOnTap: true,
    },
    {
      key: 'frame',
      label: 'Frame all',
      icon: <CenterFocusStrong fontSize="small" />,
      active: false,
      onTap: () => pressKey('g'),
      closesOnTap: true,
    },
    // Stats only while following a player (mirrors the desktop J-key button condition).
    ...(following
      ? [
          {
            key: 'stats',
            label: statsPanelEnabled ? 'Hide player stats' : 'Show player stats',
            icon: <Insights fontSize="small" />,
            active: statsPanelEnabled,
            onTap: onToggleStats,
            closesOnTap: true,
          } as ToolItem,
        ]
      : []),
    {
      key: 'perf',
      label: performanceMode ? 'Performance mode on' : 'Performance mode',
      icon: <Bolt fontSize="small" />,
      active: performanceMode,
      onTap: onTogglePerformance,
    },
  ];

  const handleTap = (item: ToolItem): void => {
    item.onTap();
    if (item.closesOnTap) setToolsAnchor(null);
  };

  return (
    <>
      {/* Prominent Close — top-right, thumb-reachable. iOS Safari has no Escape key and the desktop
          fullscreen-exit button is hidden on mobile, so this is the ONLY way out of the overlay. */}
      <Tooltip title="Close">
        <IconButton
          aria-label="Close 3D replay"
          onClick={onClose}
          sx={{
            position: 'absolute',
            // Plain px (NOT env()) — the overlay container already pads for the safe area; adding
            // env() here too would double-count and push the button too far inboard.
            top: 8,
            right: 8,
            zIndex: 2,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.65)',
            width: 48,
            height: 48,
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' },
          }}
        >
          <Close />
        </IconButton>
      </Tooltip>

      {/* Tools button — a single bottom-RIGHT affordance (thumb zone, clear of the bottom-left stats
          panel and the contested top). Opens the toggles sheet. Sits ABOVE the transport so the bottom
          edge stays clean playback. The active-toggle count is conveyed by the sheet, not the button. */}
      <Tooltip title="Tools">
        <IconButton
          aria-label="Replay tools"
          aria-haspopup="true"
          aria-expanded={toolsOpen}
          onClick={(e) => setToolsAnchor(e.currentTarget)}
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 96,
            zIndex: 2,
            width: 48,
            height: 48,
            color: toolsOpen ? 'white' : 'rgba(255,255,255,0.85)',
            backgroundColor: toolsOpen ? 'rgba(20,30,68,0.95)' : 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(148,210,255,0.35)',
            '&:hover': { backgroundColor: 'rgba(20,30,68,0.98)' },
          }}
        >
          <Tune />
        </IconButton>
      </Tooltip>

      {/* Toggles sheet — a compact menu anchored to the tools button. Each row is a ≥44px tap target. */}
      <Menu
        anchorEl={toolsAnchor}
        open={toolsOpen}
        onClose={() => setToolsAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: (theme) => ({
              minWidth: 200,
              backgroundColor: alpha(theme.palette.background.paper, 0.96),
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148,210,255,0.25)',
            }),
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.key}
            onClick={() => handleTap(item)}
            aria-pressed={item.active}
            disabled={item.disabled}
            sx={{
              minHeight: 44,
              color: item.active ? 'primary.main' : 'text.primary',
            }}
          >
            <ListItemIcon
              sx={{ color: item.active ? 'primary.main' : 'text.secondary', minWidth: 36 }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText slotProps={{ primary: { sx: { fontSize: '0.9rem' } } }}>
              {item.label}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
