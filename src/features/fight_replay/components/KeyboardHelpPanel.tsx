/**
 * Keyboard help panel — desktop-only DOM overlay (bottom-right of the arena)
 *
 * Documents the physical-key shortcuts (camera / playback / view). Extracted out of Arena3D so
 * the shortcut table lives in one place and the panel can own its own layout rules:
 *
 *   - LAYERING: it renders ABOVE the top-right BossHealthPanel (zIndex 3) instead of underneath
 *     it. The old bare `rgba(0,0,0,0.85)` box had no zIndex, so on short canvases the boss bars
 *     painted straight through the help text.
 *   - HEIGHT: capped to the canvas with its own scroll region, so a tall shortcut list can never
 *     run past the top edge into the boss bars in the first place.
 *   - The surface matches the rest of the replay chrome (cyan-glass panel, kbd key chips)
 *     rather than a flat black rectangle of text lines.
 */

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardIcon from '@mui/icons-material/KeyboardOutlined';
import { Box, Collapse, IconButton, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { ARENA_HEIGHT } from '../constants/replayDesign';

interface KeyboardHelpPanelProps {
  /** Whether the panel is shown (auto-opens for a few seconds on mount; H toggles it). */
  open: boolean;
  /** Dismiss the panel (header close button). */
  onClose: () => void;
}

/** Shortcut table, grouped by the surface each group drives. */
const SECTIONS: ReadonlyArray<{ title: string; rows: ReadonlyArray<readonly [string, string]> }> = [
  {
    title: 'Camera',
    rows: [
      ['WASD', 'Move camera'],
      ['Shift', 'Sprint'],
      ['Drag', 'Rotate · Ctrl+scroll: Zoom'],
      ['R', 'Reset view · G: Frame all'],
    ],
  },
  {
    title: 'Playback',
    rows: [
      ['Space', 'Play / pause'],
      ['← →', 'Seek ±1s · Shift: ±10s'],
      ['+ −', 'Speed up / down'],
      [', .', 'Frame step'],
      ['< >', 'Prev / next event'],
      ['I O', 'Set loop in / out · U: Clear'],
      ['[ ]', 'Prev / next boss'],
    ],
  },
  {
    title: 'View',
    rows: [
      ['P', 'Player list'],
      ['T', 'Player trails'],
      ['N', 'Name cards'],
      ['J', 'Player stats (when locked)'],
      ['F', 'Fullscreen'],
      ['C', 'Collapse controls'],
    ],
  },
];

export const KeyboardHelpPanel: React.FC<KeyboardHelpPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Collapse
      in={open}
      sx={{
        position: 'absolute',
        // Raised to clear the docked control-bar overlay at the bottom of the canvas.
        bottom: 104,
        right: 16,
        width: 296,
        maxWidth: 'calc(100% - 32px)',
        // Above BossHealthPanel / PlayerListPanel (zIndex 3) and the drawing HUD (6), so the panel
        // is always fully legible while it is open.
        zIndex: 12,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${alpha(primary, 0.28)}`,
          backgroundColor: 'rgba(9, 14, 28, 0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header — title + explicit dismiss, so the panel reads as a real surface (and can be
            closed by pointer, not only by the H key it is documenting). */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.75,
            flexShrink: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.6)',
            borderBottom: `1px solid ${alpha(primary, 0.18)}`,
          }}
        >
          <KeyboardIcon fontSize="small" sx={{ color: primary }} />
          <Typography
            component="span"
            sx={{
              flexGrow: 1,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: theme.palette.text.secondary,
            }}
          >
            Keyboard
          </Typography>
          <IconButton
            aria-label="Hide keyboard controls"
            size="small"
            onClick={onClose}
            sx={{
              p: 0.25,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            overflowY: 'auto',
            // Never grow past the canvas top edge (where the boss bars live): the list scrolls
            // instead. Bounded by the shared arena height minus this panel's bottom offset (104),
            // its header (~34) and a top margin (16) — same ARENA_HEIGHT clamp the player list uses.
            maxHeight: `calc(${ARENA_HEIGHT} - 154px)`,
            px: 1.25,
            py: 1,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(primary, 0.25),
              borderRadius: 3,
            },
          }}
        >
          {SECTIONS.map((section, i) => (
            <Box key={section.title} sx={{ mt: i === 0 ? 0 : 1.25 }}>
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: alpha(primary, 0.85),
                  mb: 0.5,
                }}
              >
                {section.title}
              </Typography>
              {section.rows.map(([keys, label]) => (
                <Box
                  key={keys}
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1,
                    py: 0.2,
                  }}
                >
                  <Box
                    component="kbd"
                    sx={{
                      flexShrink: 0,
                      minWidth: 46,
                      textAlign: 'center',
                      px: 0.6,
                      py: 0.15,
                      borderRadius: '5px',
                      fontFamily: 'inherit',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      lineHeight: 1.5,
                      color: theme.palette.text.primary,
                      backgroundColor: alpha(primary, 0.12),
                      border: `1px solid ${alpha(primary, 0.3)}`,
                    }}
                  >
                    {keys}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      lineHeight: 1.5,
                      color: 'rgba(226, 232, 240, 0.82)',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
          <Typography
            sx={{
              display: 'block',
              mt: 1.25,
              fontSize: '0.66rem',
              color: 'rgba(226, 232, 240, 0.45)',
            }}
          >
            Press H to toggle this help
          </Typography>
        </Box>
      </Box>
    </Collapse>
  );
};
