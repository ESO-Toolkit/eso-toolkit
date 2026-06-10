/**
 * Authoritative fight / trial / dungeon detection for the Report Fights page.
 *
 * Design goals (the "best detection possible" audit, June 2026):
 *   1. Boss vs. trash is decided by the API's `encounterID` (0 = trash), not by
 *      the presence of a `difficulty` value.
 *   2. Kill vs. wipe is decided by the API's authoritative `kill` flag, not by a
 *      hand-tuned `bossPercentage` heuristic.
 *   3. Which trial/dungeon a fight belongs to is decided by the per-fight
 *      `gameZone.id` (an in-game zone ID), which lets us correctly separate logs
 *      that mix multiple trials and/or dungeons. Boss-name matching survives only
 *      as a fallback for older logs that lack `gameZone`.
 *
 * All functions here are pure so they can be unit-tested without React.
 */

import {
  CONTENT_ZONES,
  getContentZone,
  getDungeonBossCount,
  type ContentType,
} from '../../data/esoContentZones';
import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';

/** Index of canonical display name → content zone, for the name-based fallback. */
const ZONE_BY_NAME = new Map(
  Object.values(CONTENT_ZONES).map((zone) => [zone.name.toLowerCase(), zone]),
);

/**
 * The effective encounter ID for a fight. ESO Logs occasionally demotes a boss
 * fight to trash (`encounterID === 0`) while preserving the real ID in
 * `originalEncounterID`; we treat that as the boss encounter.
 */
export function effectiveEncounterId(fight: FightFragment): number {
  if (fight.encounterID && fight.encounterID !== 0) return fight.encounterID;
  return fight.originalEncounterID ?? 0;
}

/**
 * Whether a fight is a boss encounter (vs. trash).
 *
 * Follows the *live* `encounterID` (0 = trash), which is what ESO Logs intends:
 * when it demotes a boss fight to trash it sets `encounterID` to 0 (preserving
 * the real id in `originalEncounterID`). Real logs show these demoted fights are
 * post-kill / instant-reset noise, so they belong with trash — not as phantom
 * boss attempts. `difficulty != null` is kept as a union fallback so a boss that
 * older logs only tag via difficulty is never dropped. (The schema guarantees
 * `difficulty` is null for trash, so the union cannot promote real trash.)
 */
export function isBossFight(fight: FightFragment): boolean {
  return (fight.encounterID ?? 0) !== 0 || fight.difficulty != null;
}

/**
 * Whether the boss was killed (fight succeeded).
 *
 * Prefers the authoritative `kill` flag. Falls back to `bossPercentage` only when
 * `kill` is null (some legacy logs), using the "<= 1% boss health remaining"
 * convention. This replaces the previous `isFalsePositiveWipe` heuristic, which
 * existed only because the UI ignored `kill` and inferred success from
 * `bossPercentage`.
 */
export function wasKill(fight: FightFragment): boolean {
  if (fight.kill === true) return true;
  if (fight.kill === false) return false;
  // kill == null → fall back to boss health remaining.
  return fight.bossPercentage != null && fight.bossPercentage <= 1.0;
}

/** Boss health % remaining at end of fight (0–100), or null if unknown. */
export function bossHealthRemaining(fight: FightFragment): number | null {
  if (fight.bossPercentage == null) return null;
  return Math.max(0, Math.min(100, fight.bossPercentage));
}

/**
 * Boss-name → trial name fallback, used only when `gameZone` is unavailable.
 * Returns a canonical trial name (matching `CONTENT_ZONES`) or null if the boss
 * is not recognised. Matching is done with `includes` to tolerate instance
 * suffixes (e.g. "Falgravn #2") and minor name variants.
 */
