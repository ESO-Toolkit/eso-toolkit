/**
 * Pure mappers between the local SavedLoadout shape and the server row/payload,
 * plus a last-write-wins merge for two-way sync. No I/O — unit-testable.
 */

import type { SavedLoadout, SavedLoadoutMeta } from '@/store/saved_loadouts';

import type { LoadoutSyncPayload, UserLoadoutRow } from '../types/loadout-sync.types';
import type { LoadoutSetup } from '../types/loadout.types';

/** The canonical payload stored in user_loadouts.loadout_data. */
interface LoadoutDataBlob {
  setup: LoadoutSetup;
  meta?: SavedLoadoutMeta;
  createdAt?: string;
  updatedAt?: string;
}

// Mirror the worker's field caps (roster-hub-api parseLoadoutBody). The worker
// rejects the WHOLE /loadouts/sync batch on the first over-cap field, so one
// oversized local loadout would block every other loadout from syncing. Clamp here
// so the payload is always acceptable (over-long legacy values are truncated).
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TRIAL_ID_LENGTH = 64;
const MAX_CHARACTER_NAME_LENGTH = 64;

/**
 * Deterministic 53-bit content hash (cyrb53) as fixed-width 14-char lowercase hex.
 *
 * Fixed width + a hex alphabet means lexical `>=` equals numeric ordering AND compares
 * IDENTICALLY under JS (UTF-16 code units) and SQLite BINARY (UTF-8 bytes) — so the
 * client tie-break and the server `upsertUserLoadouts` conflict guard, comparing this
 * exact value, pick the SAME winner for an equal-`client_updated_at` collision. (A raw
 * field concatenation could disagree across the two collations on non-ASCII text.)
 * Used ONLY to break exact-timestamp ties; collisions merely fall back to the server's
 * arrival order in an already-astronomically-rare case.
 */
export function contentFingerprint(name: string, description: string, loadoutData: string): string {
  // JSON-encode the fields so their boundaries are unambiguous (e.g. ("ab","c") and
  // ("a","bc") can’t collide) WITHOUT baking control characters into the source.
  const input = JSON.stringify([name, description, loadoutData]);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0); // 0 … 2^53-1
  return hash.toString(16).padStart(14, '0');
}

export function savedLoadoutToPayload(loadout: SavedLoadout): LoadoutSyncPayload {
  const blob: LoadoutDataBlob = {
    setup: loadout.setup,
    meta: loadout.meta,
    createdAt: loadout.createdAt,
    updatedAt: loadout.updatedAt,
  };
  // Normalize to EXACTLY what the worker stores (cleanText = trim) so the fingerprint
  // survives a pull→re-push and never causes per-sync churn. Trim → clamp → trim again:
  // the leading trim matches cleanText, and the trailing trim covers the case where the
  // clamp truncates at a space (a >cap name whose boundary char is whitespace), which the
  // server's cleanText would otherwise strip and re-diverge the fingerprint. Sending the
  // normalized value keeps the local copy byte-identical to the server's after sync.
  const name = loadout.name.trim().slice(0, MAX_NAME_LENGTH).trim();
  const description = (loadout.description ?? '').trim().slice(0, MAX_DESCRIPTION_LENGTH).trim();
  const loadoutData = JSON.stringify(blob);
  return {
    id: loadout.id,
    name,
    description,
    trial_id: (loadout.meta?.trialId ?? '').slice(0, MAX_TRIAL_ID_LENGTH),
    character_name: (loadout.meta?.characterName ?? '').slice(0, MAX_CHARACTER_NAME_LENGTH),
    loadout_data: loadoutData,
    client_updated_at: loadout.updatedAt ?? '',
    // Fingerprint over exactly the fields the server stores byte-identically for the
    // incoming and stored rows (the trimmed+clamped name/description and the verbatim
    // loadout_data — NOT the provenance columns), so the server settles equal-timestamp
    // ties the same way the client merge does and the value survives a pull→re-push.
    content_fingerprint: contentFingerprint(name, description, loadoutData),
  };
}

