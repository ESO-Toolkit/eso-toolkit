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

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Collapse, IconButton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { ARENA_HEIGHT } from '../constants/replayDesign';
import { getPlayerInfo } from '../utils/pathUtils';
import { getPlayerPathColor } from '../utils/playerColors';

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
}

interface PlayerRowInfo {
  id: number;
  name: string;
  color: string;
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
}) => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // Resolve names + colors once per player-set change (names are stable for the fight).
  const players = useMemo<PlayerRowInfo[]>(() => {
    if (!lookup) return [];
    return playerIds.map((id) => {
      const info = getPlayerInfo(lookup, id);
      return {
        id,
        name: info?.name || `Player ${id}`,
        color: getPlayerPathColor(id),
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
        top: 16,
        left: 16,
        width: 232,
        maxWidth: 'calc(100% - 32px)',
        // Cap to the arena viewport so the scroll region — not the page — absorbs overflow.
        maxHeight: 'calc(100% - 32px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.primary.main}29`,
        boxShadow: '0 8px 26px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      {/* Header */}
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

      <Collapse in={!collapsed} sx={{ minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            overflowY: 'auto',
            // Cap the scroll region to the arena viewport (ARENA_HEIGHT — shared so this
            // tracks the arena exactly) minus the panel's top margin (16px) + header (~30px)
            // + a little breathing room. So a long roster scrolls WITHIN the panel and never
            // overruns the arena — the core fix vs. the old fixed-height canvas that silently
            // clipped players past row 12.
            maxHeight: `calc(${ARENA_HEIGHT} - 56px)`,
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
                  {/* Color swatch */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 11,
                      height: 11,
                      borderRadius: '3px',
                      backgroundColor: player.color,
                    }}
                  />

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
    </Box>
  );
};
