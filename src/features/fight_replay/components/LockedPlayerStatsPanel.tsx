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
 * TANK MODELED DR % (labeling matters): tanks also get an "est. DR" line — the SAME modeled
 * resistance-based damage-reduction the /damage-reduction insights view computes (static gear/CP/
 * passive resistance + dynamic buff/debuff resistance at the playhead → resistanceToDamageReduction,
 * capped at 50%). It NEVER reads a damage event and omits Major/Minor Protection, block, and shields,
 * so it is labeled "est." and sits beside the MEASURED damage-taken — never presented as true
 * mitigation. It degrades gracefully: the measured scalars show immediately; the DR % line only
 * appears once the (heavier, async) gear + buff/debuff lookups resolve.
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
 * SCOPE: live up-to-playhead SCALARS (DPS/HPS/damage-taken/crit/overheal/deaths) for every role,
 * plus a MODELED resistance-based damage-reduction % for tanks (see the tank labeling note above).
 * Buff/debuff uptime and the per-ability breakdown layer on next.
 */

import Tune from '@mui/icons-material/Tune';
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Popover,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReportMasterData } from '../../../hooks';
import { useCombatantInfoRecord } from '../../../hooks/events/useCombatantInfoRecord';
import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import { usePlayerData } from '../../../hooks/usePlayerData';
import {
  DEFAULT_STATS_PANEL_SECTIONS,
  type StatsPanelSections,
} from '../../../hooks/useReplayPrefs';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import { computeBuffUptimes } from '../../../utils/buffUptimeCalculator';
import {
  calculateDynamicDamageReductionAtTimestamp,
  calculateStaticResistanceValue,
  resistanceToDamageReduction,
} from '../../../utils/damageReductionUtils';
import {
  type TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { IMPORTANT_BUFF_ABILITIES } from '../../report_details/insights/BuffUptimesPanel';
import { IMPORTANT_DEBUFF_ABILITIES } from '../../report_details/insights/DebuffUptimesPanel';
import { getReplayActorResolvedAccentColor } from '../utils/actorVisualState';
import {
  type AbilityBreakdownIndex,
  type AbilityBreakdownRow,
  type DebuffAppliedIndex,
  type DebuffAppliedRow,
  type LiveLockedStats,
  buildAbilityBreakdownIndex,
  buildDebuffAppliedIndex,
  buildLockedStatsIndex,
  queryAbilityBreakdown,
  queryDebuffApplied,
  queryLiveLockedStats,
} from '../utils/lockedPlayerStats';
import { getPlayerInfo } from '../utils/pathUtils';

type Role = 'tank' | 'healer' | 'dps';

// Mobile layout: the panel is bottom-LEFT and now only has to clear the docked TRANSPORT bar at the
// bottom edge (the old 7-button toggle cluster that used to sit above the transport was moved into a
// bottom-RIGHT tools sheet, so there's no cluster band on the left anymore). Reserve the transport
// band height plus a small clearance. (The tools button lives bottom-right and never overlaps the
// left side, so it isn't in this calc.)
const MOBILE_TRANSPORT_BAND_PX = 96;
const MOBILE_PANEL_CLEARANCE_PX = 16;
// Resting distance of the panel's bottom edge from the viewport bottom on mobile (clears the transport).
const MOBILE_PANEL_BOTTOM_PX = MOBILE_TRANSPORT_BAND_PX + MOBILE_PANEL_CLEARANCE_PX; // 112

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
  /** Which sections to show. Omitted → all sections (back-compat default). */
  sections?: StatsPanelSections;
  /** Persist a sections change (from the panel's gear menu). Omitted → the gear menu is hidden. */
  onSectionsChange?: (next: StatsPanelSections) => void;
  /**
   * True inside the mobile pseudo-fullscreen overlay. The panel then lifts above the touch control
   * cluster (which docks above the transport) and caps its width/height to the narrow viewport,
   * instead of the desktop bottom:112 / maxWidth:340 that would overlap the cluster on a phone.
   */
  isMobile?: boolean;
}