// Worker caps the per-field clamp above can't fix: oversized loadout_data, an empty
// name, or a future/malformed client timestamp (e.g. a skewed device clock). Mirror
// roster-hub-api parseLoadoutBody so an unsyncable row is dropped from the push
// instead of 400-ing the whole batch (and blocking the pull reconciliation).
const MAX_LOADOUT_DATA_CHARS = 20_000;
const MAX_CLIENT_TIMESTAMP_LENGTH = 40;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const isAcceptableClientTimestamp = (s: string, now: number): boolean => {
  if (s === '') return true; // empty sorts oldest; the worker accepts it
  if (s.length > MAX_CLIENT_TIMESTAMP_LENGTH || !ISO_UTC_RE.test(s)) return false;
  const ms = Date.parse(s);
  return Number.isFinite(ms) && ms <= now + CLOCK_SKEW_MS;
};

/**
 * True when a payload satisfies the worker's per-field contract, so it can be pushed.
 * `/loadouts/sync` rejects the WHOLE batch on the first bad entry, so the caller
 * filters these out (and warns) rather than letting one bad local row block every
 * other loadout and the pulled-library reconciliation. `now` is injectable for tests.
 */
export function isSyncablePayload(p: LoadoutSyncPayload, now: number = Date.now()): boolean {
  if (!p.name.trim() || p.name.length > MAX_NAME_LENGTH) return false;
  if (p.description.length > MAX_DESCRIPTION_LENGTH) return false;
  if (p.trial_id.length > MAX_TRIAL_ID_LENGTH) return false;
  if (p.character_name.length > MAX_CHARACTER_NAME_LENGTH) return false;
  if (!isAcceptableClientTimestamp(p.client_updated_at, now)) return false;
  if (!p.loadout_data.trim() || p.loadout_data.length > MAX_LOADOUT_DATA_CHARS) return false;
  return true;
}

/**
 * Reconstruct a SavedLoadout from a server row. The authoritative timestamps and
 * setup live inside loadout_data (the client's own ISO times, so merges compare
 * like-for-like); the columns are fallbacks. Returns null if the blob is
 * unparseable or missing a setup, so a corrupt row can't crash a sync.
 */
export function rowToSavedLoadout(row: UserLoadoutRow): SavedLoadout | null {
  let blob: LoadoutDataBlob;
  try {
    blob = JSON.parse(row.loadout_data) as LoadoutDataBlob;
  } catch {
    return null;
  }
  if (!blob || typeof blob !== 'object' || !blob.setup) return null;

  const meta: SavedLoadoutMeta | undefined =
    blob.meta ??
    (row.trial_id || row.character_name
      ? { trialId: row.trial_id || undefined, characterName: row.character_name || undefined }
      : undefined);

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdAt: blob.createdAt ?? row.created_at,
    updatedAt: blob.updatedAt ?? row.updated_at,
    setup: blob.setup,
    meta,
  };
}

const time = (iso: string | undefined): number => (iso ? Date.parse(iso) || 0 : 0);

/**
 * Stable content fingerprint used ONLY to break exact-timestamp ties deterministically,
 * so two devices that diverged at the same millisecond converge on the same survivor
 * instead of one side silently dropping its edit.
 *
 * This is the SAME `content_fingerprint` the payload carries to the server, computed over
 * the exact bytes (clamped name + description + loadout_data) the server stores — so the
 * client merge and the worker's equal-timestamp upsert guard agree on the winner instead
 * of the server settling ties by arrival order. (updatedAt is equal in a tie, so it isn't
 * part of the comparison; it lives inside loadout_data but is identical on both sides.)
 */
const contentKey = (l: SavedLoadout): string => savedLoadoutToPayload(l).content_fingerprint;

/**
 * Merge local and remote libraries by id, keeping whichever side has the newer
 * `updatedAt` for shared ids (ties favour remote, so a just-pushed sync settles
 * deterministically). Non-destructive: ids present on only one side are kept.
 * Result is sorted newest-first for stable display.
 */
