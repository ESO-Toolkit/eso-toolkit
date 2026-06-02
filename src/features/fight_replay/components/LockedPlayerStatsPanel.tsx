/**
 * Locked-player stats panel — DOM overlay shown when the replay camera is locked onto a player.
 *
 * When the user follows an actor (the "Following: <name>" lock), this surfaces a compact,
 * role-tinted readout of that player's combat performance for the fight: DPS for damage roles,
 * HPS/overheal for healers, and resistance-based damage-reduction + survivability for tanks. It
 * REUSES the proven fight-insights calculations rather than re-deriving them:
 *   - DPS / total / crit       → usePlayerCardData (the same per-actor scalars the player card uses)
 *   - damage-reduction %        → useDamageReductionTask (the /damage-reduction insights view's calc)
 *   - HPS / overheal, dmg taken → small recompute from the raw event arrays already in the store
 *
 * SCOPE (v1): WHOLE-FIGHT totals, computed once when an actor is locked (not live-scrubbing). The
 * heavy data hook (usePlayerCardData) lives in an inner component that only mounts while an actor
 * is locked — mirroring PlayerCardModal's mount-on-select pattern — so it never runs during normal
 * playback. This deliberately does NOT use a per-frame rAF loop (the stats don't change per frame
 * at whole-fight scope), so it doesn't touch the replay's idle-gate / no-per-tick-reconcile contract.
 *
 * IMPORTANT LABELING: the tank "damage reduction %" is a MODELED resistance estimate (gear/CP/buff
 * resistances → reduction %), NOT measured damage mitigated — it never reads a damage event and
 * omits Protection/block/shields. It is labeled "est. resistance DR" here so it's never read as
 * true mitigation. The measured "damage taken" beside it IS from real events.
 */

import { Box, Typography, useTheme, alpha } from '@mui/material';
import React, { useMemo } from 'react';

import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import { usePlayerCardData } from '../../../hooks/usePlayerCardData';
import {
  type TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { getReplayActorResolvedAccentColor } from '../utils/actorVisualState';
import { getPlayerInfo } from '../utils/pathUtils';

type Role = 'tank' | 'healer' | 'dps';

interface LockedPlayerStatsPanelProps {
  /** The currently-followed actor id, or null when not following. */
  followingActorId: number | null;
  /** Position lookup — resolves the actor's name/role/type and is the shared id-space with playersById. */
  lookup: TimestampPositionLookup | null;
  /** Fight duration in ms (for per-second rates). */
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

/** A hero stat: big value + small label, optionally a sub-line. */
const Stat: React.FC<{ value: string; label: string; hint?: string; accent?: string }> = ({
  value,
  label,
  hint,
  accent,
}) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      sx={{
        fontFamily: 'Space Grotesk, Inter, system-ui',
        fontWeight: 700,
        fontSize: '1.25rem',
        lineHeight: 1.05,
        fontVariantNumeric: 'tabular-nums',
        color: accent || 'text.primary',
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.66rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'text.secondary',
      }}
    >
      {label.toUpperCase()}
    </Typography>
    {hint && (
      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.1 }}>
        {hint}
      </Typography>
    )}
  </Box>
);

/**
 * Inner content — mounts ONLY while an actor is locked, so the heavy usePlayerCardData hook (≈12
 * event types + worker tasks) never runs during normal playback. Computes whole-fight stats for the
 * one locked player and renders a role-appropriate set.
 */
const PlayerStatsContent: React.FC<{
  playerId: number;
  role: Role;
  fightDurationMs: number;
  accent: string;
}> = ({ playerId, role, fightDurationMs, accent }) => {
  const card = usePlayerCardData({ playerId });
  const { healingEvents } = useHealingEvents();
  const { damageEvents } = useDamageEvents();
  const { deathEvents } = useDeathEvents();

  const durationSecs = fightDurationMs > 0 ? fightDurationMs / 1000 : 0;

  // Healer recompute (effective healing / HPS / overheal%). Mirrors HealingDonePanel exactly:
  // event.amount is ALREADY effective; overheal is a separate field.
  const healing = useMemo(() => {
    if (role !== 'healer') return null;
    let raw = 0;
    let overheal = 0;
    for (const ev of healingEvents) {
      if (ev.sourceID === playerId) {
        raw += ev.amount ?? 0;
        overheal += ev.overheal ?? 0;
      }
    }
    const total = raw + overheal;
    return {
      effective: raw,
      hps: durationSecs > 0 ? raw / durationSecs : 0,
      overhealPct: total > 0 ? (overheal / total) * 100 : 0,
    };
  }, [role, healingEvents, playerId, durationSecs]);

  // Tank recompute (measured damage TAKEN + deaths). All app summing keys by sourceID = damage
  // DONE, so we flip the key to targetID for damage taken.
  const survivability = useMemo(() => {
    if (role !== 'tank') return null;
    let taken = 0;
    for (const ev of damageEvents) {
      if (ev.targetID === playerId) taken += ev.amount ?? 0;
    }
    let deaths = 0;
    for (const ev of deathEvents) {
      if ((ev as { targetID?: number }).targetID === playerId) deaths += 1;
    }
    return { damageTaken: taken, deaths };
  }, [role, damageEvents, deathEvents, playerId]);

  if (role === 'healer') {
    return (
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Stat value={fmtNum(healing?.hps ?? 0)} label="HPS" accent={accent} />
        <Stat value={fmtNum(healing?.effective ?? 0)} label="Healing" />
        <Stat value={fmtPct(healing?.overhealPct ?? 0)} label="Overheal" />
      </Box>
    );
  }

  if (role === 'tank') {
    return (
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Stat value={fmtNum(survivability?.damageTaken ?? 0)} label="Dmg Taken" accent={accent} />
        <Stat value={`${survivability?.deaths ?? 0}`} label="Deaths" />
        <Stat value={fmtNum(card.totalDamage ?? 0)} label="Dmg Done" />
      </Box>
    );
  }

  // DPS (default)
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Stat value={fmtNum(card.dpsValue ?? 0)} label="DPS" accent={accent} />
      <Stat value={fmtNum(card.totalDamage ?? 0)} label="Damage" />
      <Stat value={fmtPct(card.critChance ?? 0)} label="Crit" />
    </Box>
  );
};

const LockedPlayerStatsPanelComponent: React.FC<LockedPlayerStatsPanelProps> = ({
  followingActorId,
  lookup,
  fightDurationMs,
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
        fightDurationMs={fightDurationMs}
        accent={accent}
      />

      {role === 'tank' && (
        <Typography sx={{ mt: 0.75, fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.2 }}>
          Damage taken &amp; deaths are measured; resistance-based DR is a modeled estimate.
        </Typography>
      )}
    </Box>
  );
};

/**
 * Memoized: only re-renders when the locked actor changes (or the lookup/duration). It does NOT
 * read the per-frame timeRef, so it never reconciles during playback — whole-fight stats are static
 * for a given locked actor.
 */
export const LockedPlayerStatsPanel = React.memo(LockedPlayerStatsPanelComponent);
