import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import type { LoadoutSetup } from '../../features/loadout-manager/types/loadout.types';

/**
 * Light provenance so a library row can show context (trial/character) without
 * decoding the gear payload.
 */
export interface SavedLoadoutMeta {
  trialId?: string;
  characterName?: string;
}

/**
 * A named, persisted loadout — the library counterpart of {@link SavedBuild}.
 * The portable payload is a single {@link LoadoutSetup} (the WW/loadout unit).
 */
export interface SavedLoadout {
  id: string; // uuid
  name: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  setup: LoadoutSetup;
  meta?: SavedLoadoutMeta;
  /**
   * The account this loadout belongs to, stamped when it is synced to an account.
   * Undefined = unowned/local (a guest- or pre-sign-in-built loadout). Used to
   * hide (never delete) other users' synced loadouts on a shared browser and to
   * avoid pushing them into the wrong account. Claimed only on an explicit sync.
   */
  ownerUserId?: string;
}

interface SavedLoadoutsState {
  loadouts: SavedLoadout[];
  /** ISO timestamp of the last successful account sync, if any. */
  lastSyncedAt?: string;
  /**
   * The account id the local library was last synced with. Used to detect a
   * shared browser switching accounts, so one user's local loadouts are never
   * pushed into another user's account.
   */
  syncedUserId?: string;
}

const initialState: SavedLoadoutsState = {
  loadouts: [],
};

interface SaveLoadoutInput {
  name: string;
  setup: LoadoutSetup;
  description?: string;
  meta?: SavedLoadoutMeta;
  /**
   * The account saving this loadout, when signed in. Stamping ownership at save
   * time (not at sync) means a loadout built while signed in is never treated as
   * unowned guest data and can't be claimed/pushed into a different account.
   */
  ownerUserId?: string;
}

const savedLoadoutsSlice = createSlice({
  name: 'savedLoadouts',
  initialState,
  reducers: {
    saveLoadout: {
      reducer(state, action: PayloadAction<SavedLoadout>) {
        state.loadouts.unshift(action.payload);
      },
      prepare({ name, setup, description, meta, ownerUserId }: SaveLoadoutInput) {
        const now = new Date().toISOString();
        return {
          payload: {
            id: uuidv4(),
            name,
            description,
            createdAt: now,
            updatedAt: now,
            setup,
            meta,
            ownerUserId,
          } satisfies SavedLoadout,
        };
      },
    },
    updateSavedLoadout(
      state,
      action: PayloadAction<{
        id: string;
        ownerUserId?: string;
        setup: LoadoutSetup;
        name?: string;
        description?: string;
        meta?: SavedLoadoutMeta;
      }>,
    ) {
      // Match on (id, ownerUserId): the same client id can exist under different
      // accounts in the persisted slice, so id alone could mutate another (hidden)
      // account's loadout.
      const idx = state.loadouts.findIndex(
        (l) => l.id === action.payload.id && l.ownerUserId === action.payload.ownerUserId,
      );
      if (idx === -1) {
        return;
      }
      const existing = state.loadouts[idx];
      state.loadouts[idx] = {
        ...existing,
        name: action.payload.name ?? existing.name,
        description:
          action.payload.description !== undefined
            ? action.payload.description
            : existing.description,
        setup: action.payload.setup,
        meta: action.payload.meta ?? existing.meta,
        updatedAt: new Date().toISOString(),
      };
    },
    renameSavedLoadout(
      state,
      action: PayloadAction<{
        id: string;
        ownerUserId?: string;
        name: string;
        description?: string;
      }>,
    ) {
      const idx = state.loadouts.findIndex(
        (l) => l.id === action.payload.id && l.ownerUserId === action.payload.ownerUserId,
      );
      if (idx === -1) {
        return;
      }
      state.loadouts[idx].name = action.payload.name;
      if (action.payload.description !== undefined) {
        state.loadouts[idx].description = action.payload.description;
      }
      state.loadouts[idx].updatedAt = new Date().toISOString();
    },
    deleteSavedLoadout(state, action: PayloadAction<{ id: string; ownerUserId?: string }>) {
      state.loadouts = state.loadouts.filter(
        (l) => !(l.id === action.payload.id && l.ownerUserId === action.payload.ownerUserId),
      );
    },
    /**
     * Replace the entire library — used by account sync after merging the local
     * and remote sets so the store reflects loadouts pulled from other devices.
     */
    replaceAllLoadouts(state, action: PayloadAction<SavedLoadout[]>) {
      state.loadouts = action.payload;
    },
    setLastSyncedAt(state, action: PayloadAction<string | undefined>) {
      state.lastSyncedAt = action.payload;
    },
    setSyncedUserId(state, action: PayloadAction<string | undefined>) {
      state.syncedUserId = action.payload;
    },
    /**
     * Explicitly claim all unowned (guest/legacy) loadouts for an account — the
     * "Add to account" action. Sync never claims unowned data implicitly, so this
     * is the one deliberate step that assigns local-only loadouts to a user.
     */
    claimUnownedLoadouts(state, action: PayloadAction<string>) {
      for (const l of state.loadouts) {
        if (l.ownerUserId === undefined) l.ownerUserId = action.payload;
      }
    },
  },
});

export const {
  saveLoadout,
  updateSavedLoadout,
  renameSavedLoadout,
  deleteSavedLoadout,
  replaceAllLoadouts,
  setLastSyncedAt,
  setSyncedUserId,
  claimUnownedLoadouts,
} = savedLoadoutsSlice.actions;
export default savedLoadoutsSlice.reducer;