export function trialNameFromBossName(bossName: string | null | undefined): string | null {
  const name = (bossName ?? '').toLowerCase();
  if (!name) return null;

  const tables: Array<{ trial: string; bosses: string[] }> = [
    { trial: 'Opulent Ordeal', bosses: ['opulent trio', 'opulent'] },
    {
      trial: 'Ossein Cage',
      bosses: [
        'gedna relvel',
        'hall of fleshcraft',
        'shaper of flesh',
        'shapers of flesh',
        'tortured ranyu',
        'tortured kathutet',
        'tortured amkaos',
        'tortured trio',
        'jynorah',
        'skorkhif',
        'blood drinker thisa',
        'overfiend kazpian',
      ],
    },
    { trial: "Sanity's Edge", bosses: ['ansuul', 'spiral', 'twelvane', 'yaseyla', 'yasela'] },
    { trial: "Kyne's Aegis", bosses: ['falgravn', 'vrol', 'yandir'] },
    { trial: 'Sunspire', bosses: ['lokke', 'nahviintaas', 'yolnahkriin'] },
    { trial: 'Cloudrest', bosses: ["z'maja", 'galenwe', 'relequen', 'siroria'] },
    {
      trial: 'Asylum Sanctorium',
      bosses: ['lord felms', 'saint felms', 'saint llothis', 'saint olms'],
    },
    {
      trial: 'Lucent Citadel',
      bosses: [
        'xoryn',
        'count ryelaz',
        'zilyesset',
        'cavot agnan',
        'orphic shattered shard',
        'cavot',
        'orphic',
      ],
    },
    {
      trial: 'Rockgrove',
      bosses: [
        'oaxiltso',
        'flame-herald bahsei',
        'xalvakka',
        'ash titan',
        'basks-in-snakes',
        'basks',
      ],
    },
    {
      trial: 'Dreadsail Reef',
      bosses: [
        'lylanar and turlassil',
        'lylanar',
        'sail ripper',
        'bow breaker',
        'reef guardian',
        'tideborn taleria',
      ],
    },
    {
      trial: 'Halls of Fabrication',
      bosses: [
        'hunter-killer fabricant',
        'pinnacle factotum',
        'archcustodian',
        'assembly general',
        'refabrication committee',
      ],
    },
    {
      trial: 'Maw of Lorkhaj',
      bosses: ["zhaj'hassa the forgotten", 'vashai', 'rakkhat', 'twins', "zhaj'hassa"],
    },
    {
      trial: 'Sanctum Ophidia',
      bosses: [
        'possessed manticora',
        'possessed mantikora',
        'stonebreaker',
        'ozara',
        'serpent',
        'mantikora',
        'manticora',
      ],
    },
    { trial: 'Hel Ra Citadel', bosses: ['ra kotu', "yokeda rok'dun", 'yokedas', 'the warrior'] },
    {
      trial: 'Aetherian Archive',
      bosses: [
        'storm atronach',
        'stone atronach',
        'varlariel',
        'the mage',
        'foundation stone atronach',
        'lightning storm atronach',
      ],
    },
  ];

  const match = tables.find((t) => t.bosses.some((b) => name.includes(b)));
  return match?.trial ?? null;
}

/** Resolved zone identity for a single fight. */
export interface ResolvedZone {
  /** Stable grouping key. */
  key: string;
  /** In-game zone ID when known. */
  zoneId: number | null;
  /** Display name. */
  name: string;
  type: ContentType;
  shortName?: string;
  expectedBossCount?: number;
  /**
   * True when the zone came from the report-level zone name rather than from
   * the fight itself. The report zone is report-wide, so in a mixed log it is
   * wrong for every fight outside the "main" zone — grouping must treat these
   * as weak evidence (attach to the current run, never force a split).
   */
  fromReportFallback?: boolean;
}

const UNKNOWN_ZONE: ResolvedZone = {
  key: 'unknown',
  zoneId: null,
  name: 'Unknown',
  type: 'unknown',
};

/** Lowercased name fragments for the solo/group arenas (not trials or dungeons). */
const ARENA_NAME_TOKENS: readonly string[] = [
  'maelstrom arena',
  'vateshran hollows',
  'dragonstar arena',
  'blackrose prison',
];

/** Classify an unrecognised (non-trial) zone as an arena or a dungeon by name. */
function classifyUnknownZone(name: string | null | undefined): ContentType {
  const n = (name ?? '').toLowerCase();
  return ARENA_NAME_TOKENS.some((token) => n.includes(token)) ? 'arena' : 'dungeon';
}