/** A section the gear menu can toggle, paired with the roles it's relevant to. */
interface SectionDef {
  key: keyof StatsPanelSections;
  label: string;
  /** Roles this section applies to — the gear menu only lists it for those roles. */
  roles: readonly Role[];
}

const SECTION_DEFS: readonly SectionDef[] = [
  { key: 'hero', label: 'Hero stats', roles: ['tank', 'healer', 'dps'] },
  { key: 'dr', label: 'Est. resistance DR %', roles: ['tank'] },
  { key: 'buffs', label: 'Buff uptime', roles: ['tank', 'healer', 'dps'] },
  { key: 'debuffs', label: 'Debuffs applied', roles: ['tank', 'healer', 'dps'] },
  { key: 'abilities', label: 'Top abilities', roles: ['dps'] },
];

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

/**
 * Tank modeled damage-reduction % — a thin live line under the tank scalars. Mounts only for tanks.
 * Computes the static resistance once on lock, then a per-frame dynamic resistance at the playhead
 * (frame-safe: isBuffActiveOnTarget is O(log m)), summed and run through resistanceToDamageReduction
 * (caps 50%). Renders nothing until the gear + buff/debuff lookups resolve, so it never blocks the
 * measured scalars above it. The DR value is written to a DOM ref by its own rAF loop — no React
 * render per frame, same contract as the scalar path.
 */
