import Bolt from '@mui/icons-material/Bolt';
import CenterFocusStrong from '@mui/icons-material/CenterFocusStrong';
import Close from '@mui/icons-material/Close';
import Insights from '@mui/icons-material/Insights';
import Label from '@mui/icons-material/Label';
import LabelOff from '@mui/icons-material/LabelOff';
import People from '@mui/icons-material/People';
import RestartAlt from '@mui/icons-material/RestartAlt';
import Route from '@mui/icons-material/Route';
import { Box, IconButton, Tooltip } from '@mui/material';
import type { SystemStyleObject, Theme } from '@mui/system';
import React from 'react';

/**
 * Touch control cluster for the mobile pseudo-fullscreen replay overlay.
 *
 * The desktop replay drives almost everything from the keyboard (WASD/R/G/P/T/N/J/H/F/C) plus a
 * right-edge icon stack that's laid out for a wide viewport. On a 390px phone that stack collides
 * with the transport, and the keyboard shortcuts have no touch path at all (WASD/R/G especially —
 * camera move/reset/frame-all are keydown-only). This component is the touch home for the controls
 * that actually matter on a phone, shown ONLY inside the immersive overlay (where there's room).
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
}

/** Shared sx for the round glass toggle buttons so the row reads as one control cluster. */
const toggleSx = (active: boolean): SystemStyleObject<Theme> => ({
  color: active ? 'white' : 'rgba(255,255,255,0.6)',
  backgroundColor: active ? 'rgba(20,30,68,0.92)' : 'rgba(0,0,0,0.6)',
  border: active ? '1px solid rgba(148,210,255,0.5)' : '1px solid rgba(255,255,255,0.12)',
  width: 44,
  height: 44,
  '&:hover': { backgroundColor: 'rgba(20,30,68,0.98)' },
});

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
}) => {
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

      {/* Toggle row — a single horizontally-scrollable strip sitting ABOVE the transport (which docks
          at the very bottom). Raised to clear the transport band + the home-indicator safe area. The
          frame is pointer-events:none so its gaps never steal a camera drag; only the buttons take input. */}
      <Box
        sx={{
          position: 'absolute',
          // Plain px (NOT env()) — the overlay container already pads for the safe area. bottom:96
          // matches MOBILE_CLUSTER_BOTTOM_PX in LockedPlayerStatsPanel (the stats panel derives its
          // resting offset from this so the two never collide).
          left: 8,
          right: 8,
          bottom: 96,
          display: 'flex',
          gap: 1,
          justifyContent: 'center',
          flexWrap: 'wrap',
          pointerEvents: 'none',
          '& > *': { pointerEvents: 'auto' },
        }}
      >
        <Tooltip title={showPlayerList ? 'Hide players' : 'Show players'}>
          <IconButton
            aria-label={showPlayerList ? 'Hide player list' : 'Show player list'}
            aria-pressed={showPlayerList}
            onClick={onTogglePlayerList}
            sx={toggleSx(showPlayerList)}
          >
            <People fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={showTrails ? 'Hide trails' : 'Show trails'}>
          <IconButton
            aria-label={showTrails ? 'Hide player trails' : 'Show player trails'}
            aria-pressed={showTrails}
            onClick={onToggleTrails}
            sx={toggleSx(showTrails)}
          >
            <Route fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={namesEnabled ? 'Hide names' : 'Show names'}>
          <IconButton
            aria-label={namesEnabled ? 'Hide name tags' : 'Show name tags'}
            aria-pressed={namesEnabled}
            onClick={onToggleNames}
            sx={toggleSx(namesEnabled)}
          >
            {namesEnabled ? <Label fontSize="small" /> : <LabelOff fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset view">
          <IconButton
            aria-label="Reset camera view"
            onClick={() => pressKey('r')}
            sx={toggleSx(false)}
          >
            <RestartAlt fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Frame all">
          <IconButton
            aria-label="Frame all actors"
            onClick={() => pressKey('g')}
            sx={toggleSx(false)}
          >
            <CenterFocusStrong fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Stats toggle — only while following a player (mirrors the desktop J-key button condition). */}
        {following && (
          <Tooltip title={statsPanelEnabled ? 'Hide player stats' : 'Show player stats'}>
            <IconButton
              aria-label={
                statsPanelEnabled ? 'Hide locked-player stats' : 'Show locked-player stats'
              }
              aria-pressed={statsPanelEnabled}
              onClick={onToggleStats}
              sx={toggleSx(statsPanelEnabled)}
            >
              <Insights fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={performanceMode ? 'Performance mode on' : 'Performance mode'}>
          <IconButton
            aria-label={performanceMode ? 'Disable performance mode' : 'Enable performance mode'}
            aria-pressed={performanceMode}
            onClick={onTogglePerformance}
            sx={[
              toggleSx(performanceMode),
              { color: performanceMode ? '#fcd34d' : 'rgba(255,255,255,0.6)' },
            ]}
          >
            <Bolt fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </>
  );
};
