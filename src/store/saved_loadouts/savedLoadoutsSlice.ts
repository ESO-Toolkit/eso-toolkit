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
}

interface SavedLoadoutsState {
  loadouts: SavedLoadout[];
  /** ISO timestamp of the last successful account sync, if any. */
  lastSyncedAt?: string;
}

const initialState: SavedLoadoutsState = {
  loadouts: [],
};

interface SaveLoadoutInput {
  name: string;
  setup: LoadoutSetup;
  description?: string;
  meta?: SavedLoadoutMeta;
}

const savedLoadoutsSlice = createSlice({
  name: 'savedLoadouts',
  initialState,
  reducers: {
    saveLoadout: {
      reducer(state, action: PayloadAction<SavedLoadout>) {
        state.loadouts.unshift(action.payload);
      },
      prepare({ name, setup, description, meta }: SaveLoadoutInput) {
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
          } satisfies SavedLoadout,
        };
      },
    },
    updateSavedLoadout(
      state,
      action: PayloadAction<{
        id: string;
        setup: LoadoutSetup;
        name?: string;
        description?: string;
        meta?: SavedLoadoutMeta;
      }>,
    ) {
      const idx = state.loadouts.findIndex((l) => l.id === action.payload.id);
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
      action: PayloadAction<{ id: string; name: string; description?: string }>,
    ) {
      const idx = state.loadouts.findIndex((l) => l.id === action.payload.id);
      if (idx === -1) {
        return;
      }
      state.loadouts[idx].name = action.payload.name;
      if (action.payload.description !== undefined) {
        state.loadouts[idx].description = action.payload.description;
      }
      state.loadouts[idx].updatedAt = new Date().toISOString();
    },
    deleteSavedLoadout(state, action: PayloadAction<string>) {
      state.loadouts = state.loadouts.filter((l) => l.id !== action.payload);
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
  },
});

export const {
  saveLoadout,
  updateSavedLoadout,
  renameSavedLoadout,
  deleteSavedLoadout,
  replaceAllLoadouts,
  setLastSyncedAt,
} = savedLoadoutsSlice.actions;
export default savedLoadoutsSlice.reducer;
