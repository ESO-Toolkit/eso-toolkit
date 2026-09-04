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
  getActorPositionsByIdAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { REPLAY_Z, overlayPanelSurface } from '../constants/replayDesign';

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
  track: HTMLDivElement | null;
}

function healthColor(theme: Theme, pct: number): string {
  if (pct > 50) return theme.palette.success.main;
  if (pct > 25) return theme.palette.warning.main;
  return theme.palette.error.main;
}

/**
 * Format a boss HP value for the readout. Desktop shows the exact number with grouping commas
 * (e.g. "181,632,304"); mobile abbreviates to compact notation (e.g. "182M") so the full
 * "100.0% · 182M / 182M" readout fits on one line inside the narrow ~210px pill instead of
 * overflowing/clipping the 18px track (the worst case: a 9-digit max at 100% HP).
 */
function fmtHp(n: number, compact: boolean): string {
  const rounded = Math.round(n);
  if (!compact) return rounded.toLocaleString();
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(rounded);
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
    // The playhead value the last write pass ran for. While the replay is PAUSED, `timeRef.current`
    // never changes, so boss health is identical frame-to-frame — re-querying the lookup and
    // re-writing the DOM (a `width`/`backgroundColor`/`textContent` mutation that, with the fill's
    // CSS `transition`, keeps the compositor animating) every rAF was pure waste over the live WebGL
    // canvas. Gate the body on the playhead actually moving. `lastTickTime` is NaN-seeded so the
    // first tick always runs.
    let lastTickTime = NaN;
    // Forces a write pass even when the playhead is static: set on mount and whenever the boss SET
    // changes (newly-mounted bars must receive their initial width/text), cleared once every current
    // boss's bar refs exist and have been written.
    let pendingWrite = true;
    // Per-bar last-written values, so a moving playhead still only touches the DOM for bars whose
    // displayed value actually changed (e.g. a boss already at a steady % between samples).
    const lastWritten = new Map<number, { width: string; color: string; text: string }>();
    // Last aria-valuenow write per boss (1Hz throttle — see the write path below).
    const lastAriaWrite = new Map<number, number>();
    // Reused across ticks (length-reset per tick) so the boss scan allocates nothing per frame.
    const bossScratch: ActorPosition[] = [];

    const tick = (): void => {
      const currentTime = timeRef.current;
      if (currentTime === lastTickTime && !pendingWrite) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastTickTime = currentTime;
      // By-reference record lookup + for-in, NOT getAllActorPositionsAtTimestamp:
      // that helper Object.values-allocates a fresh array every moving rAF — a
      // steady GC drip in the playback hot path. Integer-like keys enumerate in
      // ascending order, so the same MAX_BOSSES bosses are chosen either way.
      const positionsById = getActorPositionsByIdAtClosestTimestamp(lookup, currentTime);

      // Filter to bosses with health (same rule as the old HUD).
      bossScratch.length = 0;
      const bossActors = bossScratch;
      for (const key in positionsById) {
        const actor = positionsById[Number(key)];
        if (!actor) continue;
        if (actor.type === 'boss' && actor.health) {
          bossActors.push(actor);
          if (bossActors.length >= MAX_BOSSES) break;
        }
      }

      // Re-render only when the boss SET changes (id + name). A changed set mounts/unmounts bars, so
      // force the next pass(es) to write through until the new refs exist.
      let sig = '';
      for (const b of bossActors) sig += `${b.id}:${b.name};`;
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setBosses(bossActors.map((b) => ({ id: b.id, name: b.name })));
        pendingWrite = true;
        // Drop the dirty-check cache so every (re)mounted bar is written fresh. Without this, a boss
        // that left the set and later reappears at an identical health % would match its stale cache
        // entry, the write would be skipped, and the freshly-mounted bar would keep its default 100%.
        lastWritten.clear();
      }

      // Write live values straight to the DOM — no React involved. Only touch a node when its value
      // changed since the last write (dirty check), so a paused/steady bar adds zero layout/paint.
      let allRefsPresent = true;
      for (const boss of bossActors) {
        const refs = barRefs.current.get(boss.id);
        // An UNMOUNTED bar leaves a stale {fill:null, readout:null} entry (the callback ref nulls
        // them out), so `refs` can be truthy while its elements are gone. Require the actual nodes —
        // otherwise a reappearing boss would clear pendingWrite without writing, and the freshly
        // mounted bar would keep its default 100% until the playhead moves.
        if (!refs || !refs.fill || !refs.readout) {
          allRefsPresent = false;
          continue;
        }
        if (!boss.health) continue;
        const pct = boss.health.percentage;
        const width = boss.isDead ? '0%' : `${Math.max(0, Math.min(100, pct))}%`;
        const color = healthColor(theme, pct);
        // Mobile keeps it to the percentage only — the exact HP numbers are noise on a phone and
        // make the bar read as cluttered. Desktop shows "pct · cur / max", abbreviating once the
        // numbers are big enough that the exact form ("145,368,051 / 181,632,304") would overflow
        // the 280px pill and spill past the track.
        const compact = isMobile || boss.health.max >= 10_000_000;
        const text = boss.isDead
          ? 'DEAD'
          : isMobile
            ? `${pct.toFixed(1)}%`
            : `${pct.toFixed(1)}%  ·  ${fmtHp(boss.health.current, compact)} / ${fmtHp(boss.health.max, compact)}`;
        const prev = lastWritten.get(boss.id);
        if (!prev || prev.width !== width || prev.color !== color || prev.text !== text) {
          if (refs.fill) {
            refs.fill.style.width = width;
            refs.fill.style.backgroundColor = color;
          }
          if (refs.readout) refs.readout.textContent = text;
          // Screen-reader value: written on first sight, then throttled to 1Hz (the visual
          // bar moves continuously, but an aria-valuenow write on every change would spam AT
          // buffers on fast burns). Death always writes through immediately.
          const nowMs = performance.now();
          const lastAriaAt = lastAriaWrite.get(boss.id);
          if (
            refs.track &&
            (lastAriaAt === undefined || nowMs - lastAriaAt >= 1000 || boss.isDead)
          ) {
            refs.track.setAttribute('aria-valuenow', String(Math.round(pct)));
            lastAriaWrite.set(boss.id, nowMs);
          }
          lastWritten.set(boss.id, { width, color, text });
        }
      }
      // Hold the force flag until every current boss has had its (just-mounted) refs written, so the
      // initial values are never dropped while React is still committing the bars.
      if (allRefsPresent) pendingWrite = false;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `bosses.length` intentionally excluded — the loop manages its own dirty check; we only
    // (re)start it when the data source changes. isMobile is included so the readout formatter
    // flips between exact (desktop) and compact (mobile) if the layout changes underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, timeRef, theme, isMobile]);

  // Stable callback-ref factory per boss id + slot kind.
  const setBarRef = useMemo(() => {
    const cache = new Map<number, (el: HTMLDivElement | null) => void>();
    return (id: number, kind: 'fill' | 'readout' | 'track') => {
      const key = id * 3 + (kind === 'fill' ? 0 : kind === 'readout' ? 1 : 2);
      let cb = cache.get(key);
      if (!cb) {
        cb = (el: HTMLDivElement | null): void => {
          const existing = barRefs.current.get(id) ?? { fill: null, readout: null, track: null };
          if (kind === 'fill') existing.fill = el;
          else if (kind === 'track') existing.track = el;
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
        // Mobile overlay: drop below the top-right Close button. Plain-px offsets (NOT env()) — the
        // overlay container already pads for the safe area, so adding env() here would double-count
        // and push the panel too far inboard. Desktop keeps the original top:16 right:16.
        top: isMobile ? 64 : 16,
        right: isMobile ? 8 : 16,
        width: { xs: 220, sm: 280 },
        // Desktop: on top of the 32px edge-clearance cap, never let this claim more than the arena's
        // right HALF — PlayerListPanel sits top-left at left:16 width:232 (right edge ~248px), and
        // below ~530px of arena width (ARENA_HEIGHT's 420px floor can get there) the two top corners'
        // fixed-px panels would otherwise overlap under the "Following" chip. min() keeps whichever
        // cap is tighter at a given width instead of only ever applying the wider one.
        maxWidth: isMobile ? 'calc(100% - 16px)' : 'min(calc(100% - 32px), calc(50% - 24px))',
        // Mobile: a defensive height cap so a multi-boss stack (up to MAX_BOSSES=4) can't run down
        // into the control cluster / transport in the short landscape viewport. Scrollable (not
        // hidden) so the 3rd/4th pills are reachable instead of silently clipped. The per-pill
        // footprint reduction below is the primary fix; this is the hard safety bound.
        ...(isMobile
          ? {
              maxHeight: 'calc(100vh - 64px - 96px - 44px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }
          : null),
        pointerEvents: 'none',
        // Persistent corner HUD — see REPLAY_Z's module doc for the full rung ordering.
        zIndex: REPLAY_Z.panel,
      }}
    >
      <Stack spacing={isMobile ? 0.75 : 1}>
        {bosses.map((boss) => (
          <Box
            key={boss.id}
            sx={{
              borderRadius: 2,
              px: 1.5,
              // Tighter vertical padding on mobile so a multi-boss stack fits the short viewport.
              py: isMobile ? 0.5 : 1,
              // Shared glass-panel token. `solid: isMobile` mirrors the old ternary's intent
              // exactly: mobile drops the backdrop blur (the dark drop-shadow halo that read as
              // "darkness around the frame", and a costly full-screen blur) but keeps the element
              // on its own GPU compositing layer via `translateZ(0)` (baked into the `solid`
              // variant) — this pill's fill mutates `width`/`backgroundColor` every frame (rAF
              // loop below), and without a layer those per-frame paints recomposite the
              // translucent pill against the live WebGL canvas underneath, which is what tanked
              // the iOS frame rate. Desktop gets the same layer for free from its backdrop-filter,
              // which is why it stayed smooth. Also fixes the light-mode bug: the old fixed
              // `rgba(15,23,42,…)` / `rgba(12,18,32,…)` navy literals never read the theme, so
              // this pill stayed dark even in light mode.
              ...overlayPanelSurface(theme, { solid: isMobile }),
              // willChange is a mobile-only perf hint (the frequently-mutated transform), not part
              // of the shared token — kept as an explicit addition rather than folded in.
              ...(isMobile ? { willChange: 'transform' } : null),
            }}
          >
            <Typography
              noWrap
              sx={{
                fontFamily: '"Space Grotesk Variable", Inter Variable, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: isMobile ? '0.8rem' : { xs: '0.9rem', sm: '1rem' },
                lineHeight: 1.2,
                color: theme.palette.text.primary,
                mb: isMobile ? 0.25 : 0.75,
              }}
            >
              {boss.name}
            </Typography>

            {/* Track — keep 16px on mobile (not 14) so the nowrap compact readout never vertically clips. */}
            <Box
              ref={setBarRef(boss.id, 'track')}
              role="progressbar"
              aria-label={`${boss.name} health`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100}
              sx={{
                position: 'relative',
                height: isMobile ? 16 : 18,
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
                  // Never wrap — the readout is a single line; wrapping would clip it in the short track.
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  // Symmetric halo on ALL viewports (not just mobile): white 0.7rem over bright
                  // green/orange fills fails contrast without it. A 0-blur surround on every glyph
                  // keeps the readout legible regardless of fill — cheap (one text-shadow).
                  textShadow: '0 0 3px rgba(2,6,23,0.95), 0 1px 2px rgba(2,6,23,0.95)',
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
