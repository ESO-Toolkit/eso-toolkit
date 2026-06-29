/**
 * Match ESOTK Companion snapshots to an ESO Logs report's players/fights.
 *
 * The companion's SavedVariables is not stamped with the report code, so we match on
 * the keys both sides share: character name (+ server) and time. The ESO Logs report
 * exposes an absolute `startTime` (ms) and per-fight `startTime`/`endTime` as ms offsets
 * from it, plus the player actors. We attach each actor to the nearest in-window
 * snapshot. Pure and dependency-free so it can be unit-tested without the app.
 *
 * Known gaps handled by the caller, not here: anonymised reports (actor names hidden →
 * no match → fall back to a manual "attach to player" picker), and the direct-key path
 * (user supplied the report code) which bypasses matching entirely.
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

function normalizeServer(server: string | undefined): string | undefined {
  const normalized = server?.trim().toLowerCase();
  return normalized || undefined;
}

function sameId(a: MatchableFight['id'], b: MatchableFight['id']): boolean {
  return String(a) === String(b);
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
): { fight: MatchableFight; distanceMs: number } | undefined {
  if (!fights || fights.length === 0) return undefined;
  let best: { fight: MatchableFight; distanceMs: number } | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const fight of fights) {
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
  opts: MatchCompanionSnapshotsOptions,
): { fightId?: MatchableFight['id']; distanceMs: number } | null {
  const reportStart = report.startTime;
  const reportEnd = report.endTime ?? reportStart + SIX_HOURS_MS;

  const targetFightId = opts.targetFightId;
  if (targetFightId !== undefined) {
    const fight = report.fights?.find((f) => sameId(f.id, targetFightId));
    if (!fight) return null;

    const start = reportStart + fight.startTime;
    const end = reportStart + fight.endTime;
    if (!withinWindow(tsMs, start, end)) return null;
    return { fightId: fight.id, distanceMs: distanceToWindow(tsMs, start, end) };
  }

  if (!withinWindow(tsMs, reportStart, reportEnd)) return null;

  const fightCandidate = findNearestFightCandidate(tsMs, reportStart, report.fights);
  if (fightCandidate) {
    return { fightId: fightCandidate.fight.id, distanceMs: fightCandidate.distanceMs };
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
      // If both sides declare a server, they must agree.
      const actorServer = normalizeServer(actor.server);
      const snapshotServer = normalizeServer(snapshot.server);
      if (actorServer && snapshotServer && actorServer !== snapshotServer) continue;

      const tsMs = snapshotMs(snapshot);
      const candidate = candidateDistance(tsMs, report, opts);
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
