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

export function savedLoadoutToPayload(loadout: SavedLoadout): LoadoutSyncPayload {
  const blob: LoadoutDataBlob = {
    setup: loadout.setup,
    meta: loadout.meta,
    createdAt: loadout.createdAt,
    updatedAt: loadout.updatedAt,
  };
  return {
    id: loadout.id,
    name: loadout.name,
    description: loadout.description ?? '',
    trial_id: loadout.meta?.trialId ?? '',
    character_name: loadout.meta?.characterName ?? '',
    loadout_data: JSON.stringify(blob),
    client_updated_at: loadout.updatedAt ?? '',
  };
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
    if (!existing || time(r.updatedAt) >= time(existing.updatedAt)) {
      byId.set(r.id, r);
    }
  }
  return Array.from(byId.values()).sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
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
