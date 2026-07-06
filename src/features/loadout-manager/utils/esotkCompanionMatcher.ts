/**
 * Match ESOTK Companion snapshots to an ESO Logs report's players/fights.
 *
 * The companion's SavedVariables is not stamped with the report code, so we match on
 * the keys both sides share: character name (+ server) and time. The ESO Logs report
 * exposes an absolute `startTime` (ms) and per-fight `startTime`/`endTime` as ms offsets
 * from it, plus the player actors. We attach each actor to the nearest in-window
 * snapshot. Pure and dependency-free so it can be unit-tested without the app.
 *
 * Known gaps: on anonymised reports actor names are hidden, so nothing matches and every
 * snapshot lands in `unmatched` — the caller should surface that (a manual "attach to
 * player" picker is a planned fallback, not yet implemented; until then, show a notice
 * rather than silently rendering nothing). The direct-key path (user supplied the report
 * code) bypasses matching entirely and is handled upstream.
 */

import type { CompanionSnapshot } from './esotkCompanionParser';

/** Minimal shape of a report player/actor needed for matching. */
export interface MatchableActor {
  /** Stable id used as the result key (e.g. ESO Logs actor id). */
  id: number | string;
  name: string;
  /** Optional server/world to disambiguate name collisions. */
  server?: string;
}

/** Minimal shape of a report fight needed for matching. */
export interface MatchableFight {
  id: number | string;
  /** ms offset from report start. */
  startTime: number;
  /** ms offset from report start. */
  endTime: number;
  /** Optional zone id for disambiguating same-character snapshots near the same time. */
  zoneId?: number;
}

/** Minimal report shape required to match snapshots. */
export interface MatchableReport {
  /** Absolute report start, UNIX ms. */
  startTime: number;
  /** Absolute report end, UNIX ms. Defaults to startTime + 6h if omitted. */
  endTime?: number;
  actors: MatchableActor[];
  fights?: MatchableFight[];
}

export interface CompanionMatch {
  actor: MatchableActor;
  snapshot: CompanionSnapshot;
  /** The fight whose window best contains/precedes the snapshot, if any. */
  fightId?: number | string;
  /** ms between the snapshot and the selected fight/report window (0 when inside it). */
  distanceMs: number;
}

export interface CompanionMatchResult {
  /** One match per actor that had a usable snapshot, keyed by actor id. */
  matches: Map<MatchableActor['id'], CompanionMatch>;
  /** Snapshots that matched no actor (e.g. anonymised report). */
  unmatched: CompanionSnapshot[];
}

export interface MatchCompanionSnapshotsOptions {
  /** Prefer snapshots for this fight. Use the currently selected report fight when known. */
  targetFightId?: MatchableFight['id'];
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
/** Allow a snapshot slightly outside the report window (clock skew / pre-pull capture). */
const WINDOW_SLOP_MS = 5 * 60 * 1000;

function normalizeName(name: string): string {
  // ESO names may carry the @ display or a leading icon; compare on the bare name.
  return name.replace(/^@/, '').trim().toLowerCase();
}

/**
 * Classify a server/world string to a region. The two sides speak different
 * vocabularies — the addon's `GetWorldName()` yields "NA Megaserver" / "EU Megaserver"
 * while ESO Logs actors carry "PC-NA" / "PC-EU" (or console "XB-NA" / "PS-EU") — so a
 * strict string compare rejects every real match. Returns undefined when the string
 * carries no recognizable region; callers must then fall through to name + time rather
 * than reject, so we never drop a match on an unclassifiable server.
 */
function toServerRegion(server: string | undefined): 'na' | 'eu' | undefined {
  if (!server) return undefined;
  const s = server.toUpperCase();
  if (s.includes('EU')) return 'eu';
  if (s.includes('NA')) return 'na';
  return undefined;
}

function sameId(a: MatchableFight['id'], b: MatchableFight['id']): boolean {
  return String(a) === String(b);
}

function zoneMatches(snapshot: CompanionSnapshot, fight: MatchableFight): boolean {
  return (
    snapshot.zoneId === undefined || fight.zoneId === undefined || snapshot.zoneId === fight.zoneId
  );
}

/** Snapshot ts is UNIX seconds; report times are UNIX ms. */
function snapshotMs(snapshot: CompanionSnapshot): number {
  return snapshot.ts * 1000;
}

function withinWindow(tsMs: number, start: number, end: number): boolean {
  return tsMs >= start - WINDOW_SLOP_MS && tsMs <= end + WINDOW_SLOP_MS;
}

function distanceToWindow(tsMs: number, start: number, end: number): number {
  if (tsMs < start) return start - tsMs;
  if (tsMs > end) return tsMs - end;
  return 0;
}

function findNearestFightCandidate(
  tsMs: number,
  reportStart: number,
  fights: MatchableFight[] | undefined,
  snapshot: CompanionSnapshot,
): { fight: MatchableFight; distanceMs: number } | undefined {
  if (!fights || fights.length === 0) return undefined;
  let best: { fight: MatchableFight; distanceMs: number } | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const fight of fights) {
    if (!zoneMatches(snapshot, fight)) continue;
    const start = reportStart + fight.startTime;
    const end = reportStart + fight.endTime;
    const dist = distanceToWindow(tsMs, start, end);
    if (dist < bestDist) {
      bestDist = dist;
      best = { fight, distanceMs: dist };
    }
  }
  return best;
}