/**
 * Resolve which trial/dungeon a fight belongs to, in priority order:
 *   1. `gameZone.id` matched against the canonical content table (most reliable).
 *   2. The raw `gameZone` (id/name) as a dungeon/unknown zone — the per-fight
 *      API signal always outranks name heuristics, so a dungeon boss whose name
 *      happens to contain a trial token ("the mage", "serpent", …) is never
 *      mislabeled as a trial.
 *   3. Boss-name → trial fallback (legacy logs with no `gameZone` at all).
 *   4. The report-level zone name.
 */
export function resolveFightZone(
  fight: FightFragment,
  reportData?: ReportFragment | null,
): ResolvedZone {
  const gz = fight.gameZone;

  // 1. Known content zone by in-game zone id.
  const known = getContentZone(gz?.id);
  if (known) {
    return {
      key: `zone:${known.zoneId}`,
      zoneId: known.zoneId,
      name: known.name,
      type: known.type,
      shortName: known.shortName,
      expectedBossCount: known.expectedBossCount,
    };
  }

  // 2. Raw gameZone — an unrecognised zone (a dungeon, or a solo/group arena).
  //    Group by its id; classify arenas by name so they aren't called dungeons.
  //    Dungeons get an expected boss count from the curated dungeon rosters.
  if (gz?.id) {
    const type = classifyUnknownZone(gz.name);
    return {
      key: `zone:${gz.id}`,
      zoneId: gz.id,
      name: gz.name || reportData?.zone?.name || 'Unknown Zone',
      type,
      expectedBossCount: type === 'dungeon' ? getDungeonBossCount(gz.name) : undefined,
    };
  }
  if (gz?.name) {
    // A name-only gameZone can still match a canonical trial by name.
    const byName = ZONE_BY_NAME.get(gz.name.toLowerCase());
    if (byName) {
      return {
        key: `zone:${byName.zoneId}`,
        zoneId: byName.zoneId,
        name: byName.name,
        type: byName.type,
        shortName: byName.shortName,
        expectedBossCount: byName.expectedBossCount,
      };
    }
    const type = classifyUnknownZone(gz.name);
    return {
      key: `name:${gz.name.toLowerCase()}`,
      zoneId: null,
      name: gz.name,
      type,
      expectedBossCount: type === 'dungeon' ? getDungeonBossCount(gz.name) : undefined,
    };
  }

  // 3. Boss-name fallback — only for legacy logs with no `gameZone` at all,
  //    and only for recognised trial bosses.
  if (isBossFight(fight)) {
    const trialName = trialNameFromBossName(fight.name);
    const byName = trialName ? ZONE_BY_NAME.get(trialName.toLowerCase()) : undefined;
    if (byName) {
      return {
        key: `zone:${byName.zoneId}`,
        zoneId: byName.zoneId,
        name: byName.name,
        type: byName.type,
        shortName: byName.shortName,
        expectedBossCount: byName.expectedBossCount,
      };
    }
  }

  // 4. Report-level zone name (weak: report-wide, so wrong for every fight
  //    outside the main zone of a mixed log — see `fromReportFallback`).
  const reportZoneName = reportData?.zone?.name;
  if (reportZoneName) {
    const byName = ZONE_BY_NAME.get(reportZoneName.toLowerCase());
    if (byName) {
      return {
        key: `zone:${byName.zoneId}`,
        zoneId: byName.zoneId,
        name: byName.name,
        type: byName.type,
        shortName: byName.shortName,
        expectedBossCount: byName.expectedBossCount,
        fromReportFallback: true,
      };
    }
    return {
      key: `name:${reportZoneName.toLowerCase()}`,
      zoneId: null,
      name: reportZoneName,
      type: 'unknown',
      fromReportFallback: true,
    };
  }

  return UNKNOWN_ZONE;
}

/** A single run of one trial/dungeon within a report. */
export interface ContentRun {
  /** Unique id for this run within the report. */
  id: string;
  zone: ResolvedZone;
  /** All fights (boss + trash) in chronological order. */
  fights: FightFragment[];
  startTime: number;
  endTime: number;
}

