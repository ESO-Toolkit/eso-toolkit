/**
 * Boss health panel — DOM overlay (replaces the in-canvas BossHealthHUD)
 *
 * Renders up to four boss health bars as a real MUI surface absolutely positioned over the
 * top-right of the arena canvas. Crisp text at any DPI and styling that matches the rest of
 * the page (the old version painted a canvas-2D texture onto a 3D plane, which read soft and
 * dated once magnified).
 *
 * PERF CONTRACT (mirrors the old HUD's per-frame discipline, now in the DOM world):
 *   - Boss health changes every playback frame, but `currentTime` in React is throttled to
 *     ~2Hz on purpose (useAnimationTimeRef updateInterval) so it never re-reconciles Arena3D.
 *     Driving these bars from React state would therefore make the focal % readout visibly
 *     choppy. So we run our OWN requestAnimationFrame loop that reads the high-frequency
 *     `timeRef.current` + `lookup` and writes straight to DOM refs (bar width, % text). React
 *     only re-renders when the SET of bosses changes (a boss appears/dies) — rare and cheap.
 *   - No allocation in the rAF tick beyond the actor array the lookup already returns.
 */

import { Box, Stack, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ActorPosition,
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';

interface BossHealthPanelProps {
  lookup: TimestampPositionLookup | null;
  timeRef: React.RefObject<number> | { current: number };
  /**
   * True inside the mobile pseudo-fullscreen overlay. The panel then drops below the overlay's
   * top-right Close button (which shares the top-right corner) and respects the top/right safe-area
   * insets, instead of sitting at the desktop top:16 right:16 where it would collide with Close.
   */
  isMobile?: boolean;
}

const MAX_BOSSES = 4;

/** Identity of the boss set, so React only re-renders when bosses appear/die — not per frame. */
interface BossSlot {
  id: number;
  name: string;
}

/** Per-bar imperative handles written by the rAF loop (no React re-render). */
interface BarRefs {
  fill: HTMLDivElement | null;
  readout: HTMLSpanElement | null;
}

function healthColor(theme: Theme, pct: number): string {
  if (pct > 50) return theme.palette.success.main;
  if (pct > 25) return theme.palette.warning.main;
  return theme.palette.error.main;
}

export const BossHealthPanel: React.FC<BossHealthPanelProps> = ({
  lookup,
  timeRef,
  isMobile = false,
}) => {
  const theme = useTheme();

  // The boss SET (identity + names). Only changes when a boss appears or dies, so this drives
  // React renders; the per-frame health values never touch React.
  const [bosses, setBosses] = useState<BossSlot[]>([]);

  // Imperative handles into each bar's fill + readout, keyed by boss id.
  const barRefs = useRef<Map<number, BarRefs>>(new Map());

  // Track the last-seen boss-set signature so we only setState on an actual change.
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    if (!lookup) {
      if (bosses.length > 0) setBosses([]);
      return;
    }

    let raf = 0;

    const tick = (): void => {
      const currentTime = timeRef.current;
      const allActors = getAllActorPositionsAtTimestamp(lookup, currentTime);

      // Filter to bosses with health (same rule as the old HUD).
      const bossActors: ActorPosition[] = [];
      for (const actor of allActors) {
        if (actor.type === 'boss' && actor.health) {
          bossActors.push(actor);
          if (bossActors.length >= MAX_BOSSES) break;
        }
      }

      // Re-render only when the boss SET changes (id + name).
      let sig = '';
      for (const b of bossActors) sig += `${b.id}:${b.name};`;
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setBosses(bossActors.map((b) => ({ id: b.id, name: b.name })));
      }

      // Write live values straight to the DOM — no React involved.
      for (const boss of bossActors) {
        const refs = barRefs.current.get(boss.id);
        if (!refs || !boss.health) continue;
        const pct = boss.health.percentage;
        if (refs.fill) {
          refs.fill.style.width = boss.isDead ? '0%' : `${Math.max(0, Math.min(100, pct))}%`;
          refs.fill.style.backgroundColor = healthColor(theme, pct);
        }
        if (refs.readout) {
          refs.readout.textContent = boss.isDead
            ? 'DEAD'
            : `${pct.toFixed(1)}%  ·  ${Math.round(boss.health.current).toLocaleString()} / ${Math.round(boss.health.max).toLocaleString()}`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `bosses.length` intentionally excluded — the loop manages its own dirty check; we only
    // (re)start it when the data source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, timeRef, theme]);

  // Stable callback-ref factory per boss id.
  const setBarRef = useMemo(() => {
    const cache = new Map<number, (el: HTMLDivElement | null) => void>();
    return (id: number, kind: 'fill' | 'readout') => {
      const key = id * 2 + (kind === 'fill' ? 0 : 1);
      let cb = cache.get(key);
      if (!cb) {
        cb = (el: HTMLDivElement | null): void => {
          const existing = barRefs.current.get(id) ?? { fill: null, readout: null };
          if (kind === 'fill') existing.fill = el;
          else existing.readout = el as unknown as HTMLSpanElement;
          barRefs.current.set(id, existing);
        };
        cache.set(key, cb);
      }
      return cb;
    };
  }, []);

  if (bosses.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        // Mobile overlay: drop below the top-right Close button and honor the safe-area insets so the
        // panel never sits under the notch or behind Close. Desktop keeps the original top:16 right:16.
        top: isMobile ? 'calc(env(safe-area-inset-top) + 64px)' : 16,
        right: isMobile ? 'calc(env(safe-area-inset-right) + 8px)' : 16,
        width: { xs: 220, sm: 280 },
        maxWidth: isMobile ? 'calc(100% - 16px)' : 'calc(100% - 32px)',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <Stack spacing={1}>
        {bosses.map((boss) => (
          <Box
            key={boss.id}
            sx={{
              borderRadius: 2,
              px: 1.5,
              py: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.82)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.primary.main}29`,
              boxShadow: '0 8px 26px rgba(0,0,0,0.5)',
            }}
          >
            <Typography
              noWrap
              sx={{
                fontFamily: '"Space Grotesk", Inter, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                lineHeight: 1.2,
                color: theme.palette.text.primary,
                mb: 0.75,
              }}
            >
              {boss.name}
            </Typography>

            {/* Track */}
            <Box
              sx={{
                position: 'relative',
                height: 18,
                borderRadius: '999px',
                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                border: `1px solid ${theme.palette.primary.main}29`,
                overflow: 'hidden',
              }}
            >
              {/* Fill — width + color written imperatively by the rAF loop */}
              <Box
                ref={setBarRef(boss.id, 'fill')}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  right: 'auto',
                  width: '100%',
                  borderRadius: '999px',
                  backgroundColor: theme.palette.success.main,
                  transition: 'width 0.12s linear',
                }}
              />
              {/* Readout overlaid on the bar */}
              <Typography
                component="span"
                ref={setBarRef(boss.id, 'readout')}
                className="u-tabular"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  textShadow: '0 1px 2px rgba(2,6,23,0.9)',
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