const TankDamageReduction: React.FC<{
  playerId: number;
  fightStartTime: number;
  timeRef: React.RefObject<number> | { current: number };
}> = ({ playerId, fightStartTime, timeRef }) => {
  const { combatantInfoRecord } = useCombatantInfoRecord();
  const { playerData } = usePlayerData();
  const { buffLookupData } = useBuffLookupTask();
  const { debuffLookupData } = useDebuffLookupTask();

  const player = playerData?.playersById?.[playerId] ?? null;
  const combatantInfo = combatantInfoRecord?.[playerId] ?? null;

  // Static resistance (gear/CP/passives) — recomputed only when the inputs change.
  const staticResistance = useMemo(() => {
    if (!player) return null;
    return calculateStaticResistanceValue(combatantInfo, player);
  }, [combatantInfo, player]);

  const valueRef = useRef<HTMLSpanElement | null>(null);

  // All four async inputs must be present before the modeled DR % means anything.
  const ready = staticResistance != null && buffLookupData != null && debuffLookupData != null;

  useEffect(() => {
    if (!ready || !buffLookupData || !debuffLookupData || staticResistance == null) return;
    let raf = 0;
    const tick = (): void => {
      const playheadMs = timeRef.current ?? 0;
      const timestamp = fightStartTime + playheadMs;
      const dynamic = calculateDynamicDamageReductionAtTimestamp(
        buffLookupData,
        debuffLookupData,
        timestamp,
        playerId,
      );
      const dr = resistanceToDamageReduction(staticResistance + dynamic);
      const node = valueRef.current;
      if (node) node.textContent = `${dr.toFixed(1)}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    buffLookupData,
    debuffLookupData,
    staticResistance,
    playerId,
    fightStartTime,
    timeRef,
  ]);

  // Until the lookups resolve, render nothing — the measured scalars carry the panel.
  if (!ready) return null;

  return (
    <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
      <Typography
        component="span"
        ref={valueRef}
        sx={{
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontWeight: 700,
          fontSize: '0.95rem',
          fontVariantNumeric: 'tabular-nums',
          color: 'text.primary',
        }}
      >
        —
      </Typography>
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'text.secondary',
        }}
      >
        EST. RESIST. DR
      </Typography>
    </Box>
  );
};

/** How often the (O(n)) buff-uptime recompute runs while scrubbing. */
const UPTIME_THROTTLE_MS = 280;
/** How many buffs to surface — kept short so the panel stays glanceable. */
const UPTIME_TOP_N = 4;

interface UptimeRow {
  key: string;
  name: string;
  pct: number;
}

/**
 * Buff-uptime list — the important raid buffs the locked player currently HAS, up to the playhead.
 * Reuses the insights' curated IMPORTANT_BUFF_ABILITIES set and computeBuffUptimes (targetIds =
 * the locked player, so the averaging path resolves to exactly that player's uptime). Window-scoped
 * to [fightStart, playhead] so the % is live as you scrub.
 *
 * computeBuffUptimes is O(n) over intervals, so — unlike the scalar path — this can't run per frame.
 * It lives in its OWN sub-component and recomputes on a ~3-4Hz throttle, setState-ing only when the
 * rounded rows change. As a memo'd-leaf child its re-render can't reconcile Arena3D; it's isolated
 * from the scalar component so that one still renders exactly once on lock.
 */
const BuffUptimeList: React.FC<{
  playerId: number;
  fightStartTime: number;
  timeRef: React.RefObject<number> | { current: number };
}> = ({ playerId, fightStartTime, timeRef }) => {
  const { buffLookupData } = useBuffLookupTask();
  const { reportMasterData } = useReportMasterData();

  const targetIds = useMemo(() => new Set<number>([playerId]), [playerId]);
  const abilitiesById = reportMasterData?.abilitiesById;

  const [rows, setRows] = useState<UptimeRow[]>([]);
  // Signature of the last-pushed rows, so we only setState when the visible list actually changes.
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    if (!buffLookupData) {
      if (rows.length) setRows([]);
      lastSigRef.current = '';
      return;
    }
    let raf = 0;
    let lastRun = -Infinity;
    const tick = (now: number): void => {
      if (now - lastRun >= UPTIME_THROTTLE_MS) {
        lastRun = now;
        const playheadMs = timeRef.current ?? 0;
        const fightEndTime = fightStartTime + playheadMs;
        const uptimes = computeBuffUptimes(buffLookupData, {
          abilityIds: IMPORTANT_BUFF_ABILITIES,
          targetIds,
          fightStartTime,
          fightEndTime,
          fightDuration: playheadMs,
          abilitiesById: abilitiesById ?? {},
          isDebuff: false,
          hostilityType: 0,
        });
        const next: UptimeRow[] = uptimes.slice(0, UPTIME_TOP_N).map((u) => ({
          key: u.uniqueKey,
          name: u.abilityName,
          pct: u.uptimePercentage,
        }));
        let sig = '';
        for (const r of next) sig += `${r.key}:${Math.round(r.pct)};`;
        if (sig !== lastSigRef.current) {
          lastSigRef.current = sig;
          setRows(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // rows.length intentionally excluded — the loop owns its dirty check via lastSigRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffLookupData, targetIds, fightStartTime, timeRef, abilitiesById]);

  if (!buffLookupData || rows.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        sx={{
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'text.secondary',
          mb: 0.25,
        }}
      >
        BUFF UPTIME
      </Typography>
      {rows.map((r) => (
        <Box
          key={r.key}
          sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography
            noWrap
            sx={{ fontSize: '0.72rem', color: 'text.primary', minWidth: 0, flex: 1 }}
          >
            {r.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.secondary',
            }}
          >
            {r.pct.toFixed(0)}%
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/** How often the ability breakdown recomputes while scrubbing, and how many abilities to surface. */
const BREAKDOWN_THROTTLE_MS = 280;
const BREAKDOWN_TOP_N = 3;

/**
 * Per-ability damage breakdown — the locked player's top damage abilities, up to the playhead.
 * Reuses the same outgoing-damage filter + crit rule as the /damage insights DamageBreakdownPanel
 * (extracted into buildAbilityBreakdownIndex/queryAbilityBreakdown). DPS-focused: the breakdown is
 * only meaningful for damage roles, so the panel mounts it for DPS.
 *
 * Like the buff list, it builds its per-ability prefix index once on lock and recomputes the top-N
 * on a ~3-4Hz throttle (a binary search per ability — cheap, but a reordering list must render
 * through React, so not the per-frame DOM-ref path). Sibling-isolated, so the scalar leaf still
 * renders once on lock.
 */
const AbilityBreakdownList: React.FC<{
  playerId: number;
  fightStartTime: number;
  timeRef: React.RefObject<number> | { current: number };
  accent: string;
}> = ({ playerId, fightStartTime, timeRef, accent }) => {
  const { damageEvents } = useDamageEvents();
  const { reportMasterData } = useReportMasterData();
  const abilitiesById = reportMasterData?.abilitiesById;

  const index: AbilityBreakdownIndex = useMemo(
    () => buildAbilityBreakdownIndex(playerId, damageEvents, abilitiesById ?? {}),
    [playerId, damageEvents, abilitiesById],
  );

  const [rows, setRows] = useState<AbilityBreakdownRow[]>([]);
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    let raf = 0;
    let lastRun = -Infinity;
    const tick = (now: number): void => {
      if (now - lastRun >= BREAKDOWN_THROTTLE_MS) {
        lastRun = now;
        const playheadMs = timeRef.current ?? 0;
        const cutoff = fightStartTime + playheadMs;
        const next = queryAbilityBreakdown(index, cutoff, BREAKDOWN_TOP_N);
        // Key the dirty-check on the DISPLAYED string (fmtNum), not a coarse 1K bucket. The row
        // renders fmtNum(totalDamage) — exact integers below 1K, one-decimal K above — so a 1K
        // bucket let the visible value go stale (e.g. 100→499, or 1.1K→1.4K) between boundaries.
        let sig = '';
        for (const r of next) sig += `${r.abilityGameID}:${fmtNum(r.totalDamage)};`;
        if (sig !== lastSigRef.current) {
          lastSigRef.current = sig;
          setRows(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, fightStartTime, timeRef]);

  if (rows.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        sx={{
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'text.secondary',
          mb: 0.25,
        }}
      >
        TOP ABILITIES
      </Typography>
      {rows.map((r) => (
        <Box
          key={r.abilityGameID}
          sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography
            noWrap
            sx={{ fontSize: '0.72rem', color: 'text.primary', minWidth: 0, flex: 1 }}
          >
            {r.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: accent,
            }}
          >
            {fmtNum(r.totalDamage)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/** Throttle + cap for the debuff-applied list (same discipline as the buff list). */
const DEBUFF_THROTTLE_MS = 280;
const DEBUFF_TOP_N = 4;

/**
 * Debuffs APPLIED BY the locked player, up to the playhead — e.g. a tank's Major Breach / Crusher
 * uptime on the boss. Reuses the insights' curated IMPORTANT_DEBUFF_ABILITIES set. Debuff intervals
 * store the applier in a different field per ability (inverted: sourceID; normal: targetID), so the
 * index classifies each ability with the friendly-player id set before attributing it to the player
 * (see buildDebuffAppliedIndex). Uptime is the PRIMARY-BOSS number (max per-enemy uptime — the target
 * the player maintained it on hardest), labeled "on boss" to distinguish it from the insights Debuffs
 * tab's multi-target average.
 *
 * Same sibling-isolated throttled-list pattern as the buff list; degrades gracefully while the
 * debuff lookup + player data load.
 */
const DebuffUptimeList: React.FC<{
  playerId: number;
  fightStartTime: number;
  timeRef: React.RefObject<number> | { current: number };
}> = ({ playerId, fightStartTime, timeRef }) => {
  const { debuffLookupData } = useDebuffLookupTask();
  const { playerData } = usePlayerData();
  const { reportMasterData } = useReportMasterData();
  const abilitiesById = reportMasterData?.abilitiesById;

  // Friendly player id set — used to classify each debuff's applier field.
  const friendlyPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    const byId = playerData?.playersById;
    if (byId) for (const key of Object.keys(byId)) ids.add(Number(key));
    return ids;
  }, [playerData]);

  const index: DebuffAppliedIndex = useMemo(
    () =>
      buildDebuffAppliedIndex(
        playerId,
        debuffLookupData,
        IMPORTANT_DEBUFF_ABILITIES,
        friendlyPlayerIds,
        abilitiesById ?? {},
      ),
    [playerId, debuffLookupData, friendlyPlayerIds, abilitiesById],
  );

  const [rows, setRows] = useState<DebuffAppliedRow[]>([]);
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    if (index.abilities.length === 0) {
      if (rows.length) setRows([]);
      lastSigRef.current = '';
      return;
    }
    let raf = 0;
    let lastRun = -Infinity;
    const tick = (now: number): void => {
      if (now - lastRun >= DEBUFF_THROTTLE_MS) {
        lastRun = now;
        const playheadMs = timeRef.current ?? 0;
        const cutoff = fightStartTime + playheadMs;
        const next = queryDebuffApplied(index, fightStartTime, cutoff, DEBUFF_TOP_N);
        let sig = '';
        for (const r of next) sig += `${r.abilityGameID}:${Math.round(r.uptimePct)};`;
        if (sig !== lastSigRef.current) {
          lastSigRef.current = sig;
          setRows(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, fightStartTime, timeRef]);

  if (rows.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        sx={{
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'text.secondary',
          mb: 0.25,
        }}
      >
        DEBUFFS APPLIED · ON BOSS
      </Typography>
      {rows.map((r) => (
        <Box
          key={r.abilityGameID}
          sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography
            noWrap
            sx={{ fontSize: '0.72rem', color: 'text.primary', minWidth: 0, flex: 1 }}
          >
            {r.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.secondary',
            }}
          >
            {r.uptimePct.toFixed(0)}%
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
  sections,
  onSectionsChange,
  isMobile = false,
}) => {
  const theme = useTheme();

  // Gear-menu anchor (the per-section toggle popover). Local UI state; doesn't affect playback.
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Landscape-phone (short viewport): the vertical axis is scarce (~390px), so the body height cap
  // SHRINKS rather than grows. Matches useIsMobileReplay's landscape clause.
  const shortViewport = useMediaQuery('(pointer: coarse) and (max-height: 600px)');

  // --- Mobile thumb-drag (imperative; zero React render per move, preserving the perf contract) ---
  // The panel root is pointerEvents:none (click-through); only the HEADER opts into pointer events as
  // a drag handle. On pointer-down we capture the pointer to the root so a fast drag that leaves the
  // small header keeps moving the panel instead of falling through to OrbitControls (camera rotate).
  // The committed offset lives in a ref and is written straight to root.style.transform.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  // Clamp the committed offset so the panel's rect stays fully on-screen given its bottom-left anchor.
  // Reserves the top band (Close + boss panel) and the bottom band (the docked transport bar).
  const clampOffset = useCallback((x: number, y: number): { x: number; y: number } => {
    const el = rootRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Current on-screen position of the element's top-left WITHOUT the proposed offset delta.
    const baseLeft = rect.left - offsetRef.current.x;
    const baseTop = rect.top - offsetRef.current.y;
    const TOP_RESERVE = 72; // clear the top-right Close / boss stack band
    const BOTTOM_RESERVE = MOBILE_TRANSPORT_BAND_PX; // clear the docked transport bar
    const minX = 8 - baseLeft;
    const maxX = vw - 8 - rect.width - baseLeft;
    const minY = TOP_RESERVE - baseTop;
    const maxY = vh - BOTTOM_RESERVE - rect.height - baseTop;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  const applyOffset = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    offsetRef.current = { x, y };
    if (el) el.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      // Don't start a drag from the gear button — it has its own tap (open the Choose-stats popover).
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
      // Record the drag origin FIRST so the gesture is live even if capture can't be acquired —
      // pointer capture is a robustness boost (keeps tracking if the thumb slides off the small
      // header), not a requirement. setPointerCapture throws if the id isn't an active pointer
      // (e.g. synthetic events in tests), so guard it; the bubbled move/up events still drive the drag.
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: offsetRef.current.x,
        baseY: offsetRef.current.y,
      };
      try {
        // Capture on e.currentTarget (the HEADER — where onPointerMove/onPointerUp are attached), NOT
        // the root. When capture succeeds the browser retargets subsequent pointer events to the
        // capture element and they no longer fire on a different child, so capturing the root would
        // starve the header handlers and the drag would stall after the first move.
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unavailable — the drag still works via bubbled pointer events */
      }
    },
    [isMobile],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      const next = clampOffset(d.baseX + (e.clientX - d.startX), d.baseY + (e.clientY - d.startY));
      applyOffset(next.x, next.y);
    },
    [clampOffset, applyOffset],
  );

  const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    // Release on the same element the capture was taken on (the header = e.currentTarget).
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  // Re-clamp the committed offset on resize / orientation change — a portrait-valid offset can shove
  // the panel off-screen in landscape (844×390).
  useEffect(() => {
    if (!isMobile) return;
    const onResize = (): void => {
      const c = clampOffset(offsetRef.current.x, offsetRef.current.y);
      applyOffset(c.x, c.y);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [isMobile, clampOffset, applyOffset]);

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

  // Effective section flags (prop, or the all-on default for back-compat — identical today, deduped
  // against the prefs default). A section renders only when its flag is on AND it's relevant to this
  // role (the role gates already enforced below stay in force).
  const visible = sections ?? DEFAULT_STATS_PANEL_SECTIONS;

  // The gear menu only lists sections relevant to this role, so a healer never sees "Top abilities".
  const menuSections = onSectionsChange ? SECTION_DEFS.filter((s) => s.roles.includes(role)) : [];

  // Tank caveat — built from ONLY the clauses whose section is actually showing, so compacting the
  // panel never leaves a disclaimer referencing a stat that isn't on screen (e.g. the DR sentence
  // must not appear when the DR line is toggled off).
  const tankCaveat =
    role === 'tank'
      ? [
          visible.hero ? 'Damage taken & deaths are measured.' : null,
          visible.dr
            ? 'DR % is a modeled resistance estimate (excludes Protection, block & shields).'
            : null,
        ]
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <Box
      ref={rootRef}
      sx={{
        position: 'absolute',
        // Bottom-left, lifted clear of the transport bar (~95px) — opposite corner from the
        // boss-health panel (top-right) and below the player-list panel (top-left). On mobile it
        // lifts higher to clear BOTH the transport and the touch control cluster docked above it.
        // Plain-px offsets (NOT env()) — the overlay container already pads for the safe area, so
        // adding env() here would double-count and push the panel too far inboard. The bottom is
        // DERIVED from the cluster geometry so the two can't drift into a collision.
        left: isMobile ? 8 : 16,
        bottom: isMobile ? MOBILE_PANEL_BOTTOM_PX : 112,
        zIndex: 3,
        px: 1.75,
        py: 1.25,
        minWidth: isMobile ? 0 : 220,
        // Mobile: a corner CARD, never a half-screen sheet. 78vw of 844 (landscape) clamps to 320px;
        // 78vw of 390 (portrait) ≈ 304px — both read as a card, not a panel that eats the short side.
        maxWidth: isMobile ? 'min(78vw, 320px)' : 340,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.82),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(accent, 0.45)}`,
        boxShadow: `0 8px 26px rgba(0,0,0,0.5), 0 0 14px ${alpha(accent, 0.22)}`,
        // The panel ROOT stays click-through on every form factor (so its empty margins never block a
        // canvas drag); only the header (drag handle) and the gear button opt back into pointer events.
        pointerEvents: 'none',
      }}
    >
      {/* Header: role pill + name + (optional) gear menu. On mobile it's also the DRAG HANDLE —
          pointerEvents:auto + touchAction:none so a thumb-drag moves the panel (and, via pointer
          capture, doesn't fall through to rotate the camera). Desktop header stays inert. */}
      <Box
        onPointerDown={isMobile ? handleDragStart : undefined}
        onPointerMove={isMobile ? handleDragMove : undefined}
        onPointerUp={isMobile ? handleDragEnd : undefined}
        onPointerCancel={isMobile ? handleDragEnd : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1,
          ...(isMobile ? { pointerEvents: 'auto', touchAction: 'none', cursor: 'grab' } : null),
        }}
      >
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
            flex: 1,
            minWidth: 0,
          }}
        >
          {actor.name}
        </Typography>
        {menuSections.length > 0 && (
          <Tooltip title="Choose stats">
            <IconButton
              aria-label="Choose which stats to show"
              size="small"
              // data-no-drag: on mobile the header is a drag handle; pointer-down here must NOT start
              // a drag, so the drag handler bails when the target is inside this button.
              data-no-drag
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{
                pointerEvents: 'auto',
                p: 0.25,
                color: alpha(theme.palette.text.secondary, 0.8),
                '&:hover': { color: 'text.primary' },
              }}
            >
              <Tune sx={{ fontSize: '0.95rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Body — on mobile a scrollable region (pan-y) so a long DPS panel (hero+DR+buffs+debuffs+
          abilities+caveat) is reachable without the panel running off-screen. The height cap lives
          HERE (not on the root, which must stay click-through) and SHRINKS in landscape where the
          vertical axis is scarce. Desktop renders the body bare — no wrapper styling, no cap. */}
      <Box
        sx={
          isMobile
            ? {
                pointerEvents: 'auto',
                overflowY: 'auto',
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch',
                // Portrait: cap to a comfortable fraction; landscape (short viewport): tighter so the
                // card never exceeds the ~390px short side. Both leave the header always visible.
                // Landscape (short viewport): the panel rests at bottom:MOBILE_PANEL_BOTTOM_PX and
                // must also clear the top band, so the body cap is derived from the actually-available
                // vertical space (≈ 100vh − rest-bottom − top-reserve − header/padding) — NOT a flat
                // fraction, which let the panel exceed the 390px short side and clip off the top.
                // Portrait has ample height, so a comfortable 40vh fraction is fine there.
                maxHeight: shortViewport
                  ? `calc(100vh - ${MOBILE_PANEL_BOTTOM_PX + 72 + 64}px)`
                  : '40vh',
              }
            : undefined
        }
      >
        {visible.hero && (
          <PlayerStatsContent
            playerId={followingActorId}
            role={role}
            fightStartTime={fightStartTime}
            accent={accent}
            timeRef={timeRef}
          />
        )}

        {role === 'tank' && visible.dr && (
          <TankDamageReduction
            playerId={followingActorId}
            fightStartTime={fightStartTime}
            timeRef={timeRef}
          />
        )}

        {visible.buffs && (
          <BuffUptimeList
            playerId={followingActorId}
            fightStartTime={fightStartTime}
            timeRef={timeRef}
          />
        )}

        {visible.debuffs && (
          <DebuffUptimeList
            playerId={followingActorId}
            fightStartTime={fightStartTime}
            timeRef={timeRef}
          />
        )}

        {role === 'dps' && visible.abilities && (
          <AbilityBreakdownList
            playerId={followingActorId}
            fightStartTime={fightStartTime}
            timeRef={timeRef}
            accent={accent}
          />
        )}

        {tankCaveat && (
          <Typography
            sx={{ mt: 0.75, fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.2 }}
          >
            {tankCaveat}
          </Typography>
        )}
      </Box>

      {onSectionsChange && (
        <Popover
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                pointerEvents: 'auto',
                px: 1.5,
                py: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(accent, 0.4)}`,
              },
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'text.secondary',
              mb: 0.5,
            }}
          >
            SHOW STATS
          </Typography>
          {menuSections.map((s) => (
            <FormControlLabel
              key={s.key}
              sx={{ display: 'flex', m: 0, mb: 0.25 }}
              control={
                <Checkbox
                  size="small"
                  checked={visible[s.key]}
                  onChange={(e) => onSectionsChange({ ...visible, [s.key]: e.target.checked })}
                  sx={{ p: 0.5, color: accent, '&.Mui-checked': { color: accent } }}
                />
              }
              label={<Typography sx={{ fontSize: '0.78rem' }}>{s.label}</Typography>}
            />
          ))}
        </Popover>
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