export function mergeLoadoutsByNewest(
  local: SavedLoadout[],
  remote: SavedLoadout[],
): SavedLoadout[] {
  const byId = new Map<string, SavedLoadout>();
  for (const l of local) byId.set(l.id, l);
  for (const r of remote) {
    const existing = byId.get(r.id);
    if (!existing) {
      byId.set(r.id, r);
      continue;
    }
    const tr = time(r.updatedAt);
    const te = time(existing.updatedAt);
    // Newer wins; on an EXACT-timestamp tie the greater content fingerprint wins, so
    // divergent same-millisecond edits resolve the same way on every device (no silent
    // per-device drift). Identical content keeps remote, so a just-pushed row still
    // settles deterministically without churn.
    if (tr > te || (tr === te && contentKey(r) >= contentKey(existing))) {
      byId.set(r.id, r);
    }
  }
  return Array.from(byId.values()).sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
}

/**
 * Of a merged library, the rows worth POSTing back to the account: those whose id
 * is absent from the just-pulled `remote` slice, or whose `updatedAt` is strictly
 * newer than the remote copy. Rows identical to (or older than) what the server
 * already has are dropped, so a pull-only sync (new device, or a library already
 * matching the server) never re-POSTs the rows it just fetched — that would burn
 * the write rate limit on every refresh and, once throttled, 429 the whole sync
 * before the pulled state could commit. `remote` must be the PURE server slice
 * (never merged with local), so the diff reflects true server state.
 */
export function selectOutgoing(merged: SavedLoadout[], remote: SavedLoadout[]): SavedLoadout[] {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  return merged.filter((l) => {
    const r = remoteById.get(l.id);
    if (r === undefined) return true;
    const tl = time(l.updatedAt);
    const tr = time(r.updatedAt);
    // Push when newer, or when an exact-timestamp tie resolves in this row's favor (its
    // content fingerprint wins the same tie-break the merge uses). That gets a divergent
    // same-timestamp edit to the server instead of letting it be silently overwritten,
    // while pushing only the deterministic winner — so devices converge, no ping-pong.
    return tl > tr || (tl === tr && contentKey(l) > contentKey(r));
  });
}

/**
 * Drop loadouts killed by an account deletion tombstone — but only when the local
 * copy is NOT newer than the delete. A local edit that post-dates the tombstone
 * (updatedAt > deleted_at) is kept so it can be pushed and revive the loadout
 * (the server allows this and clears the stale tombstone). `tombstones` maps id →
 * delete time (ISO).
 */
export function purgeDeleted(
  loadouts: SavedLoadout[],
  tombstones: Map<string, string>,
): SavedLoadout[] {
  if (tombstones.size === 0) return loadouts;
  return loadouts.filter((l) => {
    const deletedAt = tombstones.get(l.id);
    if (deletedAt === undefined) return true; // not deleted
    return time(l.updatedAt) > time(deletedAt); // keep only if strictly newer (revive)
  });
}

/** Tag loadouts with an owning account (claim on sync). Identity-preserving when unchanged. */
export function stampOwner(loadouts: SavedLoadout[], ownerUserId: string): SavedLoadout[] {
  return loadouts.map((l) => (l.ownerUserId === ownerUserId ? l : { ...l, ownerUserId }));
}

/**
 * Split a library into the current user's slice and everything else (preserved).
 * `claimUnowned` controls whether unowned (guest/legacy) loadouts count as the
 * current user's: true on a first/own-browser sync (claim them), false once a
 * DIFFERENT account has synced here, so a shared browser never pushes a prior
 * user's legacy loadouts into the new account.
 */
export function partitionByOwner(
  loadouts: SavedLoadout[],
  currentUserId: string,
  claimUnowned = true,
): { mine: SavedLoadout[]; others: SavedLoadout[] } {
  const mine: SavedLoadout[] = [];
  const others: SavedLoadout[] = [];
  for (const l of loadouts) {
    const isMine = l.ownerUserId === currentUserId || (claimUnowned && l.ownerUserId === undefined);
    if (isMine) mine.push(l);
    else others.push(l);
  }
  return { mine, others };
}

/**
 * True when two libraries hold the same ids with the same updatedAt — i.e. no
 * edit happened between two reads. Used to detect a quiescent sync pass.
 */
export function sameLibrary(a: SavedLoadout[], b: SavedLoadout[]): boolean {
  if (a.length !== b.length) return false;
  const sig = (list: SavedLoadout[]): string =>
    list
      .map((l) => `${l.id}:${l.updatedAt}`)
      .sort()
      .join('|');
  return sig(a) === sig(b);
}