/**
 * Group a report's fights into runs, correctly separating logs that mix several
 * trials/dungeons.
 *
 * A new run always starts when the resolved **zone changes** — this is the key
 * fix for logs that mix multiple trials/dungeons.
 *
 * Same-zone re-clears (farm/reset nights that kill the same bosses repeatedly)
 * are kept in a **single run by default**, because real reset logs interleave
 * kills and wipes in a way that makes per-clear splitting noisy and unhelpful —
 * attempt grouping (see {@link buildRunEncounters} / {@link summarizeEncounter})
 * organises those far better. Pass `{ splitReclears: true }` to opt into starting
 * a new run each time a previously-killed boss is killed again.
 *
 * Fights with an unknown zone (e.g. inter-zone trash with no `gameZone`) attach
 * to the current run rather than forcing a split, and can "upgrade" a run whose
 * zone was not yet known.
 */
export function groupFightsIntoRuns(
  fights: readonly FightFragment[] | null | undefined,
  reportData?: ReportFragment | null,
  options?: { splitReclears?: boolean },
): ContentRun[] {
  if (!fights?.length) return [];
  const splitReclears = options?.splitReclears ?? false;

  const valid = fights
    .filter((f) => f.startTime != null && f.endTime != null && f.endTime > f.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  const runs: ContentRun[] = [];
  let current: ContentRun | null = null;
  let killedBossEncounters = new Set<number>();
  let runSeq = 0;

  for (const fight of valid) {
    const zone = resolveFightZone(fight, reportData);
    const boss = isBossFight(fight);
    const encId = effectiveEncounterId(fight);

    // Report-fallback zones are weak evidence (report-wide, wrong for every
    // fight outside a mixed log's main zone): they can seed/label a run but
    // never force a split away from one.
    const zoneKnown =
      !zone.fromReportFallback && (zone.zoneId != null || zone.key.startsWith('name:'));
    const currentKnown =
      current != null &&
      !current.zone.fromReportFallback &&
      (current.zone.zoneId != null || current.zone.key.startsWith('name:'));

    // A name-keyed fallback zone (e.g. a `gameZone` with a name but no id) must
    // not split away from an id-keyed run of the same content — compare by
    // display name when either side is name-keyed.
    const sameContentByName =
      current != null &&
      zone.name.toLowerCase() === current.zone.name.toLowerCase() &&
      (zone.key.startsWith('name:') || current.zone.key.startsWith('name:'));

    const zoneChanged =
      current != null &&
      zoneKnown &&
      currentKnown &&
      zone.key !== current.zone.key &&
      !sameContentByName;
    // Only treat a *kill* of an already-killed boss as a re-clear, and only when
    // the caller opts in.
    const reclear =
      splitReclears && boss && encId !== 0 && wasKill(fight) && killedBossEncounters.has(encId);

    if (current == null || zoneChanged || reclear) {
      runSeq += 1;
      current = {
        id: `${zone.key}#${runSeq}`,
        zone,
        fights: [],
        startTime: fight.startTime,
        endTime: fight.endTime,
      };
      runs.push(current);
      killedBossEncounters = new Set();
    } else if (
      zoneKnown &&
      (!currentKnown || (sameContentByName && current.zone.zoneId == null && zone.zoneId != null))
    ) {
      // Upgrade a run whose zone was not yet known, or that started from the
      // name-keyed fallback, once an id-keyed fight identifies it precisely.
      current.zone = zone;
      current.id = `${zone.key}#${runSeq}`;
    }

    current.fights.push(fight);
    current.endTime = Math.max(current.endTime, fight.endTime);
    if (boss && encId !== 0 && wasKill(fight)) {
      killedBossEncounters.add(encId);
    }
  }

  return runs;
}

/** A boss encounter within a run, with its surrounding trash. */
export interface RunEncounter {
  id: string;
  name: string;
  bossFights: FightFragment[];
  preTrash: FightFragment[];
  postTrash: FightFragment[];
}

/**
 * Build the boss encounters for a run, grouping every attempt of the same boss
 * together. Bosses are grouped by `encounterID` (stable across name variants and
 * instance suffixes), and trash is associated with the encounter it precedes /
 * follows by chronological position.
 */
export function buildRunEncounters(run: ContentRun): RunEncounter[] {
  const bossFights = run.fights.filter(isBossFight).sort((a, b) => a.startTime - b.startTime);
  const trashFights = run.fights
    .filter((f) => !isBossFight(f))
    .sort((a, b) => a.startTime - b.startTime);

  const encounters: RunEncounter[] = [];
  const byKey = new Map<string, RunEncounter>();

  for (let i = 0; i < bossFights.length; i++) {
    const boss = bossFights[i];
    const encId = effectiveEncounterId(boss);
    // Group by encounter id when present, else by normalised name.
    const key = encId !== 0 ? `enc:${encId}` : `name:${(boss.name || 'boss').toLowerCase()}`;

    let encounter = byKey.get(key);
    if (!encounter) {
      encounter = {
        id: `${run.id}-${key}`,
        name: boss.name || 'Unknown Boss',
        bossFights: [],
        preTrash: [],
        postTrash: [],
      };
      byKey.set(key, encounter);
      encounters.push(encounter);
    }

    const prevBossEnd = i > 0 ? bossFights[i - 1].endTime : 0;
    const preTrash = trashFights.filter(
      (t) => t.startTime >= prevBossEnd && t.startTime < boss.startTime,
    );
    encounter.bossFights.push(boss);
    encounter.preTrash.push(...preTrash);

    const nextBoss = bossFights[i + 1];
    if (nextBoss) {
      const postTrash = trashFights.filter(
        (t) => t.startTime > boss.endTime && t.startTime < nextBoss.startTime,
      );
      encounter.postTrash.push(...postTrash);
    }
  }

  return encounters;
}

/** Trash fights in a run not associated with any boss encounter. */
export function uncategorizedTrash(run: ContentRun, encounters: RunEncounter[]): FightFragment[] {
  const categorized = new Set(
    encounters.flatMap((e) => [...e.preTrash, ...e.postTrash]).map((f) => f.id),
  );
  return run.fights.filter((f) => !isBossFight(f) && !categorized.has(f.id));
}

/** Fight duration in milliseconds. */
export function fightDurationMs(fight: FightFragment): number {
  return Math.max(0, (fight.endTime ?? 0) - (fight.startTime ?? 0));
}

/**
 * Whether a wipe is really a quick "reset" / re-pull rather than a genuine
 * progression attempt. On prog nights, groups frequently pull, see the opener,
 * and immediately reset — producing a very short fight that ends with the boss at
 * near-full health. Real logs (e.g. a 45-attempt boss) are roughly half resets,
 * so distinguishing them is what makes the attempt list legible.
 */
export function isResetPull(fight: FightFragment): boolean {
  if (!isBossFight(fight) || wasKill(fight)) return false;
  const remaining = bossHealthRemaining(fight);
  if (remaining == null) return false;
  return fightDurationMs(fight) < 30_000 && remaining >= 90;
}

/** Aggregate stats for one boss encounter (all of its attempts). */
export interface EncounterSummary {
  /** Total boss attempts. */
  attempts: number;
  /** Attempts excluding quick resets. */
  realAttempts: number;
  /** Quick reset / re-pull count. */
  resets: number;
  /** Number of kills (>1 on farm logs). */
  kills: number;
  killed: boolean;
  /**
   * Best boss health % remaining among genuine (non-reset) wipes — lower is
   * closer to a kill. `0` when the boss was killed, `null` when there are no
   * genuine wipes to measure.
   */
  bestPercent: number | null;
  /** Distinct difficulty codes seen across attempts (e.g. `[121, 122]`). */
  difficulties: number[];
}

/** Summarise an encounter's attempts for the organised / collapsed view. */
export function summarizeEncounter(encounter: RunEncounter): EncounterSummary {
  const bosses = encounter.bossFights.filter(isBossFight);
  const kills = bosses.filter(wasKill);
  const resets = bosses.filter(isResetPull);
  const genuineWipes = bosses.filter((f) => !wasKill(f) && !isResetPull(f));
  const wipePercents = genuineWipes.map(bossHealthRemaining).filter((p): p is number => p != null);
  const killed = kills.length > 0;
  const difficulties = Array.from(
    new Set(bosses.map((f) => f.difficulty).filter((d): d is number => d != null)),
  ).sort((a, b) => a - b);

  return {
    attempts: bosses.length,
    realAttempts: bosses.length - resets.length,
    resets: resets.length,
    kills: kills.length,
    killed,
    bestPercent: killed ? 0 : wipePercents.length ? Math.min(...wipePercents) : null,
    difficulties,
  };
}
