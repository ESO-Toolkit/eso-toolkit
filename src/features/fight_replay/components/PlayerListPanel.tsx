/**
 * Player list panel — DOM overlay (replaces the in-canvas PlayerListHUD)
 *
 * Renders the per-player controls (color swatch, name, live health, visibility toggle, path
 * toggle) as a real MUI surface absolutely positioned over the top-left of the arena. This
 * fixes three problems the canvas-texture version had:
 *   1. CRISP — DOM text is sharp at any DPI (the canvas-on-a-plane was inherently soft).
 *   2. NO CLIPPING — the list is a real scroll region capped to the arena height, so every
 *      player is reachable. The old canvas was hard-sized for 12 rows and silently clipped
 *      the rest (the reported "can't see the bottom players" bug).
 *   3. NATIVE STYLING — matches the page's glass/cyan design language via the live theme.
 *
 * PERF CONTRACT: health changes every frame, but React `currentTime` is throttled to ~2Hz so
 * it never re-reconciles Arena3D. So an isolated requestAnimationFrame loop reads the
 * high-frequency `timeRef.current` + `lookup` and writes health bar widths straight to DOM
 * refs — zero React re-render per frame. React only re-renders on user toggles (collapse,
 * visibility, path selection), which are rare. This panel is a leaf sibling of <Canvas>, so
 * its own re-renders never touch the 3D scene tree.
 */

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Box,
  Collapse,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { ARENA_HEIGHT, TRANSPORT_RESERVED } from '../constants/replayDesign';
import { getReplayActorResolvedAccentColor } from '../utils/actorVisualState';
import { getPlayerInfo } from '../utils/pathUtils';
import { PLAYER_PATH_COLORS } from '../utils/playerColors';

// Distinct palette offered in the per-player color picker. The role colors live at the top so the
// common "recolor a player to a role hue" case is one click; the rest are the visually distinct
// extras already used for player paths, so a player's body color can match its trail.
const COLOR_PICKER_SWATCHES: string[] = [
  PLAYER_PATH_COLORS.tank,
  PLAYER_PATH_COLORS.healer,
  PLAYER_PATH_COLORS.dps,
  PLAYER_PATH_COLORS.red,
  PLAYER_PATH_COLORS.green,
  PLAYER_PATH_COLORS.cyan,
  PLAYER_PATH_COLORS.yellow,
  PLAYER_PATH_COLORS.pink,
  PLAYER_PATH_COLORS.lime,
  PLAYER_PATH_COLORS.indigo,
  PLAYER_PATH_COLORS.teal,
  PLAYER_PATH_COLORS.coral,
  PLAYER_PATH_COLORS.emerald,
  PLAYER_PATH_COLORS.violet,
  PLAYER_PATH_COLORS.amber,
];

interface PlayerListPanelProps {
  /** Player actor IDs to list (derived from the position lookup). */
  playerIds: number[];
  /** Position lookup for live health + names. */
  lookup: TimestampPositionLookup | null;
  /** High-frequency current-time ref (read in the rAF loop). */
  timeRef: React.RefObject<number> | { current: number };
  /** Selected players (paths drawn). */
  selectedPlayerIds: Set<number>;
  onPlayerSelectionChange: (ids: Set<number>) => void;
  /** Per-player visibility of the 3D actor model. */
  playerVisibility: Map<number, boolean>;
  onPlayerVisibilityChange: (actorId: number, visible: boolean) => void;
  /** Per-player body-color overrides (actorId → hex). */
  playerColorOverrides: Map<number, string>;
  /** Set (hex) or clear (null → back to role color) a player's body color. */
  onPlayerColorChange: (actorId: number, color: string | null) => void;
  /**
   * Vertical band (px) reserved at the bottom for the docked transport bar, subtracted from the
   * panel's height caps so a long roster stops ABOVE the bar instead of plunging into it. Defaults
   * to the full bar height (TRANSPORT_RESERVED); callers pass a smaller value when the bar is
   * hidden (fullscreen cinema mode) so the panel reclaims that space.
   */
  reservedInset?: number;
  /**
   * True inside the mobile pseudo-fullscreen overlay. The panel then honors the top/left safe-area
   * insets and reserves extra bottom space for the touch control cluster (which docks above the
   * transport), so a long roster's scroll region stops above the cluster instead of behind it.
   */
  isMobile?: boolean;
  /** Dismiss the panel (mobile bottom sheet gets an explicit close button wired to this). */
  onClose?: () => void;
}

