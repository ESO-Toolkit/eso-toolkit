/**
 * Locked-player stats panel — DOM overlay shown when the replay camera is locked onto a player.
 *
 * When the user follows an actor (the "Following: <name>" lock), this surfaces a compact,
 * role-tinted readout of that player's combat performance UP TO THE PLAYHEAD: scrub to 30s and you
 * see the player's DPS/HPS/damage-taken as of 30s, not the whole-fight total. DPS for damage roles,
 * HPS/overheal for healers, and measured damage-taken + survivability for tanks.
 *
 * It REUSES the proven fight-insights semantics rather than re-deriving them — damage/crit filter
 * mirrors usePlayerCardData.damageStats, healing mirrors HealingDonePanel — but feeds them through a
 * prefix-sum engine (lockedPlayerStats.ts) so an up-to-playhead query is O(log n) per frame.
 *
 * PERF CONTRACT (mirrors BossHealthPanel's per-frame discipline):
 *   - The replay throttles `currentTime` React state to ~2Hz so it never re-reconciles Arena3D.
 *     Driving these numbers from React state would make them choppy AND risk per-tick renders. So
 *     the scalar values run on their OWN requestAnimationFrame loop that reads the high-frequency
 *     `timeRef.current` and writes straight to DOM refs (textContent) — zero React render per frame.
 *   - The heavy work (filter + sort + prefix-sum) happens ONCE on lock, inside an inner component
 *     that only mounts while an actor is followed (mirroring PlayerCardModal's mount-on-select), so
 *     it costs nothing during normal playback when nobody is locked.
 *   - This panel is a React.memo'd leaf that owns its own state — its internal renders structurally
 *     cannot re-render Arena3D. Every per-frame value stays inside this leaf.
 *
 * SCOPE (this commit): live up-to-playhead SCALARS (DPS/HPS/damage-taken/crit/overheal/deaths).
 * Tank modeled resistance-DR %, buff/debuff uptime, and the per-ability breakdown layer on next.
 */

import { Box, Typography, useTheme, alpha } from '@mui/material';
import React, { useEffect, useMemo, useRef } from 'react';

import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import {
  type TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { getReplayActorResolvedAccentColor } from '../utils/actorVisualState';
import {
  type LiveLockedStats,
  buildLockedStatsIndex,
  queryLiveLockedStats,
} from '../utils/lockedPlayerStats';
import { getPlayerInfo } from '../utils/pathUtils';

type Role = 'tank' | 'healer' | 'dps';

interface LockedPlayerStatsPanelProps {
  /** The currently-followed actor id, or null when not following. */
  followingActorId: number | null;
  /** Position lookup — resolves the actor's name/role/type and is the shared id-space with playersById. */
  lookup: TimestampPositionLookup | null;
  /** High-frequency playhead time (ms into the fight). Read every rAF tick. */
  timeRef: React.RefObject<number> | { current: number };
  /** Absolute fight start timestamp — added to the playhead to get the event-space cutoff. */
  fightStartTime: number;
  /** Fight duration in ms (currently informational; rates use the elapsed playhead). */
  fightDurationMs: number;
}

/** Compact, abbreviated number: 1.23M / 45.6K / 678. */
const fmtNum = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
};

const fmtPct = (n: number): string => (Number.isFinite(n) ? `${n.toFixed(1)}%` : '—');

/** Which LiveLockedStats fields each role's three hero slots read, and how to format them. */
interface StatSlot {
  label: string;
  /** Pull the raw number out of the live stats. */
  pick: (s: LiveLockedStats) => number;
  /** Format it for display. */
  fmt: (n: number) => string;
  /** Whether this slot gets the role accent color (the headline stat). */
  accented?: boolean;
}

const ROLE_SLOTS: Record<Role, StatSlot[]> = {
  dps: [
    { label: 'DPS', pick: (s) => s.dps, fmt: fmtNum, accented: true },
    { label: 'Damage', pick: (s) => s.totalDamage, fmt: fmtNum },
    { label: 'Crit', pick: (s) => s.critChance, fmt: fmtPct },
  ],
  healer: [
    { label: 'HPS', pick: (s) => s.hps, fmt: fmtNum, accented: true },
    { label: 'Healing', pick: (s) => s.effectiveHealing, fmt: fmtNum },
    { label: 'Overheal', pick: (s) => s.overhealPct, fmt: fmtPct },
  ],
  tank: [
    { label: 'Dmg Taken', pick: (s) => s.damageTaken, fmt: fmtNum, accented: true },
    { label: 'Deaths', pick: (s) => s.deaths, fmt: (n) => `${n}` },
    { label: 'Dmg Done', pick: (s) => s.totalDamage, fmt: fmtNum },
  ],
};

/**
 * Inner content — mounts ONLY while an actor is locked. Builds the prefix-sum index once (keyed on
 * playerId, so locking A→B rebuilds), then runs a rAF loop writing live values to DOM refs. No
 * React render happens per frame.
 */
