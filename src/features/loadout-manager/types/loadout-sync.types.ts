/**
 * Types for account loadout sync (mirrors the roster-hub-api user_loadouts row).
 */

/** A loadout row as returned by the worker. */
export interface UserLoadoutRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  trial_id: string;
  character_name: string;
  /** Compact JSON of the SavedLoadout payload ({ setup, meta, createdAt, updatedAt }). */
  loadout_data: string;
  /** Client-authored ISO edit time (the SavedLoadout's updatedAt). */
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

/** The body shape the worker accepts for create/update/sync. */
export interface LoadoutSyncPayload {
  id: string;
  name: string;
  description: string;
  trial_id: string;
  character_name: string;
  loadout_data: string;
  /** Client-authored ISO edit time; drives server-side last-write-wins on sync. */
  client_updated_at: string;
}