interface PlayerRowInfo {
  id: number;
  name: string;
  /** The role accent (figure's default color when no override is set). */
  roleColor: string;
}

interface RowHealthRefs {
  fill: HTMLDivElement | null;
}

function healthColor(theme: Theme, pct: number): string {
  if (pct < 25) return theme.palette.error.main;
  if (pct < 50) return theme.palette.warning.main;
  return theme.palette.success.main;
}

export const PlayerListPanel: React.FC<PlayerListPanelProps> = ({
  playerIds,
  lookup,
  timeRef,
  selectedPlayerIds,
  onPlayerSelectionChange,
  playerVisibility,
  onPlayerVisibilityChange,
  playerColorOverrides,
  onPlayerColorChange,
  reservedInset = TRANSPORT_RESERVED,
  isMobile = false,
  onClose,
}) => {
  // On mobile the touch control cluster docks above the transport, so the panel must stop higher.
  // Fold that extra band into the reserve used by the height caps below (desktop unchanged).
  const MOBILE_CLUSTER_BAND = 72;
  const effectiveReserved = isMobile ? reservedInset + MOBILE_CLUSTER_BAND : reservedInset;
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // The player whose color picker is open, plus its anchor element for the popover.
  const [colorPicker, setColorPicker] = useState<{ id: number; anchorEl: HTMLElement } | null>(
    null,
  );

  // Resolve names + role colors once per player-set change (both are stable for the fight). The
  // role color is the figure's DEFAULT body color; an override (read live below) wins when set.
  const players = useMemo<PlayerRowInfo[]>(() => {
    if (!lookup) return [];
    return playerIds.map((id) => {
      const info = getPlayerInfo(lookup, id);
      return {
        id,
        name: info?.name || `Player ${id}`,
        roleColor: getReplayActorResolvedAccentColor({
          type: 'player',
          role: info?.role,
          isDead: false,
        }),
      };
    });
  }, [playerIds, lookup]);

  // Imperative handles into each row's health-bar fill.
  const healthRefs = useRef<Map<number, RowHealthRefs>>(new Map());

  // Isolated rAF loop: live health straight to the DOM, no React re-render per frame.
  useEffect(() => {
    if (!lookup) return;
    let raf = 0;
    const tick = (): void => {
      const currentTime = timeRef.current;
      for (const player of players) {
        const refs = healthRefs.current.get(player.id);
        if (!refs?.fill) continue;
        const pos = getActorPositionAtClosestTimestamp(lookup, player.id, currentTime);
        const pct = pos?.health ? Math.max(0, Math.min(100, pos.health.percentage)) : 0;
        refs.fill.style.width = `${pct}%`;
        refs.fill.style.backgroundColor = healthColor(theme, pct);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lookup, timeRef, players, theme]);

  const setHealthRef = useMemo(() => {
    const cache = new Map<number, (el: HTMLDivElement | null) => void>();
    return (id: number) => {
      let cb = cache.get(id);
      if (!cb) {
        cb = (el: HTMLDivElement | null): void => {
          healthRefs.current.set(id, { fill: el });
        };
        cache.set(id, cb);
      }
      return cb;
    };
  }, []);

  const togglePath = useCallback(
    (id: number) => {
      const next = new Set(selectedPlayerIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onPlayerSelectionChange(next);
    },
    [selectedPlayerIds, onPlayerSelectionChange],
  );

  if (players.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        // Mobile = a bottom sheet (full-width, docked just above the transport) so it stops fighting
        // the top-left chrome and reads as one clean surface. Desktop keeps the top-left panel.
        // Plain px (NOT env()) on mobile — the overlay container already pads for the safe area.
        ...(isMobile
          ? {
              left: 8,
              right: 8,
              bottom: reservedInset + 8,
              maxHeight: '46vh',
              borderRadius: 3,
            }
          : {
              top: 16,
              left: 16,
              width: 232,
              maxWidth: 'calc(100% - 32px)',
              // Cap to the arena viewport minus the top margin + reserved transport band so the
              // scroll region — not the page — absorbs overflow and the panel stops above the bar.
              maxHeight: `calc(100% - ${16 + effectiveReserved}px)`,
              borderRadius: 2,
            }),
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.primary.main}29`,
        boxShadow: '0 8px 26px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      {/* Header — a collapse toggle on desktop; on the mobile bottom sheet it's a static title with a
          dedicated close button (the toggle that opened it is hidden behind the sheet). */}
      {isMobile ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 1.5,
            py: 1,
            backgroundColor: 'rgba(2, 6, 23, 0.6)',
            color: theme.palette.text.secondary,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Players
            <Box component="span" sx={{ ml: 0.75, opacity: 0.6, fontWeight: 500 }}>
              {players.length}
            </Box>
          </Typography>
          {onClose && (
            <IconButton
              aria-label="Close player list"
              size="small"
              onClick={onClose}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ) : (
        <Box
          component="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            width: '100%',
            px: 1.25,
            py: 0.75,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'rgba(2, 6, 23, 0.6)',
            color: theme.palette.text.secondary,
            '&:hover': { color: theme.palette.text.primary },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Players
            <Box component="span" sx={{ ml: 0.75, opacity: 0.6, fontWeight: 500 }}>
              {players.length}
            </Box>
          </Typography>
          {collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </Box>
      )}

      <Collapse in={!collapsed} sx={{ minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            overflowY: 'auto',
            // Cap the scroll region to the arena viewport (ARENA_HEIGHT — shared so this
            // tracks the arena exactly) minus the panel's top margin (16px) + header (~30px)
            // + a little breathing room, AND the reserved transport band so the roster never
            // plunges into the bar. This inner cap (pinned to raw ARENA_HEIGHT) is the real
            // overrun — the outer % cap alone doesn't bound it. The core fix vs. the old
            // fixed-height canvas that silently clipped players past row 12.
            // On mobile the panel lives in a full-viewport overlay (not the ARENA_HEIGHT clamp), so
            // cap the inner scroll region to viewport height there; desktop keeps the arena clamp.
            maxHeight: isMobile
              ? // Bottom sheet: fit the scroll region inside the 46vh sheet, minus its header.
                'calc(46vh - 48px)'
              : `calc(${ARENA_HEIGHT} - 56px - ${reservedInset}px)`,
            // Slim, theme-tinted scrollbar.
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: `${theme.palette.primary.main}40`,
              borderRadius: 3,
            },
          }}
        >
          <Stack sx={{ py: 0.5 }}>
            {players.map((player) => {
              const isSelected = selectedPlayerIds.has(player.id);
              const isVisible = playerVisibility.get(player.id) ?? true;
              const override = playerColorOverrides.get(player.id);
              const bodyColor = override ?? player.roleColor;
              const hasOverride = override !== undefined;
              return (
                <Box
                  key={player.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    position: 'relative',
                    '&:hover': { backgroundColor: 'rgba(148, 210, 255, 0.06)' },
                    ...(isSelected && {
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 4,
                        bottom: 4,
                        width: 2.5,
                        borderRadius: 2,
                        backgroundColor: theme.palette.primary.main,
                      },
                    }),
                  }}
                >
                  {/* Color swatch — click to recolor this player's figure. Previews the actual
                      body color (override if set, else role color), with a ring when overridden. */}
                  <Tooltip title="Change figure color">
                    <Box
                      component="button"
                      aria-label={`Change ${player.name} figure color`}
                      onClick={(e) => setColorPicker({ id: player.id, anchorEl: e.currentTarget })}
                      sx={{
                        flexShrink: 0,
                        width: 13,
                        height: 13,
                        p: 0,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        backgroundColor: bodyColor,
                        border: hasOverride
                          ? `1.5px solid ${theme.palette.common.white}`
                          : '1px solid rgba(255,255,255,0.25)',
                        boxShadow: hasOverride ? `0 0 0 1px ${bodyColor}` : 'none',
                        '&:hover': { transform: 'scale(1.15)' },
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: 1,
                        },
                        transition: 'transform 0.1s ease',
                      }}
                    />
                  </Tooltip>

                  {/* Name + health */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        lineHeight: 1.3,
                        color: isVisible ? theme.palette.text.primary : theme.palette.text.disabled,
                      }}
                    >
                      {player.name}
                    </Typography>
                    {/* Health track */}
                    <Box
                      sx={{
                        mt: 0.25,
                        height: 4,
                        borderRadius: '999px',
                        backgroundColor: 'rgba(2, 6, 23, 0.85)',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        ref={setHealthRef(player.id)}
                        sx={{
                          height: '100%',
                          width: '100%',
                          borderRadius: '999px',
                          backgroundColor: theme.palette.success.main,
                          transition: 'width 0.12s linear',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Visibility toggle */}
                  <Tooltip title={isVisible ? 'Hide actor' : 'Show actor'}>
                    <IconButton
                      size="small"
                      aria-label={isVisible ? `Hide ${player.name}` : `Show ${player.name}`}
                      onClick={() => onPlayerVisibilityChange(player.id, !isVisible)}
                      sx={{
                        p: 0.25,
                        color: isVisible ? theme.palette.primary.main : theme.palette.text.disabled,
                      }}
                    >
                      {isVisible ? (
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <VisibilityOffIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>

                  {/* Path toggle */}
                  <Tooltip title={isSelected ? 'Hide path' : 'Show path'}>
                    <IconButton
                      size="small"
                      aria-label={
                        isSelected ? `Hide ${player.name} path` : `Show ${player.name} path`
                      }
                      aria-pressed={isSelected}
                      onClick={() => togglePath(player.id)}
                      sx={{
                        p: 0.25,
                        color: isSelected
                          ? theme.palette.primary.main
                          : theme.palette.text.disabled,
                      }}
                    >
                      <TimelineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Collapse>

      {/* Per-player color picker. A palette grid plus a "reset to role color" action. Selecting a
          swatch sets the override; reset clears it (figure returns to its role color). */}
      <Popover
        open={colorPicker !== null}
        anchorEl={colorPicker?.anchorEl ?? null}
        onClose={() => setColorPicker(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.primary.main}40`,
              borderRadius: 1.5,
            },
          },
        }}
      >
        {colorPicker && (
          <Box sx={{ width: 132 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 0.5,
                mb: 0.75,
              }}
            >
              {COLOR_PICKER_SWATCHES.map((swatch) => {
                const active = playerColorOverrides.get(colorPicker.id) === swatch;
                return (
                  <Box
                    key={swatch}
                    component="button"
                    aria-label={`Set color ${swatch}`}
                    onClick={() => {
                      onPlayerColorChange(colorPicker.id, swatch);
                      setColorPicker(null);
                    }}
                    sx={{
                      width: 20,
                      height: 20,
                      p: 0,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: swatch,
                      border: active
                        ? `2px solid ${theme.palette.common.white}`
                        : '1px solid rgba(255,255,255,0.2)',
                      '&:hover': { transform: 'scale(1.12)' },
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 1,
                      },
                      transition: 'transform 0.1s ease',
                    }}
                  />
                );
              })}
            </Box>
            <Box
              component="button"
              onClick={() => {
                onPlayerColorChange(colorPicker.id, null);
                setColorPicker(null);
              }}
              sx={{
                width: '100%',
                py: 0.5,
                border: 'none',
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: 'rgba(148, 210, 255, 0.08)',
                color: theme.palette.text.secondary,
                fontSize: '0.7rem',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: 'rgba(148, 210, 255, 0.16)',
                  color: theme.palette.text.primary,
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              }}
            >
              Reset to role color
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
};