const PlayerStatsContent: React.FC<{
  playerId: number;
  role: Role;
  fightStartTime: number;
  accent: string;
  timeRef: React.RefObject<number> | { current: number };
}> = ({ playerId, role, fightStartTime, accent, timeRef }) => {
  const { healingEvents } = useHealingEvents();
  const { damageEvents } = useDamageEvents();
  const { deathEvents } = useDeathEvents();

  // Built once per (player, event-set). Rebuilds when locking onto a different player or when the
  // event arrays finish loading (lock-before-load → indexes fill in and the rAF loop picks them up).
  const index = useMemo(
    () => buildLockedStatsIndex(playerId, damageEvents, healingEvents, deathEvents),
    [playerId, damageEvents, healingEvents, deathEvents],
  );

  const slots = ROLE_SLOTS[role];

  // One DOM ref per hero-stat value node; the rAF loop writes textContent here.
  const valueRefs = useRef<Array<HTMLSpanElement | null>>([]);

  // Dev-only render counter — used to confirm this leaf does NOT re-render per frame while scrubbing
  // (it should only render on lock/role change). Exposed on window for the Chrome-MCP perf check.
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as { __lockedStatsRenders?: number }).__lockedStatsRenders =
      renderCountRef.current;
  }

  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const playheadMs = timeRef.current ?? 0;
      const cutoff = fightStartTime + playheadMs;
      const elapsedSeconds = playheadMs / 1000;
      const stats = queryLiveLockedStats(index, cutoff, elapsedSeconds);
      for (let i = 0; i < slots.length; i++) {
        const node = valueRefs.current[i];
        if (node) node.textContent = slots[i].fmt(slots[i].pick(stats));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, slots, fightStartTime, timeRef]);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {slots.map((slot, i) => (
        <Box key={slot.label} sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            ref={(el: HTMLSpanElement | null) => {
              valueRefs.current[i] = el;
            }}
            sx={{
              display: 'block',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 700,
              fontSize: '1.25rem',
              lineHeight: 1.05,
              fontVariantNumeric: 'tabular-nums',
              color: slot.accented ? accent : 'text.primary',
            }}
          >
            —
          </Typography>
          <Typography
            sx={{
              fontSize: '0.66rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'text.secondary',
            }}
          >
            {slot.label.toUpperCase()}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const LockedPlayerStatsPanelComponent: React.FC<LockedPlayerStatsPanelProps> = ({
  followingActorId,
  lookup,
  timeRef,
  fightStartTime,
}) => {
  const theme = useTheme();

  // Resolve the locked actor's identity from the lookup (same id-space as playersById — the lookup
  // is built by indexing playersById[actorId], so followingActorId is a valid player key).
  const actor = useMemo(() => {
    if (followingActorId == null || !lookup) return null;
    const info = getPlayerInfo(lookup, followingActorId);
    // getActorPositionAtClosestTimestamp gives us `type` (player vs boss/enemy) for the fallback.
    const pos = getActorPositionAtClosestTimestamp(lookup, followingActorId, 0);
    return { name: info?.name ?? pos?.name ?? null, role: info?.role, type: pos?.type };
  }, [followingActorId, lookup]);

  if (followingActorId == null || !actor || actor.name == null) return null;

  // Only players have role-based combat stats. Locking onto a boss/enemy/pet → don't render a
  // role-less shell; the BossHealthPanel already covers bosses. (A future round could add an
  // enemy damage-taken readout here.)
  const isPlayer = actor.type === 'player';
  if (!isPlayer) return null;

  const role: Role = actor.role ?? 'dps';
  const accent = getReplayActorResolvedAccentColor({ type: 'player', role, isDead: false });

  return (
    <Box
      sx={{
        position: 'absolute',
        // Bottom-left, lifted clear of the transport bar (~95px) — opposite corner from the
        // boss-health panel (top-right) and below the player-list panel (top-left).
        left: 16,
        bottom: 112,
        zIndex: 3,
        px: 1.75,
        py: 1.25,
        minWidth: 220,
        maxWidth: 340,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.82),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(accent, 0.45)}`,
        boxShadow: `0 8px 26px rgba(0,0,0,0.5), 0 0 14px ${alpha(accent, 0.22)}`,
        pointerEvents: 'none',
      }}
    >
      {/* Header: role pill + name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box
          component="span"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75,
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: theme.palette.getContrastText(accent),
            backgroundColor: accent,
          }}
        >
          {role.toUpperCase()}
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {actor.name}
        </Typography>
      </Box>

      <PlayerStatsContent
        playerId={followingActorId}
        role={role}
        fightStartTime={fightStartTime}
        accent={accent}
        timeRef={timeRef}
      />

      {role === 'tank' && (
        <Typography sx={{ mt: 0.75, fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.2 }}>
          Damage taken &amp; deaths are measured up to the playhead.
        </Typography>
      )}
    </Box>
  );
};

/**
 * Memoized: only re-renders when the locked actor / lookup / fight changes. It does NOT take the
 * per-frame time as a prop, so React never reconciles it during playback — the live numbers are
 * written to DOM refs by the inner rAF loop.
 */
export const LockedPlayerStatsPanel = React.memo(LockedPlayerStatsPanelComponent);
