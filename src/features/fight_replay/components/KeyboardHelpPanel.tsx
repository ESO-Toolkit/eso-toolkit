/**
 * Keyboard help panel — desktop-only DOM overlay (bottom-right of the arena)
 *
 * Documents the physical-key shortcuts (camera / playback / view). Extracted out of Arena3D so
 * the shortcut table lives in one place and the panel can own its own layout rules:
 *
 *   - LAYERING: it renders ABOVE the top-right BossHealthPanel (REPLAY_Z.panel) instead of
 *     underneath it. The old bare `rgba(0,0,0,0.85)` box had no zIndex, so on short canvases the
 *     boss bars painted straight through the help text. Now sits at REPLAY_Z.help, the top rung —
 *     see that ladder's module doc in replayDesign.ts for why help outranks everything else.
 *   - HEIGHT: capped to the canvas with its own scroll region, so a tall shortcut list can never
 *     run past the top edge into the boss bars in the first place.
 *   - The surface uses the shared `overlayPanelSurface` token (cyan-glass panel, kbd key chips)
 *     rather than a flat black rectangle of text lines, and reads the live theme so it renders as
 *     a real light-glass panel in light mode instead of staying a fixed dark box.
 */

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardIcon from '@mui/icons-material/KeyboardOutlined';
import { Box, Collapse, IconButton, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { ARENA_HEIGHT, REPLAY_Z, overlayPanelSurface } from '../constants/replayDesign';
import { REPLAY_SHORTCUTS, type ReplayShortcutGroup } from '../constants/replayShortcuts';

/**
 * Shared size for every uppercase, letter-spaced label in this panel (the "Keyboard" header pill
 * and the Camera/Playback/View section titles). These previously drifted to 0.7rem and 0.62rem
 * respectively for no reason other than having been written at different times — one scale reads
 * as one deliberate system instead of two arbitrary ones. 0.66rem was picked because it's already
 * the size the kbd-chip labels below use, so converging onto it also means this panel now has
 * exactly ONE small-label size instead of three.
 */
const LABEL_FONT_SIZE = '0.66rem';

interface KeyboardHelpPanelProps {
  /** Whether the panel is shown (auto-opens for a few seconds on mount; H toggles it). */
  open: boolean;
  /** Dismiss the panel (header close button). */
  onClose: () => void;
}

// Display order for the three sections. The registry's rows are already grouped/ordered to match
// (see replayShortcuts.ts's module doc), so this is only the section ORDER, not the row content.
const GROUP_ORDER: readonly ReplayShortcutGroup[] = ['Camera', 'Playback', 'View'];

/**
 * Shortcut table, grouped by the surface each group drives — derived from the shared
 * `REPLAY_SHORTCUTS` registry (constants/replayShortcuts.ts) instead of a private copy. That
 * registry is now the ONLY place the key → description text is written down; this panel, the
 * physical `useReplayShortcuts` listeners, and this derivation all read from it, so a shortcut
 * can't drift out of sync with what's documented here the way the old three-listener/one-table
 * split allowed. The row content below is byte-identical to the table this replaced — see
 * `KeyboardHelpPanel.test.tsx`'s consistency assertion.
 */
const SECTIONS: ReadonlyArray<{
  title: ReplayShortcutGroup;
  rows: ReadonlyArray<readonly [string, string]>;
}> = GROUP_ORDER.map((title) => ({
  title,
  rows: REPLAY_SHORTCUTS.filter((s) => s.group === title).map(
    (s) => [s.keys, s.description] as const,
  ),
}));

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
        // Above BossHealthPanel / PlayerListPanel (REPLAY_Z.panel) and the drawing HUD
        // (REPLAY_Z.hud), so the panel is always fully legible while it is open — see the
        // REPLAY_Z module doc for why `help` deliberately outranks every other rung.
        zIndex: REPLAY_Z.help,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          // Shared glass-panel chrome (fill/border/blur/shadow) — reads the live theme so this
          // panel is a real light-glass surface in light mode instead of the old fixed
          // `rgba(9,14,28,0.94)` navy box staying dark regardless of palette mode.
          ...overlayPanelSurface(theme),
        }}
      >
        {/* Header — title + explicit dismiss, so the panel reads as a real surface (and can be
            closed by pointer, not only by the H key it is documenting). Its wash is a themed
            tint of the same `background.default` the panel body derives from (not an independent
            fixed navy), so the header strip stays coherent with the body in both palette modes. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.75,
            flexShrink: 0,
            backgroundColor: alpha(theme.palette.background.default, 0.6),
            borderBottom: `1px solid ${alpha(primary, 0.18)}`,
          }}
        >
          <KeyboardIcon fontSize="small" sx={{ color: primary }} />
          <Typography
            component="span"
            sx={{
              flexGrow: 1,
              fontSize: LABEL_FONT_SIZE,
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
                  fontSize: LABEL_FONT_SIZE,
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
                  {/* This key chip has no shared token to move onto — `overlayPillSurface` is a
                      fixed-tint floating badge (a chip OVER the scene), while this is a small
                      inline glyph INSIDE an already-glass panel, so it stays hand-rolled. It
                      shares LABEL_FONT_SIZE with the section titles above so it no longer reads
                      as an unrelated one-off size next to them. */}
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
                      fontSize: LABEL_FONT_SIZE,
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