function candidateDistance(
  tsMs: number,
  report: MatchableReport,
  snapshot: CompanionSnapshot,
  opts: MatchCompanionSnapshotsOptions,
): { fightId?: MatchableFight['id']; distanceMs: number } | null {
  const reportStart = report.startTime;
  const reportEnd = report.endTime ?? reportStart + SIX_HOURS_MS;

  const targetFightId = opts.targetFightId;
  if (targetFightId !== undefined) {
    const fight = report.fights?.find((f) => sameId(f.id, targetFightId));
    if (!fight) return null;
    if (!zoneMatches(snapshot, fight)) return null;

    const start = reportStart + fight.startTime;
    const end = reportStart + fight.endTime;
    if (!withinWindow(tsMs, start, end)) return null;
    return { fightId: fight.id, distanceMs: distanceToWindow(tsMs, start, end) };
  }

  if (!withinWindow(tsMs, reportStart, reportEnd)) return null;

  const fightCandidate = findNearestFightCandidate(tsMs, reportStart, report.fights, snapshot);
  if (fightCandidate) {
    return { fightId: fightCandidate.fight.id, distanceMs: fightCandidate.distanceMs };
  }

  if (snapshot.zoneId !== undefined && report.fights?.some((fight) => fight.zoneId !== undefined)) {
    return null;
  }

  return { distanceMs: distanceToWindow(tsMs, reportStart, reportEnd) };
}

/**
 * Match snapshots to report actors. For each actor, picks the in-window snapshot whose
 * name (and server, when both provide one) matches and which is closest in time; the
 * combat-end snapshot for that player's fight wins.
 */
export function matchCompanionSnapshots(
  snapshots: CompanionSnapshot[],
  report: MatchableReport,
  opts: MatchCompanionSnapshotsOptions = {},
): CompanionMatchResult {
  const matches = new Map<MatchableActor['id'], CompanionMatch>();
  const matchedSnapshots = new Set<CompanionSnapshot>();

  for (const actor of report.actors) {
    const actorName = normalizeName(actor.name);
    if (!actorName) continue;

    let best: CompanionMatch | undefined;
    for (const snapshot of snapshots) {
      if (normalizeName(snapshot.char) !== actorName) continue;
      // If both sides declare a recognizable region, they must agree. The addon
      // ("NA Megaserver") and ESO Logs ("PC-NA") use different vocabularies, so we
      // compare by region and only reject on a provable conflict.
      const actorRegion = toServerRegion(actor.server);
      const snapshotRegion = toServerRegion(snapshot.server);
      if (actorRegion && snapshotRegion && actorRegion !== snapshotRegion) continue;

      const tsMs = snapshotMs(snapshot);
      const candidate = candidateDistance(tsMs, report, snapshot, opts);
      if (!candidate) continue;

      if (
        !best ||
        candidate.distanceMs < best.distanceMs ||
        (candidate.distanceMs === best.distanceMs && tsMs > snapshotMs(best.snapshot))
      ) {
        best = {
          actor,
          snapshot,
          fightId: candidate.fightId,
          distanceMs: candidate.distanceMs,
        };
      }
    }

    if (best) {
      matches.set(actor.id, best);
      matchedSnapshots.add(best.snapshot);
    }
  }

  const unmatched = snapshots.filter((s) => !matchedSnapshots.has(s));
  return { matches, unmatched };
}
